/* Set a user's password directly. Resets are manual — there is no mail
   sending — so this is the ops path when someone can't use an invite link.
   Usage: node scripts/set-password.mjs <email> <password>
   Deliberately skips passwordProblem(): the caller is an operator with
   database access, not someone submitting a form. */
import { sql } from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: node scripts/set-password.mjs <email> <password>');
  process.exit(1);
}

const hash = await hashPassword(password);
const rows = await sql`
  UPDATE users SET password_hash = ${hash}, invite_token = NULL, invite_expires = NULL,
    failed_logins = 0, locked_until = NULL, updated_at = now()
  WHERE email = ${String(email).trim().toLowerCase()}
  RETURNING email, role, club_id
`;

if (!rows.length) {
  console.error(`No user with email ${email}`);
  process.exit(1);
}
console.log(`Password set for ${rows[0].email} (role: ${rows[0].role})`);
