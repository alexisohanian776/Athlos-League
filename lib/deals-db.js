/* Brand partnerships — the sales pipeline.

   ATHLOS deals are multi-year and multi-person: a sponsor has a day-to-day
   contact, often an "alpha" in the C-suite who blesses the whole thing, and
   money that lands across several seasons. That shape is why money lives in
   deal_years rather than a column, and people in deal_contacts rather than a
   name field. */
import { sql } from './db.js';

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
  { key: 'active',   label: 'Active discussions' },
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
export const STAGE_KEYS = ALL_STAGES.map((s) => s.key);
export const CLOSED_KEYS = CLOSED_STAGES.map((s) => s.key);
export const isClosedStage = (key) => CLOSED_KEYS.includes(key);
export const stageLabel = (key) => ALL_STAGES.find((s) => s.key === key)?.label || key;

/* Ranked worst to best for sorting: the closed stages sit below the funnel,
   so "stage, descending" reads Closed Won first and Lost last. */
const RANKED_JSON = [...CLOSED_KEYS].reverse().concat(STAGE_KEYS.filter((k) => !isClosedStage(k)));
export const stageRank = (key) => RANKED_JSON.indexOf(key);

const toDeal = (r) => r && ({
  id: r.id,
  company: r.company,
  name: r.name,
  stage: r.stage,
  stageLabel: stageLabel(r.stage),
  category: r.category || '',
  notes: r.notes || '',
  statusNote: r.status_note || '',
  nextSteps: r.next_steps || '',
  lastTouchpoint: r.touch_ymd ?? null,    // 'YYYY-MM-DD' — never a local Date
  inDiscussions: r.in_discussions,
  ownerName: r.owner_name || '',
  ownerId: r.owner_id,
  parentDealId: r.parent_deal_id,
  parentCompany: r.parent_company || null,
  escalated: r.escalated,
  escalatedNote: r.escalated_note || '',
  escalatedAt: r.escalated_at,
  hubspotId: r.hubspot_id,
  updatedAt: r.updated_at,
  contactCount: r.contact_count ?? undefined,
  guaranteed: r.guaranteed ?? undefined,
  optioned: r.optioned ?? undefined,
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
  stage = 'all', q = '', owner = 'all', escalated = false, year,
  sort = '', dir = '',
} = {}) {
  const search = String(q || '').trim();
  const by = SORTS.some((c) => c.key === sort) ? sort : '';
  const direction = dir === 'asc' || dir === 'desc' ? dir : '';
  const rows = await sql`
    SELECT * FROM (
      SELECT d.*,
             to_char(d.last_touchpoint, 'YYYY-MM-DD') AS touch_ymd,
             p.company AS parent_company,
             (SELECT count(*)::int FROM deal_contacts c WHERE c.deal_id = d.id) AS contact_count,
             COALESCE((SELECT sum(y.amount)::int FROM deal_years y
                       WHERE y.deal_id = d.id AND y.guaranteed AND (${year ?? null}::int IS NULL OR y.year = ${year ?? null})), 0) AS guaranteed,
             COALESCE((SELECT sum(y.amount)::int FROM deal_years y
                       WHERE y.deal_id = d.id AND NOT y.guaranteed AND (${year ?? null}::int IS NULL OR y.year = ${year ?? null})), 0) AS optioned,
             (SELECT ord FROM json_array_elements_text(${JSON.stringify(RANKED_JSON)}::json)
                WITH ORDINALITY AS r(value, ord) WHERE r.value = d.stage) AS stage_rank
      FROM deals d
      LEFT JOIN deals p ON p.id = d.parent_deal_id
      WHERE (
          /* The closed list is passed as a parameter rather than written as
             a SQL literal, so it cannot drift from CLOSED_STAGES. */
          (${stage}::text = 'all'
            AND d.stage NOT IN (SELECT json_array_elements_text(${JSON.stringify(CLOSED_KEYS)}::json)))
          OR (${stage}::text = 'closed'
            AND d.stage IN (SELECT json_array_elements_text(${JSON.stringify(CLOSED_KEYS)}::json)))
          OR d.stage = ${stage}
        )
        AND (${owner}::text = 'all' OR d.owner_name = ${owner})
        AND (${escalated}::boolean = false OR d.escalated)
        AND (
          ${search}::text = ''
          OR d.company ILIKE ${like(search)}
          OR d.name ILIKE ${like(search)}
          OR d.notes ILIKE ${like(search)}
          OR d.status_note ILIKE ${like(search)}
          OR d.category ILIKE ${like(search)}
          OR EXISTS (SELECT 1 FROM deal_contacts c
                     WHERE c.deal_id = d.id
                       AND (c.name ILIKE ${like(search)} OR c.email ILIKE ${like(search)}))
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
    SELECT d.*, to_char(d.last_touchpoint, 'YYYY-MM-DD') AS touch_ymd,
           p.company AS parent_company
    FROM deals d LEFT JOIN deals p ON p.id = d.parent_deal_id
    WHERE d.id = ${Number(id) || 0}
  `;
  return toDeal(row);
}

/* The stage strip: a count per stage plus the money in play. */
export async function dealCounts(year) {
  const stages = await sql`SELECT stage, count(*)::int AS n FROM deals GROUP BY stage`;
  const byStage = Object.fromEntries(stages.map((r) => [r.stage, r.n]));
  /* Money in play means live deals. A lost sponsor's number staying in the
     total is the whole reason these are a separate list. */
  const [extra] = await sql`
    SELECT (SELECT count(*)::int FROM deals
            WHERE stage NOT IN (SELECT json_array_elements_text(${JSON.stringify(CLOSED_KEYS)}::json))) AS total,
           (SELECT count(*)::int FROM deals
            WHERE stage IN (SELECT json_array_elements_text(${JSON.stringify(CLOSED_KEYS)}::json))) AS closed,
           (SELECT count(*)::int FROM deals WHERE escalated
            AND stage NOT IN (SELECT json_array_elements_text(${JSON.stringify(CLOSED_KEYS)}::json))) AS escalated,
           COALESCE((SELECT sum(y.amount)::int FROM deal_years y JOIN deals d ON d.id = y.deal_id
                     WHERE y.guaranteed
                       AND d.stage NOT IN (SELECT json_array_elements_text(${JSON.stringify(CLOSED_KEYS)}::json))
                       AND (${year ?? null}::int IS NULL OR y.year = ${year ?? null})), 0) AS guaranteed,
           COALESCE((SELECT sum(y.amount)::int FROM deal_years y JOIN deals d ON d.id = y.deal_id
                     WHERE NOT y.guaranteed
                       AND d.stage NOT IN (SELECT json_array_elements_text(${JSON.stringify(CLOSED_KEYS)}::json))
                       AND (${year ?? null}::int IS NULL OR y.year = ${year ?? null})), 0) AS optioned
  `;
  return {
    byStage: Object.fromEntries(ALL_STAGES.map((s) => [s.key, byStage[s.key] || 0])),
    total: extra.total,
    closed: extra.closed,
    escalated: extra.escalated,
    guaranteed: extra.guaranteed,
    optioned: extra.optioned,
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

/* Years that actually carry money — the year picker offers these, not a
   hard-coded range that goes stale. */
export async function dealYearsInUse() {
  const rows = await sql`SELECT DISTINCT year FROM deal_years ORDER BY year`;
  return rows.map((r) => r.year);
}

export async function createDeal(actor, fields) {
  const company = String(fields.company || '').trim();
  if (!company) return { error: 'A company name is required.' };
  const stage = STAGE_KEYS.includes(fields.stage) ? fields.stage : 'engaged';

  const [row] = await sql`
    INSERT INTO deals (company, name, stage, category, notes, owner_name)
    VALUES (${company}, ${String(fields.name || '').trim() || company}, ${stage},
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
  name: 'Deal name',
  stage: 'Stage',
  category: 'Category',
  notes: 'Notes',
  status_note: 'Status',
  next_steps: 'Next steps',
  last_touchpoint: 'Last touchpoint',
  owner_name: 'Sales lead',
  parent_deal_id: 'Renewal of',
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

  if (fields.stage !== undefined && !STAGE_KEYS.includes(fields.stage)) {
    return { error: 'That is not a stage.' };
  }
  if (fields.company !== undefined && !String(fields.company).trim()) {
    return { error: 'A company name is required.' };
  }
  /* A deal cannot renew itself, and a two-link chain is as deep as this
     needs to go. */
  if (fields.parent_deal_id && Number(fields.parent_deal_id) === dealId) {
    return { error: 'A deal cannot be a renewal of itself.' };
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
    else if (c.col === 'name')       await sql`UPDATE deals SET name = ${c.next} WHERE id = ${dealId}`;
    else if (c.col === 'stage')      await sql`UPDATE deals SET stage = ${c.next} WHERE id = ${dealId}`;
    else if (c.col === 'category')   await sql`UPDATE deals SET category = ${c.next} WHERE id = ${dealId}`;
    else if (c.col === 'notes')      await sql`UPDATE deals SET notes = ${c.next} WHERE id = ${dealId}`;
    else if (c.col === 'status_note') await sql`UPDATE deals SET status_note = ${c.next} WHERE id = ${dealId}`;
    else if (c.col === 'next_steps') await sql`UPDATE deals SET next_steps = ${c.next} WHERE id = ${dealId}`;
    else if (c.col === 'last_touchpoint') await sql`UPDATE deals SET last_touchpoint = ${c.next} WHERE id = ${dealId}`;
    else if (c.col === 'owner_name') await sql`UPDATE deals SET owner_name = ${c.next} WHERE id = ${dealId}`;
    else if (c.col === 'parent_deal_id') await sql`UPDATE deals SET parent_deal_id = ${c.next ? Number(c.next) : null} WHERE id = ${dealId}`;

    await sql`
      INSERT INTO deal_events (deal_id, user_id, who, kind, field, old_value, new_value)
      VALUES (${dealId}, ${actor.id}, ${actor.who},
              ${c.col === 'stage' ? 'stage' : c.col === 'owner_name' ? 'owner' : 'edited'},
              ${c.label},
              ${c.col === 'stage' ? stageLabel(c.prev) : c.prev === null ? null : String(c.prev)},
              ${c.col === 'stage' ? stageLabel(c.next) : c.next === null ? null : String(c.next)})
    `;
  }

  await sql`UPDATE deals SET updated_at = now() WHERE id = ${dealId}`;
  return { ok: true, changed: changed.length };
}

/* Renewals point at their parent, so deleting a parent would orphan the
   chain — the FK is SET NULL, which is why this is safe without a check. */
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
    ORDER BY year, guaranteed DESC
  `;
  return rows.map(toYear);
}

/* Guaranteed and optioned are separate rows for the same year — a deal can
   be $650k signed plus $950k in options, and the strip sums them apart. */
export async function setDealYear(actor, dealId, { year, amount, guaranteed }) {
  const deal = Number(dealId) || 0;
  const yr = Number(year);
  if (!Number.isInteger(yr) || yr < 2020 || yr > 2040) return { error: 'That is not a season.' };
  const value = Number(String(amount).replace(/[$,\s]/g, ''));
  if (!Number.isFinite(value) || value < 0) return { error: 'That is not an amount.' };

  await sql`
    INSERT INTO deal_years (deal_id, year, amount, guaranteed)
    VALUES (${deal}, ${yr}, ${Math.round(value)}, ${Boolean(guaranteed)})
    ON CONFLICT (deal_id, year, guaranteed) DO UPDATE SET amount = EXCLUDED.amount
  `;
  await sql`
    INSERT INTO deal_events (deal_id, user_id, who, kind, field, new_value)
    VALUES (${deal}, ${actor.id}, ${actor.who}, 'edited',
            ${`${yr} ${guaranteed ? 'guaranteed' : 'optioned'}`}, ${String(Math.round(value))})
  `;
  return { ok: true };
}

export async function deleteDealYear(dealId, yearRowId) {
  await sql`
    DELETE FROM deal_years WHERE id = ${Number(yearRowId) || 0} AND deal_id = ${Number(dealId) || 0}
  `;
  return { ok: true };
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
    SELECT other.id, other.company, other.name, other.stage, other.category
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

/* The renewal chain in both directions — what this deal renews, and what
   renews it. */
export async function chainFor(dealId) {
  const rows = await sql`
    SELECT *, to_char(last_touchpoint, 'YYYY-MM-DD') AS touch_ymd
    FROM deals WHERE parent_deal_id = ${Number(dealId) || 0} ORDER BY id
  `;
  return rows.map(toDeal);
}

/* Candidates for "Renewal of": other deals for the same brand only. The
   general search would also drag in every deal whose notes happen to name
   this company, which is right for search and wrong for a picker. */
export async function siblingDeals(dealId) {
  const rows = await sql`
    SELECT other.*, to_char(other.last_touchpoint, 'YYYY-MM-DD') AS touch_ymd
    FROM deals d
    JOIN deals other ON other.company = d.company AND other.id <> d.id
    WHERE d.id = ${Number(dealId) || 0}
    ORDER BY other.id
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
