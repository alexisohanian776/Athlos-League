'use server';

import { put } from '@vercel/blob';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/current-user';
import { changePassword, setAvatar, updateProfile } from '@/lib/users-db';
import { passwordProblem } from '@/lib/auth';

/* Outcomes travel back as a fixed status code in the query string — never as
   echoed input — so the page can render a message without any client JS. */
export async function changePasswordAction(formData) {
  const session = await currentUser();
  if (!session) redirect('/login?next=/account');

  const current = String(formData.get('current') ?? '');
  const next = String(formData.get('next') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (next !== confirm) redirect('/account?status=mismatch');
  if (passwordProblem(next)) redirect('/account?status=weak');

  const result = await changePassword(session.id, current, next);
  if (result.error) redirect('/account?status=wrong');

  redirect('/account?status=ok');
}

const MAX_AVATAR = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function updateProfileAction(formData) {
  const session = await currentUser();
  if (!session) redirect('/login?next=/account');

  const result = await updateProfile(session.id, {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
  });
  if (result.error === 'email') redirect('/account?status=bademail');
  if (result.error === 'taken') redirect('/account?status=taken');

  /* The avatar is optional: an empty file input still arrives as a File with
     zero bytes, so size is what says whether one was actually chosen. */
  const file = formData.get('avatar');
  if (file && typeof file === 'object' && file.size > 0) {
    if (!IMAGE_TYPES.includes(file.type)) redirect('/account?status=badimage');
    if (file.size > MAX_AVATAR) redirect('/account?status=bigimage');

    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const blob = await put(`avatars/${session.id}.${ext}`, file, {
      access: 'public',
      addRandomSuffix: true,        // a new URL per upload, so caches can't serve the old face
      contentType: file.type,
    });
    await setAvatar(session.id, blob.url);
  }

  revalidatePath('/account');
  revalidatePath('/admin');
  redirect('/account?status=saved');
}
