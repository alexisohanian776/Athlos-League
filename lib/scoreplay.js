/* Read-only access to the ATHLOS media library in Scoreplay.

   Server-only: the API key never reaches the browser, so every call from the
   admin UI goes through our own routes rather than talking to Scoreplay
   directly. */

const BASE = 'https://media.scoreplay.io/v1';

export const scoreplayConfigured = () => Boolean(process.env.SCOREPLAY_API_KEY);

async function api(path, { method = 'GET', body } = {}) {
  const key = process.env.SCOREPLAY_API_KEY;
  if (!key) throw new Error('SCOREPLAY_API_KEY missing');

  const res = await fetch(BASE + path, {
    method,
    headers: { 'X-ScorePlay-Api-Key': key, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Scoreplay ${method} ${path} -> ${res.status}`);
  return res.json();
}

/* The library holds camera RAW (.CR3) alongside processed images. A browser
   cannot display RAW, so only web formats are offered. */
const DISPLAYABLE = /\.(jpe?g|png|webp)$/i;

export async function searchLibrary(query, page = 1, perPage = 24) {
  /* `name` is the only text filter the API honours — it matches the file
     name, which is how this library is organised (GLAMSHOOT_KIPYEGON_0808). */
  const body = { media_type: 'photo' };
  const q = String(query || '').trim();
  if (q) body.name = q;

  const r = await api(`/media/search?page=${page}&per_page=${perPage}`, { method: 'POST', body });
  const media = (r.media || [])
    .filter((m) => m.thumbnail_url && DISPLAYABLE.test(m.name || ''))
    .map((m) => ({
      id: m.ID,
      name: m.name,
      thumb: m.thumbnail_url,
      width: m.width,
      height: m.height,
      date: m.date ? String(m.date).slice(0, 10) : null,
    }));
  return { media, total: r.total ?? null };
}

export async function getMediaAsset(id) {
  const r = await api(`/media/${encodeURIComponent(id)}`);
  const m = r.media || r;
  return {
    id: m.ID,
    name: m.name,
    url: m.original_url || m.thumbnail_url,
    thumb: m.thumbnail_url,
  };
}

/* ---------- photos for a specific meet ----------

   The library has no usable date filter: `date` is the upload timestamp, not
   when the shutter fired, and no date range parameter is honoured. What race
   photography does carry is the year and city in the file name, e.g.
   "2024 Athlos NYC  jeff cohen photo  4124.jpg" — so that is what we match
   on.

   File names use short city forms; "Athlos NYC" returns 60 images where
   "Athlos New York" returns none. */
const CITY_ALIASES = {
  'new york': 'NYC',
  brooklyn: 'NYC',
  'los angeles': 'LA',
  'san francisco': 'SF',
};

export function meetQueries({ city, year, name } = {}) {
  const c = String(city || '').trim();
  const y = String(year || '').trim();
  const yy = y.slice(2);
  const alias = CITY_ALIASES[c.toLowerCase()] || c;

  /* Naming is not consistent between shoots — the 2024 race is
     "2024 Athlos NYC  jeff cohen photo  4124.jpg" while 2025 is
     "Athlos 25 night2  jeff cohen photo  54xx.jpg" — so several candidates
     are tried and merged rather than betting on one. */
  return [...new Set([
    y && alias && `${y} Athlos ${alias}`,
    yy && `Athlos ${yy}`,
    alias && `Athlos ${alias}`,
    name && String(name).replace(/^ATHLOS\s+/i, 'Athlos '),
    c,
  ].filter(Boolean))];
}

/* How well a file name says "this meet". The year in full is the strongest
   signal; "Athlos 25" is weaker because a bare 24/25 is often a frame
   number, not a year. */
function scoreFor(name, year) {
  const n = String(name);
  const y = String(year || '');
  const yy = y.slice(2);
  let score = 0;
  if (y && n.includes(y)) score += 3;
  if (yy && new RegExp(`athlos[ _-]?${yy}\\b`, 'i').test(n)) score += 2;
  return score;
}

/* Photos for one meet: merge the candidate queries, rank the frames whose
   name actually names this meet, and say which queries were used so the
   admin can see what was searched and widen it. */
export async function searchForMeet(meet, limit = 60) {
  const year = String(meet?.year || '').trim();
  const queries = meetQueries(meet);
  const seen = new Map();
  const used = [];

  for (const query of queries.slice(0, 3)) {
    let media = [];
    try {
      ({ media } = await searchLibrary(query, 1, 60));
    } catch {
      continue;
    }
    if (!media.length) continue;
    used.push(query);
    for (const m of media) if (!seen.has(m.id)) seen.set(m.id, m);
    /* Enough strong matches already — no need to widen further. */
    if ([...seen.values()].filter((m) => scoreFor(m.name, year) > 0).length >= limit) break;
  }

  const all = [...seen.values()];
  const scored = all
    .map((m) => ({ m, s: scoreFor(m.name, year) }))
    .sort((a, b) => b.s - a.s);

  const strong = scored.filter((x) => x.s > 0);
  return {
    media: (strong.length ? strong : scored).slice(0, limit).map((x) => x.m),
    query: used[0] || queries[0] || '',
    queriesUsed: used,
    matchedMeet: strong.length > 0,
  };
}
