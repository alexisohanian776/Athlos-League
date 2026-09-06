import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getUserByHandle } from '@/lib/users-db';

/* TEMPORARY diagnostic. Reports only whether a handle resolves, which
   /fans/<handle> already reveals by returning 200 or 404 — so it exposes
   nothing new. Delete once the lookup discrepancy is understood. */
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const h = new URL(request.url).searchParams.get('handle') || '';
  const viaHelper = await getUserByHandle(h);
  const raw = await sql`SELECT id FROM users WHERE lower(handle) = ${h.toLowerCase()}`;
  const all = await sql`SELECT id, handle FROM users WHERE handle IS NOT NULL ORDER BY id`;
  return NextResponse.json({
    asked: h,
    viaHelper: viaHelper ? viaHelper.id : null,
    viaRawSql: raw.map((r) => r.id),
    handlesProductionSees: all,
  });
}
