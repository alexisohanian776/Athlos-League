/* Creates the editable-content tables and seeds them from the static files.
   Safe to re-run: DDL is IF NOT EXISTS and the seed only fills empty tables. */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS run_clubs (
    id          serial PRIMARY KEY,
    slug        text UNIQUE NOT NULL,
    name        text NOT NULL,
    type        text NOT NULL DEFAULT 'Official',
    city        text NOT NULL,
    code        text NOT NULL DEFAULT 'USA',
    region      text NOT NULL DEFAULT 'North America',
    hood        text,
    organizer   text,
    members     integer NOT NULL DEFAULT 0,
    next_run    text,
    tone        text NOT NULL DEFAULT 'ph-wine',
    map_x       numeric,
    map_y       numeric,
    founded     text,
    photo_url   text,
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
  )
`;
console.log('table run_clubs ready');

const [{ count }] = await sql`SELECT count(*)::int AS count FROM run_clubs`;
if (count > 0) {
  console.log(`run_clubs already has ${count} rows — seed skipped`);
} else {
  const { CLUBS } = await import('../lib/clubs.js');
  for (const [i, c] of CLUBS.entries()) {
    await sql`
      INSERT INTO run_clubs
        (slug, name, type, city, code, region, hood, organizer, members, next_run, tone, map_x, map_y, founded, sort_order)
      VALUES
        (${c.slug}, ${c.name}, ${c.type}, ${c.city}, ${c.code}, ${c.region}, ${c.hood},
         ${c.organizer}, ${c.members}, ${c.next}, ${c.tone}, ${c.mapX}, ${c.mapY}, ${c.founded}, ${i})
    `;
  }
  console.log(`seeded ${CLUBS.length} run clubs`);
}

const rows = await sql`SELECT slug, name, members, region FROM run_clubs ORDER BY sort_order`;
console.table(rows);
