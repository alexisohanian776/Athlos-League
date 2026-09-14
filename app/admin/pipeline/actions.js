'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/current-user';
import { getUserById } from '@/lib/users-db';
import {
  createDeal, updateDeal, deleteDeal, setEscalated,
  upsertContact, touchContact, deleteContact,
  setDealYear, deleteDealYear,
} from '@/lib/deals-db';

/* The cookie says admin; the row says whether they still are. Every write
   goes through here, and it returns the actor the audit trail records —
   a name, because "somebody moved this to Terms" is useless. */
async function actor() {
  const session = await currentUser();
  if (!session || session.role !== 'admin') throw new Error('Not authorised.');
  const me = await getUserById(session.id);
  if (!me || me.disabled) throw new Error('Not authorised.');
  return {
    id: me.id,
    who: [me.firstName, me.lastName].filter(Boolean).join(' ') || me.email,
  };
}

const str = (fd, name) => String(fd.get(name) ?? '').trim();

function refresh(id) {
  revalidatePath('/admin/pipeline');
  if (id) revalidatePath(`/admin/pipeline/${id}`);
}

export async function addDealAction(formData) {
  const me = await actor();
  const result = await createDeal(me, {
    company: str(formData, 'company'),
    name: str(formData, 'name'),
    stage: str(formData, 'stage'),
    category: str(formData, 'category'),
    notes: str(formData, 'notes'),
    ownerName: str(formData, 'ownerName'),
  });
  if (result.error) redirect(`/admin/pipeline?error=${encodeURIComponent(result.error)}`);
  refresh(result.id);
  redirect(`/admin/pipeline/${result.id}`);
}

export async function saveDealAction(formData) {
  const me = await actor();
  const id = str(formData, 'id');
  /* Only the fields the form actually submitted — updateDeal diffs against
     the stored row and writes one event per real change. */
  const result = await updateDeal(me, id, {
    company: str(formData, 'company'),
    name: str(formData, 'name'),
    stage: str(formData, 'stage'),
    category: str(formData, 'category'),
    notes: str(formData, 'notes'),
    status_note: str(formData, 'statusNote'),
    next_steps: str(formData, 'nextSteps'),
    last_touchpoint: str(formData, 'lastTouchpoint'),
    owner_name: str(formData, 'ownerName'),
    parent_deal_id: str(formData, 'parentDealId'),
  });
  if (result.error) redirect(`/admin/pipeline/${id}?error=${encodeURIComponent(result.error)}`);
  refresh(id);
  redirect(`/admin/pipeline/${id}?saved=${result.changed}`);
}

/* The list's inline stage move — one field, so it skips the full form. */
export async function moveStageAction(formData) {
  const me = await actor();
  const id = str(formData, 'id');
  /* '' is meaningful here — it clears the stage back to blank. */
  await updateDeal(me, id, { stage: str(formData, 'stage') });
  refresh(id);
  redirect(str(formData, 'back') || `/admin/pipeline/${id}`);
}

export async function escalateAction(formData) {
  const me = await actor();
  const id = str(formData, 'id');
  await setEscalated(me, id, str(formData, 'on') === '1', str(formData, 'note'));
  refresh(id);
  redirect(str(formData, 'back') || `/admin/pipeline/${id}`);
}

export async function deleteDealAction(formData) {
  await actor();
  await deleteDeal(str(formData, 'id'));
  revalidatePath('/admin/pipeline');
  redirect('/admin/pipeline');
}

export async function saveContactAction(formData) {
  const me = await actor();
  const dealId = str(formData, 'dealId');
  const result = await upsertContact(me, dealId, {
    id: str(formData, 'id'),
    name: str(formData, 'name'),
    email: str(formData, 'email'),
    title: str(formData, 'title'),
    role: str(formData, 'role'),
    notes: str(formData, 'notes'),
  });
  refresh(dealId);
  redirect(`/admin/pipeline/${dealId}${result.error ? `?error=${encodeURIComponent(result.error)}` : ''}`);
}

export async function touchContactAction(formData) {
  const me = await actor();
  const dealId = str(formData, 'dealId');
  await touchContact(me, dealId, str(formData, 'id'));
  refresh(dealId);
  redirect(`/admin/pipeline/${dealId}`);
}

export async function deleteContactAction(formData) {
  await actor();
  const dealId = str(formData, 'dealId');
  await deleteContact(dealId, str(formData, 'id'));
  refresh(dealId);
  redirect(`/admin/pipeline/${dealId}`);
}

export async function saveYearAction(formData) {
  const me = await actor();
  const dealId = str(formData, 'dealId');
  const result = await setDealYear(me, dealId, {
    year: str(formData, 'year'),
    amount: str(formData, 'amount'),
    kind: str(formData, 'kind'),
    note: str(formData, 'note'),
    guaranteed: str(formData, 'guaranteed') === '1',
  });
  refresh(dealId);
  redirect(`/admin/pipeline/${dealId}${result.error ? `?error=${encodeURIComponent(result.error)}` : ''}`);
}

export async function deleteYearAction(formData) {
  await actor();
  const dealId = str(formData, 'dealId');
  await deleteDealYear(dealId, str(formData, 'id'));
  refresh(dealId);
  redirect(`/admin/pipeline/${dealId}`);
}
