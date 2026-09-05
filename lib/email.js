/* Transactional email via Resend.

   Sending is best-effort on purpose: every caller also surfaces a copy-able
   link, so a missing key, an unverified domain or a Resend outage degrades
   to the manual flow that already worked rather than failing the action the
   person was actually taking. */
import { Resend } from 'resend';

const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || 'ATHLOS <no-reply@athlosleague.com>';
const REPLY_TO = process.env.EMAIL_REPLY_TO || undefined;

export const emailConfigured = () => Boolean(KEY);

async function send({ to, subject, heading, lines, cta, url, footer }) {
  if (!KEY) return { skipped: 'no RESEND_API_KEY' };

  try {
    const resend = new Resend(KEY);
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      replyTo: REPLY_TO,
      text: [heading, '', ...lines, '', url, '', footer].filter(Boolean).join('\n'),
      html: shell({ heading, lines, cta, url, footer }),
    });
    if (error) return { error: error.message || String(error) };
    return { id: data?.id };
  } catch (err) {
    return { error: err?.message || String(err) };
  }
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Inline styles and a table: every real mail client strips <style> blocks. */
function shell({ heading, lines, cta, url, footer }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F2F0EC;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F0EC;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E3DFD8;">
        <tr><td style="padding:28px 32px 0;">
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:13px;letter-spacing:.18em;font-weight:700;color:#0D040B;">ATHLOS</div>
        </td></tr>
        <tr><td style="padding:18px 32px 0;">
          <h1 style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:26px;line-height:1.15;color:#0D040B;">${esc(heading)}</h1>
        </td></tr>
        <tr><td style="padding:14px 32px 0;">
          ${lines.map((l) => `<p style="margin:0 0 12px;font-family:Georgia,serif;font-size:16px;line-height:1.55;color:#4A4048;">${esc(l)}</p>`).join('')}
        </td></tr>
        <tr><td style="padding:10px 32px 0;">
          <a href="${esc(url)}" style="display:inline-block;background:#0D040B;color:#F2F0EC;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 26px;border-radius:999px;">${esc(cta)}</a>
        </td></tr>
        <tr><td style="padding:18px 32px 0;">
          <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#8A8189;word-break:break-all;">Or paste this into your browser:<br>${esc(url)}</p>
        </td></tr>
        <tr><td style="padding:20px 32px 28px;">
          <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#8A8189;">${esc(footer)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function sendInviteEmail({ to, name, url, role }) {
  const who = name ? name.split(' ')[0] : 'there';
  return send({
    to,
    subject: 'Your ATHLOS admin account',
    heading: 'Set your password',
    lines: [
      `${who} — you have been given ${role === 'admin' ? 'an admin' : 'a run club leader'} account on athlosleague.com.`,
      'Choose a password and you are in. The link works once and expires in 14 days.',
    ],
    cta: 'Set your password',
    url,
    footer: 'If you were not expecting this, ignore it and nothing happens.',
  });
}

export function sendResetEmail({ to, name, url }) {
  const who = name ? name.split(' ')[0] : 'there';
  return send({
    to,
    subject: 'Reset your ATHLOS password',
    heading: 'Reset your password',
    lines: [
      `${who} — here is a link to set a new password for athlosleague.com.`,
      'It works once and expires in 14 days. Your current password keeps working until you use it.',
    ],
    cta: 'Set a new password',
    url,
    footer: 'If you did not ask for this, ignore it — your password will not change.',
  });
}
