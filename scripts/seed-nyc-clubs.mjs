/* The three NYC clubs ATHLOS sponsors.

   Member counts and run cadence come from the league. Everything else is from
   each club's own site or reporting — fields that could not be verified are
   left null rather than guessed at (notably organizer names). */
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const sql = neon(process.env.DATABASE_URL);

const CLUBS = [
  {
    slug: 'brooklyn-track-club',
    name: 'Brooklyn Track Club',
    type: 'Partner', city: 'Brooklyn', code: 'USA', region: 'North America',
    hood: null, organizer: null, members: 1000,
    next_run: '3–4× / week', founded: '2016', tone: 'ph-wine',
    map_x: 35.6, map_y: 61.4,
    website: 'https://www.brooklyntrackclub.org',
    instagram: '@brooklyntrackclub', strava: null,
    about: [
      'Brooklyn Track Club was established in 2016 and has grown into one of the most competitive clubs in the city, sending athletes to USATF championship events and Olympic Trials qualifiers.',
      'Weekly group workouts bring together runners of every level across the five boroughs, with a strong female contingent and real track and field literacy — which is exactly why the league works with them.',
    ].join('\n\n'),
  },
  {
    slug: 'boogie-down-bronx-runners',
    name: 'Boogie Down Bronx Runners',
    type: 'Partner', city: 'Bronx', code: 'USA', region: 'North America',
    hood: 'Pelham Parkway', organizer: null, members: 800,
    next_run: 'Tue 7:00 PM', founded: '2017', tone: 'ph-ember',
    map_x: 34.0, map_y: 55.2,
    website: null,
    instagram: '@boogiedownbronxrunners', strava: null,
    about: [
      'A collective of everyday Bronx residents turning non-runners into runners. Boogie Down runs a 3-mile loop every Tuesday evening and a 2-mile walk-run on Sunday mornings, both from the Pelham Cornerstone Community Center.',
      'Its all-women leadership has built one of the city’s clearest examples of a safe, welcoming space for female runners, and its cheer sections at the New York City Marathon are an institution in their own right.',
    ].join('\n\n'),
  },
  {
    slug: 'front-runners-new-york',
    name: 'Front Runners New York',
    type: 'Partner', city: 'New York', code: 'USA', region: 'North America',
    hood: 'Central Park', organizer: null, members: 1200,
    next_run: 'Sat 10:00 AM', founded: '1979', tone: 'ph-dusk',
    map_x: 33.4, map_y: 57.2,
    website: 'https://frny.org',
    instagram: '@frontrunnersny', strava: null,
    about: [
      'Founded in October 1979 and named for Patricia Nell Warren’s novel The Front Runner, FRNY is the largest LGBTQ+ running community in New York and one of the oldest in the world.',
      'The Saturday Fun Run is the club’s mainstay: 10:00 AM in Central Park at the 72nd Street Traverse and West Drive, every pace and distance welcome, no membership required to join in.',
    ].join('\n\n'),
  },
];

for (const c of CLUBS) {
  const rows = await sql`
    INSERT INTO run_clubs
      (slug, name, type, city, code, region, hood, organizer, members, next_run,
       tone, map_x, map_y, founded, about, website, instagram, strava, sort_order)
    VALUES
      (${c.slug}, ${c.name}, ${c.type}, ${c.city}, ${c.code}, ${c.region}, ${c.hood},
       ${c.organizer}, ${c.members}, ${c.next_run}, ${c.tone}, ${c.map_x}, ${c.map_y},
       ${c.founded}, ${c.about}, ${c.website}, ${c.instagram}, ${c.strava},
       (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM run_clubs))
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name, type = EXCLUDED.type, city = EXCLUDED.city,
      region = EXCLUDED.region, hood = EXCLUDED.hood, members = EXCLUDED.members,
      next_run = EXCLUDED.next_run, tone = EXCLUDED.tone,
      map_x = EXCLUDED.map_x, map_y = EXCLUDED.map_y, founded = EXCLUDED.founded,
      about = EXCLUDED.about, website = EXCLUDED.website,
      instagram = EXCLUDED.instagram, updated_at = now()
    RETURNING slug, name, members, founded
  `;
  console.log('  ', rows[0].slug.padEnd(28), rows[0].name.padEnd(28), rows[0].members, 'est.', rows[0].founded);
}

console.log('\nall clubs now:');
console.table(await sql`SELECT slug, type, city, members, founded FROM run_clubs ORDER BY sort_order`);
