/* Per-person read marker for admin chat: the id of the last message they
   have seen. Stored server-side so it follows a person across devices
   rather than living in one browser.
   Usage: node --env-file=.env.local scripts/migrate-chat-read.mjs */
import { sql } from '../lib/db.js';

await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_read_id integer NOT NULL DEFAULT 0`;

/* Existing admins start caught up — nobody wants a flare for history they
   were never able to read. */
const [{ max }] = await sql`SELECT COALESCE(MAX(id), 0) AS max FROM chat_messages`;
await sql`UPDATE users SET chat_read_id = ${max} WHERE role = 'admin' AND chat_read_id = 0`;

console.log(`chat_read_id ready · admins marked read up to message ${max}`);
