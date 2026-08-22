/* Run clubs, from Postgres. Rows are mapped to the same shape the components
   already consumed when this was a static file, so the UI is unchanged. */
import { sql } from './db.js';
import { slugify } from './slug.js';

const toClub = (r) => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  type: r.type,
  city: r.city,
  code: r.code,
  region: r.region,
  hood: r.hood,
  organizer: r.organizer,
  members: r.members,
  next: r.next_run,
  tone: r.tone,
  mapX: r.map_x === null ? null : Number(r.map_x),
  mapY: r.map_y === null ? null : Number(r.map_y),
  founded: r.founded,
  photo: r.photo_url,
});

export async function listClubs() {
  const rows = await sql`
    SELECT * FROM run_clubs ORDER BY sort_order, name
  `;
  return rows.map(toClub);
}

export async function getClub(slug) {
  const rows = await sql`SELECT * FROM run_clubs WHERE slug = ${slug} LIMIT 1`;
  return rows.length ? toClub(rows[0]) : null;
}

/* Slugs are derived from the name and kept unique with a numeric suffix. */
async function uniqueSlug(name, ignoreId = null) {
  const base = slugify(name) || 'club';
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    const rows = ignoreId
      ? await sql`SELECT id FROM run_clubs WHERE slug = ${candidate} AND id <> ${ignoreId}`
      : await sql`SELECT id FROM run_clubs WHERE slug = ${candidate}`;
    if (!rows.length) return candidate;
  }
  throw new Error('Could not derive a unique slug.');
}

export async function createClub(c) {
  const slug = await uniqueSlug(c.name);
  const rows = await sql`
    INSERT INTO run_clubs
      (slug, name, type, city, code, region, hood, organizer, members, next_run, tone, map_x, map_y, founded, photo_url, sort_order)
    VALUES
      (${slug}, ${c.name}, ${c.type}, ${c.city}, ${c.code}, ${c.region}, ${c.hood},
       ${c.organizer}, ${c.members}, ${c.next}, ${c.tone}, ${c.mapX}, ${c.mapY}, ${c.founded}, ${c.photo},
       (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM run_clubs))
    RETURNING *
  `;
  return toClub(rows[0]);
}

export async function updateClub(id, c) {
  const slug = await uniqueSlug(c.name, id);
  const rows = await sql`
    UPDATE run_clubs SET
      slug = ${slug}, name = ${c.name}, type = ${c.type}, city = ${c.city},
      code = ${c.code}, region = ${c.region}, hood = ${c.hood},
      organizer = ${c.organizer}, members = ${c.members}, next_run = ${c.next},
      tone = ${c.tone}, map_x = ${c.mapX}, map_y = ${c.mapY},
      founded = ${c.founded}, photo_url = ${c.photo}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows.length ? toClub(rows[0]) : null;
}

export async function deleteClub(id) {
  const rows = await sql`DELETE FROM run_clubs WHERE id = ${id} RETURNING slug`;
  return rows.length ? rows[0].slug : null;
}

export async function clubStats() {
  const [row] = await sql`
    SELECT count(*)::int AS clubs,
           count(DISTINCT region)::int AS regions,
           COALESCE(sum(members), 0)::int AS runners
    FROM run_clubs
  `;
  return row;
}
