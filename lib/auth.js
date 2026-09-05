/* Account auth: scrypt password hashing + a signed session cookie.
   Passwords are never stored or logged in plaintext. Node crypto only —
   no third-party auth dependency. */
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(_scrypt);

const KEYLEN = 64;

/* ---------- passwords ---------- */

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, KEYLEN);
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, salt, hex] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hex) return false;
  const key = await scrypt(password, salt, KEYLEN);
  const expected = Buffer.from(hex, 'hex');
  return expected.length === key.length && timingSafeEqual(expected, key);
}

/* Rejects the obvious failures rather than pretending to score strength. */
export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 10) {
    return 'Use at least 10 characters.';
  }
  if (password.length > 200) return 'That password is too long.';
  if (/^\s|\s$/.test(password)) return 'Remove the leading or trailing space.';
  return null;
}

export const newInviteToken = () => randomBytes(32).toString('base64url');
