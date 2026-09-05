/* ATHLOS League — shared league data and site nav. */

/* Schedule is no longer a nav item — the wordmark is the route home and the
   home page carries the schedule. NAV_HREF keeps a Schedule entry so any
   lingering reference resolves to home. */
export const NAV = ['Athletes', 'Run Clubs', 'VIP'];

export const NAV_HREF = {
  Schedule: '/',
  Athletes: '/athletes',
  'Run Clubs': '/run-clubs',
  VIP: '/vip',
};

/* 2026 is a single-city season: London only. Past meets (2024, 2025) were
   run in New York and are kept in the archive. */
export const MEETS = [
  {
    city: 'London', name: 'ATHLOS London', date: 'Sept 18, 2026', iso: '2026-09-18',
    dow: 'Friday', time: '7:00 PM BST', venue: 'Stone X Stadium', area: 'Hendon, London',
    tone: 'ph-dusk', ticketsLive: true,
    photo: 'https://cq8tl0fe8vkndzbb.public.blob.vercel-storage.com/meets/london-2026.jpg',
    ticketUrl: 'https://www.eticketing.co.uk/saracens/EDP/Event/Index/504??utm_source=clubaff&utm_medium=ref&utm_campaign=AthlosWeb',
  },
];

/* All-time ATHLOS meet records (2024–2025 results). */
export const MEET_RECORDS = [
  { ev: '100M',      t: '10.98',   who: 'Ta Lou-Smith',   yr: '24' },
  { ev: '200M',      t: '21.89',   who: 'Brittany Brown', yr: '25' },
  { ev: '400M',      t: '49.59',   who: 'M. Paulino',     yr: '24' },
  { ev: '800M',      t: '1:56.53', who: 'K. Hodgkinson',  yr: '25' },
  { ev: 'MILE',      t: '4:17.78', who: 'F. Kipyegon',    yr: '25' },
  { ev: '100M H',    t: '12.36',   who: 'Camacho-Quinn',  yr: '24' },
  { ev: 'LONG JUMP', t: '7.13m',   who: 'Davis-Woodhall', yr: '25' },
];

/* Days until a meet, counted from `now`. The hero countdown is computed
   rather than stored so it never goes stale. */
export function daysUntil(iso, now = new Date()) {
  const DAY = 24 * 60 * 60 * 1000;
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const [y, m, d] = iso.split('-').map(Number);
  return Math.max(0, Math.round((Date.UTC(y, m - 1, d) - start) / DAY));
}

/* Announced 2026 roster. Until the meet runs these are commitments, not
   results — `mark` is the athlete's season best at ATHLOS to date. */
export const ATHLETES = [
  { slug: 'faith-kipyegon',       name: 'Faith Kipyegon',       event: 'MILE',         country: 'KEN', tone: 'ph-field', mark: '4:17.78' },
  { slug: 'sha-carri-richardson', name: "Sha'Carri Richardson", event: '100M',         country: 'USA', tone: 'ph-wine',  mark: '10.71' },
  { slug: 'gabby-thomas',         name: 'Gabby Thomas',         event: '200M',         country: 'USA', tone: 'ph-dusk',  mark: '22.21' },
  { slug: 'tara-davis-woodhall',  name: 'Tara Davis-Woodhall',  event: 'LONG JUMP',    country: 'USA', tone: 'ph-clay',  mark: '7.13m' },
  { slug: 'keely-hodgkinson',     name: 'Keely Hodgkinson',     event: '800M',         country: 'GBR', tone: 'ph-plum',  mark: '1:56.53' },
  { slug: 'marileidy-paulino',    name: 'Marileidy Paulino',    event: '400M',         country: 'DOM', tone: 'ph-ember', mark: '49.59' },
  { slug: 'masai-russell',        name: 'Masai Russell',        event: '100M HURDLES', country: 'USA', tone: 'ph-wine',  mark: '12.44' },
  { slug: 'brittany-brown',       name: 'Brittany Brown',       event: '200M',         country: 'USA', tone: 'ph-dusk',  mark: '21.89' },
];

/* Where each season was run. Drives the season bar's meta line. */
export const SEASON_MEET = {
  2026: 'London · Stone X Stadium · 18 Sept',
  2025: 'New York · Icahn Stadium',
  2024: 'New York · Icahn Stadium',
};
