import { NextResponse } from 'next/server';
import { vipGate } from '@/lib/vip-auth';
import { SESSION_COOKIE, readSession } from '@/lib/session';

/* /vip is a shared-password guest gate. /admin and /club need real accounts. */
export const config = { matcher: ['/vip', '/admin', '/admin/:path*', '/club', '/club/:path*', '/account'] };

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname === '/vip') {
    if (await vipGate.isValidCookie(request.cookies.get(vipGate.cookie)?.value)) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = '/vip/unlock';
    return NextResponse.redirect(url);
  }

  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  /* Leaders have no business in /admin. */
  if (pathname.startsWith('/admin') && session.role !== 'admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/club';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
