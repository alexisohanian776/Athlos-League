'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { adminGate } from '@/lib/admin-auth';
import { createClub, deleteClub, updateClub } from '@/lib/clubs-db';

/* Server actions are directly callable endpoints, so each one re-checks the
   admin cookie rather than trusting that middleware ran. */
async function assertAdmin() {
  const value = cookies().get(adminGate.cookie)?.value;
  if (!(await adminGate.isValidCookie(value))) {
    throw new Error('Not authorised.');
  }
}

const TONES = ['ph-wine', 'ph-plum', 'ph-ember', 'ph-field', 'ph-dusk', 'ph-clay'];
const TYPES = ['Official', 'Partner'];
const REGIONS = ['North America', 'Europe'];

function parseClub(formData) {
  const str = (k, max = 120) => String(formData.get(k) ?? '').trim().slice(0, max);
  const name = str('name');
  if (!name) throw new Error('Name is required.');
  const city = str('city');
  if (!city) throw new Error('City is required.');

  const num = (k, lo, hi) => {
    const raw = formData.get(k);
    if (raw === null || raw === '') return null;
    const n = Number(raw);
    if (Number.isNaN(n)) return null;
    return Math.min(hi, Math.max(lo, n));
  };

  const type = str('type');
  const region = str('region');
  const tone = str('tone');

  return {
    name,
    city,
    type: TYPES.includes(type) ? type : 'Official',
    region: REGIONS.includes(region) ? region : 'North America',
    tone: TONES.includes(tone) ? tone : 'ph-wine',
    code: str('code', 3).toUpperCase() || 'USA',
    hood: str('hood') || null,
    organizer: str('organizer') || null,
    members: num('members', 0, 1_000_000) ?? 0,
    next: str('next') || null,
    founded: str('founded', 4) || null,
    mapX: num('mapX', 0, 100),
    mapY: num('mapY', 0, 100),
    photo: str('photo', 500) || null,
  };
}

function refresh(slug) {
  revalidatePath('/admin');
  revalidatePath('/run-clubs');
  revalidatePath('/');
  if (slug) revalidatePath(`/run-clubs/${slug}`);
}

export async function addClubAction(formData) {
  await assertAdmin();
  const club = await createClub(parseClub(formData));
  refresh(club.slug);
}

export async function updateClubAction(formData) {
  await assertAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) throw new Error('Bad club id.');
  const club = await updateClub(id, parseClub(formData));
  refresh(club?.slug);
}

export async function deleteClubAction(formData) {
  await assertAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) throw new Error('Bad club id.');
  const slug = await deleteClub(id);
  refresh(slug);
}
