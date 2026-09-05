'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/current-user';
import { createClub, deleteClub, updateClub } from '@/lib/clubs-db';
import { deleteUser, getUserById, inviteUser, reissueInvite, setDisabled, setRole } from '@/lib/users-db';

/* Server actions are directly callable endpoints, so each one re-checks the
   session rather than trusting that middleware ran. */
async function assertAdmin() {
  const user = await currentUser();
  if (!user || user.role !== 'admin') throw new Error('Not authorised.');
  return user;
}

/* Managing people is super-admin only. The flag is read from the database,
   never from the session cookie, so promoting yourself in a forged cookie
   gets you nowhere. */
async function assertSuperAdmin() {
  const session = await currentUser();
  if (!session) throw new Error('Not authorised.');
  const user = await getUserById(session.id);
  if (!user || !user.isSuper || user.disabled) throw new Error('Not authorised.');
  return user;
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
    website: str('website', 300) || null,
    instagram: str('instagram', 80) || null,
    about: String(formData.get('about') ?? '').trim().slice(0, 4000) || null,
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

/* ---------- people ---------- */

function refreshPeople() {
  revalidatePath('/admin');
}

export async function inviteUserAction(formData) {
  await assertSuperAdmin();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');

  const role = formData.get('role') === 'admin' ? 'admin' : 'leader';
  const rawClub = formData.get('clubId');
  const clubId = role === 'leader' && rawClub ? Number(rawClub) : null;
  if (role === 'leader' && !Number.isInteger(clubId)) throw new Error('Pick a club for this leader.');

  await inviteUser({ email, name: String(formData.get('name') || '').trim() || null, role, clubId });
  refreshPeople();
}

export async function reissueInviteAction(formData) {
  await assertSuperAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) throw new Error('Bad user id.');
  await reissueInvite(id);
  refreshPeople();
}

export async function removeUserAction(formData) {
  const me = await assertSuperAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) throw new Error('Bad user id.');
  if (id === me.id) throw new Error('You cannot remove your own account.');
  await deleteUser(id);
  refreshPeople();
}

export async function setRoleAction(formData) {
  const me = await assertSuperAdmin();
  await setRole(me.id, formData.get('id'), String(formData.get('role') || ''));
  refreshPeople();
}

export async function setAccessAction(formData) {
  const me = await assertSuperAdmin();
  await setDisabled(me.id, formData.get('id'), formData.get('disabled') === 'true');
  refreshPeople();
}
