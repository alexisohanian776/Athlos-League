/* Fills the blank category on every live deal with one placeholder value.

   Categories are not decoration: conflictsFor() warns when another deal in
   the same category is at Terms or better, so these decide which exclusivity
   clashes surface. Values are taken from the vocabulary already in the table
   wherever one fits — a new label nobody else uses can never raise a flag.

   Usage:
     node --env-file=.env.local scripts/seed-categories.mjs [--apply]

   Only blanks are touched; the 13 categories already set are left alone.
*/
import { sql } from '../lib/db.js';

const GUESS = {
  'Abbott': 'Healthcare',
  'Aflac': 'Insurance',
  'Amazfit': 'Technology - Wearables',
  'Athletic Brewing': 'Beverage - Non-Alc',
  'C4': 'Beverage - Energy Drink',
  'CarMax': 'Auto',
  'Cash App': 'Financial - Payment',
  'Coach': 'Apparel - Luxury',
  'Delta': 'Airline - Commercial',
  'Dick’s Sporting Goods': 'Retail',
  'Dove': 'Skincare',
  'Essentia': 'Beverage - Water',
  'Fenty': 'Cosmetics',
  'Gainbridge': 'Insurance',
  'Gatorade': 'Beverage - Sports Drink',
  'Glossier': 'Cosmetics',
  'Instacart': 'E - Commerce',
  'LuluLemon': 'Apparel - Performance',
  "McDonald's": 'QSR',
  'Nike': 'Apparel - Performance',
  'Oofos': 'Apparel - Performance',
  'Oura Ring': 'Technology - Wearables',
  'Rodeo de las Aguas Tequila': 'Alcohol - Tequila',
  'Sephora': 'Retail',
  'Shark Ninja': 'Technology - Appliances',
  'Spectrum': 'Telecommunications',
  'State Farm': 'Insurance',
  'TCS': 'Business Consulting',
  'Target': 'Retail',
  'Telmont': 'Alcohol - Champagne',
  'Tiffany&Co.': 'Jewelry',
  'Toyota': 'Auto',
  'Upper Deck': 'Collectibles',
  'Wells Fargo': 'Financial Services',
  'eBay': 'E - Commerce',
};

const APPLY = process.argv.includes('--apply');

const blanks = await sql`
  SELECT id, company FROM deals
  WHERE stage IS NOT NULL AND (category IS NULL OR category = '') ORDER BY company
`;
const known = new Set((await sql`
  SELECT DISTINCT category FROM deals WHERE category IS NOT NULL AND category <> ''
`).map((r) => r.category));

const plan = blanks.map((d) => ({
  company: d.company,
  id: d.id,
  category: GUESS[d.company] || null,
  /* A brand-new label is worth knowing about: nothing else carries it, so it
     can never raise an exclusivity flag. */
  novel: GUESS[d.company] && !known.has(GUESS[d.company]) ? 'new label' : '',
}));

const missing = plan.filter((p) => !p.category);
console.table(plan);
if (missing.length) console.log('no guess for:', missing.map((m) => m.company).join(', '));

/* What these categories will actually cause the deal pages to say.

   This has to include the deals being categorised in this run, not just the
   ones that already had a category — six of them are at Closed Won, so they
   become blockers the moment this lands. Leaving them out understated the
   consequence to one warning when it is really seven. */
const live = await sql`
  SELECT id, company, category, stage FROM deals WHERE stage IS NOT NULL
`;
const after = live.map((d) => {
  const set = plan.find((p) => p.id === d.id);
  return { ...d, category: set?.category ?? d.category };
});
const warnings = [];
for (const d of after) {
  if (!d.category) continue;
  const against = after.filter((o) => o.id !== d.id && o.category === d.category
    && ['terms', 'won'].includes(o.stage) && o.company !== d.company);
  if (against.length) {
    warnings.push({
      on: `${d.company} (${d.stage})`,
      category: d.category,
      because: against.map((a) => `${a.company} (${a.stage})`).join(', '),
    });
  }
}
console.log('\nexclusivity warnings this will raise:');
console.table(warnings);

if (!APPLY) { console.log('\nDry run. Nothing changed. Re-run with --apply.'); process.exit(0); }

await sql`
  UPDATE deals d SET category = t.category, updated_at = now()
  FROM json_to_recordset(${JSON.stringify(plan.filter((p) => p.category))}::json)
    AS t(id int, category text)
  WHERE d.id = t.id
`;
console.log(`\nset ${plan.filter((p) => p.category).length} categories.`);
console.log('live deals still blank:', (await sql`
  SELECT count(*)::int AS n FROM deals WHERE stage IS NOT NULL AND (category IS NULL OR category = '')
`)[0].n);
