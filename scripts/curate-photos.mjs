/* Pulls portrait candidates for the announced roster and writes an index +
   local review copies. Read-only against Scoreplay; nothing is uploaded. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { searchMedia } from './scoreplay.mjs';

const APPROVED_LABEL = 494;

export const ROSTER = [
  { slug: 'faith-kipyegon',       name: 'Faith Kipyegon',       surname: 'KIPYEGON',       players: [132346] },
  { slug: 'sha-carri-richardson', name: "Sha'Carri Richardson", surname: 'RICHARDSON',     players: [352880, 459153] },
  { slug: 'gabby-thomas',         name: 'Gabby Thomas',         surname: 'THOMAS',         players: [121198] },
  { slug: 'tara-davis-woodhall',  name: 'Tara Davis-Woodhall',  surname: 'DAVIS-WOODHALL', players: [318788] },
  { slug: 'keely-hodgkinson',     name: 'Keely Hodgkinson',     surname: 'HODGKINSON',     players: [404648] },
  { slug: 'marileidy-paulino',    name: 'Marileidy Paulino',    surname: 'PAULINO',        players: [132343] },
  { slug: 'masai-russell',        name: 'Masai Russell',        surname: 'RUSSELL',        players: [198533] },
  { slug: 'brittany-brown',       name: 'Brittany Brown',       surname: 'BROWN',          players: [198536] },
];

/* Other athletes' surnames, so a frame named for someone else is never picked
   just because it carries this athlete's tag. */
const OTHER_SURNAMES = (surname) =>
  ROSTER.map((r) => r.surname).filter((s) => s !== surname)
    .concat(['GBAI', 'JEFFERSON-WOODEN', 'LAMOTE', 'SEARS', 'BATTLE', 'HOLMES', 'ANNING', 'NAKAAYI', 'HILTZ', 'LONG', 'BURKS', 'GOULE-TOPPIN']);

/* A profile hero wants a tall, single-subject, approved studio frame that is
   demonstrably of THIS athlete. */
function score(m, entry) {
  const upper = m.name.toUpperCase();
  const others = OTHER_SURNAMES(entry.surname);
  /* A frame named after a different athlete is disqualified outright. */
  if (others.some((o) => upper.includes(o)) && !upper.includes(entry.surname)) return -1;

  const ratio = m.height / Math.max(1, m.width);
  const tags = (m.raw_tags || []).join(' ').toLowerCase();
  let s = 0;
  if (m.height > m.width) s += 40;
  if (ratio >= 1.2 && ratio <= 1.5) s += 15;        // close to the 5:7 card crop
  if (upper.includes(entry.surname)) s += 35;       // named for this athlete
  if (/GLAMSHOOT/.test(upper)) s += 30;             // studio set
  if (tags.includes('glam shoot')) s += 10;
  if (tags.includes('portrait')) s += 10;
  if ((m.player_ids || []).length === 1) s += 15;   // solo, not a race pack
  if (m.label_id === APPROVED_LABEL) s += 10;
  if (m.width >= 3000) s += 5;
  return s;
}

export async function candidatesFor(entry) {
  const seen = new Map();
  for (const pid of entry.players) {
    for (let page = 1; page <= 8; page++) {
      const r = await searchMedia({ media_type: 'photo', players: [pid] }, page, 100);
      const items = r.media || [];
      for (const m of items) seen.set(m.ID, m);
      if (items.length < 100) break;
    }
  }
  const all = [...seen.values()];
  const usable = all
    .filter((m) => m.label_id === APPROVED_LABEL && m.height > m.width)
    .map((m) => ({ m, s: score(m, entry) }))
    .filter((x) => x.s > 0);
  return {
    total: all.length,
    approvedPortrait: usable.length,
    hasStudioSet: usable.some((x) => /GLAMSHOOT/.test(x.m.name.toUpperCase())),
    top: usable.sort((a, b) => b.s - a.s).slice(0, 12).map(({ m, s }) => ({
      id: m.ID, name: m.name, w: m.width, h: m.height,
      players: (m.player_ids || []).length,
      tags: (m.raw_tags || []).slice(0, 5),
      score: s,
      thumb: m.thumbnail_url, compressed: m.compressed_url,
    })),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = {};
  for (const e of ROSTER) {
    const c = await candidatesFor(e);
    out[e.slug] = { name: e.name, ...c };
    console.log(`${e.name.padEnd(22)} photos=${String(c.total).padStart(4)}  usable-portrait=${String(c.approvedPortrait).padStart(4)}  studio=${c.hasStudioSet ? 'yes' : 'NO '}  best="${c.top[0]?.name || 'NONE'}"`);
  }
  mkdirSync('photo-review', { recursive: true });
  writeFileSync('photo-review/index.json', JSON.stringify(out, null, 2));
  console.log('\nwrote photo-review/index.json');
}
