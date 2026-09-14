/* Lets a deal have no stage at all, and blanks the 189 cold companies.

   A stage claims someone has placed the company somewhere. For a name
   nobody has looked at, blank is the honest value — any label we invented
   would say more than we know.

   Usage:
     node --env-file=.env.local scripts/migrate-blank-stage.mjs
*/
import { sql } from '../lib/db.js';
import { STAGE_KEYS } from '../lib/deals-db.js';

await sql`ALTER TABLE deals ALTER COLUMN stage DROP NOT NULL`;

/* Drop, blank, then re-add. 'prospect' is no longer an allowed value, so
   adding the new constraint while rows still hold it fails and leaves the
   table with no stage check at all. */
await sql`ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_stage_chk`;

const cleared = await sql`UPDATE deals SET stage = NULL WHERE stage = 'prospect' RETURNING id`;
console.log(`blanked ${cleared.length} deals that were parked at 'prospect'`);

const stray = await sql`
  SELECT stage, count(*)::int AS n FROM deals
  WHERE stage IS NOT NULL
    AND stage NOT IN (SELECT json_array_elements_text(${JSON.stringify(STAGE_KEYS)}::json))
  GROUP BY stage
`;
if (stray.length) {
  console.error('Rows still hold stages the constraint would reject — re-adding it anyway would fail:');
  console.table(stray);
  process.exit(1);
}

/* A CHECK passes when its expression is NULL, so a nullable stage needs no
   special case — but spell it out rather than relying on that. */
await sql.query(
  `ALTER TABLE deals ADD CONSTRAINT deals_stage_chk
   CHECK (stage IS NULL OR stage IN (${STAGE_KEYS.map((k) => `'${k}'`).join(', ')}))`
);

console.table(await sql`
  SELECT COALESCE(stage, '(no stage)') AS stage, count(*)::int AS deals
  FROM deals GROUP BY stage ORDER BY count(*) DESC
`);
