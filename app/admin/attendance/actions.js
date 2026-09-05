'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/current-user';
import { reviewAttendance } from '@/lib/meets-db';

async function assertAdmin() {
  const user = await currentUser();
  if (!user || user.role !== 'admin') throw new Error('Not authorised.');
  return user;
}

export async function reviewAttendanceAction(formData) {
  const me = await assertAdmin();
  await reviewAttendance(me.id, formData.get('id'), String(formData.get('status') || ''));
  revalidatePath('/admin/attendance');
  revalidatePath('/admin/meets');
}
