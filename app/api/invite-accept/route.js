import { NextResponse } from 'next/server';
import { passwordProblem } from '@/lib/auth';
import { setPasswordFromInvite } from '@/lib/users-db';
import { SESSION_COOKIE, SESSION_MAX_AGE, createSession } from '@/lib/session';

export async function POST(request) {
  const { token, password } = await request.json().catch(() => ({}));
  if (!token) return NextResponse.json({ error: 'This invite link is not valid.' }, { status: 400 });

  const problem = passwordProblem(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const user = await setPasswordFromInvite(token, password);
  if (!user) {
    return NextResponse.json({ error: 'This invite has expired or already been used.' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, role: user.role, needsHandle: !user.handle });
  res.cookies.set(SESSION_COOKIE, await createSession(user), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: SESSION_MAX_AGE,
  });
  return res;
}
