/* Removes the renewal chain.

   Zero deals ever used it. With one deal per brand and money kept per year,
   a renewal is another year on the same deal, not a second deal pointing at
   the first — so the column had nothing to point at and the "Renewal of"
   select rendered empty on every deal page.

   Usage:
     node --env-file=.env.local scripts/drop-renewal-chain.mjs
*/
import { sql } from '../lib/db.js';

const [{ n }] = await sql`SELECT count(*)::int AS n FROM deals WHERE parent_deal_id IS NOT NULL`;
if (n > 0) {
  console.error(`${n} deals still point at a parent — dropping the column would lose that. Nothing changed.`);
  process.exit(1);
}

await sql`ALTER TABLE deals DROP COLUMN IF EXISTS parent_deal_id`;
console.log('deals.parent_deal_id dropped.');
console.table(await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'deals' ORDER BY ordinal_position
`);
