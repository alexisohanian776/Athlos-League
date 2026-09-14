/* Widens the deals stage constraint to take the closed stages — Lost,
   Ghosted and Paused — alongside the five funnel stages.

   Usage:
     node --env-file=.env.local scripts/migrate-deal-stages.mjs

   Safe to re-run: it rebuilds the constraint from the current STAGE_KEYS
   every time, so adding a stage later is the same one-line change in
   lib/deals-db.js followed by running this again. */
import { sql } from '../lib/db.js';
import { STAGE_KEYS, CLOSED_KEYS, ALL_STAGES } from '../lib/deals-db.js';

/* Any row already outside the new set would make ADD CONSTRAINT fail after
   the DROP, leaving the table with no stage check at all. Look first. */
const stray = await sql`
  SELECT stage, count(*)::int AS n FROM deals
  WHERE stage NOT IN (SELECT json_array_elements_text(${JSON.stringify(STAGE_KEYS)}::json))
  GROUP BY stage
`;
if (stray.length) {
  console.error('\nRows hold stages the new constraint would reject — nothing was changed:');
  console.table(stray);
  process.exit(1);
}

/* A CHECK constraint takes neither a parameter nor a subquery — it has to
   be a literal list, so this is the one place the keys are written into SQL
   text. They come from our own constant, never from a request, and the
   shape is asserted anyway rather than assumed. */
const bad = STAGE_KEYS.filter((k) => !/^[a-z][a-z0-9_]*$/.test(k));
if (bad.length) {
  console.error('Stage keys must be plain lowercase identifiers:', bad);
  process.exit(1);
}
const list = STAGE_KEYS.map((k) => `'${k}'`).join(', ');

await sql`ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_stage_chk`;
await sql.query(
  `ALTER TABLE deals ADD CONSTRAINT deals_stage_chk CHECK (stage IN (${list}))`
);

console.log('stage constraint now accepts:', STAGE_KEYS.join(', '));
console.log('of which closed:', CLOSED_KEYS.join(', '));
console.log('\ncurrent spread:');
console.table(await sql`
  SELECT stage, count(*)::int AS deals FROM deals GROUP BY stage ORDER BY count(*) DESC
`);
console.log('labels:', ALL_STAGES.map((s) => `${s.key}=${s.label}`).join('  '));
