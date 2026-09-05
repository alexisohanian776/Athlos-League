'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/current-user';
import { claimAttendance, getMeet } from '@/lib/meets-db';

export async function claimAction(formData) {
  const slug = String(formData.get('slug') || '');
  const session = await currentUser();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/verify/${slug}`)}`);

  const meet = await getMeet(slug);
  if (!meet) redirect('/');

  /* Only a URL from our own Blob store is accepted, so this field can't be
     used to point a claim at an arbitrary address. */
  const proofUrl = String(formData.get('proofUrl') || '').trim();
  if (proofUrl && !/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(proofUrl)) {
    redirect(`/verify/${slug}?status=badproof`);
  }
  if (!proofUrl) redirect(`/verify/${slug}?status=noproof`);

  await claimAttendance({
    userId: session.id,
    meetId: meet.id,
    proofUrl,
    note: String(formData.get('note') || '').trim().slice(0, 500),
  });

  revalidatePath('/admin/attendance');
  redirect(`/verify/${slug}?status=sent`);
}
