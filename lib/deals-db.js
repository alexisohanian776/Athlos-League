/* Brand partnerships — the sales pipeline.

   ATHLOS deals are multi-year and multi-person: a sponsor has a day-to-day
   contact, often an "alpha" in the C-suite who blesses the whole thing, and
   money that lands across several seasons. That shape is why money lives in
   deal_years rather than a column, and people in deal_contacts rather than a
   name field. */
import { sql } from './db.js';
import { parseMoney } from './money.js';

/* Stage slugs, order and labels in one place — imported by the pages, the
   actions and the import script, so a rename happens once. The HubSpot
   labels ('3. Engaged', '6. Terms ' with its trailing space) are export
   residue and are deliberately not what we store.

   Two lists, not one, because Lost and Ghosted are outcomes rather than
   steps. Appending them to the funnel would count dead deals as money in
   play, stop the stage counts summing to the live pipeline, and fill the
   default list with corpses. */
export const STAGES = [
  { key: 'engaged',  label: 'Engaged' },
  { key: 'active',   label: 'Active convos' },
  { key: 'proposal', label: 'Custom proposal' },
  { key: 'terms',    label: 'Terms' },
  { key: 'won',      label: 'Closed Won' },
];

/* Ghosted and Paused are deliberately separate: ghosted is them going quiet
   on us, which is a nudge problem; paused is a mutual "not this season",
   which is a calendar problem. Collapsing them loses which deals to chase. */
export const CLOSED_STAGES = [
  { key: 'lost',    label: 'Lost',    hint: 'They said no, or went elsewhere.' },
  { key: 'ghosted', label: 'Ghosted', hint: 'They went quiet and stopped replying.' },
  { key: 'paused',  label: 'Paused',  hint: 'Agreed to revisit — not this season.' },
];

export const ALL_STAGES = [...STAGES, ...CLOSED_STAGES];

/* A deal can also have no stage at all. That is the honest state for a
   company nobody has looked at yet — a blank says "we have decided nothing
   here", where any label we invented would claim more than we know. */
export const NO_STAGE = { key: 'none', label: 'No stage', hint: 'Nobody has worked this one yet.' };
export const STAGE_KEYS = ALL_STAGES.map((s) => s.key);
export const CLOSED_KEYS = CLOSED_STAGES.map((s) => s.key);
export const isClosedStage = (key) => CLOSED_KEYS.includes(key);
/* What the live book leaves out: the closed stages, and no stage. */
export const isAsideStage = (key) => !key || CLOSED_KEYS.includes(key);
export const stageLabel = (key) => (key ? ALL_STAGES.find((s) => s.key === key)?.label || key : '');

/* Ranked worst to best for sorting: the closed stages sit below the funnel,
   so "stage, descending" reads Closed Won first and Lost last. */
const RANKED_JSON = [...CLOSED_KEYS].reverse()
  .concat(STAGE_KEYS.filter((k) => !isAsideStage(k)));
export const stageRank = (key) => RANKED_JSON.indexOf(key);

/* What the money is. Every deal has cash and that is the number that leads,
   but a sponsorship is often part product and part placement — Toyota's 2025
   was entirely VIK, and Essentia's was cash plus free water plus shelf ads.
   Folding those into one figure loses the shape of the deal. */
export const MONEY_KINDS = [
  { key: 'cash',  label: 'Cash',         short: 'Cash',  hint: 'Money that actually moves.' },
  { key: 'vik',   label: 'VIK',          short: 'VIK',   hint: 'Value in kind — product or services instead of cash.' },
  { key: 'media', label: 'Earned media', short: 'Media', hint: 'Placement and coverage, carried at its dollar value.' },
];
export const MONEY_KEYS = MONEY_KINDS.map((k) => k.key);
export const moneyKindLabel = (key) => MONEY_KINDS.find((k) => k.key === key)?.short || key;

const toDeal = (r) => r && ({
  id: r.id,
  company: r.company,
  stage: r.stage,
  stageLabel: stageLabel(r.stage),
  hasStage: Boolean(r.stage),
  category: r.category || '',
  notes: r.notes || '',
  statusNote: r.status_note || '',
  nextSteps: r.next_steps || '',
  lastTouchpoint: r.touch_ymd ?? null,    // 'YYYY-MM-DD' — never a local Date
  inDiscussions: r.in_discussions,
  ownerName: r.owner_name || '',
  ownerId: r.owner_id,
  escalated: r.escalated,
  escalatedNote: r.escalated_note || '',
  escalatedAt: r.escalated_at,
  hubspotId: r.hubspot_id,
  updatedAt: r.updated_at,
  contactCount: r.contact_count ?? undefined,
  guaranteed: r.guaranteed ?? undefined,
  optioned: r.optioned ?? undefined,
  cash: r.cash ?? undefined,
  vik: r.vik ?? undefined,
  media: r.media ?? undefined,
});

const toContact = (r) => ({
  id: r.id,
  dealId: r.deal_id,
  name: r.name,
  email: r.email || '',
  title: r.title || '',
  role: r.role,
  lastTouchedAt: r.last_touched_at,
  notes: r.notes || '',
});

const toYear = (r) => ({
  id: r.id,
  dealId: r.deal_id,
  year: r.year,
  amount: r.amount,
  kind: r.kind,
  kindLabel: moneyKindLabel(r.kind),
  note: r.note || '',
  guaranteed: r.guaranteed,
});

const toEvent = (r) => ({
  id: r.id,
  dealId: r.deal_id,
  company: r.company,
  who: r.who,
  kind: r.kind,
  field: r.field,
  oldValue: r.old_value,
  newValue: r.new_value,
  createdAt: r.created_at,
});

/* ILIKE treats % and _ as wildcards, so a typed '%' would match everything.
   Backslash first, or it would escape the escapes. */
const like = (q) => `%${String(q).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/* Columns the list can sort by. Exported so the header links and the query
   read from one allow-list — a hand-typed ?sort= can never reach the SQL. */
export const SORTS = [
  { key: 'deal',    label: 'Deal',    kind: 'text', default: 'asc' },
  { key: 'stage',   label: 'Stage',   kind: 'num',  default: 'desc' },
  { key: 'lead',    label: 'Lead',    kind: 'text', default: 'asc' },
  { key: 'money',   label: 'Money',   kind: 'num',  default: 'desc' },
  { key: 'touched', label: 'Touched', kind: 'num',  default: 'desc' },
];

/* One template with self-neutralising parameters rather than a complete
   query per filter combination — there are four independent filters and five
   sort columns, which is dozens of near-identical blocks the other way.
   Nothing is concatenated; the ::text casts are what let Postgres infer each
   comparison.

   The ordering sits outside the select so it can name `guaranteed` and
   `optioned`: Postgres allows an output alias as a whole ORDER BY term but
   not inside an expression, and these need to go inside a CASE. */
export async function listDeals({
  stage = 'all', q = '', owner = 'all', category = 'all', escalated = false, year,
  sort = '', dir = '',
} = {}) {
  const search = String(q || '').trim();
  const by = SORTS.some((c) => c.key === sort) ? sort : '';
  const direction = dir === 'asc' || dir === 'desc' ? dir : '';
  const rows = await sql`
    SELECT * FROM (
      SELECT d.*,
             to_char(d.last_touchpoint, 'YYYY-MM-DD') AS touch_ymd,
             (SELECT count(*)::int FROM deal_contacts c WHERE c.deal_id = d.id) AS contact_count,
             /* Totals run across all three kinds: a VIK-only deal showing
                $0 in the list would be a lie. The split rides alongside so
                the row can say what the money is made of. */
             COALESCE(m.guaranteed, 0) AS guaranteed,
             COALESCE(m.optioned, 0) AS optioned,
             COALESCE(m.cash, 0) AS cash,
             COALESCE(m.vik, 0) AS vik,
             COALESCE(m.media, 0) AS media,
             (SELECT ord FROM json_array_elements_text(${JSON.stringify(RANKED_JSON)}::json)
                WITH ORDINALITY AS r(value, ord) WHERE r.value = d.stage) AS stage_rank
      FROM deals d
      LEFT JOIN LATERAL (
        SELECT sum(amount) FILTER (WHERE guaranteed)::int      AS guaranteed,
               sum(amount) FILTER (WHERE NOT guaranteed)::int  AS optioned,
               sum(amount) FILTER (WHERE kind = 'cash')::int   AS cash,
               sum(amount) FILTER (WHERE kind = 'vik')::int    AS vik,
               sum(amount) FILTER (WHERE kind = 'media')::int  AS media
        FROM deal_years y
        WHERE y.deal_id = d.id AND (${year ?? null}::int IS NULL OR y.year = ${year ?? null})
      ) m ON true
      WHERE (
          /* The closed list is passed as a parameter rather than written as
             a SQL literal, so it cannot drift from CLOSED_STAGES. */
          /* 'all' means all — prospects, closed, everything. 'live' is the
             funnel-only view and is opt-in, because a view labelled all that
             quietly hides 189 rows is a lie. */
          ${stage}::text = 'all'
          OR (${stage}::text = 'live'
            AND d.stage IS NOT NULL
            AND d.stage NOT IN (SELECT json_array_elements_text(${JSON.stringify(CLOSED_KEYS)}::json)))
          OR (${stage}::text = 'none' AND d.stage IS NULL)
          OR (${stage}::text = 'closed'
            AND d.stage IN (SELECT json_array_elements_text(${JSON.stringify(CLOSED_KEYS)}::json)))
          OR d.stage = ${stage}
        )
        AND (${owner}::text = 'all' OR d.owner_name = ${owner})
        AND (${category}::text = 'all' OR d.category = ${category})
        /* Picking a season narrows the list to the deals that actually have
           a number in it, rather than showing all 232 with their other years
           zeroed out. */
        AND (${year ?? null}::int IS NULL
             OR EXISTS (SELECT 1 FROM deal_years y2
                        WHERE y2.deal_id = d.id AND y2.year = ${year ?? null}))
        AND (${escalated}::boolean = false OR d.escalated)
        AND (
          ${search}::text = ''
          OR d.company ILIKE ${like(search)}
          OR d.notes ILIKE ${like(search)}
          OR d.status_note ILIKE ${like(search)}
          OR d.category ILIKE ${like(search)}
          OR EXISTS (SELECT 1 FROM deal_contacts c
                     WHERE c.deal_id = d.id
                       AND (c.name ILIKE ${like(search)} OR c.email ILIKE ${like(search)}))
          OR EXISTS (SELECT 1 FROM deal_allies a
                     WHERE a.deal_id = d.id AND a.name ILIKE ${like(search)})
        )
    ) t
    ORDER BY
      /* Unsorted, the flagged deals float and stage leads — what you want
         landing on the page. An explicit sort takes that over completely,
         or "sort by money" would still be grouped by stage. */
      CASE WHEN ${by}::text = '' THEN t.escalated END DESC,
      CASE WHEN ${by}::text = '' THEN t.stage_rank END DESC,
      CASE WHEN ${direction}::text = 'asc' THEN
        CASE ${by}::text
          WHEN 'stage'   THEN t.stage_rank
          WHEN 'money'   THEN t.guaranteed + t.optioned
          WHEN 'touched' THEN EXTRACT(EPOCH FROM t.last_touchpoint)::bigint
        END
      END ASC NULLS LAST,
      CASE WHEN ${direction}::text = 'desc' THEN
        CASE ${by}::text
          WHEN 'stage'   THEN t.stage_rank
          WHEN 'money'   THEN t.guaranteed + t.optioned
          WHEN 'touched' THEN EXTRACT(EPOCH FROM t.last_touchpoint)::bigint
        END
      END DESC NULLS LAST,
      CASE WHEN ${direction}::text = 'asc' THEN
        CASE ${by}::text WHEN 'deal' THEN t.company WHEN 'lead' THEN t.owner_name END
      END ASC NULLS LAST,
      CASE WHEN ${direction}::text = 'desc' THEN
        CASE ${by}::text WHEN 'deal' THEN t.company WHEN 'lead' THEN t.owner_name END
      END DESC NULLS LAST,
      t.company ASC
  `;
  return rows.map(toDeal);
}

export async function getDeal(id) {
  const [row] = await sql`
    SELECT d.*, to_char(d.last_touchpoint, 'YYYY-MM-DD') AS touch_ymd
    FROM deals d
    WHERE d.id = ${Number(id) || 0}
  `;
  return toDeal(row);
}

/* The stage strip: a count per stage plus the money in play. */
export async function dealCounts(year) {
  const stages = await sql`SELECT stage, count(*)::int AS n FROM deals GROUP BY stage`;
  const byStage = Object.fromEntries(stages.map((r) => [r.stage, r.n]));
  /* Two questions, not one. "Closed" is money on a signed deal — guaranteed
     value on a deal at Closed Won. "In play" is everything else still alive:
     the options on a signed deal, and every number on a deal we are still
     working. Lost, ghosted and paused count as neither.

     The old label read "In play · guaranteed", which was two different axes
     jammed together and never said what it excluded. */
  const [extra] = await sql`
    SELECT (SELECT count(*)::int FROM deals) AS all_deals,
           (SELECT count(*)::int FROM deals
            WHERE stage IS NOT NULL
              AND stage NOT IN (SELECT json_array_elements_text(${JSON.stringify(CLOSED_KEYS)}::json))) AS total,
           (SELECT count(*)::int FROM deals
            WHERE stage IN (SELECT json_array_elements_text(${JSON.stringify(CLOSED_KEYS)}::json))) AS closed,
           (SELECT count(*)::int FROM deals WHERE stage IS NULL) AS unstaged,
           (SELECT count(*)::int FROM deals WHERE escalated
            AND stage NOT IN (SELECT json_array_elements_text(${JSON.stringify(CLOSED_KEYS)}::json))) AS escalated,
           m.*
    FROM (
      SELECT
        COALESCE(sum(y.amount) FILTER (WHERE y.kind = 'cash'  AND y.guaranteed AND d.stage = 'won'), 0)::int AS cash_closed,
        COALESCE(sum(y.amount) FILTER (WHERE y.kind = 'vik'   AND y.guaranteed AND d.stage = 'won'), 0)::int AS vik_closed,
        COALESCE(sum(y.amount) FILTER (WHERE y.kind = 'media' AND y.guaranteed AND d.stage = 'won'), 0)::int AS media_closed,
        COALESCE(sum(y.amount) FILTER (WHERE y.kind = 'cash'  AND NOT (y.guaranteed AND COALESCE(d.stage, '') = 'won')), 0)::int AS cash_play,
        COALESCE(sum(y.amount) FILTER (WHERE y.kind = 'vik'   AND NOT (y.guaranteed AND COALESCE(d.stage, '') = 'won')), 0)::int AS vik_play,
        COALESCE(sum(y.amount) FILTER (WHERE y.kind = 'media' AND NOT (y.guaranteed AND COALESCE(d.stage, '') = 'won')), 0)::int AS media_play
      FROM deal_years y JOIN deals d ON d.id = y.deal_id
      WHERE (d.stage IS NULL
             OR d.stage NOT IN (SELECT json_array_elements_text(${JSON.stringify(CLOSED_KEYS)}::json)))
        AND (${year ?? null}::int IS NULL OR y.year = ${year ?? null})
    ) m
  `;
  return {
    byStage: Object.fromEntries(ALL_STAGES.map((s) => [s.key, byStage[s.key] || 0])),
    all: extra.all_deals,
    total: extra.total,
    closed: extra.closed,
    unstaged: extra.unstaged,
    escalated: extra.escalated,
    money: {
      cash:  { closed: extra.cash_closed,  inPlay: extra.cash_play },
      vik:   { closed: extra.vik_closed,   inPlay: extra.vik_play },
      media: { closed: extra.media_closed, inPlay: extra.media_play },
    },
  };
}

/* Sales leads as they appear on deals — for the owner filter. Text, because
   most of them have no account here. */
export async function dealOwners() {
  const rows = await sql`
    SELECT owner_name, count(*)::int AS n FROM deals
    WHERE owner_name IS NOT NULL AND owner_name <> ''
    GROUP BY owner_name ORDER BY count(*) DESC, owner_name
  `;
  return rows.map((r) => ({ name: r.owner_name, count: r.n }));
}

/* Who can be a sales lead: the names already on deals, plus these two.

   The whole staff roster was too much — most admins do not work sponsorship
   deals, and offering all ten made the real four hard to find. A named list
   rather than a flag on users, because there is no screen to manage a flag
   from: either way it takes a code change, and this way it is one line in
   the open. */
const EXTRA_LEADS = ['Kayla Green', 'Alexis Ohanian'];

export async function dealLeadNames() {
  const onDeals = await sql`
    SELECT DISTINCT owner_name AS name FROM deals
    WHERE owner_name IS NOT NULL AND owner_name <> ''
  `;
  const names = new Set([...onDeals.map((r) => r.name), ...EXTRA_LEADS]);
  return [...names].sort((a, b) => a.localeCompare(b));
}

/* Categories actually on a deal, with counts — the picker offers these
   rather than the full 85-value vocabulary, most of which nobody carries. */
export async function dealCategories() {
  const rows = await sql`
    SELECT category, count(*)::int AS n FROM deals
    WHERE category IS NOT NULL AND category <> ''
    GROUP BY category ORDER BY category
  `;
  return rows.map((r) => ({ name: r.category, count: r.n }));
}

/* Years that actually carry money — the year picker offers these, not a
   hard-coded range that goes stale. */
export async function dealYearsInUse() {
  const rows = await sql`SELECT DISTINCT year FROM deal_years ORDER BY year`;
  return rows.map((r) => r.year);
}

export async function createDeal(actor, fields) {
  const company = String(fields.company || '').trim();
  if (!company) return { error: 'A company name is required.' };
  /* Blank is the honest default for a deal someone has only just typed in:
     nobody has placed it anywhere yet. '' clears to NULL rather than
     falling back to Engaged, which would claim contact had been made. */
  const stage = fields.stage === '' || fields.stage == null
    ? null
    : (STAGE_KEYS.includes(fields.stage) ? fields.stage : null);

  const [row] = await sql`
    INSERT INTO deals (company, stage, category, notes, owner_name)
    VALUES (${company}, ${stage},
            ${String(fields.category || '').trim() || null},
            ${String(fields.notes || '').trim() || null},
            ${String(fields.ownerName || '').trim() || null})
    RETURNING id
  `;
  await sql`
    INSERT INTO deal_events (deal_id, user_id, who, kind) VALUES (${row.id}, ${actor.id}, ${actor.who}, 'created')
  `;
  return { id: row.id };
}

/* The audit write lives here rather than in the action: the diff needs the
   stored row, and this codebase already puts row-state decisions in the db
   module (see deleteMessage in lib/chat-db.js). A save that changes nothing
   writes nothing. */
const EDITABLE = {
  company: 'Company',
  stage: 'Stage',
  category: 'Category',
  notes: 'Notes',
  status_note: 'Status',
  next_steps: 'Next steps',
  last_touchpoint: 'Last touchpoint',
  owner_name: 'Sales lead',
};

export async function updateDeal(actor, id, fields) {
  const dealId = Number(id) || 0;
  /* to_char, or the Date this comes back as never matches the
     'YYYY-MM-DD' the form submits and every save logs a phantom change. */
  const [before] = await sql`
    SELECT *, to_char(last_touchpoint, 'YYYY-MM-DD') AS touch_ymd
    FROM deals WHERE id = ${dealId}
  `;
  if (!before) return { error: 'That deal no longer exists.' };

  /* '' clears the stage back to blank, which is a real state here. */
  if (fields.stage !== undefined && fields.stage !== '' && !STAGE_KEYS.includes(fields.stage)) {
    return { error: 'That is not a stage.' };
  }
  if (fields.company !== undefined && !String(fields.company).trim()) {
    return { error: 'A company name is required.' };
  }

  const changed = [];
  for (const [col, label] of Object.entries(EDITABLE)) {
    if (fields[col] === undefined) continue;
    const next = fields[col] === '' ? null : fields[col];
    const prev = col === 'last_touchpoint' ? before.touch_ymd : before[col];
    /* Dates arrive as strings and come back as strings; ids as numbers. */
    if (String(prev ?? '') === String(next ?? '')) continue;
    changed.push({ col, label, prev, next });
  }
  if (!changed.length) return { ok: true, changed: 0 };

  for (const c of changed) {
    /* One statement per column keeps this a tagged template — no dynamic
       SQL assembly — and the set is at most ten. */
    if (c.col === 'company')         await sql`UPDATE deals SET company = ${c.next} WHERE id = ${dealId}`;
    else if (c.col === 'stage')      await sql`UPDATE deals SET stage = ${c.next} WHERE id = ${dealId}`;
    else if (c.col === 'category')   await sql`UPDATE deals SET category = ${c.next} WHERE id = ${dealId}`;
    else if (c.col === 'notes')      await sql`UPDATE deals SET notes = ${c.next} WHERE id = ${dealId}`;
    else if (c.col === 'status_note') await sql`UPDATE deals SET status_note = ${c.next} WHERE id = ${dealId}`;
    else if (c.col === 'next_steps') await sql`UPDATE deals SET next_steps = ${c.next} WHERE id = ${dealId}`;
    else if (c.col === 'last_touchpoint') await sql`UPDATE deals SET last_touchpoint = ${c.next} WHERE id = ${dealId}`;
    else if (c.col === 'owner_name') await sql`UPDATE deals SET owner_name = ${c.next} WHERE id = ${dealId}`;

    await sql`
      INSERT INTO deal_events (deal_id, user_id, who, kind, field, old_value, new_value)
      VALUES (${dealId}, ${actor.id}, ${actor.who},
              ${c.col === 'stage' ? 'stage' : c.col === 'owner_name' ? 'owner' : 'edited'},
              ${c.label},
              ${c.col === 'stage' ? stageLabel(c.prev) || 'No stage' : c.prev === null ? null : String(c.prev)},
              ${c.col === 'stage' ? stageLabel(c.next) || 'No stage' : c.next === null ? null : String(c.next)})
    `;
  }

  await sql`UPDATE deals SET updated_at = now() WHERE id = ${dealId}`;
  return { ok: true, changed: changed.length };
}

export async function deleteDeal(id) {
  const [row] = await sql`DELETE FROM deals WHERE id = ${Number(id) || 0} RETURNING company`;
  return row ? { ok: true, company: row.company } : { error: 'That deal no longer exists.' };
}

/* "Needs Alexis" — named for the concept rather than the person, so the
   schema does not encode one individual. */
export async function setEscalated(actor, id, on, note) {
  const dealId = Number(id) || 0;
  const reason = String(note || '').trim() || null;
  const [row] = await sql`
    UPDATE deals
    SET escalated = ${Boolean(on)},
        escalated_note = ${on ? reason : null},
        escalated_at = ${on ? new Date().toISOString() : null},
        updated_at = now()
    WHERE id = ${dealId}
    RETURNING company
  `;
  if (!row) return { error: 'That deal no longer exists.' };
  await sql`
    INSERT INTO deal_events (deal_id, user_id, who, kind, field, new_value)
    VALUES (${dealId}, ${actor.id}, ${actor.who}, 'escalated', 'Needs Alexis',
            ${on ? reason || 'flagged' : 'cleared'})
  `;
  return { ok: true };
}

/* ---- contacts ---- */

export async function listContacts(dealId) {
  const rows = await sql`
    SELECT * FROM deal_contacts WHERE deal_id = ${Number(dealId) || 0}
    ORDER BY array_position(ARRAY['primary','alpha','contact']::text[], role),
             last_touched_at ASC NULLS FIRST, name
  `;
  return rows.map(toContact);
}

export async function upsertContact(actor, dealId, fields) {
  const id = Number(fields.id) || 0;
  const name = String(fields.name || '').trim();
  if (!name) return { error: 'A name is required.' };
  const role = ['primary', 'alpha', 'contact'].includes(fields.role) ? fields.role : 'contact';
  const deal = Number(dealId) || 0;

  /* At most one primary per deal, enforced by a partial unique index — so
     promoting someone demotes the incumbent rather than failing. */
  if (role === 'primary') {
    await sql`
      UPDATE deal_contacts SET role = 'contact'
      WHERE deal_id = ${deal} AND role = 'primary' AND id <> ${id}
    `;
  }

  const email = String(fields.email || '').trim() || null;
  const title = String(fields.title || '').trim() || null;
  const notes = String(fields.notes || '').trim() || null;
  const touched = String(fields.lastTouchedAt || '').trim() || null;

  if (id) {
    const [row] = await sql`
      UPDATE deal_contacts
      SET name = ${name}, email = ${email}, title = ${title}, role = ${role},
          notes = ${notes}, last_touched_at = ${touched}, updated_at = now()
      WHERE id = ${id} AND deal_id = ${deal}
      RETURNING id
    `;
    if (!row) return { error: 'That contact no longer exists.' };
  } else {
    await sql`
      INSERT INTO deal_contacts (deal_id, name, email, title, role, notes, last_touched_at)
      VALUES (${deal}, ${name}, ${email}, ${title}, ${role}, ${notes}, ${touched})
    `;
  }

  await sql`
    INSERT INTO deal_events (deal_id, user_id, who, kind, field, new_value)
    VALUES (${deal}, ${actor.id}, ${actor.who}, 'edited', 'Contact', ${name})
  `;
  return { ok: true };
}

export async function touchContact(actor, dealId, contactId) {
  const deal = Number(dealId) || 0;
  const [row] = await sql`
    UPDATE deal_contacts SET last_touched_at = now(), updated_at = now()
    WHERE id = ${Number(contactId) || 0} AND deal_id = ${deal}
    RETURNING name
  `;
  if (!row) return { error: 'That contact no longer exists.' };
  await sql`
    INSERT INTO deal_events (deal_id, user_id, who, kind, field, new_value)
    VALUES (${deal}, ${actor.id}, ${actor.who}, 'edited', 'Touched', ${row.name})
  `;
  return { ok: true };
}

export async function deleteContact(dealId, contactId) {
  await sql`
    DELETE FROM deal_contacts WHERE id = ${Number(contactId) || 0} AND deal_id = ${Number(dealId) || 0}
  `;
  return { ok: true };
}

/* ---- money ---- */

export async function listYears(dealId) {
  const rows = await sql`
    SELECT * FROM deal_years WHERE deal_id = ${Number(dealId) || 0}
    ORDER BY year,
             array_position(ARRAY['cash','vik','media']::text[], kind),
             guaranteed DESC
  `;
  return rows.map(toYear);
}

/* Guaranteed and optioned are separate rows for the same year — a deal can
   be $650k signed plus $950k in options, and the strip sums them apart. */
export async function setDealYear(actor, dealId, { year, amount, guaranteed, kind, note }) {
  const deal = Number(dealId) || 0;
  const yr = Number(year);
  if (!Number.isInteger(yr) || yr < 2020 || yr > 2040) return { error: 'That is not a season.' };
  const value = parseMoney(amount);
  if (value === null || value < 0) return { error: 'That is not an amount.' };
  const what = MONEY_KEYS.includes(kind) ? kind : 'cash';

  await sql`
    INSERT INTO deal_years (deal_id, year, amount, kind, guaranteed, note)
    VALUES (${deal}, ${yr}, ${value}, ${what}, ${Boolean(guaranteed)},
            ${String(note || '').trim() || null})
    ON CONFLICT (deal_id, year, kind, guaranteed)
    DO UPDATE SET amount = EXCLUDED.amount, note = EXCLUDED.note
  `;
  await sql`
    INSERT INTO deal_events (deal_id, user_id, who, kind, field, new_value)
    VALUES (${deal}, ${actor.id}, ${actor.who}, 'edited',
            ${`${yr} ${moneyKindLabel(what)} ${guaranteed ? 'guaranteed' : 'optioned'}`},
            ${String(value)})
  `;
  return { ok: true };
}

/* Editing an existing line, by row id.

   setDealYear cannot do this: it upserts on (deal, year, kind, guaranteed),
   so changing any of those four would leave the original row behind and
   write a second one. */
export async function updateDealYear(actor, dealId, rowId, { year, amount, guaranteed, kind, note }) {
  const deal = Number(dealId) || 0;
  const yr = Number(year);
  if (!Number.isInteger(yr) || yr < 2020 || yr > 2040) return { error: 'That is not a season.' };
  const value = parseMoney(amount);
  if (value === null || value < 0) return { error: 'That is not an amount.' };
  const what = MONEY_KEYS.includes(kind) ? kind : 'cash';

  let row;
  try {
    [row] = await sql`
      UPDATE deal_years
      SET year = ${yr}, amount = ${value}, kind = ${what},
          guaranteed = ${Boolean(guaranteed)}, note = ${String(note || '').trim() || null}
      WHERE id = ${Number(rowId) || 0} AND deal_id = ${deal}
      RETURNING id
    `;
  } catch (err) {
    /* One line per year per kind per guaranteed. Editing a row onto one that
       already exists is a real thing to try, so it gets a sentence rather
       than a stack trace. */
    if (err?.code === '23505') {
      return { error: `There is already a ${yr} ${moneyKindLabel(what)} ${guaranteed ? 'guaranteed' : 'optioned'} line. Edit that one instead.` };
    }
    throw err;
  }
  if (!row) return { error: 'That line no longer exists.' };

  await sql`
    INSERT INTO deal_events (deal_id, user_id, who, kind, field, new_value)
    VALUES (${deal}, ${actor.id}, ${actor.who}, 'edited',
            ${`${yr} ${moneyKindLabel(what)} ${guaranteed ? 'guaranteed' : 'optioned'}`},
            ${String(value)})
  `;
  return { ok: true };
}

export async function deleteDealYear(dealId, yearRowId) {
  await sql`
    DELETE FROM deal_years WHERE id = ${Number(yearRowId) || 0} AND deal_id = ${Number(dealId) || 0}
  `;
  return { ok: true };
}

/* ---- allies ---- */

/* People on our side who helped a deal happen — an intro, a nudge, a word in
   the right ear. Kept so they can be thanked. */
export async function listAllies(dealId) {
  const rows = await sql`
    SELECT * FROM deal_allies WHERE deal_id = ${Number(dealId) || 0} ORDER BY id
  `;
  return rows.map((r) => ({
    id: r.id, dealId: r.deal_id, name: r.name, who: r.who, createdAt: r.created_at,
  }));
}

export async function addAlly(actor, dealId, name) {
  const deal = Number(dealId) || 0;
  const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!clean) return { error: 'A name is required.' };

  /* Adding the same person twice is a thing people do; it should be a no-op,
     not an error and not a duplicate row. */
  const [row] = await sql`
    INSERT INTO deal_allies (deal_id, name, user_id, who)
    VALUES (${deal}, ${clean}, ${actor.id}, ${actor.who})
    ON CONFLICT (deal_id, name) DO NOTHING
    RETURNING id
  `;
  if (!row) return { ok: true, already: true };

  await sql`
    INSERT INTO deal_events (deal_id, user_id, who, kind, field, new_value)
    VALUES (${deal}, ${actor.id}, ${actor.who}, 'edited', 'Ally', ${clean})
  `;
  return { ok: true };
}

export async function removeAlly(dealId, allyId) {
  await sql`
    DELETE FROM deal_allies WHERE id = ${Number(allyId) || 0} AND deal_id = ${Number(dealId) || 0}
  `;
  return { ok: true };
}

/* Everywhere one person has helped — the list exists to be read this way. */
export async function dealsHelpedBy(name) {
  const rows = await sql`
    SELECT d.id, d.company, a.created_at FROM deal_allies a
    JOIN deals d ON d.id = a.deal_id
    WHERE lower(a.name) = lower(${String(name || '').trim()})
    ORDER BY a.created_at DESC
  `;
  return rows;
}

/* ---- conflicts, chains, history ---- */

/* Sponsorship is exclusivity-driven: another water brand at Terms is a
   problem worth seeing on the page. One query over category and stage — no
   new table, and the free-text CONFLICT notes stay findable by search.

   A brand never conflicts with itself: Hublot's 2026 renewal shares a
   category with Hublot's 2025 Closed Won, and that is a renewal chain, not
   an exclusivity problem. */
export async function conflictsFor(dealId) {
  const rows = await sql`
    SELECT other.id, other.company, other.stage, other.category
    FROM deals d
    JOIN deals other ON other.category = d.category AND other.id <> d.id
    WHERE d.id = ${Number(dealId) || 0}
      AND d.category IS NOT NULL AND d.category <> ''
      AND other.company <> d.company
      AND other.stage IN ('terms', 'won')
    ORDER BY array_position(ARRAY['won','terms']::text[], other.stage), other.company
  `;
  return rows.map(toDeal);
}

export async function listDealEvents(dealId, limit = 100) {
  const rows = await sql`
    SELECT e.*, d.company FROM deal_events e JOIN deals d ON d.id = e.deal_id
    WHERE e.deal_id = ${Number(dealId) || 0}
    ORDER BY e.id DESC LIMIT ${limit}
  `;
  return rows.map(toEvent);
}

/* The "Recent changes" card. Imports are excluded — 202 rows of "imported"
   would bury everything a person actually did. */
export async function recentDealEvents(limit = 20) {
  const rows = await sql`
    SELECT e.*, d.company FROM deal_events e JOIN deals d ON d.id = e.deal_id
    WHERE e.kind <> 'imported'
    ORDER BY e.id DESC LIMIT ${limit}
  `;
  return rows.map(toEvent);
}
