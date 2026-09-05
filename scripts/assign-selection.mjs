/* Assigns the curated selection to athlete-season cards.
   Matching is by Scoreplay player id, not name — their library has typos
   ("mariledy paulino") and shortened names that name matching gets wrong. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const DIR = 'photo-review/selected';
mkdirSync(DIR, { recursive: true });

const selection = JSON.parse(readFileSync('photo-review/selection.json', 'utf8'));
const players = JSON.parse(readFileSync('photo-review/players.json', 'utf8'));

/* playerId -> our slug */
const byPlayerId = new Map(Object.entries(players).map(([slug, p]) => [p.playerId, slug]));

function dims(file) {
  try {
    const o = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
    const w = Number(o.match(/pixelWidth:\s*(\d+)/)?.[1]);
    const h = Number(o.match(/pixelHeight:\s*(\d+)/)?.[1]);
    return Number.isFinite(w) && Number.isFinite(h) ? { w, h } : null;
  } catch { return null; }
}

async function grab(url, file) {
  if (!url) return false;
  if (existsSync(file)) return true;
  const res = await fetch(url);
  if (!res.ok) return false;
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return true;
}

/* candidates[slug][season] = [frames] */
const candidates = {};
const unmatched = [];
for (const f of selection) {
  if (!f.players?.length || !f.season) continue;
  for (const p of f.players) {
    const slug = byPlayerId.get(p.id);
    if (!slug) { unmatched.push(`${p.name}#${p.id}`); continue; }
    ((candidates[slug] ||= {})[f.season] ||= []).push({ ...f, solo: f.players.length === 1 });
  }
}

const assigned = {};
for (const [slug, seasons] of Object.entries(candidates)) {
  for (const [season, frames] of Object.entries(seasons)) {
    /* Solo frames first, then portrait-ish, then bigger. */
    const scored = [];
    for (const f of frames) {
      const file = `${DIR}/${slug}-${season}-${f.id}.jpg`;
      if (!(await grab(f.compressed || f.thumb, file))) continue;
      const d = dims(file);
      if (!d) continue;
      const ratio = d.h / d.w;
      let s = 0;
      if (f.solo) s += 60;
      if (ratio >= 1.15) s += 40; else if (ratio >= 0.95) s += 18; else if (ratio >= 0.72) s += 6;
      if (d.w >= 1400) s += 5;
      scored.push({ ...f, file, ...d, ratio: +ratio.toFixed(2), score: s });
    }
    if (!scored.length) continue;
    scored.sort((a, b) => b.score - a.score);
    (assigned[slug] ||= {})[season] = scored[0];
    (assigned[slug]._pool ||= {})[season] = scored.length;
  }
}

writeFileSync('photo-review/assigned.json', JSON.stringify(assigned, null, 2));

const rows = [];
for (const [slug, seasons] of Object.entries(assigned)) {
  for (const [season, f] of Object.entries(seasons)) {
    if (season === '_pool') continue;
    rows.push({ slug, season, name: f.name, solo: f.solo, dims: `${f.w}x${f.h}`, pool: seasons._pool?.[season] });
  }
}
rows.sort((a, b) => a.slug.localeCompare(b.slug) || a.season.localeCompare(b.season));
for (const r of rows) {
  console.log(`${r.slug.padEnd(26)} ${r.season}  ${r.solo ? 'solo ' : 'group'}  ${String(r.dims).padEnd(11)} of ${r.pool}  ${String(r.name).slice(0, 40)}`);
}
console.log(`\n${rows.length} athlete-season assignments from the selection`);
if (unmatched.length) console.log('tagged athletes not in our results:', [...new Set(unmatched)].join(', '));
