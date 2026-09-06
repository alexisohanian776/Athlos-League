/* Delivery and engagement log for outbound mail.
   Usage: node --env-file=.env.local scripts/migrate-email-events.mjs */
import { sql } from '../lib/db.js';

await sql`
  CREATE TABLE IF NOT EXISTS email_events (
    id         serial PRIMARY KEY,
    resend_id  text,
    recipient  text,
    kind       text NOT NULL,
    subject    text,
    meta       jsonb NOT NULL DEFAULT '{}'::jsonb,
    at         timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS email_events_kind_idx ON email_events(kind)`;
await sql`CREATE INDEX IF NOT EXISTS email_events_at_idx ON email_events(at DESC)`;

/* One row per message per event type. Resend retries webhooks, and a person
   opening the same mail twice is one opener, not two — the unique index makes
   both of those idempotent so the rate can't drift above 100%. */
await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS email_events_unique_idx
  ON email_events(resend_id, kind) WHERE resend_id IS NOT NULL
`;

console.log('email_events ready');
console.table(await sql`
  SELECT kind, count(*)::int AS n FROM email_events GROUP BY kind ORDER BY kind`);
