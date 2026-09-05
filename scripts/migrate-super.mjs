/* Super admin + the usage log behind the metrics page.
   `is_super` is a flag rather than a third role, so the existing
   admin/leader permission checks keep working untouched.
   Usage: node --env-file=.env.local scripts/migrate-super.mjs [email] */
import { sql } from '../lib/db.js';

const OWNER = (process.argv[2] || 'a@sevensevensix.com').toLowerCase();

await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super  boolean NOT NULL DEFAULT false`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled  boolean NOT NULL DEFAULT false`;

/* One row per successful sign-in. Deliberately not a general event table:
   this is the only usage signal the app can honestly report today. */
await sql`
  CREATE TABLE IF NOT EXISTS login_events (
    id      serial PRIMARY KEY,
    user_id integer REFERENCES users(id) ON DELETE CASCADE,
    at      timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS login_events_at_idx ON login_events(at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS login_events_user_idx ON login_events(user_id)`;

const rows = await sql`
  UPDATE users SET is_super = true, role = 'admin', updated_at = now()
  WHERE email = ${OWNER} RETURNING id, email, role, is_super
`;
if (!rows.length) {
  console.error(`No user with email ${OWNER} — nothing granted.`);
  process.exit(1);
}

/* Seed the log with what we already know, so the metrics page is not empty
   on day one. Marked by the existing last_login_at, one row each. */
await sql`
  INSERT INTO login_events (user_id, at)
  SELECT id, last_login_at FROM users
  WHERE last_login_at IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM login_events e WHERE e.user_id = users.id AND e.at = users.last_login_at)
`;

console.log(`super admin: ${rows[0].email}`);
console.table(await sql`
  SELECT id, email, role, is_super, disabled,
         password_hash IS NOT NULL AS has_password
  FROM users ORDER BY id`);
console.log('login_events rows:', (await sql`SELECT count(*)::int AS n FROM login_events`)[0].n);
