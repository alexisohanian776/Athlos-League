import { NextResponse } from 'next/server';
import { adminGate } from '@/lib/admin-auth';

const DAY = 60 * 60 * 24;

export async function POST(request) {
  if (!adminGate.password()) {
    return NextResponse.json({ error: 'Admin access is not configured.' }, { status: 500 });
  }
  const { password } = await request.json().catch(() => ({}));
  if (!adminGate.checkPassword(password)) {
    return NextResponse.json({ error: 'That password is not right.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  /* Shorter than the VIP cookie — this one can change live content. */
  res.cookies.set(adminGate.cookie, await adminGate.token(password), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: DAY,
  });
  return res;
}
