'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/current-user';
import { getClub, updateClub } from '@/lib/clubs-db';
import { getUserById } from '@/lib/users-db';

const TONES = ['ph-wine', 'ph-plum', 'ph-ember', 'ph-field', 'ph-dusk', 'ph-clay'];

/* A leader may only ever touch their own club. The club id comes from the
   database record, never from the submitted form. */
async function assertCanEdit(formId) {
  const session = await currentUser();
  if (!session) throw new Error('Not signed in.');

  const id = Number(formId);
  if (!Number.isInteger(id)) throw new Error('Bad club id.');

  if (session.role === 'admin') return id;

  const user = await getUserById(session.id);
  if (!user || user.role !== 'leader' || !user.clubId) throw new Error('Not authorised.');
  if (user.clubId !== id) throw new Error('You can only edit your own club.');
  return id;
}

export async function updateMyClubAction(formData) {
  const id = await assertCanEdit(formData.get('id'));
  const existing = await getClub((await getClubSlugById(id)) || '');

  const str = (k, max = 200) => String(formData.get(k) ?? '').trim().slice(0, max);
  const num = (k, lo, hi) => {
    const raw = formData.get(k);
    if (raw === null || raw === '') return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : Math.min(hi, Math.max(lo, n));
  };

  const name = str('name', 120);
  if (!name) throw new Error('Name is required.');
  const tone = str('tone');

  /* Leaders control presentation and logistics. Region, type and map position
     stay with the league, so they are carried over unchanged. */
  const club = await updateClub(id, {
    name,
    city: str('city', 120) || existing.city,
    hood: str('hood') || null,
    organizer: str('organizer') || null,
    members: num('members', 0, 1_000_000) ?? 0,
    next: str('next') || null,
    founded: str('founded', 4) || null,
    tone: TONES.includes(tone) ? tone : existing.tone,
    photo: str('photo', 500) || null,
    website: str('website', 300) || null,
    instagram: str('instagram', 80) || null,
    about: String(formData.get('about') ?? '').trim().slice(0, 4000) || null,
    type: existing.type,
    region: existing.region,
    code: existing.code,
    mapX: existing.mapX,
    mapY: existing.mapY,
  });

  revalidatePath('/club');
  revalidatePath('/admin');
  revalidatePath('/run-clubs');
  if (club?.slug) revalidatePath(`/run-clubs/${club.slug}`);
}

/* Small helper so the action can read the club it is about to write. */
async function getClubSlugById(id) {
  const { sql } = await import('@/lib/db');
  const rows = await sql`SELECT slug FROM run_clubs WHERE id = ${id}`;
  return rows.length ? rows[0].slug : null;
}
