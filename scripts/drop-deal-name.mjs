/* Removes the deal name.

   It carried nothing: of 48 live deals, 41 had a name identical to the
   company and the other 7 held the other pipeline's labels — "Athleta - New
   Deal", "Google - Gemni", "Gruns - 2024 - Aspen 1". No brand holds more
   than one live deal, so there is nothing for a name to distinguish. With
   one deal per brand and money kept per year, a renewal is another year
   rather than another deal.

   Usage:
     node --env-file=.env.local scripts/drop-deal-name.mjs [--apply]
*/
import { sql } from '../lib/db.js';

const APPLY = process.argv.includes('--apply');

/* The name was carrying the readable spelling for a few brands. Once it is
   gone the company is the only label, so fix those first. Spellings are the
   brand tracker's own. */
const RENAMES = [
  ['CELSIUS', 'Celsius'],
  ['OLIPOP', 'Olipop'],
  ['Meta Platforms,', 'Meta'],
  ['EbAY', 'eBay'],
  ['Mcdonalds', "McDonald's"],
];

/* Some cold companies hold two rows, distinguished only by the other
   pipeline's deal names. Without a name they render as identical rows, and
   one row per company is what a cold list wants anyway.

   The match is on a normalised company, not the exact string, so it also
   catches a cold row shadowing a real ATHLOS deal — Google had one, and so
   did Grüns against Gruns. */
const key = (n) => String(n ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9 ]/g, '')
  .replace(/\b(inc|llc|ltd|co|corp|company|the|platforms|brands|international)\b/g, '')
  .replace(/\s+/g, '');

const everything = await sql`SELECT id, company, stage FROM deals ORDER BY id`;
const seen = new Map();
const drop = [];
for (const d of everything.filter((x) => x.stage)) seen.set(key(d.company), d.id);
for (const d of everything.filter((x) => !x.stage)) {
  const k = key(d.company);
  if (seen.has(k)) drop.push(d); else seen.set(k, d.id);
}
const dupes = drop.map((d) => ({ id: d.id, company: d.company }));

console.log('renames:'); console.table(RENAMES.map(([from, to]) => ({ from, to })));
console.log('cold rows collapsing away:'); console.table(dupes);

if (!APPLY) { console.log('\nDry run. Nothing changed. Re-run with --apply.'); process.exit(0); }

for (const [from, to] of RENAMES) {
  await sql`UPDATE deals SET company = ${to} WHERE company = ${from}`;
}

if (drop.length) {
  await sql`
    DELETE FROM deals WHERE id IN (
      SELECT (value->>'id')::int FROM json_array_elements(${JSON.stringify(dupes)}::json))
  `;
}
console.log(`\ncollapsed ${drop.length} duplicate cold rows`);

await sql`ALTER TABLE deals DROP COLUMN IF EXISTS name`;
console.log('deals.name dropped.');
console.table(await sql`
  SELECT COALESCE(stage, '(no stage)') AS stage, count(*)::int AS deals
  FROM deals GROUP BY stage ORDER BY count(*) DESC
`);
