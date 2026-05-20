import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { getProducts } from '~/lib/products';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return new Response(
      JSON.stringify({ error: 'Stripe non configuré. Ajoute STRIPE_SECRET_KEY dans .env' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const stripe = new Stripe(secret, { apiVersion: '2024-12-18.acacia' });

  let body: { items?: Array<{ id: string; qty: number }> };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON invalide' }), { status: 400 });
  }

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return new Response(JSON.stringify({ error: 'Panier vide' }), { status: 400 });
  }

  const allProducts = await getProducts();
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const it of body.items) {
    const product = allProducts.find((p) => p.id === it.id);
    if (!product) continue;
    const qty = Math.max(1, Math.min(99, Math.floor(Number(it.qty) || 1)));

    // Stripe n'accepte pas les data:image base64 (limité à 2048 chars, HTTPS uniquement).
    // On envoie l'image SEULEMENT si c'est une vraie URL publique.
    const stripeImage =
      product.image && /^https?:\/\//.test(product.image) && product.image.length <= 2048
        ? [product.image]
        : undefined;

    line_items.push({
      quantity: qty,
      price_data: {
        currency: product.currency,
        unit_amount: product.priceCents,
        product_data: {
          name: product.name,
          description: `${product.shortDescription} — ${product.unit}`,
          images: stripeImage,
          metadata: { productId: product.id, slug: product.slug },
        },
      },
    });
  }

  if (line_items.length === 0) {
    return new Response(JSON.stringify({ error: 'Aucun produit valide' }), { status: 400 });
  }

  const siteUrl = import.meta.env.PUBLIC_SITE_URL || new URL(request.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      shipping_address_collection: {
        allowed_countries: ['FR', 'BE', 'LU', 'DE', 'CH', 'ES', 'IT', 'NL'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 590, currency: 'eur' },
            display_name: 'Standard — 3 à 5 jours',
          },
        },
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 990, currency: 'eur' },
            display_name: 'Express — 1 à 2 jours',
          },
        },
      ],
      success_url: `${siteUrl}/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/panier`,
      locale: 'fr',
    });

    return new Response(JSON.stringify({ url: session.url, id: session.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur Stripe inconnue';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
