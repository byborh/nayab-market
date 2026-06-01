import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

const apiKey = import.meta.env.RESEND_API_KEY;
const fromEmail = import.meta.env.RESEND_FROM_EMAIL || 'Nayab Market <onboarding@resend.dev>';
const adminEmail = import.meta.env.ADMIN_NOTIFICATION_EMAIL;

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export const POST: APIRoute = async ({ request }) => {
  if (!apiKey || !adminEmail) {
    return new Response(
      JSON.stringify({ error: 'Service email non configuré côté serveur.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let body: { name?: string; email?: string; subject?: string; message?: string; honeypot?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON invalide' }), { status: 400 });
  }

  // Honeypot anti-bots : si rempli, on simule un succès silencieux
  if (body.honeypot) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const name = (body.name || '').trim().slice(0, 100);
  const email = (body.email || '').trim().slice(0, 200);
  const subject = (body.subject || '').trim().slice(0, 200);
  const message = (body.message || '').trim().slice(0, 5000);

  if (!name || !email || !message) {
    return new Response(JSON.stringify({ error: 'Nom, email et message sont requis.' }), { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Email invalide.' }), { status: 400 });
  }

  const resend = new Resend(apiKey);
  const html = `
    <div style="font-family:-apple-system,sans-serif;color:#0d1f3f;max-width:600px;">
      <h2 style="color:#751515;border-bottom:2px solid #ffc445;padding-bottom:8px;">Nouveau message — Nayab Market</h2>
      <p><strong>De :</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
      ${subject ? `<p><strong>Sujet :</strong> ${escapeHtml(subject)}</p>` : ''}
      <div style="margin-top:16px;padding:16px;background:#fbf7ef;border-left:3px solid #ffc445;white-space:pre-wrap;">${escapeHtml(message)}</div>
    </div>`;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      replyTo: email,
      subject: subject ? `[Contact] ${subject}` : `[Contact] Message de ${name}`,
      html,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur envoi' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
