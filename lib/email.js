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

/* Inline styles and a table: every real mail client strips <style> blocks.
   Colours are the ATHLOS tokens — dark plum, bone, hyper red — and the
   wordmark is the real PNG served from the site, so it stays correct if the
   brand mark is ever updated. Remote images are blocked by default in a lot
   of clients, so the alt text has to read as the brand on its own. */
const BRAND = {
  plum: '#0D040B',
  plumDeep: '#1F0219',
  red: '#FF0044',
  bone: '#F2F0EC',
  stone: '#E4E2DF',
  gray: '#93989A',
  white: '#FFFFFF',
};

const SITE = process.env.EMAIL_ASSET_ORIGIN || 'https://athlosleague.com';

function shell({ heading, lines, cta, url, footer }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${BRAND.bone};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bone};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${BRAND.white};border:1px solid ${BRAND.stone};">

        <tr><td style="background:${BRAND.plum};padding:22px 32px;">
          <img src="${SITE}/assets/athlos-wordmark-light.png" alt="ATHLOS" width="132" height="24"
               style="display:block;width:132px;height:24px;border:0;outline:none;text-decoration:none;" />
        </td></tr>
        <tr><td style="background:${BRAND.red};height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>

        <tr><td style="padding:30px 32px 0;">
          <h1 style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:27px;line-height:1.12;letter-spacing:-0.01em;color:${BRAND.plum};">${esc(heading)}</h1>
        </td></tr>
        <tr><td style="padding:14px 32px 0;">
          ${lines.map((l) => `<p style="margin:0 0 12px;font-family:Georgia,serif;font-size:16px;line-height:1.55;color:#4A4048;">${esc(l)}</p>`).join('')}
        </td></tr>

        <tr><td style="padding:14px 32px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="background:${BRAND.red};border-radius:999px;">
              <a href="${esc(url)}" style="display:inline-block;padding:15px 30px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${BRAND.white};text-decoration:none;">${esc(cta)}</a>
            </td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:20px 32px 0;">
          <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.gray};word-break:break-all;">Or paste this into your browser:<br>${esc(url)}</p>
        </td></tr>
        <tr><td style="padding:18px 32px 26px;">
          <p style="margin:0;border-top:1px solid ${BRAND.stone};padding-top:16px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.gray};">${esc(footer)}</p>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding:14px 4px 0;">
          <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${BRAND.gray};">The fastest women on earth</p>
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

export function sendVerifyEmail({ to, name, url }) {
  const who = name ? name.split(' ')[0] : 'there';
  return send({
    to,
    subject: 'Confirm your ATHLOS account',
    heading: 'Confirm your email',
    lines: [
      `${who} — one tap and your ATHLOS account is confirmed.`,
      'You need this before the league can verify you attended a meet.',
    ],
    cta: 'Confirm my email',
    url,
    footer: 'If you did not create an ATHLOS account, ignore this.',
  });
}
