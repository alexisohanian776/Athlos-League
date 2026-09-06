'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/current-user';
import { createMeet, deleteMeet, updateMeet } from '@/lib/meets-db';

/* Server actions are directly callable endpoints, so each re-checks the
   session rather than trusting that middleware ran. Meets are ordinary
   league content, so any admin may edit them. */
async function assertAdmin() {
  const user = await currentUser();
  if (!user || user.role !== 'admin') throw new Error('Not authorised.');
  return user;
}

const TONES = ['ph-wine', 'ph-plum', 'ph-ember', 'ph-field', 'ph-dusk', 'ph-clay'];

/* Facts are authored one per line as "Label: Value" — plain enough to type
   quickly, and it avoids a repeating-field widget nobody asked for. */
function parseFacts(raw) {
  return String(raw || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf(':');
      if (at === -1) return { label: line.slice(0, 40), value: '' };
      return { label: line.slice(0, at).trim().slice(0, 40), value: line.slice(at + 1).trim().slice(0, 60) };
    })
    .filter((f) => f.label)
    .slice(0, 8);
}

function parse(formData) {
  const str = (k, max = 200) => String(formData.get(k) ?? '').trim().slice(0, max);
  const int = (k, lo, hi) => {
    const raw = formData.get(k);
    if (raw === null || String(raw).trim() === '') return null;
    const n = Number.parseInt(raw, 10);
    return Number.isNaN(n) ? null : Math.min(hi, Math.max(lo, n));
  };

  const name = str('name', 120);
  if (!name) throw new Error('Name is required.');

  /* The date is required because the year is derived from it rather than
     typed twice — two fields that can disagree is one field too many. */
  const heldOn = str('heldOn', 10);
  if (!heldOn) throw new Error('Date is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(heldOn)) throw new Error('Date must be YYYY-MM-DD.');

  /* One "City, Country" field, split on the last comma so city names
     containing one survive. */
  const location = str('location', 160);
  const comma = location.lastIndexOf(',');
  const city = comma === -1 ? location : location.slice(0, comma).trim();
  const country = comma === -1 ? '' : location.slice(comma + 1).trim();

  const tone = str('tone');

  return {
    name,
    year: heldOn.slice(0, 4),
    heldOn,
    venue: str('venue', 120),
    area: '',
    city,
    country,
    attendance: int('attendance', 0, 500000),
    capacity: int('capacity', 0, 500000),
    events: int('events', 0, 40),
    headline: str('headline', 240),
    facts: parseFacts(formData.get('facts')),
    photoUrl: str('photoUrl', 500) || null,
    tone: TONES.includes(tone) ? tone : 'ph-wine',
    published: formData.get('published') === 'on',
  };
}

function refresh() {
  revalidatePath('/admin/meets');
  revalidatePath('/');
}

export async function updateMeetAction(formData) {
  await assertAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) throw new Error('Bad meet id.');
  await updateMeet(id, parse(formData));
  refresh();
}

export async function createMeetAction(formData) {
  await assertAdmin();
  const slug = String(formData.get('slug') || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(slug)) {
    throw new Error('Slug: lower-case letters, numbers and hyphens.');
  }
  await createMeet({ slug, ...parse(formData) });
  refresh();
}

export async function deleteMeetAction(formData) {
  await assertAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) throw new Error('Bad meet id.');
  await deleteMeet(id);
  refresh();
}
