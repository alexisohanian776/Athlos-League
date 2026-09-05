/* Club profile fields. These were previously only available for RUNPAC via a
   hard-coded map, which meant a club leader could not edit their own bio. */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE run_clubs ADD COLUMN IF NOT EXISTS about text`;
await sql`ALTER TABLE run_clubs ADD COLUMN IF NOT EXISTS website text`;
await sql`ALTER TABLE run_clubs ADD COLUMN IF NOT EXISTS instagram text`;
await sql`ALTER TABLE run_clubs ADD COLUMN IF NOT EXISTS strava text`;
console.log('profile columns ready');
console.table(await sql`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'run_clubs' AND column_name IN ('about','website','instagram','strava')
  ORDER BY column_name
`);
