import type { APIRoute } from 'astro';
import Stripe from 'stripe';

export const prerender = false;

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
    // Cloudflare Workers requires the async variant
    event = await stripe.webhooks.constructEventAsync(payload, sig, whSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature invalide';
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      // TODO: enregistrer la commande dans Firestore, envoyer un email de confirmation, etc.
      console.log('✓ Commande confirmée:', {
        id: session.id,
        email: session.customer_details?.email,
        amount: session.amount_total,
        currency: session.currency,
      });
      break;
    }
    case 'checkout.session.expired':
      console.log('Session de paiement expirée:', event.data.object);
      break;
    default:
      // Ignorer les autres événements
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
