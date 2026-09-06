import { NextResponse } from 'next/server';
import { isOurs, recordEmailEvent } from '@/lib/email-events';

/* Resend posts delivery and engagement events here.

   The payload is signed with Svix. Verification is done by hand with Web
   Crypto rather than pulling in the svix package — it is one HMAC — and an
   unverified body is rejected, because this endpoint is public and anyone
   could otherwise POST fabricated opens. */
export const dynamic = 'force-dynamic';

/* email.sent is deliberately absent: we write that row ourselves when we
   send. Resend webhooks are account-wide, so accepting it here would log
   every message the whole account sends — including other products sharing
   this Resend account — into ATHLOS's metrics. */
const KINDS = {
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.delivery_delayed': 'delayed',
};

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verify(secret, { id, timestamp, signature, body }) {
  /* Svix secrets arrive as "whsec_<base64>"; the raw bytes are the key. */
  const raw = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  /* The header carries a space-separated list of "v1,<sig>" — any match is valid. */
  return String(signature)
    .split(' ')
    .map((part) => part.split(',')[1])
    .some((sig) => sig && timingSafeEqual(sig, expected));
}

export async function POST(request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const body = await request.text();

  if (!secret) {
    /* Fail closed: without a secret nothing can be verified, so nothing is
       recorded — better an empty chart than fabricated numbers. */
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 503 });
  }

  const id = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: 'Unsigned.' }, { status: 400 });
  }

  /* Reject anything older than five minutes so a captured request can't be
     replayed later. */
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) {
    return NextResponse.json({ error: 'Stale timestamp.' }, { status: 400 });
  }

  let ok = false;
  try {
    ok = await verify(secret, { id, timestamp, signature, body });
  } catch {
    ok = false;
  }
  if (!ok) return NextResponse.json({ error: 'Bad signature.' }, { status: 401 });

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Bad JSON.' }, { status: 400 });
  }

  const kind = KINDS[event?.type];
  if (!kind) return NextResponse.json({ ok: true, ignored: event?.type });

  const data = event.data || {};
  const resendId = data.email_id || data.id;

  /* Only events for mail this app actually sent. The account is shared, so
     without this the panel fills up with other products' recipients. */
  if (!resendId || !(await isOurs(resendId))) {
    return NextResponse.json({ ok: true, ignored: 'not ours' });
  }

  await recordEmailEvent({
    resendId,
    recipient: Array.isArray(data.to) ? data.to[0] : data.to,
    kind,
    subject: data.subject,
    meta: kind === 'clicked' ? { link: data.click?.link } : {},
  });

  return NextResponse.json({ ok: true });
}
