/* People who helped get a deal done.

   Deliberately not deal_contacts with a new role: a contact is someone at
   the sponsor, and they carry a last-touched date that drives the nudge
   view and, later, Gmail address matching. An ally is on our side of the
   table — a mutual connection, an agent, someone who made an intro. Mixing
   them would put strangers into the nudge queue and into the mail matcher.

   Usage:
     node --env-file=.env.local scripts/migrate-allies.mjs
*/
import { sql } from '../lib/db.js';

await sql`
  CREATE TABLE IF NOT EXISTS deal_allies (
    id         serial PRIMARY KEY,
    deal_id    integer NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    name       text NOT NULL,
    user_id    integer REFERENCES users(id) ON DELETE SET NULL,
    who        text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (deal_id, name)
  )
`;
await sql`CREATE INDEX IF NOT EXISTS deal_allies_deal_idx ON deal_allies(deal_id)`;
/* Answering "what did Jane help with?" is the point of keeping the list. */
await sql`CREATE INDEX IF NOT EXISTS deal_allies_name_idx ON deal_allies(lower(name))`;

console.log('deal_allies ready.');
console.table(await sql`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'deal_allies' ORDER BY ordinal_position
`);
