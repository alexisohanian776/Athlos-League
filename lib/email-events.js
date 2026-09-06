/* Delivery and engagement for outbound mail.

   Rates are only ever computed against messages we actually sent, so a
   webhook we never received cannot inflate them. */
import { sql } from './db.js';

export async function recordEmailEvent({ resendId, recipient, kind, subject, meta }) {
  await sql`
    INSERT INTO email_events (resend_id, recipient, kind, subject, meta)
    VALUES (${resendId || null}, ${recipient || null}, ${kind},
            ${subject || null}, ${JSON.stringify(meta || {})}::jsonb)
    ON CONFLICT (resend_id, kind) WHERE resend_id IS NOT NULL DO NOTHING
  `;
}

export async function emailStats() {
  const [totals] = await sql`
    SELECT
      count(DISTINCT resend_id) FILTER (WHERE kind = 'sent')::int       AS sent,
      count(DISTINCT resend_id) FILTER (WHERE kind = 'delivered')::int  AS delivered,
      count(DISTINCT resend_id) FILTER (WHERE kind = 'opened')::int     AS opened,
      count(DISTINCT resend_id) FILTER (WHERE kind = 'clicked')::int    AS clicked,
      count(DISTINCT resend_id) FILTER (WHERE kind = 'bounced')::int    AS bounced,
      count(DISTINCT resend_id) FILTER (WHERE kind = 'complained')::int AS complained
    FROM email_events
  `;

  /* Per message, so a bounce and an open on the same send line up. */
  const recent = await sql`
    SELECT s.resend_id, s.recipient, s.subject,
           to_char(s.at, 'YYYY-MM-DD HH24:MI') AS sent_at,
           EXISTS (SELECT 1 FROM email_events e WHERE e.resend_id = s.resend_id AND e.kind = 'delivered')  AS delivered,
           EXISTS (SELECT 1 FROM email_events e WHERE e.resend_id = s.resend_id AND e.kind = 'opened')     AS opened,
           EXISTS (SELECT 1 FROM email_events e WHERE e.resend_id = s.resend_id AND e.kind = 'clicked')    AS clicked,
           EXISTS (SELECT 1 FROM email_events e WHERE e.resend_id = s.resend_id AND e.kind = 'bounced')    AS bounced
    FROM email_events s
    WHERE s.kind = 'sent'
    ORDER BY s.at DESC
    LIMIT 40
  `;

  /* We write the 'sent' rows ourselves; everything else only exists if the
     webhook is wired up. Until one arrives, a rate is unknown — reporting it
     as 0% would read as "nobody opened it", which is a different claim. */
  const receiving =
    totals.delivered + totals.opened + totals.clicked + totals.bounced + totals.complained > 0;

  const pct = (n, d) => (receiving && d > 0 ? Math.round((n / d) * 100) : null);
  return {
    totals,
    receiving,
    openRate: pct(totals.opened, totals.delivered || totals.sent),
    clickRate: pct(totals.clicked, totals.delivered || totals.sent),
    bounceRate: pct(totals.bounced, totals.sent),
    recent,
  };
}

/* True only if this app wrote a `sent` row for that message. Resend webhooks
   are account-wide, so this is what keeps another product's mail — and its
   recipients — out of ATHLOS's metrics. */
export async function isOurs(resendId) {
  const rows = await sql`
    SELECT 1 FROM email_events WHERE resend_id = ${resendId} AND kind = 'sent' LIMIT 1`;
  return rows.length > 0;
}
