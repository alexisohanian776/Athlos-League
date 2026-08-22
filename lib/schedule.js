/* ATHLOS League — schedule content: the 2026 upcoming meets and the
   past-meets archive. Full results come from MEET_RESULTS (results.js);
   `marquee` is the headline meet records for each past meet. */

export const SEASON_EVENTS = ['100M', '200M', '400M', '800M', 'MILE', '100M HURDLES', 'LONG JUMP'];

/* Confirmed-athlete preview per upcoming meet, drawn from the roster. */
export const CONFIRMED = {
  London: {
    names: ['Faith Kipyegon', "Sha'Carri Richardson", 'Keely Hodgkinson', 'Masai Russell'],
    total: 38,
    tones: ['ph-field', 'ph-wine', 'ph-plum', 'ph-wine'],
  },
  'New York': {
    names: ['Gabby Thomas', 'Marileidy Paulino', 'Tara Davis-Woodhall', 'Brittany Brown'],
    total: 31,
    tones: ['ph-dusk', 'ph-ember', 'ph-clay', 'ph-dusk'],
  },
};

export const PAST_MEETS = [
  {
    year: '2025', slug: '2025-nyc', date: 'Oct 10, 2025', venue: 'Icahn Stadium',
    area: "Randall's Island, NYC", events: 7, tone: 'ph-wine',
    map: 'https://www.google.com/maps/search/?api=1&query=Icahn+Stadium+Randalls+Island+New+York',
    attendees: 342,
    fans: ['Maya R.', 'Devon K.', 'Aisha B.', 'Liam T.', 'Priya S.', 'Jordan M.'],
    marquee: [
      { who: 'Faith Kipyegon', ev: 'MILE', mark: '4:17.78', note: 'MR' },
      { who: 'Tara Davis-Woodhall', ev: 'LONG JUMP', mark: '7.13m', note: 'MR' },
      { who: 'Brittany Brown', ev: '200M', mark: '21.89', note: 'MR' },
    ],
  },
  {
    year: '2024', slug: '2024-nyc', date: 'Sep 26, 2024', venue: 'Icahn Stadium',
    area: "Randall's Island, NYC", events: 6, tone: 'ph-plum',
    map: 'https://www.google.com/maps/search/?api=1&query=Icahn+Stadium+Randalls+Island+New+York',
    attendees: 218,
    fans: ['Sofia L.', 'Marcus D.', 'Nina P.', 'Tomás G.', 'Hana W.', 'Eli R.'],
    marquee: [
      { who: 'Marie-Josee Ta Lou-Smith', ev: '100M', mark: '10.98', note: 'MR' },
      { who: 'Faith Kipyegon', ev: '1500M', mark: '4:04.79', note: 'MR' },
      { who: 'Marileidy Paulino', ev: '400M', mark: '49.59', note: 'MR' },
    ],
  },
];

export const FAN_TONES = ['ph-wine', 'ph-dusk', 'ph-field', 'ph-ember', 'ph-plum', 'ph-clay'];

export const VERIFY_EMAIL = 'attended@athlosleague.com';
