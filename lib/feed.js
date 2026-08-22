/* ATHLOS League — "From our athletes" photo posts and the league updates wire.
   POSTS is a recency feed, newest first, deep-linking out to the source. */

export const POSTS = [
  { athlete: 'Gabby Thomas', handle: '@gabbythomas', tone: 'ph-dusk', cat: 'Off-track', source: 'Instagram', time: '2h',
    body: 'Sunday reset before the season ramps all the way up. London, then New York — coming for both.' },
  { athlete: 'ATHLOS', handle: 'ATHLOS team', tone: 'ph-plum', cat: 'Race day', source: 'ATHLOS team', time: '5h',
    body: 'Tunnel before a final hits different. Shot from the floor at Icahn last October.' },
  { athlete: "Sha'Carri Richardson", handle: '@itskerrii', tone: 'ph-wine', cat: 'Race day', source: 'Instagram', time: '9h',
    body: 'London. September. You already know. See you on the line.' },
  { athlete: 'Faith Kipyegon', handle: '@faithkipyegon', tone: 'ph-field', cat: 'Training', source: 'Instagram', time: '14h',
    body: 'Mile reps on the track this morning. The work does not lie.' },
  { athlete: 'Masai Russell', handle: '@masai.russell', tone: 'ph-wine', cat: 'Pro Tips', source: 'TikTok', time: '1d',
    body: 'Three drills I run before every single warmup. Save this — your hurdles will thank you.' },
  { athlete: 'Tara Davis-Woodhall', handle: '@tarathejumpa', tone: 'ph-clay', cat: 'Off-track', source: 'Instagram', time: '1d',
    body: 'Recovery day done right. Hubby, the dogs, and zero alarms.' },
  { athlete: 'Brittany Brown', handle: '@brittanybrown_', tone: 'ph-dusk', cat: 'Race day', source: 'Instagram', time: '2d',
    body: '21.89 still does not feel real. Meet record, and there is more in the tank.' },
  { athlete: 'Marileidy Paulino', handle: '@marileidy_paulino', tone: 'ph-ember', cat: 'Race day', source: 'Instagram', time: '3d',
    body: 'The 400 is a lonely event. Just you against the clock. I would not trade it.' },
  { athlete: 'Keely Hodgkinson', handle: '@keelyhodgkinson', tone: 'ph-plum', cat: 'Training', source: 'Instagram', time: '4d',
    body: '800 pace work today. Negative splits or nothing at all.' },
];

export const POST_FILTERS = ['Latest', 'Training', 'Race day', 'Off-track', 'Pro Tips'];

export const UPDATES = [
  { title: "Sha'Carri Richardson confirmed for ATHLOS London", cat: 'Athlete', date: '2d', comments: 48, votes: 312,
    teaser: 'The 100m champion lines up at Stone X Stadium this September.' },
  { title: 'NOBULL renews. Three more years on the line.', cat: 'Brand', date: '4d', comments: 21, votes: 140,
    teaser: 'The footwear partner extends its deal through the 2028 season.' },
  { title: 'Whoop joins as official wearables partner', cat: 'Brand', date: '6d', comments: 12, votes: 96,
    teaser: 'Every athlete runs the season with a band on the wrist.' },
  { title: 'London tickets drop Friday at noon BST', cat: 'Meet', date: '1w', comments: 33, votes: 205,
    teaser: 'Lower-bowl trackside seats go first. Set an alarm.' },
  { title: 'Three new athletes signed for 2027', cat: 'Athlete', date: '1w', comments: 18, votes: 88,
    teaser: 'The roster keeps getting deeper. Names inside.' },
];
