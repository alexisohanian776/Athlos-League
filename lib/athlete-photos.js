/* Athlete photography from Scoreplay, served from Blob.

   `studio` is the posed portrait — used for the profile hero and the 2026
   card, since neither is tied to a race. `seasons` holds the frame shot at
   that meet, so a 2025 photo only ever appears on a 2025 card.

   Season frames come from the league's curated "Athlete Card" selection
   where one exists; entries marked `auto` are automatic picks awaiting
   curation. */

const BLOB = 'https://cq8tl0fe8vkndzbb.public.blob.vercel-storage.com/athletes';

const PHOTOS = {
  'addy-wiley': { seasons: { '2024': `${BLOB}/addy-wiley-2024.jpg` } },
  'alaysha-johnson': { seasons: { '2024': `${BLOB}/alaysha-johnson-2024.jpg`, '2025': `${BLOB}/alaysha-johnson-2025.jpg` } },
  'alexis-holmes': { seasons: { '2024': `${BLOB}/alexis-holmes-2024.jpg`, '2025': `${BLOB}/alexis-holmes-2025.jpg` } },
  'amber-anning': { seasons: { '2025': `${BLOB}/amber-anning-2025.jpg` } },
  'amy-hunt': { seasons: { '2025': `${BLOB}/amy-hunt-2025.jpg` } },
  'anavia-battle': { seasons: { '2024': `${BLOB}/anavia-battle-2024.jpg`, '2025': `${BLOB}/anavia-battle-2025.jpg` } },
  'brittany-brown': { studio: `${BLOB}/brittany-brown.jpg`, seasons: { '2024': `${BLOB}/brittany-brown-2024.jpg`, '2025': `${BLOB}/brittany-brown-2025.jpg` } },
  'candace-hill': { seasons: { '2024': `${BLOB}/candace-hill-2024.jpg` } },
  'celera-barnes': { seasons: { '2024': `${BLOB}/celera-barnes-2024.jpg`, '2025': `${BLOB}/celera-barnes-2025.jpg` } },
  'charisma-taylor': { seasons: { '2024': `${BLOB}/charisma-taylor-2024.jpg` } },
  'cory-mcgee': { seasons: { '2024': `${BLOB}/cory-mcgee-2024.jpg` } },
  'danielle-williams': { seasons: { '2024': `${BLOB}/danielle-williams-2024.jpg` } },
  'devynne-charlton': { seasons: { '2025': `${BLOB}/devynne-charlton-2025.jpg` } },
  'faith-kipyegon': { studio: `${BLOB}/faith-kipyegon.jpg`, seasons: { '2024': `${BLOB}/faith-kipyegon-2024.jpg`, '2025': `${BLOB}/faith-kipyegon-2025.jpg` } },
  'freweyni-hailu': { seasons: { '2025': `${BLOB}/freweyni-hailu-2025.jpg` } },
  'gabby-thomas': { studio: `${BLOB}/gabby-thomas.jpg`, seasons: { '2024': `${BLOB}/gabby-thomas-2024.jpg` } },
  'georgia-hunter-bell': { seasons: { '2025': `${BLOB}/georgia-hunter-bell-2025.jpg` } },
  'grace-stark': { seasons: { '2025': `${BLOB}/grace-stark-2025.jpg` } },
  'gudaf-tsegay': { seasons: { '2024': `${BLOB}/gudaf-tsegay-2024.jpg`, '2025': `${BLOB}/gudaf-tsegay-2025.jpg` } },
  'halimah-nakaayi': { seasons: { '2024': `${BLOB}/halimah-nakaayi-2024.jpg`, '2025': `${BLOB}/halimah-nakaayi-2025.jpg` } },
  'henriette-jaeger': { seasons: { '2025': `${BLOB}/henriette-jaeger-2025.jpg` } },
  'jacious-sears': { seasons: { '2025': `${BLOB}/jacious-sears-2025.jpg` } },
  'jasmine-camacho-quinn': { seasons: { '2024': `${BLOB}/jasmine-camacho-quinn-2024.jpg` } },
  'jasmine-moore': { seasons: { '2025': `${BLOB}/jasmine-moore-2025.jpg` } },
  'jazmin-sawyers': { seasons: { '2025': `${BLOB}/jazmin-sawyers-2025.jpg` } },
  'jenna-prandini': { seasons: { '2024': `${BLOB}/jenna-prandini-2024.jpg` } },
  'jessika-gbai': { seasons: { '2025': `${BLOB}/jessika-gbai-2025.jpg` } },
  'jonielle-smith': { seasons: { '2025': `${BLOB}/jonielle-smith-2025.jpg` } },
  'katie-snowden': { seasons: { '2024': `${BLOB}/katie-snowden-2024.jpg` } },
  'kayla-white': { seasons: { '2025': `${BLOB}/kayla-white-2025.jpg` } },
  'keely-hodgkinson': { studio: `${BLOB}/keely-hodgkinson.jpg`, seasons: { '2025': `${BLOB}/keely-hodgkinson-2025.jpg` } },
  'lieke-klaver': { seasons: { '2024': `${BLOB}/lieke-klaver-2024.jpg` } },
  'marie-josee-ta-lou-smith': { seasons: { '2024': `${BLOB}/marie-josee-ta-lou-smith-2024.jpg`, '2025': `${BLOB}/marie-josee-ta-lou-smith-2025.jpg` } },
  'marileidy-paulino': { studio: `${BLOB}/marileidy-paulino.jpg`, seasons: { '2024': `${BLOB}/marileidy-paulino-2024.jpg`, '2025': `${BLOB}/marileidy-paulino-2025.jpg` } },
  'mary-moraa': { seasons: { '2024': `${BLOB}/mary-moraa-2024.jpg` } },
  'masai-russell': { studio: `${BLOB}/masai-russell.jpg`, seasons: { '2024': `${BLOB}/masai-russell-2024.jpg`, '2025': `${BLOB}/masai-russell-2025.jpg` } },
  'mckenzie-long': { seasons: { '2025': `${BLOB}/mckenzie-long-2025.jpg` } },
  'megan-tapper': { seasons: { '2025': `${BLOB}/megan-tapper-2025.jpg` } },
  'natoya-goule-toppin': { seasons: { '2024': `${BLOB}/natoya-goule-toppin-2024.jpg`, '2025': `${BLOB}/natoya-goule-toppin-2025.jpg` } },
  'nia-akins': { seasons: { '2024': `${BLOB}/nia-akins-2024.jpg` } },
  'nikki-hiltz': { seasons: { '2025': `${BLOB}/nikki-hiltz-2025.jpg` } },
  'quanesha-burks': { seasons: { '2025': `${BLOB}/quanesha-burks-2025.jpg` } },
  'salwa-eid-naser': { seasons: { '2024': `${BLOB}/salwa-eid-naser-2024.jpg`, '2025': `${BLOB}/salwa-eid-naser-2025.jpg` } },
  'shafiqua-maloney': { seasons: { '2025': `${BLOB}/shafiqua-maloney-2025.jpg` } },
  'shamier-little': { seasons: { '2024': `${BLOB}/shamier-little-2024.jpg` } },
  'susan-ejore-sanders': { seasons: { '2024': `${BLOB}/susan-ejore-sanders-2024.jpg`, '2025': `${BLOB}/susan-ejore-sanders-2025.jpg` } },
  'tamara-clark': { seasons: { '2024': `${BLOB}/tamara-clark-2024.jpg` } },
  'tara-davis-woodhall': { studio: `${BLOB}/tara-davis-woodhall.jpg`, seasons: { '2025': `${BLOB}/tara-davis-woodhall-2025.jpg` } },
  'tonea-marshall': { seasons: { '2024': `${BLOB}/tonea-marshall-2024.jpg`, '2025': `${BLOB}/tonea-marshall-2025.jpg` } },
  'torrie-lewis': { seasons: { '2024': `${BLOB}/torrie-lewis-2024.jpg` } },
  'zoe-hobbs': { seasons: { '2024': `${BLOB}/zoe-hobbs-2024.jpg`, '2025': `${BLOB}/zoe-hobbs-2025.jpg` } },
};

/* The card for a season: that season's frame, else the studio portrait. */
export function athletePhoto(slug, year) {
  const entry = PHOTOS[slug];
  if (!entry) return null;
  if (year && entry.seasons?.[String(year)]) return entry.seasons[String(year)];
  return entry.studio || null;
}

/* The profile hero prefers the posed portrait, then the most recent frame. */
export function athleteHero(slug) {
  const entry = PHOTOS[slug];
  if (!entry) return null;
  if (entry.studio) return entry.studio;
  const years = Object.keys(entry.seasons || {}).sort().reverse();
  return years.length ? entry.seasons[years[0]] : null;
}
