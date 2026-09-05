import { cookies } from 'next/headers';
import { SESSION_COOKIE, readSession } from './session.js';

/* The signed cookie is the source of truth for id/role; anything sensitive
   should re-check against the database. */
export async function currentUser() {
  return readSession(cookies().get(SESSION_COOKIE)?.value);
}

export async function requireRole(...roles) {
  const user = await currentUser();
  if (!user || !roles.includes(user.role)) throw new Error('Not authorised.');
  return user;
}
