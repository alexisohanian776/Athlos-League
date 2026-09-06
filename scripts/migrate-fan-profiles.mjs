/* Fan profile fields: where they run from, their socials, and the five
   league athletes they follow.
   Usage: node --env-file=.env.local scripts/migrate-fan-profiles.mjs */
import { sql } from '../lib/db.js';

await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS city       text`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram  text`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS strava     text`;
/* Slugs, in the order the fan ranked them. */
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS favourites jsonb NOT NULL DEFAULT '[]'::jsonb`;

console.log('fan profile columns ready');
console.table(await sql`
  SELECT id, email, handle, city, instagram, strava, favourites, club_id
  FROM users ORDER BY id LIMIT 5`);
