import type { APIRoute } from 'astro';
import { getAdminFirestore, getAdminAuth, FieldValue } from '~/lib/firebase-admin';
import { sendShippingNotification } from '~/lib/email';
import type { Order, OrderStatus } from '~/lib/orders';
import { ORDER_STATUS_OPTIONS } from '~/lib/orders';

export const prerender = false;

async function requireAdmin(request: Request): Promise<string | null> {
  const auth = getAdminAuth();
  if (!auth) return null;
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice(7);
  try {
    const decoded = await auth.verifyIdToken(idToken);
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
  if (!id) {
    return new Response(JSON.stringify({ error: 'ID manquant' }), { status: 400 });
  }

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

  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  let willSendShippingEmail = false;

  if (body.status) {
    if (!ORDER_STATUS_OPTIONS.includes(body.status)) {
      return new Response(JSON.stringify({ error: 'Statut invalide' }), { status: 400 });
    }
    updates.status = body.status;
    if (body.status === 'shipped' && !order.shippedAt) {
      updates.shippedAt = FieldValue.serverTimestamp();
      willSendShippingEmail = body.notify !== false;
    }
    if (body.status === 'delivered' && !order.deliveredAt) {
      updates.deliveredAt = FieldValue.serverTimestamp();
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

  if (willSendShippingEmail && order.customer.email) {
    const refreshed = (await ref.get()).data() as Order;
    await sendShippingNotification(refreshed);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
