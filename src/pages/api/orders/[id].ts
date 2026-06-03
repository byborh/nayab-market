import type { APIRoute } from 'astro';
import { getAdminFirestore, getAdminAuth, FieldValue } from '~/lib/firebase-admin';
import {
  sendShippingNotification,
  sendProcessingNotification,
  sendDeliveryConfirmation,
} from '~/lib/email';
import type { Order, OrderStatus, StatusHistoryEntry } from '~/lib/orders';
import { ORDER_STATUS_OPTIONS } from '~/lib/orders';

export const prerender = false;

async function requireAdmin(request: Request): Promise<string | null> {
  const auth = getAdminAuth();
  const db = getAdminFirestore();
  if (!auth || !db) return null;
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice(7);
  try {
    const decoded = await auth.verifyIdToken(idToken);
    const adminDoc = await db.collection('admins').doc(decoded.uid).get();
    if (!adminDoc.exists) return null;
    return decoded.uid;
  } catch {
    return null;
  }
}

export const PATCH: APIRoute = async ({ request, params }) => {
  const db = getAdminFirestore();
  if (!db) {
    return new Response(JSON.stringify({ error: 'Firebase Admin non configuré côté serveur.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const uid = await requireAdmin(request);
  if (!uid) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = params.id;
  if (!id) return new Response(JSON.stringify({ error: 'ID manquant' }), { status: 400 });

  let body: {
    status?: OrderStatus;
    trackingNumber?: string;
    trackingUrl?: string;
    notes?: string;
    notify?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON invalide' }), { status: 400 });
  }

  const ref = db.collection('orders').doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return new Response(JSON.stringify({ error: 'Commande introuvable' }), { status: 404 });
  }
  const order = snap.data() as Order;
  const now = Date.now();

  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  let emailToSend: ((o: Order) => Promise<void>) | null = null;

  const statusChanged = body.status && body.status !== order.status;

  if (body.status) {
    if (!ORDER_STATUS_OPTIONS.includes(body.status)) {
      return new Response(JSON.stringify({ error: 'Statut invalide' }), { status: 400 });
    }
    updates.status = body.status;

    if (statusChanged) {
      // Append à l'historique
      const newEntry: StatusHistoryEntry = { status: body.status, at: now };
      updates.statusHistory = FieldValue.arrayUnion(newEntry);

      // Email à envoyer selon le nouveau statut (si notify=true)
      const shouldNotify = body.notify !== false;
      if (shouldNotify) {
        if (body.status === 'processing') emailToSend = sendProcessingNotification;
        if (body.status === 'shipped') emailToSend = sendShippingNotification;
        if (body.status === 'delivered') emailToSend = sendDeliveryConfirmation;
      }

      // Timestamps fixes pour les étapes importantes
      if (body.status === 'shipped' && !order.shippedAt) {
        updates.shippedAt = FieldValue.serverTimestamp();
      }
      if (body.status === 'delivered' && !order.deliveredAt) {
        updates.deliveredAt = FieldValue.serverTimestamp();
      }
    }
  }

  if (typeof body.trackingNumber === 'string') {
    updates['shipping.trackingNumber'] = body.trackingNumber.trim() || null;
  }
  if (typeof body.trackingUrl === 'string') {
    updates['shipping.trackingUrl'] = body.trackingUrl.trim() || null;
  }
  if (typeof body.notes === 'string') {
    updates.notes = body.notes;
  }

  try {
    await ref.update(updates);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur Firestore' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (emailToSend && order.customer.email) {
    const refreshed = (await ref.get()).data() as Order;
    await emailToSend(refreshed);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
