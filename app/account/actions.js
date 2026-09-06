'use server';

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

export async function updateProfileAction(formData) {
  const session = await currentUser();
  if (!session) redirect('/login?next=/account');

  const result = await updateProfile(session.id, {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    handle: formData.get('handle'),
    city: formData.get('city'),
    bio: formData.get('bio'),
    instagram: formData.get('instagram'),
    strava: formData.get('strava'),
    clubId: formData.get('clubId'),
    favourites: String(formData.get('favourites') || '').split(',').filter(Boolean),
  });
  if (result.error === 'email') redirect('/account?status=bademail');
  if (result.error === 'taken') redirect('/account?status=taken');
  if (result.error === 'handle') redirect(`/account?status=handle&msg=${encodeURIComponent(result.message)}`);

  /* The browser uploaded straight to Blob and passed back the URL. Only a
     URL from our own store is accepted, so this field can't be used to point
     someone's avatar at an arbitrary address. */
  const avatarUrl = String(formData.get('avatarUrl') ?? '').trim();
  if (avatarUrl && avatarUrl !== 'null') {
    if (!/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//.test(avatarUrl)) {
      redirect('/account?status=badimage');
    }
    await setAvatar(session.id, avatarUrl);
  }

  revalidatePath('/account');
  revalidatePath('/admin');
  redirect('/account?status=saved');
}
