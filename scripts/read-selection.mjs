/* Reads the curated "Athlete Card" selection and resolves each frame to an
   athlete and a season.

   Athlete tags live in tags[].player_id / tags[].player.full_name, and season
   is a real tag (type === 'season') — more reliable than the filename, and far
   more reliable than `date`, which is the upload date. */
import { readFileSync, writeFileSync } from 'node:fs';
import { api } from './scoreplay.mjs';

const ids = readFileSync('/tmp/ids.txt', 'utf8').trim().split(',').map((s) => s.trim()).filter(Boolean);

const seasonFromName = (name) => {
  const n = String(name).toLowerCase();
  if (/athlos\s*'?25|athlos25|2025|10 ?10 ?25/.test(n)) return '2025';
  if (/athlos\s*'?24|athlos24|2024/.test(n)) return '2024';
  return null;
};

const out = [];
for (const id of ids) {
  let media;
  try {
    const r = await api(`/media/${id}`);
    media = r.media || r;
  } catch (e) {
    out.push({ id, error: String(e).slice(0, 90) });
    continue;
  }
  const tags = media.tags || [];
  const players = tags
    .filter((t) => t.player_id && t.player_id !== 0)
    .map((t) => ({ id: t.player_id, name: t.player?.full_name || String(t.player_id) }));
  const seasonTag = tags.find((t) => t.tag_option?.type === 'season')?.tag_option?.label;
  const season = (seasonTag && seasonTag.match(/20\d\d/)?.[0]) || seasonFromName(media.name);

  out.push({
    id: Number(id),
    name: media.name,
    season,
    seasonTag: seasonTag || null,
    players,
    w: media.width || null,
    h: media.height || null,
    compressed: media.compressed_url,
    thumb: media.thumbnail_url,
  });
}

writeFileSync('photo-review/selection.json', JSON.stringify(out, null, 2));

const tagged = out.filter((o) => o.players?.length);
const solo = tagged.filter((o) => o.players.length === 1);
console.log(`fetched ${out.length}  ·  tagged ${tagged.length}  ·  single-athlete ${solo.length}`);
const bySeason = {};
for (const o of tagged) bySeason[o.season || 'unknown'] = (bySeason[o.season || 'unknown'] || 0) + 1;
console.log('by season:', JSON.stringify(bySeason));
console.log('\nuntagged frames (cannot be placed):');
for (const o of out.filter((o) => !o.players?.length)) console.log('  ', o.id, String(o.name).slice(0, 50), o.error ? `ERR ${o.error}` : '');
