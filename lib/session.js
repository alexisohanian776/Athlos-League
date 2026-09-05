/* Session cookie signing with Web Crypto, so the same code runs in edge
   middleware and in Node route handlers. Passwords live in lib/auth.js,
   which is Node-only and must never be imported by middleware. */

export const SESSION_COOKIE = 'athlos_session';
export const SESSION_MAX_AGE = 60 * 60 * 12;

const enc = new TextEncoder();

async function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set.');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

async function sign(data) {
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', await key(), enc.encode(data))));
}

function equal(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSession({ id, email, role, clubId }) {
  const payload = Buffer.from(JSON.stringify({
    id, email, role, clubId: clubId ?? null,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  })).toString('base64url');
  return `${payload}.${await sign(payload)}`;
}

export async function readSession(token) {
  if (!token || typeof token !== 'string') return null;
  const [payload, mac] = token.split('.');
  if (!payload || !mac) return null;
  if (!equal(await sign(payload), mac)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}
