import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getAdminFirestore, FieldValue } from '~/lib/firebase-admin';
import { sendOrderConfirmation, sendAdminNewOrderAlert } from '~/lib/email';
import type { Order, OrderItem } from '~/lib/orders';

export const prerender = false;

function buildOrderFromSession(session: Stripe.Checkout.Session, lineItems: Stripe.ApiList<Stripe.LineItem>): Order {
  const items: OrderItem[] = lineItems.data.map((li) => {
    const product = (li.price?.product as Stripe.Product | undefined) || undefined;
    return {
      productId: (product?.metadata?.productId as string | undefined) || undefined,
      name: li.description || product?.name || 'Produit',
      qty: li.quantity || 1,
      unitAmount: li.price?.unit_amount || 0,
      currency: (li.price?.currency || session.currency || 'eur').toLowerCase(),
      image: product?.images?.[0],
    };
  });

  const subtotal = session.amount_subtotal ?? items.reduce((s, i) => s + i.unitAmount * i.qty, 0);
  const total = session.amount_total ?? subtotal;
  const shipping = total - subtotal;

  const shippingDetails = session.shipping_details;
  const customer = session.customer_details;
  const now = Date.now();

  return {
    id: session.id,
    status: 'paid',
    customer: {
      email: customer?.email || session.customer_email || '',
      name: customer?.name || undefined,
      phone: customer?.phone || undefined,
    },
    shipping: {
      name: shippingDetails?.name || undefined,
      address: {
        line1: shippingDetails?.address?.line1 || undefined,
        line2: shippingDetails?.address?.line2 || undefined,
        city: shippingDetails?.address?.city || undefined,
        postalCode: shippingDetails?.address?.postal_code || undefined,
        state: shippingDetails?.address?.state || undefined,
        country: shippingDetails?.address?.country || undefined,
      },
      method: session.shipping_cost?.shipping_rate
        ? (typeof session.shipping_cost.shipping_rate === 'string'
          ? undefined
          : session.shipping_cost.shipping_rate.display_name || undefined)
        : undefined,
      trackingNumber: null,
      trackingUrl: null,
    },
    items,
    amounts: {
      subtotal,
      shipping,
      total,
      currency: (session.currency || 'eur').toLowerCase(),
    },
    notes: '',
    stripeSessionId: session.id,
    stripePaymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
    createdAt: now,
    updatedAt: now,
    paidAt: now,
    shippedAt: null,
    deliveredAt: null,
  };
}

export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.STRIPE_SECRET_KEY;
  const whSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

  if (!secret || !whSecret) {
    return new Response('Stripe non configuré', { status: 500 });
  }

  const stripe = new Stripe(secret, { apiVersion: '2024-12-18.acacia' });

  const sig = request.headers.get('stripe-signature');
  if (!sig) return new Response('Signature manquante', { status: 400 });

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, sig, whSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature invalide';
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      // On ignore les sessions non payées (cas rare des paiements asynchrones non finalisés)
      if (session.payment_status !== 'paid') {
        console.log('[webhook] session.completed mais payment_status =', session.payment_status);
        break;
      }

      // Récupérer les line items complets (l'event ne les inclut pas par défaut)
      let lineItems: Stripe.ApiList<Stripe.LineItem>;
      try {
        lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
          limit: 100,
          expand: ['data.price.product'],
        });
      } catch (err) {
        console.error('[webhook] échec listLineItems:', err);
        return new Response('Erreur récupération line items', { status: 500 });
      }

      const order = buildOrderFromSession(session, lineItems);

      // Persister en Firestore via Admin SDK
      const db = getAdminFirestore();
      if (db) {
        try {
          await db
            .collection('orders')
            .doc(order.id)
            .set({
              ...order,
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
              paidAt: FieldValue.serverTimestamp(),
            }, { merge: false });
        } catch (err) {
          console.error('[webhook] échec écriture Firestore:', err);
          // On ne renvoie pas 500 ici : on a quand même envoyé les emails ci-dessous,
          // et un 500 ferait re-tenter Stripe en boucle.
        }
      } else {
        console.warn('[webhook] Firebase Admin non configuré — commande non persistée');
      }

      // Envoi des emails (best-effort, non bloquant en cas d'échec)
      await Promise.all([
        order.customer.email ? sendOrderConfirmation(order) : Promise.resolve(),
        sendAdminNewOrderAlert(order),
      ]);

      console.log(`[webhook] ✓ commande ${order.id} traitée (${order.customer.email})`);
      break;
    }

    case 'checkout.session.expired':
      console.log('[webhook] session expirée:', (event.data.object as Stripe.Checkout.Session).id);
      break;

    default:
      // On accuse réception des autres événements pour éviter les re-tentatives Stripe
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
