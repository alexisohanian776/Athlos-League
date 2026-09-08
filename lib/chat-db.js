/* Admin chat. Messages carry their author's name and photo so the client
   never has to look users up separately. */
import { sql } from './db.js';

const MAX_BODY = 2000;

const toMessage = (r) => ({
  id: r.id,
  body: r.body,
  createdAt: r.created_at,
  userId: r.user_id,
  who: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email,
  handle: r.handle,
  avatarUrl: r.avatar_url,
  isSuper: Boolean(r.is_super),
});

/* Newest `limit`, returned oldest-first so the client can append. */
export async function recentMessages(limit = 80) {
  const rows = await sql`
    SELECT * FROM (
      SELECT m.id, m.body, m.created_at, m.user_id,
             u.first_name, u.last_name, u.email, u.handle, u.avatar_url, u.is_super
      FROM chat_messages m JOIN users u ON u.id = m.user_id
      ORDER BY m.id DESC LIMIT ${limit}
    ) t ORDER BY t.id ASC
  `;
  return rows.map(toMessage);
}

/* Everything newer than `afterId` — what polling asks for. */
export async function messagesAfter(afterId, limit = 200) {
  const rows = await sql`
    SELECT m.id, m.body, m.created_at, m.user_id,
           u.first_name, u.last_name, u.email, u.handle, u.avatar_url, u.is_super
    FROM chat_messages m JOIN users u ON u.id = m.user_id
    WHERE m.id > ${Number(afterId) || 0}
    ORDER BY m.id ASC LIMIT ${limit}
  `;
  return rows.map(toMessage);
}

export async function postMessage(userId, body) {
  const text = String(body || '').trim().slice(0, MAX_BODY);
  if (!text) return { error: 'Nothing to send.' };
  const rows = await sql`
    INSERT INTO chat_messages (user_id, body) VALUES (${userId}, ${text}) RETURNING id
  `;
  return { id: rows[0].id };
}

/* An author can delete their own; a super admin can delete anything. The
   check is done here against the stored row rather than trusting the
   caller. */
export async function deleteMessage(actorId, messageId) {
  const [actor] = await sql`SELECT is_super FROM users WHERE id = ${actorId}`;
  const [msg] = await sql`SELECT user_id FROM chat_messages WHERE id = ${Number(messageId)}`;
  if (!msg) return { error: 'No such message.' };
  if (msg.user_id !== Number(actorId) && !actor?.is_super) {
    return { error: 'Not yours to delete.' };
  }
  await sql`DELETE FROM chat_messages WHERE id = ${Number(messageId)}`;
  return { ok: true };
}
