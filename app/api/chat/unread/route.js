import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/current-user';
import { getUserById } from '@/lib/users-db';
import { markRead, unreadFor } from '@/lib/chat-db';

/* Drives the flare on the Chat tab, and marks read when the chat itself
   reports what has been seen. Admin only, re-checked against the database. */
export const dynamic = 'force-dynamic';

async function admin() {
  const session = await currentUser();
  if (!session) return null;
  const user = await getUserById(session.id);
  if (!user || user.role !== 'admin' || user.disabled) return null;
  return user;
}

export async function GET() {
  const user = await admin();
  /* Not an error worth surfacing in the nav — a non-admin simply has no
     unread count. */
  if (!user) return NextResponse.json({ count: 0 });
  return NextResponse.json({ count: await unreadFor(user.id) });
}

export async function POST(request) {
  const user = await admin();
  if (!user) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const { upTo } = await request.json().catch(() => ({}));
  await markRead(user.id, upTo);
  return NextResponse.json({ ok: true, count: await unreadFor(user.id) });
}
