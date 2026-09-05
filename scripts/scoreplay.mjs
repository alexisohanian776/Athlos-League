/* Scoreplay Media API client for curating athlete photography.
   Read-only: resolves athletes to player ids and searches their media. */
import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const BASE = 'https://media.scoreplay.io/v1';
const KEY = process.env.SCOREPLAY_API_KEY;
if (!KEY) throw new Error('SCOREPLAY_API_KEY missing');

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'X-ScorePlay-Api-Key': KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

export async function findPlayers(name) {
  const r = await api(`/tag/search?query=${encodeURIComponent(name)}`);
  return (r.players || []).map((p) => ({ id: p.ID, name: p.full_name, mediaCount: p.media_count }));
}

export async function searchMedia(payload, page = 1, perPage = 100) {
  return api(`/media/search?page=${page}&per_page=${perPage}`, { method: 'POST', body: payload });
}

export { api };
