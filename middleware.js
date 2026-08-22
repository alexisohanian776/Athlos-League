import { NextResponse } from 'next/server';
import { vipGate } from '@/lib/vip-auth';
import { adminGate } from '@/lib/admin-auth';

/* Two gates. /vip is invite-only for guests; /admin edits live content. */
export const config = { matcher: ['/vip', '/admin', '/admin/:path*'] };

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith('/admin');
  const gate = isAdmin ? adminGate : vipGate;
  const loginPath = isAdmin ? '/admin/login' : '/vip/unlock';

  if (pathname === loginPath) return NextResponse.next();

  if (await gate.isValidCookie(request.cookies.get(gate.cookie)?.value)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = loginPath;
  return NextResponse.redirect(url);
}
