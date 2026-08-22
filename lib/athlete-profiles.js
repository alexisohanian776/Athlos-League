/* ATHLOS League — athlete profiles, derived from the results.
   Everything factual (race history, ATHLOS bests, events, country) comes from
   MEET_RESULTS. Editorial extras — bio, hometown, sponsors, socials, and bests
   set outside this league — can only be authored, so they live in AUTHORED and
   each section is omitted for athletes who don't have them yet. */

import { MEET_RESULTS } from './results.js';
import { ATHLETES } from './league.js';
import { countryName } from './countries.js';
import { slugify } from './slug.js';
import { isFieldEvent } from './season-cards.js';

const TONES = ['ph-wine', 'ph-plum', 'ph-ember', 'ph-field', 'ph-dusk', 'ph-clay'];
const MEET_NAME = { 2024: 'ATHLOS New York', 2025: 'ATHLOS New York', 2026: 'ATHLOS London' };

function toneFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return TONES[h % TONES.length];
}

const markValue = (raw) => {
  const parts = String(raw).replace(/m$/, '').split(':').map(Number);
  return parts.some((n) => Number.isNaN(n)) ? null : parts.reduce((a, n) => a * 60 + n, 0);
};

/* Flatten every result into one row per race. */
const ALL_ROWS = Object.keys(MEET_RESULTS).flatMap((year) =>
  MEET_RESULTS[year].flatMap((ev) =>
    ev.athletes.map((a) => {
      const place = Number.parseInt(a.place, 10);
      return {
        slug: slugify(a.who),
        name: a.who,
        code: a.code,
        year,
        meet: MEET_NAME[year] || 'ATHLOS',
        event: ev.event,
        place: Number.isFinite(place) ? place : null,
        status: Number.isFinite(place) ? null : a.place,
        mark: a.time,
        marks: a.marks || [],
      };
    })
  )
);

/* Editorial content. Only Faith is authored in the design; add others here. */
const AUTHORED = {
  'faith-kipyegon': {
    hometown: 'Ndabibi, Kenya',
    sponsors: ['NIKE'],
    socials: [
      { net: 'Instagram', handle: '@faithkipyegon', icon: 'ig' },
      { net: 'X', handle: '@faithkipyegon', icon: 'x' },
    ],
    bio: [
      'Faith Kipyegon does not lose the closing lap. The Kenyan miler holds the world record at 1500m and the Mile, and she has worn the ATHLOS meet record in both events she has entered.',
      'At her first ATHLOS in 2024 she took the 1500m in 4:04.79. A year later she came back for the Mile and ran 4:17.78 — the fastest the distance has been run on this stage.',
    ],
    bests: [
      { event: '1500M', mark: '3:49.04', where: 'Paris', year: '2024', wr: true },
      { event: 'MILE', mark: '4:07.64', where: 'Monaco', year: '2023', wr: true },
      { event: '5000M', mark: '14:05.20', where: 'Paris', year: '2023', wr: false },
    ],
    posts: [
      { athlete: 'Faith Kipyegon', handle: '@faithkipyegon', tone: 'ph-field', cat: 'Training', source: 'Instagram', time: '14h',
        body: 'Mile reps on the track this morning. The work does not lie.' },
      { athlete: 'Faith Kipyegon', handle: '@faithkipyegon', tone: 'ph-plum', cat: 'Off-track', source: 'Instagram', time: '3d',
        body: 'Home in the Rift Valley between blocks. This is where the engine gets built.' },
      { athlete: 'Faith Kipyegon', handle: '@faithkipyegon', tone: 'ph-wine', cat: 'Race day', source: 'Instagram', time: '1w',
        body: 'New York, you were loud. 4:17.78 and a meet record. Onto London.' },
    ],
  },
};

export const ALL_ATHLETE_SLUGS = [...new Set(ALL_ROWS.map((r) => r.slug))];

/* Best mark per event across this athlete's ATHLOS races. */
function athlosBests(rows) {
  const byEvent = new Map();
  for (const r of rows) {
    if (markValue(r.mark) === null) continue;
    const cur = byEvent.get(r.event);
    if (!cur) { byEvent.set(r.event, r); continue; }
    const better = isFieldEvent(r.event)
      ? markValue(r.mark) > markValue(cur.mark)
      : markValue(r.mark) < markValue(cur.mark);
    if (better) byEvent.set(r.event, r);
  }
  return [...byEvent.values()].map((r) => ({
    event: r.event,
    mark: r.mark,
    where: r.meet.replace('ATHLOS ', ''),
    year: r.year,
    mr: r.marks.includes('MR'),
  }));
}

export function getAthleteProfile(slug) {
  const rows = ALL_ROWS.filter((r) => r.slug === slug)
    .sort((a, b) => Number(b.year) - Number(a.year));
  const rostered = ATHLETES.find((a) => a.slug === slug) || null;
  if (!rows.length && !rostered) return null;

  const name = rows[0]?.name || rostered.name;
  const code = rows[0]?.code || rostered.country;
  /* Their signature event: the roster's, else the one they've raced most. */
  const counts = rows.reduce((m, r) => m.set(r.event, (m.get(r.event) || 0) + 1), new Map());
  const event = rostered?.event
    || [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    || '—';

  const extra = AUTHORED[slug] || {};

  return {
    slug,
    name,
    first: name.split(' ')[0],
    code,
    country: countryName(code),
    event,
    tone: rostered?.tone || toneFor(name),
    confirmed2026: Boolean(rostered),
    history: rows,
    athlosBests: athlosBests(rows),
    hometown: extra.hometown || null,
    sponsors: extra.sponsors || [],
    socials: extra.socials || [],
    bio: extra.bio || [],
    bests: extra.bests || [],
    posts: extra.posts || [],
  };
}

/* Three other athletes to surface at the foot — meet-record holders first,
   never the athlete themselves, deterministic so pages stay stable. */
export function relatedAthletes(slug, limit = 3) {
  const seen = new Set([slug]);
  const out = [];
  const ranked = [...ALL_ROWS]
    .filter((r) => r.marks.includes('MR'))
    .sort((a, b) => Number(b.year) - Number(a.year));

  for (const r of [...ranked, ...ALL_ROWS]) {
    if (seen.has(r.slug)) continue;
    seen.add(r.slug);
    out.push({
      slug: r.slug,
      name: r.name,
      event: r.event,
      code: r.code,
      mark: r.mark,
      note: r.marks.includes('MR') ? 'MR' : '',
      tone: toneFor(r.name),
    });
    if (out.length === limit) break;
  }
  return out;
}
