/* Resolves every athlete in the results to a Scoreplay player id.
   Exact full-name match only — surname search pulls in the wrong people
   (a "Russell" search returns Russell Wilson). */
import { writeFileSync } from 'node:fs';
import { api } from './scoreplay.mjs';
import { MEET_RESULTS } from '../lib/results.js';
import { ATHLETES } from '../lib/league.js';
import { slugify } from '../lib/slug.js';

const names = new Set();
for (const year of Object.keys(MEET_RESULTS)) {
  for (const ev of MEET_RESULTS[year]) for (const a of ev.athletes) names.add(a.who);
}
for (const a of ATHLETES) names.add(a.name);

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z ]/g, '').trim();

/* Scoreplay records with different spellings, typos, or shortened names.
   Mapped explicitly so we never guess by surname. */
const ALIASES = {
  'Jasmine Camacho-Quinn': 198534,
  'Lieke Klaver': 132342,
  'Marileidy Paulino': 132343,
  'Salwa Eid Naser': 198542,
  'Gudaf Tsegay': 132349,
  'Marie-Josee Ta Lou-Smith': 198539,
};

const out = {};
const unresolved = [];
for (const name of [...names].sort()) {
  const r = await api(`/tag/search?query=${encodeURIComponent(name)}`);
  const players = r.players || [];
  const exact = players.find((p) => norm(p.full_name) === norm(name));
  if (ALIASES[name]) {
    out[slugify(name)] = { name, playerId: ALIASES[name], matched: 'alias' };
  } else if (exact) {
    out[slugify(name)] = { name, playerId: exact.ID, matched: exact.full_name };
  } else {
    unresolved.push({ name, candidates: players.map((p) => p.full_name) });
  }
}
writeFileSync('photo-review/players.json', JSON.stringify(out, null, 2));
console.log(`resolved ${Object.keys(out).length} / ${names.size}`);
if (unresolved.length) {
  console.log('\nunresolved:');
  for (const u of unresolved) console.log('  ', u.name, u.candidates.length ? `(saw: ${u.candidates.slice(0,3).join(', ')})` : '(no matches)');
}
