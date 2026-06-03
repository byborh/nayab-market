import type { APIRoute } from 'astro';
import { getAdminFirestore } from '~/lib/firebase-admin';
import type { Order } from '~/lib/orders';

export const prerender = false;

/**
 * Endpoint de polling léger pour /commande/[id].
 * Retourne uniquement les infos de statut/suivi pour vérifier si la commande
 * a évolué depuis le rendu initial. Ne nécessite pas d'authentification :
 * la sécurité est assurée par l'unguessable session ID Stripe.
 */
export const GET: APIRoute = async ({ params }) => {
  const db = getAdminFirestore();
  if (!db) return new Response('Service unavailable', { status: 503 });

  const id = params.id;
  if (!id) return new Response('Bad request', { status: 400 });

  try {
    const snap = await db.collection('orders').doc(id).get();
    if (!snap.exists) return new Response('Not found', { status: 404 });
    const o = snap.data() as Order;

    const toMs = (v: unknown): number | null => {
      if (!v) return null;
      if (typeof v === 'number') return v;
      if (typeof v === 'object' && v && 'toMillis' in v) return (v as { toMillis: () => number }).toMillis();
      return null;
    };

    return new Response(
      JSON.stringify({
        status: o.status,
        shippedAt: toMs((o as unknown as Record<string, unknown>).shippedAt),
        deliveredAt: toMs((o as unknown as Record<string, unknown>).deliveredAt),
        trackingNumber: o.shipping?.trackingNumber || null,
        trackingUrl: o.shipping?.trackingUrl || null,
        statusHistory: (o.statusHistory || []).map((h) => ({
          status: h.status,
          at: toMs(h.at) ?? h.at,
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
