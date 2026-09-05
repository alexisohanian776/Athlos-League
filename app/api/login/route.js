import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/users-db';
import { SESSION_COOKIE, SESSION_MAX_AGE, createSession } from '@/lib/session';

export async function POST(request) {
  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
  }

  const { user, error } = await authenticate(email, password);
  if (error) return NextResponse.json({ error }, { status: 401 });

  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set(SESSION_COOKIE, await createSession(user), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: SESSION_MAX_AGE,
  });
  return res;
}
