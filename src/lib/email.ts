// Envoi d'emails via Resend.
// Si RESEND_API_KEY n'est pas configuré, les fonctions sont no-op
// et loguent juste un warning — le site reste fonctionnel.

import { Resend } from 'resend';
import type { Order } from '~/lib/orders';

const apiKey = import.meta.env.RESEND_API_KEY;
const fromEmail = import.meta.env.RESEND_FROM_EMAIL || 'Nayab Market <onboarding@resend.dev>';
const adminEmail = import.meta.env.ADMIN_NOTIFICATION_EMAIL;
const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';

export const emailReady = Boolean(apiKey);

const resend = apiKey ? new Resend(apiKey) : null;

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function formatPrice(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function shortRef(id: string): string {
  return id.slice(-12).toUpperCase();
}

function baseLayout(content: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Nayab Market</title>
</head>
<body style="margin:0;padding:0;background:#fbf7ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0d1f3f;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fbf7ef;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6d2a4;">
        <tr><td style="background:#142e5d;padding:24px;text-align:center;">
          <div style="font-family:Georgia,serif;color:#ffc445;font-size:28px;font-weight:bold;letter-spacing:3px;">✦ NAYAB MARKET</div>
          <div style="color:#f3ead4;font-size:13px;margin-top:6px;">4 place de la Chapelle, Paris</div>
        </td></tr>
        <tr><td style="padding:32px 32px 24px;">${content}</td></tr>
        <tr><td style="background:#fbf7ef;padding:20px 32px;text-align:center;font-size:12px;color:#624a1c;border-top:1px solid #e6d2a4;">
          <p style="margin:0 0 4px;">Nayab Market — 4 place de la Chapelle, 75018 Paris</p>
          <p style="margin:0;">Une question ? Réponds à ce mail.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function itemsTable(order: Order): string {
  const rows = order.items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3ead4;">
          <div style="font-weight:600;color:#0d1f3f;">${escapeHtml(i.name)}</div>
          <div style="color:#624a1c;font-size:13px;">Quantité : ${i.qty}</div>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f3ead4;text-align:right;font-weight:600;color:#751515;">
          ${formatPrice(i.unitAmount * i.qty, i.currency)}
        </td>
      </tr>`,
    )
    .join('');

  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    ${rows}
    <tr><td style="padding:14px 0 6px;color:#624a1c;">Sous-total</td><td style="padding:14px 0 6px;text-align:right;">${formatPrice(order.amounts.subtotal, order.amounts.currency)}</td></tr>
    <tr><td style="padding:4px 0;color:#624a1c;">Livraison</td><td style="padding:4px 0;text-align:right;">${formatPrice(order.amounts.shipping, order.amounts.currency)}</td></tr>
    <tr><td style="padding:12px 0;font-weight:bold;font-size:18px;color:#0d1f3f;border-top:2px solid #142e5d;">Total</td>
      <td style="padding:12px 0;text-align:right;font-weight:bold;font-size:20px;color:#751515;border-top:2px solid #142e5d;">${formatPrice(order.amounts.total, order.amounts.currency)}</td></tr>
  </table>`;
}

function addressBlock(order: Order): string {
  const a = order.shipping.address;
  const lines = [
    order.shipping.name,
    a.line1,
    a.line2,
    [a.postalCode, a.city].filter(Boolean).join(' '),
    a.country,
  ].filter(Boolean);
  return lines.map((l) => escapeHtml(l!)).join('<br>');
}

// ============ ORDER CONFIRMATION (customer) ============

export async function sendOrderConfirmation(order: Order): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY manquant — order confirmation non envoyée');
    return;
  }

  const trackingUrl = `${siteUrl}/commande/${order.id}`;
  const html = baseLayout(`
    <h1 style="font-family:Georgia,serif;color:#0d1f3f;font-size:24px;margin:0 0 8px;">Merci pour votre commande !</h1>
    <p style="color:#624a1c;margin:0 0 24px;">Référence : <strong>#${shortRef(order.id)}</strong></p>
    <p style="color:#0d1f3f;line-height:1.6;">Bonjour${order.customer.name ? ' ' + escapeHtml(order.customer.name) : ''},</p>
    <p style="color:#0d1f3f;line-height:1.6;">Nous avons bien reçu votre commande et le paiement a été confirmé. Vous trouverez ci-dessous le récapitulatif. Nous préparons votre colis avec soin.</p>
    <h2 style="font-family:Georgia,serif;color:#0d1f3f;font-size:18px;margin:28px 0 6px;border-bottom:2px solid #ffc445;padding-bottom:6px;">Articles commandés</h2>
    ${itemsTable(order)}
    <h2 style="font-family:Georgia,serif;color:#0d1f3f;font-size:18px;margin:28px 0 12px;border-bottom:2px solid #ffc445;padding-bottom:6px;">Livraison</h2>
    <p style="color:#0d1f3f;line-height:1.6;margin:0 0 16px;">${addressBlock(order)}</p>
    ${order.shipping.method ? `<p style="color:#624a1c;margin:0 0 24px;">Mode : <strong>${escapeHtml(order.shipping.method)}</strong></p>` : ''}
    <div style="text-align:center;margin:32px 0 8px;">
      <a href="${trackingUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#ffc445,#f5ab1c);color:#142e5d;text-decoration:none;border-radius:50px;font-weight:600;">Suivre ma commande</a>
    </div>
    <p style="color:#624a1c;font-size:13px;line-height:1.6;margin:20px 0 0;text-align:center;">À très vite chez Nayab Market.</p>
  `);

  try {
    await resend.emails.send({
      from: fromEmail,
      to: order.customer.email,
      subject: `Commande #${shortRef(order.id)} confirmée — Nayab Market`,
      html,
    });
  } catch (err) {
    console.error('[email] sendOrderConfirmation failed:', err);
  }
}

// ============ NEW ORDER ALERT (admin) ============

export async function sendAdminNewOrderAlert(order: Order): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY manquant — alerte admin non envoyée');
    return;
  }
  if (!adminEmail) {
    console.warn('[email] ADMIN_NOTIFICATION_EMAIL manquant — alerte admin non envoyée');
    return;
  }

  const adminUrl = `${siteUrl}/admin/commandes`;
  const html = baseLayout(`
    <h1 style="font-family:Georgia,serif;color:#0d1f3f;font-size:22px;margin:0 0 8px;">🔔 Nouvelle commande</h1>
    <p style="color:#624a1c;margin:0 0 20px;">#${shortRef(order.id)} · ${formatPrice(order.amounts.total, order.amounts.currency)}</p>
    <p style="color:#0d1f3f;line-height:1.6;"><strong>Client :</strong> ${escapeHtml(order.customer.email)}${order.customer.name ? ' — ' + escapeHtml(order.customer.name) : ''}</p>
    <p style="color:#0d1f3f;line-height:1.6;"><strong>Articles :</strong> ${order.items.reduce((s, i) => s + i.qty, 0)} pièces</p>
    ${itemsTable(order)}
    <p style="color:#0d1f3f;line-height:1.6;"><strong>Adresse :</strong><br>${addressBlock(order)}</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${adminUrl}" style="display:inline-block;padding:12px 24px;background:#142e5d;color:#ffc445;text-decoration:none;border-radius:50px;font-weight:600;">Ouvrir l'admin</a>
    </div>
  `);

  try {
    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: `Nouvelle commande #${shortRef(order.id)} — ${formatPrice(order.amounts.total, order.amounts.currency)}`,
      html,
    });
  } catch (err) {
    console.error('[email] sendAdminNewOrderAlert failed:', err);
  }
}

// ============ PROCESSING NOTIFICATION (customer) ============

export async function sendProcessingNotification(order: Order): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY manquant — notification "en préparation" non envoyée');
    return;
  }
  const trackingUrl = `${siteUrl}/commande/${order.id}`;
  const html = baseLayout(`
    <h1 style="font-family:Georgia,serif;color:#0d1f3f;font-size:24px;margin:0 0 8px;">👨‍🍳 Votre commande est en préparation</h1>
    <p style="color:#624a1c;margin:0 0 24px;">Référence : <strong>#${shortRef(order.id)}</strong></p>
    <p style="color:#0d1f3f;line-height:1.6;">Nous préparons soigneusement votre commande. Vous recevrez un nouvel email dès qu'elle aura été expédiée, avec le numéro de suivi.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${trackingUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#ffc445,#f5ab1c);color:#142e5d;text-decoration:none;border-radius:50px;font-weight:600;">Voir ma commande</a>
    </div>
    <p style="color:#624a1c;font-size:13px;line-height:1.6;text-align:center;">Merci pour votre confiance.</p>
  `);
  try {
    await resend.emails.send({
      from: fromEmail,
      to: order.customer.email,
      subject: `Commande #${shortRef(order.id)} en préparation — Nayab Market`,
      html,
    });
  } catch (err) {
    console.error('[email] sendProcessingNotification failed:', err);
  }
}

// ============ DELIVERY CONFIRMATION (customer) ============

export async function sendDeliveryConfirmation(order: Order): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY manquant — confirmation de livraison non envoyée');
    return;
  }
  const trackingUrl = `${siteUrl}/commande/${order.id}`;
  const html = baseLayout(`
    <h1 style="font-family:Georgia,serif;color:#0d1f3f;font-size:24px;margin:0 0 8px;">🎉 Votre commande est arrivée !</h1>
    <p style="color:#624a1c;margin:0 0 24px;">Référence : <strong>#${shortRef(order.id)}</strong></p>
    <p style="color:#0d1f3f;line-height:1.6;">On espère que vous prendrez autant de plaisir à déguster nos produits que nous en avons eu à les sélectionner pour vous.</p>
    <p style="color:#0d1f3f;line-height:1.6;">Une question sur un produit ? Une recette à partager ? Répondez simplement à ce mail, on est toujours ravis d'échanger.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${siteUrl}/boutique" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#ffc445,#f5ab1c);color:#142e5d;text-decoration:none;border-radius:50px;font-weight:600;">Découvrir d'autres produits</a>
    </div>
    <p style="color:#624a1c;font-size:13px;line-height:1.6;text-align:center;">Merci d'avoir choisi Nayab Market — à très vite.</p>
  `);
  try {
    await resend.emails.send({
      from: fromEmail,
      to: order.customer.email,
      subject: `Commande #${shortRef(order.id)} livrée — Nayab Market`,
      html,
    });
  } catch (err) {
    console.error('[email] sendDeliveryConfirmation failed:', err);
  }
}

// ============ SHIPPING NOTIFICATION (customer) ============

export async function sendShippingNotification(order: Order): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY manquant — notification d\'expédition non envoyée');
    return;
  }

  const trackingUrl = `${siteUrl}/commande/${order.id}`;
  const trackingBlock = order.shipping.trackingNumber
    ? `<p style="color:#0d1f3f;line-height:1.6;text-align:center;font-size:15px;">
        Numéro de suivi : <strong>${escapeHtml(order.shipping.trackingNumber)}</strong>
        ${order.shipping.trackingUrl ? `<br><a href="${escapeHtml(order.shipping.trackingUrl)}" style="color:#751515;">Suivre le colis →</a>` : ''}
      </p>`
    : '';

  const html = baseLayout(`
    <h1 style="font-family:Georgia,serif;color:#0d1f3f;font-size:24px;margin:0 0 8px;">📦 Votre commande est en route</h1>
    <p style="color:#624a1c;margin:0 0 24px;">Référence : <strong>#${shortRef(order.id)}</strong></p>
    <p style="color:#0d1f3f;line-height:1.6;">Bonne nouvelle ! Votre commande a quitté nos rayons et est en cours d'acheminement.</p>
    ${trackingBlock}
    <div style="text-align:center;margin:32px 0;">
      <a href="${trackingUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#ffc445,#f5ab1c);color:#142e5d;text-decoration:none;border-radius:50px;font-weight:600;">Voir ma commande</a>
    </div>
    <p style="color:#624a1c;font-size:13px;line-height:1.6;text-align:center;">À bientôt chez Nayab Market.</p>
  `);

  try {
    await resend.emails.send({
      from: fromEmail,
      to: order.customer.email,
      subject: `Commande #${shortRef(order.id)} expédiée — Nayab Market`,
      html,
    });
  } catch (err) {
    console.error('[email] sendShippingNotification failed:', err);
  }
}
