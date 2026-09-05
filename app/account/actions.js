'use server';

import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/current-user';
import { changePassword } from '@/lib/users-db';
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
