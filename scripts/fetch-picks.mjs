/* Resolves the curated picks to their full-resolution Scoreplay URLs. */
import { writeFileSync } from 'node:fs';
import { searchMedia } from './scoreplay.mjs';

export const PICKS = {
  'faith-kipyegon':      'GLAMSHOOT_KIPYEGON_0773.jpg',
  'tara-davis-woodhall': 'GLAMSHOOT_DAVIS-WOODHALL_1384.jpg',
  'keely-hodgkinson':    'GLAMSHOOT_HODGKINSON_1128.jpg',
  'marileidy-paulino':   'GLAMSHOOT_PAULINO_0915.jpg',
  'brittany-brown':      'GLAMSHOOT_BROWN_1510.jpg',
  'gabby-thomas':        'GLAM 388.jpg',
  'masai-russell':       'IMG_3181.jpg',
};

const out = {};
for (const [slug, filename] of Object.entries(PICKS)) {
  const r = await searchMedia({ media_type: 'photo', name: filename }, 1, 50);
  const hit = (r.media || []).find((m) => m.name === filename);
  if (!hit) { console.log(`${slug.padEnd(22)} NOT FOUND (${filename})`); continue; }
  out[slug] = {
    filename,
    id: hit.ID,
    original: hit.original_url,
    compressed: hit.compressed_url,
    thumb: hit.thumbnail_url,
    w: hit.width, h: hit.height,
  };
  console.log(`${slug.padEnd(22)} id=${hit.ID}  ${hit.width || '?'}x${hit.height || '?'}  original=${hit.original_url ? 'yes' : 'no'}  compressed=${hit.compressed_url ? 'yes' : 'no'}`);
}
writeFileSync('photo-review/resolved.json', JSON.stringify(out, null, 2));
console.log('\nwrote photo-review/resolved.json');
