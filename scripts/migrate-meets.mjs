/* Meets become real records so the league can edit what a ticket stub says,
   plus fan accounts and their attendance claims.
   Usage: node --env-file=.env.local scripts/migrate-meets.mjs */
import { sql } from '../lib/db.js';
import { PAST_MEETS } from '../lib/schedule.js';

/* ---- meets ---- */
await sql`
  CREATE TABLE IF NOT EXISTS meets (
    id         serial PRIMARY KEY,
    slug       text UNIQUE NOT NULL,
    name       text NOT NULL,
    year       text NOT NULL,
    held_on    date,
    venue      text,
    area       text,
    city       text,
    country    text,
    attendance integer,
    capacity   integer,
    events     integer,
    headline   text,
    facts      jsonb NOT NULL DEFAULT '[]'::jsonb,
    photo_url  text,
    tone       text NOT NULL DEFAULT 'ph-wine',
    published  boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )
`;

/* ---- fans ---- */
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS handle         text`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio            text`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token   text`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_handle_idx ON users(lower(handle)) WHERE handle IS NOT NULL`;

/* The role check predates fans. */
await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_chk`;
await sql`ALTER TABLE users ADD CONSTRAINT users_role_chk CHECK (role IN ('admin','leader','fan'))`;

/* Anyone who already had an account was created before fans existed, so
   their email is as verified as it is going to get. */
await sql`UPDATE users SET email_verified = true WHERE role IN ('admin','leader')`;

/* ---- attendance claims ---- */
await sql`
  CREATE TABLE IF NOT EXISTS attendances (
    id          serial PRIMARY KEY,
    user_id     integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meet_id     integer NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
    status      text NOT NULL DEFAULT 'pending',
    proof_url   text,
    note        text,
    reviewed_by integer REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, meet_id)
  )
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendances_status_chk') THEN
      ALTER TABLE attendances ADD CONSTRAINT attendances_status_chk
        CHECK (status IN ('pending','approved','rejected'));
    END IF;
  END $$;
`;
await sql`CREATE INDEX IF NOT EXISTS attendances_meet_idx ON attendances(meet_id)`;
await sql`CREATE INDEX IF NOT EXISTS attendances_status_idx ON attendances(status)`;

/* ---- seed the meets already shown on the site ---- */
const parseDate = (s) => new Date(`${s} UTC`).toISOString().slice(0, 10);

const SEED = [
  ...PAST_MEETS.map((m) => ({
    slug: m.slug,
    name: `ATHLOS New York ${m.year}`,
    year: m.year,
    held_on: parseDate(m.date),
    venue: m.venue,
    area: m.area,
    city: 'New York',
    country: 'USA',
    events: m.events,
    tone: m.tone,
  })),
  {
    slug: '2026-london',
    name: 'ATHLOS London 2026',
    year: '2026',
    held_on: '2026-09-18',
    venue: 'Stone X Stadium',
    area: 'Hendon, London',
    city: 'London',
    country: 'GBR',
    events: 7,
    tone: 'ph-field',
  },
];

for (const m of SEED) {
  await sql`
    INSERT INTO meets (slug, name, year, held_on, venue, area, city, country, events, tone)
    VALUES (${m.slug}, ${m.name}, ${m.year}, ${m.held_on}, ${m.venue}, ${m.area},
            ${m.city}, ${m.country}, ${m.events}, ${m.tone})
    ON CONFLICT (slug) DO NOTHING
  `;
}

console.table(await sql`
  SELECT id, slug, name, to_char(held_on,'YYYY-MM-DD') AS held_on, venue, attendance, published
  FROM meets ORDER BY held_on DESC`);
console.log('attendances table ready · users extended for fans');
