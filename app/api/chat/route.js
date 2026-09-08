import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/current-user';
import { getUserById } from '@/lib/users-db';
import { messagesAfter, postMessage } from '@/lib/chat-db';

/* Admin only, re-checked against the database on every call — a route
   handler is directly addressable and the session cookie's role is not
   enough on its own for something the whole team can read. */
export const dynamic = 'force-dynamic';

async function admin() {
  const session = await currentUser();
  if (!session) return null;
  const user = await getUserById(session.id);
  if (!user || user.role !== 'admin' || user.disabled) return null;
  return user;
}

export async function GET(request) {
  if (!(await admin())) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });
  const after = new URL(request.url).searchParams.get('after') || 0;
  return NextResponse.json({ messages: await messagesAfter(after) });
}

export async function POST(request) {
  const user = await admin();
  if (!user) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const { body } = await request.json().catch(() => ({}));
  const result = await postMessage(user.id, body);
  if (result.error) return NextResponse.json(result, { status: 400 });

  /* Hand back the new messages so the sender sees their own line without
     waiting for the next poll. */
  return NextResponse.json({ ok: true, messages: await messagesAfter(result.id - 1) });
}

export async function DELETE(request) {
  const user = await admin();
  if (!user) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const { id } = await request.json().catch(() => ({}));
  const { deleteMessage } = await import('@/lib/chat-db');
  const result = await deleteMessage(user.id, id);
  if (result.error) return NextResponse.json(result, { status: 403 });
  return NextResponse.json({ ok: true });
}
