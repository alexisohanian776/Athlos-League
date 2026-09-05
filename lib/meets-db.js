/* Meets and the attendance claims pinned to them. A meet is what a ticket
   stub is printed from, so everything the stub shows lives here and is
   editable by the league rather than hard-coded. */
import { sql } from './db.js';

const toMeet = (r) => r && ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  year: r.year,
  heldOn: r.held_on,          // 'YYYY-MM-DD' — formatted at the edges, never with a local Date
  venue: r.venue || '',
  area: r.area || '',
  city: r.city || '',
  country: r.country || '',
  attendance: r.attendance,
  capacity: r.capacity,
  events: r.events,
  headline: r.headline || '',
  facts: Array.isArray(r.facts) ? r.facts : [],
  photoUrl: r.photo_url || null,
  tone: r.tone || 'ph-wine',
  published: r.published,
  verifiedCount: r.verified_count ?? undefined,
});

const SELECT = sql`
  SELECT m.*, to_char(m.held_on, 'YYYY-MM-DD') AS held_on,
         (SELECT count(*)::int FROM attendances a
           WHERE a.meet_id = m.id AND a.status = 'approved') AS verified_count
  FROM meets m
`;

export async function listMeets({ includeUnpublished = false } = {}) {
  const rows = includeUnpublished
    ? await sql`
        SELECT m.*, to_char(m.held_on, 'YYYY-MM-DD') AS held_on,
               (SELECT count(*)::int FROM attendances a WHERE a.meet_id = m.id AND a.status = 'approved') AS verified_count
        FROM meets m ORDER BY m.held_on DESC NULLS LAST`
    : await sql`
        SELECT m.*, to_char(m.held_on, 'YYYY-MM-DD') AS held_on,
               (SELECT count(*)::int FROM attendances a WHERE a.meet_id = m.id AND a.status = 'approved') AS verified_count
        FROM meets m WHERE m.published ORDER BY m.held_on DESC NULLS LAST`;
  return rows.map(toMeet);
}

export async function getMeet(slug) {
  const rows = await sql`
    SELECT m.*, to_char(m.held_on, 'YYYY-MM-DD') AS held_on,
           (SELECT count(*)::int FROM attendances a WHERE a.meet_id = m.id AND a.status = 'approved') AS verified_count
    FROM meets m WHERE m.slug = ${slug}`;
  return toMeet(rows[0]);
}

export async function updateMeet(id, m) {
  const rows = await sql`
    UPDATE meets SET
      name = ${m.name}, year = ${m.year}, held_on = ${m.heldOn || null},
      venue = ${m.venue}, area = ${m.area}, city = ${m.city}, country = ${m.country},
      attendance = ${m.attendance}, capacity = ${m.capacity}, events = ${m.events},
      headline = ${m.headline}, facts = ${JSON.stringify(m.facts || [])}::jsonb,
      photo_url = ${m.photoUrl || null}, tone = ${m.tone},
      published = ${Boolean(m.published)}, updated_at = now()
    WHERE id = ${id} RETURNING *, to_char(held_on,'YYYY-MM-DD') AS held_on`;
  return toMeet(rows[0]);
}

export async function createMeet(m) {
  const rows = await sql`
    INSERT INTO meets (slug, name, year, held_on, venue, area, city, country,
                       attendance, capacity, events, headline, facts, photo_url, tone, published)
    VALUES (${m.slug}, ${m.name}, ${m.year}, ${m.heldOn || null}, ${m.venue}, ${m.area},
            ${m.city}, ${m.country}, ${m.attendance}, ${m.capacity}, ${m.events},
            ${m.headline}, ${JSON.stringify(m.facts || [])}::jsonb, ${m.photoUrl || null},
            ${m.tone}, ${Boolean(m.published)})
    RETURNING *, to_char(held_on,'YYYY-MM-DD') AS held_on`;
  return toMeet(rows[0]);
}

export async function deleteMeet(id) {
  const rows = await sql`DELETE FROM meets WHERE id = ${id} RETURNING slug`;
  return rows[0]?.slug || null;
}

/* ---------- attendance ---------- */

const toClaim = (r) => r && ({
  id: r.id,
  meetId: r.meet_id,
  userId: r.user_id,
  status: r.status,
  proofUrl: r.proof_url,
  note: r.note || '',
  createdAt: r.created_at,
  meetSlug: r.meet_slug,
  meetName: r.meet_name,
  meetYear: r.meet_year,
  who: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email,
  handle: r.handle,
  email: r.email,
  avatarUrl: r.avatar_url,
});

export async function claimAttendance({ userId, meetId, proofUrl, note }) {
  const rows = await sql`
    INSERT INTO attendances (user_id, meet_id, proof_url, note)
    VALUES (${userId}, ${meetId}, ${proofUrl || null}, ${note || null})
    ON CONFLICT (user_id, meet_id) DO UPDATE SET
      proof_url = EXCLUDED.proof_url,
      note = EXCLUDED.note,
      /* Re-submitting after a rejection reopens the claim; an approved one
         is left alone so a fan can't quietly swap the evidence later. */
      status = CASE WHEN attendances.status = 'approved' THEN 'approved' ELSE 'pending' END,
      reviewed_by = NULL, reviewed_at = NULL, created_at = now()
    RETURNING *`;
  return toClaim(rows[0]);
}

export async function reviewAttendance(actorId, id, status) {
  if (!['approved', 'rejected'].includes(status)) throw new Error('Unknown status.');
  const rows = await sql`
    UPDATE attendances SET status = ${status}, reviewed_by = ${actorId}, reviewed_at = now()
    WHERE id = ${Number(id)} RETURNING *`;
  return toClaim(rows[0]);
}

export async function listClaims(status = 'pending') {
  const rows = await sql`
    SELECT a.*, u.email, u.first_name, u.last_name, u.handle, u.avatar_url,
           m.slug AS meet_slug, m.name AS meet_name, m.year AS meet_year
    FROM attendances a
    JOIN users u ON u.id = a.user_id
    JOIN meets m ON m.id = a.meet_id
    WHERE a.status = ${status}
    ORDER BY a.created_at ASC`;
  return rows.map(toClaim);
}

export async function claimCounts() {
  const [row] = await sql`
    SELECT count(*) FILTER (WHERE status = 'pending')::int  AS pending,
           count(*) FILTER (WHERE status = 'approved')::int AS approved,
           count(*) FILTER (WHERE status = 'rejected')::int AS rejected
    FROM attendances`;
  return row;
}

/* Everything one person has claimed, for their own page. */
export async function myClaims(userId) {
  const rows = await sql`
    SELECT a.*, m.slug AS meet_slug, m.name AS meet_name, m.year AS meet_year
    FROM attendances a JOIN meets m ON m.id = a.meet_id
    WHERE a.user_id = ${userId} ORDER BY m.held_on DESC`;
  return rows.map(toClaim);
}

/* The approved stubs shown on a public profile. */
export async function stubsFor(userId) {
  const rows = await sql`
    SELECT m.*, to_char(m.held_on,'YYYY-MM-DD') AS held_on,
           (SELECT count(*)::int FROM attendances x WHERE x.meet_id = m.id AND x.status = 'approved') AS verified_count
    FROM attendances a JOIN meets m ON m.id = a.meet_id
    WHERE a.user_id = ${userId} AND a.status = 'approved'
    ORDER BY m.held_on DESC`;
  return rows.map(toMeet);
}
