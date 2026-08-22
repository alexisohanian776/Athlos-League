import { NextResponse } from 'next/server';
import { adminGate } from '@/lib/admin-auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(adminGate.cookie, '', { path: '/', maxAge: 0 });
  return res;
}
