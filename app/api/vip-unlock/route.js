import { NextResponse } from 'next/server';
import { vipGate } from '@/lib/vip-auth';

const WEEK = 60 * 60 * 24 * 7;

export async function POST(request) {
  if (!vipGate.password()) {
    return NextResponse.json({ error: 'VIP access is not configured.' }, { status: 500 });
  }
  const { password } = await request.json().catch(() => ({}));
  if (!vipGate.checkPassword(password)) {
    return NextResponse.json({ error: 'That password is not right.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(vipGate.cookie, await vipGate.token(password), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: WEEK,
  });
  return res;
}
