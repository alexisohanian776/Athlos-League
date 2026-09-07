/* Replaces the free-form facts blob with real columns, carrying the values
   already typed into it across. Meet records are not a column — they are
   counted from the results.
   Usage: node --env-file=.env.local scripts/migrate-meet-facts.mjs */
import { sql } from '../lib/db.js';

await sql`ALTER TABLE meets ADD COLUMN IF NOT EXISTS weather     text`;
await sql`ALTER TABLE meets ADD COLUMN IF NOT EXISTS prize_purse text`;

/* Anything already written as "Weather: 62°F, clear" or "Prize purse: $663,000"
   moves into its own column rather than being retyped. */
/* Already applied, and the column it reads has since been dropped — so on a
   database that never had it there is simply nothing to carry over. */
const [{ exists }] = await sql`
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meets' AND column_name = 'facts'
  ) AS exists
`;
const rows = exists
  ? await sql`SELECT id, slug, facts FROM meets WHERE jsonb_array_length(facts) > 0`
  : [];
if (!exists) console.log('no facts column — nothing to migrate');
for (const r of rows) {
  const find = (label) => (r.facts || [])
    .find((f) => String(f.label || '').toLowerCase().replace(/\s+/g, '') === label)?.value || null;

  const weather = find('weather');
  const purse = find('prizepurse') || find('purse');
  await sql`
    UPDATE meets SET
      weather = COALESCE(weather, ${weather}),
      prize_purse = COALESCE(prize_purse, ${purse})
    WHERE id = ${r.id}
  `;
  console.log(`${r.slug}: weather=${weather ?? '—'} purse=${purse ?? '—'}`);
}

console.table(await sql`SELECT slug, weather, prize_purse, events FROM meets ORDER BY held_on DESC`);
