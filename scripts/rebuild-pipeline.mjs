/* Re-bases the pipeline on the brand tracker.

   The HubSpot export turned out not to be ATHLOS's pipeline at all, so its
   202 rows go back to being companies nobody has approached: stage
   'prospect', and every field implying a live relationship cleared. Their
   names and categories stay, because a cold list is still worth having.

   The ~48 entities on "NEW ATHLOS BRAND TRACKER USE THIS" are the real book.
   They get stages derived from the sheet, and their money re-read with the
   VIK markers the first import silently dropped.

   Usage:
     node --env-file=.env.local scripts/rebuild-pipeline.mjs ./tracker.csv [--apply]

   Prints the full plan and changes nothing without --apply. */
import { readFileSync } from 'node:fs';
import { sql } from '../lib/db.js';

const [, , trackerPath, ...flags] = process.argv;
const APPLY = flags.includes('--apply');
if (!trackerPath) { console.error('Usage: rebuild-pipeline.mjs <tracker.csv> [--apply]'); process.exit(1); }

function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const key = (n) => String(n ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, '')
  .replace(/\b(inc|llc|ltd|co|corp|company|the|platforms|brands|international)\b/g, '')
  .replace(/\s+/g, '');

/* The sheet writes value-in-kind straight into the money columns: a bare
   "VIK", or "$100,000 (VIK)". The first import ran parseInt over both — it
   kept Toyota's number as cash and dropped the bare ones entirely. */
function readMoney(raw) {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  const isVik = /\bVIK\b/i.test(t);
  /* What is left after removing the VIK marker has to look like a figure and
     nothing else. Digit-scraping would read AG1's "Pitched $3m proposal,
     seem warm" — which sits in a money column — as three dollars. */
  const rest = t.replace(/\(?\s*VIK\s*\)?/ig, '').trim();
  if (!/^\$?\s*[\d,]+(\.\d+)?$/.test(rest)) {
    return isVik && !rest ? { amount: null, kind: 'vik' } : null;
  }
  return { amount: Number.parseInt(rest.replace(/[^0-9]/g, ''), 10), kind: isVik ? 'vik' : 'cash' };
}

const rows = parseCsv(readFileSync(trackerPath, 'utf8'));
const head = rows[0].map((h) => h.trim());
const col = (n) => head.indexOf(n);
const T = {
  disc: 0, entity: col('Entity'), status: col('Status'),
  y2024: col('2024 Commitment'), y2025: col('2025 Commitment'),
  pot2026: col('2026 Potential'), conf2026: col('2026 Confirmed'),
};

/* Stage from the sheet, in priority order. Money on the books outranks
   everything: you cannot be "in discussions" with a sponsor who has already
   paid. Anything with no signal at all stays at Engaged — these are the
   companies the team is actively working, so none of them is a cold name. */
function stageFor({ status, committed, potentialText, inDiscussions }) {
  if (/\bpassed\b|\bno\b\s*$/i.test(status)) return { stage: 'lost', why: `status says "${status}"` };
  if (committed) return { stage: 'won', why: 'has committed money' };
  if (/proposal|pitched/i.test(`${status} ${potentialText}`)) return { stage: 'proposal', why: 'a proposal is out' };
  if (inDiscussions) return { stage: 'active', why: 'flagged already in discussions' };
  return { stage: 'engaged', why: 'on the worked list, no further signal' };
}

const plan = [];
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  const entity = String(row[T.entity] ?? '').trim();
  if (!entity) continue;
  const money = [
    { year: 2024, ...(readMoney(row[T.y2024]) || {}), guaranteed: true,  raw: row[T.y2024] },
    { year: 2025, ...(readMoney(row[T.y2025]) || {}), guaranteed: true,  raw: row[T.y2025] },
    { year: 2026, ...(readMoney(row[T.conf2026]) || {}), guaranteed: true,  raw: row[T.conf2026] },
    { year: 2026, ...(readMoney(row[T.pot2026]) || {}), guaranteed: false, raw: row[T.pot2026] },
  ].filter((m) => m.kind);
  const committed = money.some((m) => m.guaranteed);
  const status = String(row[T.status] ?? '').trim();
  const potentialText = String(row[T.pot2026] ?? '').trim();
  plan.push({
    entity,
    k: key(entity),
    ...stageFor({ status, committed, potentialText, inDiscussions: String(row[T.disc] ?? '').trim().toUpperCase() === 'X' }),
    money,
    /* AG1's proposal note sits in the 2026 Potential column, not Status. */
    status: status || (/[a-z]/i.test(potentialText) && !/\d/.test(potentialText.replace(/[^0-9]/g, '')) ? potentialText : ''),
  });
}

const trackerKeys = new Set(plan.map((p) => p.k));
const all = await sql`SELECT id, company, stage, hubspot_id FROM deals ORDER BY id`;
const byKey = new Map();
for (const d of all) {
  const list = byKey.get(key(d.company)) || [];
  list.push(d); byKey.set(key(d.company), list);
}
/* Where a brand holds several rows, the tracker-created one wins — it is the
   ATHLOS deal. Anything else is another pipeline's row for the same company
   and goes back in the cold list with the rest. */
const chosen = new Map();
for (const k of trackerKeys) {
  const list = byKey.get(k) || [];
  if (list.length) chosen.set(k, list.find((d) => !d.hubspot_id) || list[0]);
}
const keep = new Set([...chosen.values()].map((d) => d.id));
const strangers = all.filter((d) => !keep.has(d.id));
const shadowed = all.filter((d) => !keep.has(d.id) && trackerKeys.has(key(d.company)));

console.log(`\n${all.length} deals total`);
console.log(`  ${strangers.length} are not the ATHLOS deal for their brand -> reset to 'prospect'`);
if (shadowed.length) {
  console.log('    of which duplicates of a tracker brand:',
    shadowed.map((d) => `${d.company}#${d.id}`).join(', '));
}
console.log(`  ${plan.length} tracker rows -> staged from the sheet\n`);
console.table(plan.map((p) => ({
  entity: p.entity,
  stage: p.stage,
  why: p.why,
  money: p.money.map((m) => `${m.year} ${m.kind}${m.amount === null ? ' (no $)' : ' $' + m.amount.toLocaleString('en-US')}${m.guaranteed ? '' : ' opt'}`).join(', ') || '—',
})));

const tally = plan.reduce((a, p) => ({ ...a, [p.stage]: (a[p.stage] || 0) + 1 }), {});
console.log('tracker stage tally:', tally);
const missing = plan.filter((p) => !byKey.has(p.k));
if (missing.length) console.log('tracker entities with no deal row:', missing.map((m) => m.entity).join(', '));

if (!APPLY) { console.log('\nDry run. Nothing was changed. Re-run with --apply.'); process.exit(0); }

/* --- reset the strangers --- */
await sql`
  UPDATE deals SET stage = 'prospect', status_note = NULL, next_steps = NULL,
                   last_touchpoint = NULL, owner_name = NULL, owner_id = NULL,
                   in_discussions = false, escalated = false, escalated_note = NULL,
                   escalated_at = NULL, parent_deal_id = NULL, updated_at = now()
  WHERE id IN (SELECT (value->>'id')::int FROM json_array_elements(${JSON.stringify(strangers.map((d) => ({ id: d.id })))}::json))
`;
await sql`
  DELETE FROM deal_years WHERE deal_id IN (
    SELECT (value->>'id')::int FROM json_array_elements(${JSON.stringify(strangers.map((d) => ({ id: d.id })))}::json))
`;

/* --- stage and re-money the tracker entities --- */
for (const p of plan) {
  const deal = chosen.get(p.k);
  if (!deal) continue;
  await sql`
    UPDATE deals SET stage = ${p.stage},
                     status_note = ${p.status || null},
                     updated_at = now()
    WHERE id = ${deal.id}
  `;
  await sql`DELETE FROM deal_years WHERE deal_id = ${deal.id}`;
  for (const m of p.money) {
    await sql`
      INSERT INTO deal_years (deal_id, year, amount, kind, guaranteed)
      VALUES (${deal.id}, ${m.year}, ${m.amount}, ${m.kind}, ${m.guaranteed})
      ON CONFLICT (deal_id, year, kind, guaranteed) DO UPDATE SET amount = EXCLUDED.amount
    `;
  }
}

console.log('\napplied.');
console.table(await sql`SELECT stage, count(*)::int AS deals FROM deals GROUP BY stage ORDER BY count(*) DESC`);
