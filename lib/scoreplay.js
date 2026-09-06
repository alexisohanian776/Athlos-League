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
