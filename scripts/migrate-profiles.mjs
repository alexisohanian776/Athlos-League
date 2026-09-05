/* Adds the self-service profile fields: a split name and an avatar.
   `name` stays as the display name the rest of the app already reads, kept
   in sync from the two halves. Usage:
     node --env-file=.env.local scripts/migrate-profiles.mjs */
import { sql } from '../lib/db.js';

await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name text`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name  text`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS title      text`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text`;

/* Backfill from the single `name` column: everything before the last space
   is the first name, so "Mary Anne Smith" splits to "Mary Anne" + "Smith". */
const rows = await sql`
  SELECT id, name FROM users
  WHERE name IS NOT NULL AND name <> '' AND first_name IS NULL AND last_name IS NULL
`;
for (const r of rows) {
  const parts = String(r.name).trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop() : '';
  await sql`UPDATE users SET first_name = ${parts.join(' ')}, last_name = ${last} WHERE id = ${r.id}`;
}
console.log(`columns ready · ${rows.length} name(s) split`);
console.table(await sql`SELECT id, email, first_name, last_name, title, role FROM users ORDER BY id`);
