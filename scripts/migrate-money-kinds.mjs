/* Splits deal money into cash, VIK and earned media.

   Usage:
     node --env-file=.env.local scripts/migrate-money-kinds.mjs

   Everything imported from the sheet was cash, so the backfill is a default
   rather than a guess. Safe to re-run. */
import { sql } from '../lib/db.js';
import { MONEY_KEYS } from '../lib/deals-db.js';

const bad = MONEY_KEYS.filter((k) => !/^[a-z][a-z0-9_]*$/.test(k));
if (bad.length) { console.error('Money kinds must be plain identifiers:', bad); process.exit(1); }

await sql`ALTER TABLE deal_years ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'cash'`;
/* What the value actually was. "$50k VIK" tells you nothing a year later;
   "free water, ~40 pallets" tells you whether to ask for it again. */
await sql`ALTER TABLE deal_years ADD COLUMN IF NOT EXISTS note text`;

/* A CHECK takes neither a parameter nor a subquery, so the keys go into the
   statement text — from our own constant, asserted above. */
await sql`ALTER TABLE deal_years DROP CONSTRAINT IF EXISTS deal_years_kind_chk`;
await sql.query(
  `ALTER TABLE deal_years ADD CONSTRAINT deal_years_kind_chk
   CHECK (kind IN (${MONEY_KEYS.map((k) => `'${k}'`).join(', ')}))`
);

/* The old key allowed one guaranteed and one optioned row per year. A year
   now holds up to six: three kinds, each guaranteed or optioned. */
await sql`ALTER TABLE deal_years DROP CONSTRAINT IF EXISTS deal_years_deal_id_year_guaranteed_key`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_years_deal_year_kind_key') THEN
      ALTER TABLE deal_years ADD CONSTRAINT deal_years_deal_year_kind_key
        UNIQUE (deal_id, year, kind, guaranteed);
    END IF;
  END $$;
`;

console.log('deal_years now carries a kind. Spread:');
console.table(await sql`
  SELECT kind, guaranteed, count(*)::int AS rows, sum(amount)::bigint AS total
  FROM deal_years GROUP BY kind, guaranteed ORDER BY kind, guaranteed DESC
`);
