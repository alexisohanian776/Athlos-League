/* Sales pipeline: schema and the one-time import of both sheet tabs.

   SUPERSEDED. The HubSpot tab turned out not to be ATHLOS's pipeline, and
   this reader also threw away the sheet's inline "(VIK)" markers. The live
   shape comes from scripts/rebuild-pipeline.mjs. Kept as the way back to the
   raw import, and updated alongside the schema so it still runs.

   Two sources become one list. The HubSpot export (202 rows) is the spine;
   the "NEW ATHLOS BRAND TRACKER USE THIS" tab (~48 rows) enriches the deals
   it names with money, a contact and a sales lead.

   Usage:
     node --env-file=.env.local scripts/migrate-pipeline.mjs <hubspot.csv> <tracker.csv>

   Safe to re-run: the schema is IF NOT EXISTS, and the import refuses to run
   a second time rather than overwriting edits made in the admin. */
import { readFileSync } from 'node:fs';
import { sql } from '../lib/db.js';
import { STAGES } from '../lib/deals-db.js';

/* ---------- CSV ----------
   Hand-rolled rather than adding a dependency: deal names and notes contain
   commas and quotes, so a split(',') would shred them, but the whole of
   RFC 4180 that matters here is quotes, doubled quotes and CRLF. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/* ---------- mojibake ----------
   The sheet was written by Excel for Mac: UTF-8 bytes displayed as Mac Roman.
   `ū` is UTF-8 C5 AB, which Mac Roman renders "≈´" (Latin-1 would give "Å«"),
   so a Latin-1 repair produces garbage. Node decodes Mac Roman natively. */
const MAC = new TextDecoder('macintosh');
const CHAR_TO_BYTE = new Map();
for (let b = 0; b < 256; b++) CHAR_TO_BYTE.set(MAC.decode(new Uint8Array([b])), b);

const UTF8_STRICT = new TextDecoder('utf-8', { fatal: true });

function repair(s) {
  if (!s || !/[^\x00-\x7F]/.test(s)) return s;          // pure ASCII round-trips
  const bytes = [];
  for (const ch of s) {
    const b = CHAR_TO_BYTE.get(ch);
    if (b === undefined) return s;                       // not Mac Roman — leave alone
    bytes.push(b);
  }
  let out;
  try { out = UTF8_STRICT.decode(new Uint8Array(bytes)); } catch { return s; }
  /* Real mojibake always collapses 2-3 characters into 1. A legitimately
     typed ° or — never shortens, so this is the backstop against "repairing"
     text that was fine. */
  return out.length < s.length ? out : s;
}

const REPAIRS = [];
function clean(s, { collapse = true } = {}) {
  const before = String(s ?? '');
  const fixed = repair(before);
  if (fixed !== before) REPAIRS.push({ before, after: fixed });
  const trimmed = fixed.trim();
  return collapse ? trimmed.replace(/\s+/g, ' ') : trimmed;
}

/* "$350,000 " -> 350000 ; "" / "$0" -> null / 0 */
function money(s) {
  const t = String(s ?? '').replace(/[$,\s]/g, '');
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

/* "10/15/2025" -> "2025-10-15" */
function usDate(s) {
  const m = String(s ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/* Company names are matched across two sheets maintained by different people,
   so the key ignores punctuation, case, and the noise words that differ. */
function key(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\b(inc|llc|ltd|co|corp|company|the|platforms|brands|international)\b/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/* ---------- schema ---------- */
await sql`
  CREATE TABLE IF NOT EXISTS deals (
    id             serial PRIMARY KEY,
    company        text NOT NULL,
    stage          text NOT NULL,
    category       text,
    notes          text,
    status_note    text,
    next_steps     text,
    last_touchpoint date,
    in_discussions boolean NOT NULL DEFAULT false,
    owner_name     text,
    owner_id       integer REFERENCES users(id) ON DELETE SET NULL,
    escalated      boolean NOT NULL DEFAULT false,
    escalated_note text,
    escalated_at   timestamptz,
    hubspot_id     text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deals_stage_chk') THEN
      ALTER TABLE deals ADD CONSTRAINT deals_stage_chk
        CHECK (stage IN ('engaged','active','proposal','terms','won'));
    END IF;
  END $$;
`;
await sql`CREATE INDEX IF NOT EXISTS deals_stage_idx ON deals(stage)`;

/* Money is per year and split guaranteed vs optioned — the league's own
   vocabulary, from the seasons tab of the same workbook. */
await sql`
  CREATE TABLE IF NOT EXISTS deal_years (
    id         serial PRIMARY KEY,
    deal_id    integer NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    year       integer NOT NULL,
    amount     integer,
    guaranteed boolean NOT NULL DEFAULT false,
    UNIQUE (deal_id, year, guaranteed)
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS deal_contacts (
    id              serial PRIMARY KEY,
    deal_id         integer NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    name            text NOT NULL,
    email           text,
    title           text,
    role            text NOT NULL DEFAULT 'contact',
    last_touched_at timestamptz,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'deal_contacts_role_chk') THEN
      ALTER TABLE deal_contacts ADD CONSTRAINT deal_contacts_role_chk
        CHECK (role IN ('primary','alpha','contact'));
    END IF;
  END $$;
`;
/* At most one primary per deal; alpha is deliberately unconstrained, since a
   Nike may well have two people who bless a deal. */
await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS deal_contacts_primary_idx
  ON deal_contacts(deal_id) WHERE role = 'primary'
`;
await sql`CREATE INDEX IF NOT EXISTS deal_contacts_deal_idx ON deal_contacts(deal_id)`;

/* One row per changed field, not a JSON diff, so the notification query in a
   later phase is pure SQL. */
await sql`
  CREATE TABLE IF NOT EXISTS deal_events (
    id         serial PRIMARY KEY,
    deal_id    integer NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    user_id    integer REFERENCES users(id) ON DELETE SET NULL,
    who        text NOT NULL,
    kind       text NOT NULL,
    field      text,
    old_value  text,
    new_value  text,
    created_at timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS deal_events_deal_idx ON deal_events(deal_id, id DESC)`;
await sql`CREATE INDEX IF NOT EXISTS deal_events_id_idx ON deal_events(id DESC)`;

console.log('schema ready');

/* ---------- import ---------- */
const [, , hubspotPath, trackerPath] = process.argv;

const [{ n: existing }] = await sql`SELECT count(*)::int AS n FROM deals`;
if (existing > 0) {
  console.log(`\n${existing} deals already present — import skipped.`);
  console.log('Re-importing would overwrite edits made in the admin. Clear the table first if that is what you want.');
  process.exit(0);
}
if (!hubspotPath || !trackerPath) {
  console.error('\nUsage: node --env-file=.env.local scripts/migrate-pipeline.mjs <hubspot.csv> <tracker.csv>');
  process.exit(1);
}

/* --- the 202 --- */
const hubRows = parseCsv(readFileSync(hubspotPath, 'utf8'));
const hubHead = hubRows[0].map((h) => h.trim());
const col = (name) => {
  const i = hubHead.indexOf(name);
  if (i === -1) throw new Error(`HubSpot CSV is missing the "${name}" column`);
  return i;
};
const C = {
  id: col('Record ID'),
  name: col('Deal Name'),
  company: col('Associated Company (Primary)'),
  stage: col('Deal Stage'),
  category: col('Sponsor Category'),
  notes: col('ATHLOS NOTES'),
};

const STAGE_BY_LABEL = new Map([
  ['3. Engaged', 'engaged'],
  ['4. Active discussions', 'active'],
  ['5. Custom proposal', 'proposal'],
  ['6. Terms', 'terms'],
  ['9. Closed Won', 'won'],
]);

const deals = [];
for (let r = 1; r < hubRows.length; r++) {
  const row = hubRows[r];
  const name = clean(row[C.name]);
  const company = clean(row[C.company]);
  /* The tab carries a Stage/Count tally in two unnamed trailing columns;
     those rows have nothing in the real ones. */
  if (!name && !company) continue;

  const label = clean(row[C.stage]);
  const stage = STAGE_BY_LABEL.get(label);
  if (!stage) {
    console.error(`\nRow ${r + 1}: unrecognised stage ${JSON.stringify(label)} — nothing was written.`);
    console.error('Add it to STAGE_BY_LABEL if it is real. Guessing would mis-stage a live deal.');
    process.exit(1);
  }

  deals.push({
    hubspot_id: clean(row[C.id]) || null,
    name: name || company,
    company: company || name,
    stage,
    category: clean(row[C.category]).replace(/\s*-\s*/, ' - ') || null,
    notes: clean(row[C.notes], { collapse: false }) || null,
  });
}

/* One statement, not 202 round-trips. The Neon HTTP driver opens a fresh
   request per query, and a per-row loop timed out partway through against
   the live database. JSON in, rows out — one text parameter, no array
   serialisation to get wrong. */
await sql`
  INSERT INTO deals (company, stage, category, notes, hubspot_id)
  SELECT company, stage, category, notes, hubspot_id
  FROM json_to_recordset(${JSON.stringify(deals)}::json)
    AS t(company text, stage text, category text, notes text, hubspot_id text)
`;
await sql`INSERT INTO deal_events (deal_id, who, kind) SELECT id, 'CSV import', 'imported' FROM deals`;
console.log(`imported ${deals.length} deals from the HubSpot tab`);

/* --- enrich from the brand tracker --- */
const trkRows = parseCsv(readFileSync(trackerPath, 'utf8'));
const trkHead = trkRows[0].map((h) => h.trim());
const tcol = (name) => trkHead.findIndex((h) => h === name);
const T = {
  discussions: 0,
  entity: tcol('Entity'),
  contact: tcol('Primary Contact'),
  email: tcol('Email'),
  y2024: tcol('2024 Commitment'),
  y2025: tcol('2025 Commitment'),
  y2026p: tcol('2026 Potential'),
  y2026c: tcol('2026 Confirmed'),
  status: tcol('Status'),
  touch: tcol('Last Touchpoint'),
  next: tcol('Next Meeting/Steps'),
  lead: tcol('Sales Lead'),
};

/* Ids read back rather than taken from RETURNING, whose order Postgres does
   not promise. Indexed by normalised company, most advanced stage first, so
   a brand holding several deals is enriched on the one furthest along. */
const stored = await sql`SELECT id, company, stage FROM deals`;
const order = new Map(STAGES.map((s, i) => [s.key, i]));
const byKey = new Map();
for (const d of stored) {
  const k = key(d.company);
  if (!k) continue;
  const list = byKey.get(k) || [];
  list.push(d);
  byKey.set(k, list);
}
for (const list of byKey.values()) list.sort((a, b) => order.get(b.stage) - order.get(a.stage));

const users = await sql`SELECT id, first_name, last_name FROM users`;
const userByName = new Map();
for (const u of users) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(' ');
  if (full) userByName.set(key(full), u.id);
}

/* Pass one: resolve every tracker row to a deal, creating the ones that have
   no HubSpot counterpart, so pass two has an id for everything. */
const rowsFor = [];
const matched = [];
const created = [];
const ambiguous = [];

for (let r = 1; r < trkRows.length; r++) {
  const row = trkRows[r];
  const entity = clean(row[T.entity]);
  if (!entity) continue;

  const candidates = byKey.get(key(entity)) || [];
  if (candidates.length > 1) {
    ambiguous.push({
      entity,
      chose: `${candidates[0].company} (${candidates[0].stage})`,
      others: candidates.slice(1).map((c) => `${c.company} (${c.stage})`).join(' | '),
    });
  }
  if (candidates.length) matched.push(entity); else created.push(entity);
  rowsFor.push({ entity, row, deal: candidates[0] || null });
}

if (created.length) {
  await sql`
    INSERT INTO deals (company, stage)
    SELECT company, 'engaged'
    FROM json_to_recordset(${JSON.stringify(created.map((company) => ({ company })))}::json)
      AS t(company text)
  `;
  const fresh = await sql`
    SELECT d.id, d.company FROM deals d
    JOIN json_to_recordset(${JSON.stringify(created.map((company) => ({ company })))}::json)
      AS t(company text) ON t.company = d.company
    WHERE d.hubspot_id IS NULL
  `;
  const freshById = new Map(fresh.map((d) => [key(d.company), d.id]));
  for (const item of rowsFor) {
    if (!item.deal) item.deal = { id: freshById.get(key(item.entity)) };
  }
  /* Only the ones the first pass did not already log. */
  await sql`
    INSERT INTO deal_events (deal_id, who, kind)
    SELECT d.id, 'CSV import', 'imported' FROM deals d
    WHERE NOT EXISTS (SELECT 1 FROM deal_events e WHERE e.deal_id = d.id)
  `;
}

/* Pass two: three batched writes. */
const updates = [];
const years = [];
const contacts = [];

for (const { row, deal } of rowsFor) {
  if (!deal?.id) continue;
  const leadName = clean(row[T.lead]) || null;
  updates.push({
    id: deal.id,
    status_note: clean(row[T.status]) || null,
    next_steps: clean(row[T.next], { collapse: false }) || null,
    last_touchpoint: usDate(row[T.touch]),
    in_discussions: clean(row[T.discussions]).toUpperCase() === 'X',
    owner_name: leadName,
    owner_id: leadName ? userByName.get(key(leadName)) ?? null : null,
  });

  for (const [year, idx, guaranteed] of [
    [2024, T.y2024, true],
    [2025, T.y2025, true],
    [2026, T.y2026c, true],
    [2026, T.y2026p, false],
  ]) {
    const amount = money(row[idx]);
    if (amount === null) continue;
    years.push({ deal_id: deal.id, year, amount, guaranteed });
  }

  const contact = clean(row[T.contact]);
  if (contact) {
    contacts.push({
      deal_id: deal.id,
      name: contact,
      email: clean(row[T.email]) || null,
      role: 'primary',
    });
  }
}

await sql`
  UPDATE deals d SET
    status_note     = t.status_note,
    next_steps      = t.next_steps,
    last_touchpoint = t.last_touchpoint,
    in_discussions  = t.in_discussions,
    owner_name      = t.owner_name,
    owner_id        = t.owner_id,
    updated_at      = now()
  FROM json_to_recordset(${JSON.stringify(updates)}::json)
    AS t(id int, status_note text, next_steps text, last_touchpoint date,
         in_discussions boolean, owner_name text, owner_id int)
  WHERE d.id = t.id
`;

if (years.length) {
  await sql`
    INSERT INTO deal_years (deal_id, year, amount, guaranteed)
    SELECT deal_id, year, amount, guaranteed
    FROM json_to_recordset(${JSON.stringify(years)}::json)
      AS t(deal_id int, year int, amount int, guaranteed boolean)
    ON CONFLICT (deal_id, year, guaranteed) DO UPDATE SET amount = EXCLUDED.amount
  `;
}

if (contacts.length) {
  await sql`
    INSERT INTO deal_contacts (deal_id, name, email, role)
    SELECT deal_id, name, email, role
    FROM json_to_recordset(${JSON.stringify(contacts)}::json)
      AS t(deal_id int, name text, email text, role text)
  `;
}

/* ---------- report ---------- */
console.log(`\nbrand tracker: ${matched.length} matched an existing deal, ${created.length} created new`);
if (created.length) console.log('  created:', created.join(', '));

if (REPAIRS.length) {
  console.log('\nmojibake repaired:');
  console.table([...new Map(REPAIRS.map((x) => [x.before, x])).values()]);
} else {
  console.log('\nno mojibake found');
}

if (ambiguous.length) {
  console.log('\nbrand tracker rows that matched more than one deal — enriched the most advanced, check these:');
  console.table(ambiguous);
}

const dupCompanies = await sql`
  SELECT company, count(*)::int AS deals, string_agg(stage, ', ') AS stages
  FROM deals GROUP BY company HAVING count(*) > 1 ORDER BY count(*) DESC, company
`;
if (dupCompanies.length) {
  console.log('\ncompanies with more than one deal — renewals are expected, true duplicates are not:');
  console.table(dupCompanies);
}

const dupIds = await sql`
  SELECT hubspot_id, count(*)::int AS n, string_agg(company, ' | ') AS deals
  FROM deals WHERE hubspot_id IS NOT NULL
  GROUP BY hubspot_id HAVING count(*) > 1 ORDER BY count(*) DESC
`;
if (dupIds.length) {
  console.log('\nRecord IDs used by more than one deal (provenance only, never a key):');
  console.table(dupIds.slice(0, 10));
}

console.log('\nstage counts — must read 101 / 32 / 39 / 24 / 6:');
console.table(await sql`
  SELECT stage, count(*)::int AS n FROM deals GROUP BY stage ORDER BY count(*) DESC
`);
console.log('totals:', (await sql`
  SELECT (SELECT count(*)::int FROM deals) AS deals,
         (SELECT count(*)::int FROM deal_years) AS money_rows,
         (SELECT count(*)::int FROM deal_contacts) AS contacts
`)[0]);
