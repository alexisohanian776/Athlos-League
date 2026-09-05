/* Removes the five sample clubs that came from the design's placeholder data
   (invented organizers, invented member counts) so the directory and its stats
   describe only clubs that actually exist. */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const sql = neon(process.env.DATABASE_URL);

const PLACEHOLDERS = [
  'runpac',
  'athlos-run-club-nyc',
  'athlos-run-club-brooklyn',
  'athlos-run-club-la',
  'athlos-run-club-london',
];

console.log('before:');
console.table(await sql`SELECT slug, type, city, members FROM run_clubs ORDER BY sort_order`);

/* Any leader account bound to a removed club is unbound, not deleted. */
const orphaned = await sql`
  UPDATE users SET club_id = NULL, updated_at = now()
  WHERE club_id IN (SELECT id FROM run_clubs WHERE slug = ANY(${PLACEHOLDERS}))
  RETURNING email
`;
if (orphaned.length) console.log('unbound leader accounts:', orphaned.map((r) => r.email).join(', '));

const gone = await sql`DELETE FROM run_clubs WHERE slug = ANY(${PLACEHOLDERS}) RETURNING slug`;
console.log(`\nremoved ${gone.length}:`, gone.map((r) => r.slug).join(', '));

console.log('\nafter:');
console.table(await sql`SELECT slug, type, city, members, founded FROM run_clubs ORDER BY sort_order`);
const [stats] = await sql`
  SELECT count(*)::int AS clubs, count(DISTINCT region)::int AS regions,
         COALESCE(sum(members), 0)::int AS runners FROM run_clubs
`;
console.log('stats now:', JSON.stringify(stats));
