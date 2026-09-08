/* Admin chat. One table, append-only apart from deletes.
   Usage: node --env-file=.env.local scripts/migrate-chat.mjs */
import { sql } from '../lib/db.js';

await sql`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id         serial PRIMARY KEY,
    user_id    integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )
`;
/* Reads are always "newest N" or "everything after id", so this is the only
   index that matters. */
await sql`CREATE INDEX IF NOT EXISTS chat_messages_id_idx ON chat_messages(id DESC)`;

console.log('chat_messages ready');
console.log('messages:', (await sql`SELECT count(*)::int AS n FROM chat_messages`)[0].n);
