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
  isSuper: Boolean(r.is_super),
  handle: r.handle || null,
  bio: r.bio || '',
  emailVerified: Boolean(r.email_verified),
  disabled: Boolean(r.disabled),
  firstName: r.first_name || '',
  lastName: r.last_name || '',
  title: r.title || '',
  avatarUrl: r.avatar_url || null,
  lastLoginAt: r.last_login_at,
  lockedUntil: r.locked_until,
  /* Decided here rather than during render: comparing against `new Date()`
     in a component gives the server and the browser two different answers. */
  locked: Boolean(r.locked_until && new Date(r.locked_until) > new Date()),
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
  if (row.disabled) {
    /* Same wording as a bad password: a revoked account shouldn't be
       distinguishable from one that never existed. */
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
  await sql`INSERT INTO login_events (user_id) VALUES (${row.id})`;
  return { user: toUser(row) };
}

/* Change your own password. The current one is re-checked here rather than
   trusted from the session, so a borrowed cookie alone can't reset it.
   Returns { ok: true } or { error }. */
export async function changePassword(id, currentPassword, newPassword) {
  const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
  const row = rows[0];
  if (!row || !row.password_hash) return { error: 'wrong' };

  const ok = await verifyPassword(String(currentPassword || ''), row.password_hash);
  if (!ok) return { error: 'wrong' };

  const hash = await hashPassword(newPassword);
  await sql`
    UPDATE users SET password_hash = ${hash}, failed_logins = 0, locked_until = NULL,
      updated_at = now()
    WHERE id = ${id}
  `;
  return { ok: true };
}

/* Update your own profile. `name` is kept in sync because the rest of the
   app still reads it. Returns { ok: true } or { error }. */
export async function updateProfile(id, { firstName, lastName, email }) {
  const first = String(firstName || '').trim().slice(0, 80);
  const last = String(lastName || '').trim().slice(0, 80);
  const mail = String(email || '').trim().toLowerCase().slice(0, 200);

  if (!mail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return { error: 'email' };

  /* Email is the sign-in identifier, so it has to stay unique. */
  const clash = await sql`SELECT id FROM users WHERE email = ${mail} AND id <> ${id}`;
  if (clash.length) return { error: 'taken' };

  const display = [first, last].filter(Boolean).join(' ') || null;
  await sql`
    UPDATE users SET first_name = ${first || null}, last_name = ${last || null},
      name = ${display}, email = ${mail}, updated_at = now()
    WHERE id = ${id}
  `;
  return { ok: true, email: mail };
}

export async function setAvatar(id, url) {
  await sql`UPDATE users SET avatar_url = ${url}, updated_at = now() WHERE id = ${id}`;
}

/* ---------- super admin ---------- */

/* Every one of these re-reads the actor from the database rather than
   trusting the session cookie's role, and refuses to let a super admin
   strip or lock out their own account — that would leave nobody able to
   restore it. */
async function assertSuper(actorId) {
  const rows = await sql`SELECT id, is_super, disabled FROM users WHERE id = ${actorId}`;
  const actor = rows[0];
  if (!actor || !actor.is_super || actor.disabled) throw new Error('Not authorised.');
  return actor;
}

export async function setRole(actorId, targetId, role) {
  await assertSuper(actorId);
  if (!['admin', 'leader'].includes(role)) throw new Error('Unknown role.');
  const id = Number(targetId);
  if (id === Number(actorId)) throw new Error('You cannot change your own role.');

  const target = (await sql`SELECT is_super FROM users WHERE id = ${id}`)[0];
  if (!target) throw new Error('No such user.');
  if (target.is_super) throw new Error('That account is a super admin.');

  await sql`UPDATE users SET role = ${role}, updated_at = now() WHERE id = ${id}`;
}

export async function setDisabled(actorId, targetId, disabled) {
  await assertSuper(actorId);
  const id = Number(targetId);
  if (id === Number(actorId)) throw new Error('You cannot revoke your own access.');

  const target = (await sql`SELECT is_super FROM users WHERE id = ${id}`)[0];
  if (!target) throw new Error('No such user.');
  if (target.is_super) throw new Error('That account is a super admin.');

  /* Revoking also clears the invite, so a pending link can't be used to walk
     back in, and unlocks on restore. */
  await sql`
    UPDATE users SET disabled = ${Boolean(disabled)},
      invite_token = CASE WHEN ${Boolean(disabled)} THEN NULL ELSE invite_token END,
      failed_logins = 0, locked_until = NULL, updated_at = now()
    WHERE id = ${id}
  `;
}

/* ---------- metrics ---------- */

export async function usageMetrics() {
  const [counts] = await sql`
    SELECT
      count(*)::int                                              AS users,
      count(*) FILTER (WHERE role = 'admin')::int                AS admins,
      count(*) FILTER (WHERE role = 'leader')::int               AS leaders,
      count(*) FILTER (WHERE password_hash IS NULL
                         AND invite_token IS NOT NULL)::int      AS pending,
      count(*) FILTER (WHERE disabled)::int                      AS revoked,
      count(*) FILTER (WHERE last_login_at > now() - interval '30 days')::int AS active30
    FROM users
  `;
  const [signins] = await sql`
    SELECT
      count(*) FILTER (WHERE at > now() - interval '7 days')::int  AS week,
      count(*) FILTER (WHERE at > now() - interval '30 days')::int AS month,
      count(*)::int                                                AS total
    FROM login_events
  `;
  /* One row per day for the last 14, zero-filled so the chart has no gaps. */
  const daily = await sql`
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day, count(e.id)::int AS n
    FROM generate_series(current_date - interval '13 days', current_date, interval '1 day') AS d(day)
    LEFT JOIN login_events e ON date_trunc('day', e.at) = d.day
    GROUP BY d.day ORDER BY d.day
  `;
  const recent = await sql`
    SELECT u.email, u.first_name, u.last_name, u.role, u.is_super, u.disabled,
           to_char(u.last_login_at, 'YYYY-MM-DD HH24:MI') AS last_login,
           (SELECT count(*)::int FROM login_events e WHERE e.user_id = u.id) AS logins
    FROM users u ORDER BY u.last_login_at DESC NULLS LAST, u.id
  `;
  return { counts, signins, daily, recent };
}

/* ---------- public profiles ---------- */

/* Handles are the public URL, so they're normalised and reserved words are
   refused — /u/admin should never belong to a fan. */
const RESERVED = new Set([
  'admin', 'account', 'login', 'logout', 'join', 'invite', 'club', 'vip',
  'athletes', 'run-clubs', 'news', 'api', 'meets', 'me', 'settings', 'athlos',
]);

export function handleProblem(handle) {
  const h = String(handle || '').trim().toLowerCase();
  if (h.length < 3 || h.length > 24) return 'Use between 3 and 24 characters.';
  if (!/^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/.test(h)) {
    return 'Letters, numbers, hyphens and underscores only.';
  }
  if (RESERVED.has(h)) return 'That handle is reserved.';
  return null;
}

export async function getUserByHandle(handle) {
  const rows = await sql`SELECT * FROM users WHERE lower(handle) = ${String(handle || '').toLowerCase()}`;
  return toUser(rows[0]);
}

export async function setHandle(id, handle) {
  const problem = handleProblem(handle);
  if (problem) return { error: problem };
  const h = String(handle).trim().toLowerCase();
  const clash = await sql`SELECT id FROM users WHERE lower(handle) = ${h} AND id <> ${id}`;
  if (clash.length) return { error: 'That handle is taken.' };
  await sql`UPDATE users SET handle = ${h}, updated_at = now() WHERE id = ${id}`;
  return { ok: true, handle: h };
}

export async function setBio(id, bio) {
  await sql`UPDATE users SET bio = ${String(bio || '').trim().slice(0, 280) || null}, updated_at = now() WHERE id = ${id}`;
}

/* Fans register themselves, so this is the one path that creates an account
   without an invite. Always role 'fan': a self-registered account can never
   arrive with elevated permissions. */
export async function registerFan({ email, password, firstName, lastName, handle }) {
  const mail = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return { error: 'That does not look like an email address.' };

  const problem = handleProblem(handle);
  if (problem) return { error: problem };
  const h = String(handle).trim().toLowerCase();

  const clash = await sql`SELECT id, lower(handle) = ${h} AS same_handle FROM users WHERE email = ${mail} OR lower(handle) = ${h}`;
  if (clash.length) {
    return { error: clash[0].same_handle ? 'That handle is taken.' : 'An account already uses that email.' };
  }

  const hash = await hashPassword(password);
  const token = newInviteToken();
  const rows = await sql`
    INSERT INTO users (email, name, first_name, last_name, handle, role, password_hash, verify_token, email_verified)
    VALUES (${mail}, ${[firstName, lastName].filter(Boolean).join(' ') || null},
            ${firstName || null}, ${lastName || null}, ${h}, 'fan', ${hash}, ${token}, false)
    RETURNING *`;
  return { user: toUser(rows[0]), token };
}

export async function confirmEmail(token) {
  const rows = await sql`
    UPDATE users SET email_verified = true, verify_token = NULL, updated_at = now()
    WHERE verify_token = ${token} RETURNING *`;
  return toUser(rows[0]);
}
