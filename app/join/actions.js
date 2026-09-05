'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { registerFan } from '@/lib/users-db';
import { passwordProblem } from '@/lib/auth';
import { SESSION_COOKIE, SESSION_MAX_AGE, createSession } from '@/lib/session';
import { sendVerifyEmail } from '@/lib/email';

/* The one path that creates an account without an invite. registerFan always
   writes role 'fan', so nothing here can mint elevated access. */
export async function joinAction(formData) {
  const first = String(formData.get('firstName') ?? '').trim();
  const last = String(formData.get('lastName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const handle = String(formData.get('handle') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  const keep = `&handle=${encodeURIComponent(handle)}&email=${encodeURIComponent(email)}`;
  if (password !== confirm) redirect(`/join?status=mismatch${keep}`);
  if (passwordProblem(password)) redirect(`/join?status=weak${keep}`);

  const result = await registerFan({ email, password, firstName: first, lastName: last, handle });
  if (result.error) redirect(`/join?status=taken&msg=${encodeURIComponent(result.error)}${keep}`);

  /* Signed in immediately; the email confirmation is a badge on the account,
     not a gate — an unverified fan can still look around, they just can't be
     verified as having attended anything. */
  cookies().set(SESSION_COOKIE, await createSession(result.user), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: SESSION_MAX_AGE,
  });

  const h = headers();
  const origin = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;
  await sendVerifyEmail({
    to: result.user.email,
    name: first,
    url: `${origin}/join/confirm/${result.token}`,
  });

  redirect(`/u/${result.user.handle}`);
}
