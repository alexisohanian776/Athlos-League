'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/current-user';
import { createClub, deleteClub, updateClub } from '@/lib/clubs-db';
import { deleteUser, getUserById, inviteUser, reissueInvite, setDisabled, setRole } from '@/lib/users-db';
import { sendInviteEmail, sendResetEmail } from '@/lib/email';
import { headers } from 'next/headers';

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

/* Links in email must be absolute, and the host differs between the
   preview deployments and athlosleague.com. */
function originFromRequest() {
  const h = headers();
  return `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;
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
  revalidatePath('/admin/people');
}

/* Sending is best effort, so the outcome has to be reported rather than
   assumed: an email that silently failed looks exactly like one that
   worked. `result` is what lib/email returned. */
function noticeFor(result) {
  if (result?.error) return { notice: 'mailfail', detail: result.error };
  if (result?.skipped) return { notice: 'mailoff' };
  return { notice: 'sent' };
}

function backToPeople({ notice, who, detail, kind }) {
  const params = new URLSearchParams({ notice, who: who || '' });
  if (detail) params.set('detail', detail);
  if (kind) params.set('kind', kind);
  redirect(`/admin/people?${params}`);
}

export async function inviteUserAction(formData) {
  await assertSuperAdmin();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');

  const role = formData.get('role') === 'admin' ? 'admin' : 'leader';
  const rawClub = formData.get('clubId');
  const clubId = role === 'leader' && rawClub ? Number(rawClub) : null;
  if (role === 'leader' && !Number.isInteger(clubId)) throw new Error('Pick a club for this leader.');

  const name = String(formData.get('name') || '').trim() || null;
  const { user, token } = await inviteUser({ email, name, role, clubId });
  /* Best effort: the invite link is still shown in the panel, so a mail
     failure never blocks getting someone in. */
  const sent = await sendInviteEmail({
    to: user.email, name, role, url: `${originFromRequest()}/invite/${token}`,
  });
  refreshPeople();
  backToPeople({ ...noticeFor(sent), who: user.email });
}

export async function reissueInviteAction(formData) {
  await assertSuperAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) throw new Error('Bad user id.');
  const result = await reissueInvite(id);
  if (!result) {
    refreshPeople();
    backToPeople({ notice: 'nouser' });
  }

  const { user, token } = result;
  const url = `${originFromRequest()}/invite/${token}`;
  const sent = await (user.hasPassword
    ? sendResetEmail({ to: user.email, name: user.name, url })
    : sendInviteEmail({ to: user.email, name: user.name, role: user.role, url }));

  refreshPeople();
  backToPeople({ ...noticeFor(sent), who: user.email, kind: user.hasPassword ? 'reset' : 'invite' });
}

export async function removeUserAction(formData) {
  const me = await assertSuperAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) throw new Error('Bad user id.');
  if (id === me.id) throw new Error('You cannot remove your own account.');
  const removed = await deleteUser(id);
  refreshPeople();
  backToPeople({ notice: 'removed', who: removed || '' });
}

export async function setRoleAction(formData) {
  const me = await assertSuperAdmin();
  const role = String(formData.get('role') || '');
  await setRole(me.id, formData.get('id'), role);
  refreshPeople();
  backToPeople({ notice: 'role', detail: role });
}

export async function setAccessAction(formData) {
  const me = await assertSuperAdmin();
  const off = formData.get('disabled') === 'true';
  await setDisabled(me.id, formData.get('id'), off);
  refreshPeople();
  backToPeople({ notice: off ? 'revoked' : 'restored' });
}
