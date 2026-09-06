'use server';

import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/current-user';
import { setHandle } from '@/lib/users-db';

/* Only same-site paths are followed, so `next` can't bounce anyone off-site. */
const safeNext = (v) => (v && /^\/(?!\/)/.test(v) ? v : '/account');

export async function setHandleAction(formData) {
  const session = await currentUser();
  if (!session) redirect('/login');

  const next = safeNext(String(formData.get('next') || ''));
  const handle = String(formData.get('handle') || '').trim();

  const result = await setHandle(session.id, handle);
  if (result.error) {
    const params = new URLSearchParams({ next, handle, error: result.error });
    redirect(`/account/handle?${params}`);
  }

  redirect(next);
}
