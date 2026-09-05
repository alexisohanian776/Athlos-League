/* /media/{id} does not return image URLs or dimensions; /media/search does.
   Backfills both onto the selection by searching each filename and matching
   on media id. */
import { readFileSync, writeFileSync } from 'node:fs';
import { searchMedia } from './scoreplay.mjs';

const sel = JSON.parse(readFileSync('photo-review/selection.json', 'utf8'));
let filled = 0, missed = 0;

for (const f of sel) {
  if (f.compressed) continue;
  try {
    const r = await searchMedia({ media_type: 'photo', name: f.name }, 1, 50);
    const hit = (r.media || []).find((m) => m.ID === f.id);
    if (hit) {
      f.compressed = hit.compressed_url;
      f.thumb = hit.thumbnail_url;
      f.w = hit.width || null;
      f.h = hit.height || null;
      filled++;
    } else { missed++; }
  } catch { missed++; }
}

writeFileSync('photo-review/selection.json', JSON.stringify(sel, null, 2));
console.log(`filled ${filled}, could not resolve ${missed}`);
