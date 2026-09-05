/* Users, invites and club ownership. Safe to re-run. */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS users (
    id             serial PRIMARY KEY,
    email          text UNIQUE NOT NULL,
    name           text,
    role           text NOT NULL DEFAULT 'leader',
    password_hash  text,
    club_id        integer REFERENCES run_clubs(id) ON DELETE SET NULL,
    invite_token   text UNIQUE,
    invite_expires timestamptz,
    last_login_at  timestamptz,
    failed_logins  integer NOT NULL DEFAULT 0,
    locked_until   timestamptz,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS users_club_idx ON users(club_id)`;
/* role is either admin (sees everything) or leader (one club) */
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_chk') THEN
      ALTER TABLE users ADD CONSTRAINT users_role_chk CHECK (role IN ('admin','leader'));
    END IF;
  END $$
`;
console.log('table users ready');

/* Seed the owner as admin, without a password yet — they set it via invite. */
const email = 'a@sevensevensix.com';
const existing = await sql`SELECT id, role, password_hash IS NOT NULL AS has_pw FROM users WHERE email = ${email}`;
if (existing.length) {
  await sql`UPDATE users SET role = 'admin', updated_at = now() WHERE email = ${email}`;
  console.log(`${email} already present — ensured role=admin (password set: ${existing[0].has_pw})`);
} else {
  await sql`INSERT INTO users (email, name, role) VALUES (${email}, 'Alexis Ohanian', 'admin')`;
  console.log(`seeded ${email} as admin (no password yet)`);
}

console.table(await sql`SELECT id, email, role, club_id, password_hash IS NOT NULL AS has_password FROM users ORDER BY id`);
