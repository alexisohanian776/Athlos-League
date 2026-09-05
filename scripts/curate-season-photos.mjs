/* One photo per athlete-season, so a 2025 action shot only appears on that
   athlete's 2025 card.

   Two quirks of the library drive this design:
   - `date` is the upload date, not capture date, so season comes from the
     filename ("Athlos 25 night2", "2024-JKH-ATHLOS…").
   - width/height are absent on most records, so orientation is measured
     locally from the downloaded file rather than trusted from the API. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { searchMedia } from './scoreplay.mjs';
import { MEET_RESULTS } from '../lib/results.js';
import { slugify } from '../lib/slug.js';

const APPROVED = 494;
const CAND_DIR = 'photo-review/candidates';

const players = JSON.parse(readFileSync('photo-review/players.json', 'utf8'));

/* Which seasons each athlete actually raced — no point hunting a 2024 frame
   for someone who only ran in 2025. */
const raced = {};
for (const year of Object.keys(MEET_RESULTS)) {
  for (const ev of MEET_RESULTS[year]) {
    for (const a of ev.athletes) (raced[slugify(a.who)] ||= new Set()).add(year);
  }
}

const seasonOf = (name) => {
  const n = name.toLowerCase();
  if (/athlos[\s_-]*'?25|2025|athlos25/.test(n)) return '2025';
  if (/athlos[\s_-]*'?24|2024|athlos24/.test(n)) return '2024';
  return null;
};

const isStudio = (name) => /glamshoot|glam /i.test(name);

/* Screenshots and PNGs in this library are social-graphic exports with the
   ATHLOS wordmark burned in — never usable as card photography. */
const isGraphic = (name) => /^screenshot|\.png$|\bstory\b|\btemplate\b|\blogo\b/i.test(name);

async function allPhotos(playerId) {
  const seen = new Map();
  for (let page = 1; page <= 8; page++) {
    const r = await searchMedia({ media_type: 'photo', players: [playerId] }, page, 100);
    const items = r.media || [];
    items.forEach((m) => seen.set(m.ID, m));
    if (items.length < 100) break;
  }
  return [...seen.values()];
}

function rank(m, surname) {
  if (m.label_id !== APPROVED) return -1;
  let s = 0;
  if ((m.player_ids || []).length === 1) s += 30;
  else if ((m.player_ids || []).length === 2) s += 8;
  if (surname && m.name.toLowerCase().includes(surname)) s += 25;
  if (/port|portrait/i.test(m.name)) s += 20;   // the shooters label portrait crops
  if (/winner|final|podium/i.test(m.name)) s += 10;
  return s;
}

/* Measured locally because the API rarely reports dimensions. */
function dimensions(file) {
  try {
    const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], { encoding: 'utf8' });
    const w = Number(out.match(/pixelWidth:\s*(\d+)/)?.[1]);
    const h = Number(out.match(/pixelHeight:\s*(\d+)/)?.[1]);
    return Number.isFinite(w) && Number.isFinite(h) ? { w, h } : null;
  } catch { return null; }
}

async function download(url, file) {
  if (!url) return false;
  if (existsSync(file)) return true;
  const res = await fetch(url);
  if (!res.ok) return false;
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  return true;
}

mkdirSync(CAND_DIR, { recursive: true });

const out = {};
let picked = 0;

for (const [slug, p] of Object.entries(players)) {
  const seasons = raced[slug];
  if (!seasons) continue;

  const surname = p.name.split(/[\s-]+/).pop().toLowerCase();
  const photos = await allPhotos(p.playerId);
  out[slug] = { name: p.name, seasons: {} };

  for (const year of seasons) {
    const pool = photos
      .filter((m) => !isStudio(m.name) && !isGraphic(m.name) && seasonOf(m.name) === year)
      .map((m) => ({ m, s: rank(m, surname) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4);

    let best = null;
    for (const { m, s } of pool) {
      const url = m.compressed_url || m.thumbnail_url;
      const file = `${CAND_DIR}/${slug}-${year}-${m.ID}.jpg`;
      if (!(await download(url, file))) continue;
      const d = dimensions(file);
      if (!d) continue;
      const ratio = d.h / d.w;
      /* A card is 5:7, so anything portrait or near-square crops acceptably. */
      const fit = ratio >= 1.15 ? 40 : ratio >= 0.95 ? 20 : ratio >= 0.72 ? 8 : 0;
      if (!fit) continue;
      const total = s + fit;
      if (!best || total > best.total) {
        best = { total, id: m.ID, name: m.name, file, w: d.w, h: d.h, ratio: +ratio.toFixed(2), compressed: url };
      }
    }
    if (best) { out[slug].seasons[year] = best; picked++; }
  }

  const got = Object.keys(out[slug].seasons).sort();
  console.log(`${p.name.padEnd(26)} ${got.length ? got.join(' + ') : '—'}`);
}

writeFileSync('photo-review/season-picks.json', JSON.stringify(out, null, 2));
console.log(`\n${picked} athlete-season photos picked`);
