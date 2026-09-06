/* ATHLOS League — season card derivation.
   One card per athlete-season entry. Result seasons come straight from
   MEET_RESULTS; the upcoming season is derived from the announced roster,
   with each athlete's best prior ATHLOS mark looked up from the results. */

import { MEET_RESULTS } from './results.js';
import { ATHLETES, SEASON_MEET } from './league.js';
import { slugify } from './slug.js';
import { athletePhoto } from './athlete-photos.js';

const TONES = ['ph-wine', 'ph-plum', 'ph-ember', 'ph-field', 'ph-dusk', 'ph-clay'];

const UPCOMING_YEAR = '2026';

export { slugify };

export const isFieldEvent = (event) => /JUMP|THROW|PUT/.test(event);

/* Duotone pairs cycle per athlete so a name always gets the same fallback. */
function toneFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return TONES[h % TONES.length];
}

/* Field marks arrive as "7.13m"; the unit is rendered separately. A
   non-numeric mark (DNF, DNS) never takes a unit. */
function splitMark(raw, event) {
  const mark = String(raw).replace(/m$/, '');
  const numeric = mark.split(':').every((p) => p !== '' && !Number.isNaN(Number(p)));
  return { mark, unit: isFieldEvent(event) && numeric ? 'm' : '' };
}

/* Comparable number: "7.13m" → 7.13, "1:56.53" → 116.53, "DNF" → null. */
function markValue(raw) {
  const parts = String(raw).replace(/m$/, '').split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function resultCard(year, event, a) {
  const place = Number.parseInt(a.place, 10);
  const finished = Number.isFinite(place);
  return {
    year,
    event,
    name: a.who,
    code: a.code,
    slug: slugify(a.who),
    tone: toneFor(a.who),
    place: finished ? place : null,
    status: finished ? null : a.place, // DNF / DNS carry through as-is
    photo: athletePhoto(slugify(a.who), year),
    marks: a.marks || [],
    ...splitMark(a.time, event),
  };
}

const RESULT_SEASONS = Object.keys(MEET_RESULTS)
  .sort((a, b) => Number(b) - Number(a))
  .map((year) => ({
    year,
    upcoming: false,
    cards: MEET_RESULTS[year].flatMap((ev) =>
      ev.athletes.map((a) => resultCard(year, ev.event, a))
    ),
  }));

const ALL_RESULT_CARDS = RESULT_SEASONS.flatMap((s) => s.cards);

/* Best mark this athlete has on record at ATHLOS in this event: furthest for
   field events, fastest for track. Unfinished races don't count. Scoped to the
   event so a 200m card never quotes a 100m time. */
function bestPrior(slug, event) {
  const runs = ALL_RESULT_CARDS.filter(
    (c) => c.slug === slug && c.event === event && markValue(c.mark) !== null
  );
  if (!runs.length) return null;
  const best = runs.reduce((a, b) => {
    const av = markValue(a.mark);
    const bv = markValue(b.mark);
    return isFieldEvent(event) ? (bv > av ? b : a) : (bv < av ? b : a);
  });
  return { mark: best.mark, unit: best.unit, year: best.year };
}

/* The announced roster. Committed, no place and no marks until the meet runs. */
const UPCOMING_SEASON = {
  year: UPCOMING_YEAR,
  upcoming: true,
  cards: ATHLETES.map((a) => {
    const prior = bestPrior(a.slug, a.event);
    const fallback = splitMark(a.mark, a.event);
    return {
      year: UPCOMING_YEAR,
      event: a.event,
      name: a.name,
      code: a.country,
      slug: a.slug,
      tone: a.tone,
      photo: athletePhoto(a.slug, UPCOMING_YEAR),
      committed: true,
      place: null,
      status: null,
      marks: [],
      mark: prior ? prior.mark : fallback.mark,
      unit: prior ? prior.unit : fallback.unit,
      setYear: prior ? prior.year : null,
    };
  }),
};

export const SEASONS = [UPCOMING_SEASON, ...RESULT_SEASONS];

export const ALL_EVENTS = 'All events';

export const EVENT_OPTIONS = [
  ALL_EVENTS,
  ...Array.from(new Set(SEASONS.flatMap((s) => s.cards.map((c) => c.event)))),
];

export const seasonMeta = (year) => SEASON_MEET[year] || 'ATHLOS';

/* Every athlete who has ever appeared on a card, newest season first — the
   pool a fan picks their five from. */
export const ALL_ATHLETES = (() => {
  const seen = new Map();
  for (const season of SEASONS) {
    for (const c of season.cards) {
      if (!seen.has(c.slug)) seen.set(c.slug, { slug: c.slug, name: c.name, code: c.code });
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
})();

/* The card to show for an athlete: their upcoming one if they are on the
   announced roster, otherwise their most recent result. */
export function cardForAthlete(slug) {
  for (const season of SEASONS) {
    const card = season.cards.find((c) => c.slug === slug);
    if (card) return card;
  }
  return null;
}
