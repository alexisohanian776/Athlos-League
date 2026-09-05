/* User records: lookup, invites, password set, login bookkeeping. */
import { sql } from './db.js';
import { hashPassword, newInviteToken, verifyPassword } from './auth.js';

const MAX_FAILED = 8;
const LOCK_MINUTES = 15;

const toUser = (r) => r && ({
  id: r.id, email: r.email, name: r.name, role: r.role,
  clubId: r.club_id, clubName: r.club_name ?? null,
  hasPassword: Boolean(r.password_hash),
  invitePending: Boolean(r.invite_token),
  inviteToken: r.invite_token || null,
  lastLoginAt: r.last_login_at,
  lockedUntil: r.locked_until,
});

export async function listUsers() {
  const rows = await sql`
    SELECT u.*, c.name AS club_name
    FROM users u LEFT JOIN run_clubs c ON c.id = u.club_id
    ORDER BY u.role, u.email
  `;
  return rows.map(toUser);
}

export async function getUserById(id) {
  const rows = await sql`
    SELECT u.*, c.name AS club_name FROM users u
    LEFT JOIN run_clubs c ON c.id = u.club_id WHERE u.id = ${id}
  `;
  return rows.length ? toUser(rows[0]) : null;
}

/* Invite creates the account up front, so nobody can self-register. */
export async function inviteUser({ email, name, role, clubId }) {
  const token = newInviteToken();
  const normalised = String(email).trim().toLowerCase();
  const rows = await sql`
    INSERT INTO users (email, name, role, club_id, invite_token, invite_expires)
    VALUES (${normalised}, ${name || null}, ${role}, ${clubId || null}, ${token}, now() + interval '14 days')
    ON CONFLICT (email) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, users.name),
      role = EXCLUDED.role,
      club_id = EXCLUDED.club_id,
      invite_token = EXCLUDED.invite_token,
      invite_expires = EXCLUDED.invite_expires,
      updated_at = now()
    RETURNING *
  `;
  return { user: toUser(rows[0]), token };
}

export async function reissueInvite(id) {
  const token = newInviteToken();
  const rows = await sql`
    UPDATE users SET invite_token = ${token}, invite_expires = now() + interval '14 days',
      failed_logins = 0, locked_until = NULL, updated_at = now()
    WHERE id = ${id} RETURNING *
  `;
  return rows.length ? { user: toUser(rows[0]), token } : null;
}

export async function findByInvite(token) {
  const rows = await sql`
    SELECT * FROM users WHERE invite_token = ${token} AND invite_expires > now()
  `;
  return rows.length ? toUser(rows[0]) : null;
}

/* Setting the password consumes the invite. */
export async function setPasswordFromInvite(token, password) {
  const hash = await hashPassword(password);
  const rows = await sql`
    UPDATE users SET password_hash = ${hash}, invite_token = NULL, invite_expires = NULL,
      failed_logins = 0, locked_until = NULL, updated_at = now()
    WHERE invite_token = ${token} AND invite_expires > now()
    RETURNING *
  `;
  return rows.length ? toUser(rows[0]) : null;
}

export async function deleteUser(id) {
  const rows = await sql`DELETE FROM users WHERE id = ${id} RETURNING email`;
  return rows.length ? rows[0].email : null;
}

/* Throttled login. Returns { user } or { error }. */
export async function authenticate(email, password) {
  const normalised = String(email || '').trim().toLowerCase();
  const rows = await sql`SELECT * FROM users WHERE email = ${normalised}`;
  const row = rows[0];

  if (!row || !row.password_hash) {
    /* Same message either way so the form can't be used to enumerate accounts. */
    return { error: 'Those details are not right.' };
  }
  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    return { error: 'Too many attempts. Try again in a few minutes.' };
  }
  if (!(await verifyPassword(password, row.password_hash))) {
    const failed = row.failed_logins + 1;
    if (failed >= MAX_FAILED) {
      await sql`UPDATE users SET failed_logins = 0, locked_until = now() + (${LOCK_MINUTES} * interval '1 minute') WHERE id = ${row.id}`;
    } else {
      await sql`UPDATE users SET failed_logins = ${failed} WHERE id = ${row.id}`;
    }
    return { error: 'Those details are not right.' };
  }
  await sql`UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = now() WHERE id = ${row.id}`;
  return { user: toUser(row) };
}
