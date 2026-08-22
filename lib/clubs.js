/* ATHLOS League — official and partner run clubs.
   mapX/mapY are percentage positions on the decorative locator map. In
   production these want real lat/long projected to the map, or a map library. */

export const CLUB_REGIONS = ['All', 'North America', 'Europe'];

import { slugify as clubSlug } from './slug.js';

export { clubSlug };

const CLUB_LIST = [
  { name: 'RUNPAC', type: 'Partner', city: 'New York', code: 'USA', region: 'North America', hood: 'Harlem', organizer: 'Jelani Ford', members: 540, next: 'Wed 6:30 AM', tone: 'ph-wine', mapX: 34.4, mapY: 56.4, founded: '2022' },
  { name: 'ATHLOS Run Club NYC', type: 'Official', city: 'New York', code: 'USA', region: 'North America', hood: 'Lower East Side', organizer: 'Renata Cross', members: 312, next: 'Sat 9:00 AM', tone: 'ph-plum', mapX: 32.9, mapY: 58.0, founded: '2024' },
  { name: 'ATHLOS Run Club Brooklyn', type: 'Official', city: 'Brooklyn', code: 'USA', region: 'North America', hood: 'Williamsburg', organizer: 'Devon Hale', members: 47, next: 'Tue 7:00 AM', tone: 'ph-ember', mapX: 35.4, mapY: 61.0, founded: '2025' },
  { name: 'ATHLOS Run Club LA', type: 'Official', city: 'Los Angeles', code: 'USA', region: 'North America', hood: 'Silver Lake', organizer: 'Mara Quinn', members: 188, next: 'Sun 8:00 AM', tone: 'ph-dusk', mapX: 7.1, mapY: 70.4, founded: '2024' },
  { name: 'ATHLOS Run Club London', type: 'Official', city: 'London', code: 'GBR', region: 'Europe', hood: 'Hackney', organizer: 'Theo Bramwell', members: 96, next: 'Sat 8:30 AM', tone: 'ph-clay', mapX: 76.4, mapY: 38.0, founded: '2025' },
];

export const CLUBS = CLUB_LIST.map((c) => ({ ...c, slug: clubSlug(c.name) }));

export const totalRunners = CLUBS.reduce((s, c) => s + c.members, 0);
export const regionCount = new Set(CLUBS.map((c) => c.region)).size;

/* Per-club page content, keyed by slug. Only RUNPAC is authored in the design;
   the rest render from their directory record until content lands. */
export const CLUB_DETAIL = {
  runpac: {
    about: [
      'RUNPAC started with six people meeting at the Marcus Garvey Park track before sunrise. Four years later we are a few hundred deep, running uptown six days a week — every pace, every level, no one left behind.',
      'We partnered with ATHLOS because the mission lines up: put the work in together, then go watch the fastest women on Earth do it on the big stage. New runners welcome. Just show up.',
    ],
    socials: [
      { net: 'Instagram', handle: '@runpac' },
      { net: 'Strava', handle: 'RUNPAC Club' },
    ],
    photos: ['ph-wine', 'ph-dusk', 'ph-plum', 'ph-ember', 'ph-clay'],
    runs: [
      { dow: 'WED', date: 'Jun 4', time: '6:30 AM', plan: 'Easy 5 — recovery pace', loc: 'Marcus Garvey Park · Harlem', pace: '8:30–9:30 /mi', going: 14,
        faces: ['Amara O.', 'Devon K.', 'Priya S.', 'Marcus D.', 'Nina P.'] },
      { dow: 'SAT', date: 'Jun 7', time: '8:00 AM', plan: 'Long run 10 — Central Park loops', loc: "Engineers' Gate · Central Park", pace: '7:00–9:00 /mi', going: 38,
        faces: ['Tomás G.', 'Hana W.', 'Eli R.', 'Maya R.', 'Liam T.', 'Sofia L.'] },
      { dow: 'WED', date: 'Jun 11', time: '6:30 AM', plan: 'Track Tuesday (on a Wednesday) — 6×800', loc: 'Icahn Stadium · Randalls Island', pace: 'Effort-based', going: 9,
        faces: ['Renata C.', 'Jordan M.', 'Aisha B.'] },
    ],
    roster: ['Amara O.', 'Devon K.', 'Priya S.', 'Marcus D.', 'Nina P.', 'Tomás G.', 'Hana W.', 'Eli R.', 'Maya R.', 'Liam T.', 'Sofia L.', 'Jordan M.'],
  },
};

export const CLUB_FAN_TONES = ['ph-wine', 'ph-dusk', 'ph-field', 'ph-ember', 'ph-plum', 'ph-clay'];

export const findClub = (slug) => CLUBS.find((c) => c.slug === slug) || null;
