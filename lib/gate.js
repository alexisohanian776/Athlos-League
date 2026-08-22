/* Shared password-gate primitives.
   A gate cookie holds an HMAC of a per-gate payload keyed by that gate's
   password, so it can't be forged and the password never reaches the browser.
   Web Crypto is used so the same code runs in middleware and route handlers. */

export async function gateToken(password, payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Buffer.from(new Uint8Array(sig)).toString('base64url');
}

/* Length-independent compare so a wrong value can't be probed byte by byte. */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function makeGate({ cookie, payload, envVar }) {
  const token = (password) => gateToken(password, payload);
  return {
    cookie,
    token,
    password: () => process.env[envVar],
    async isValidCookie(value) {
      const password = process.env[envVar];
      if (!password || !value) return false;
      return safeEqual(value, await token(password));
    },
    checkPassword(candidate) {
      const password = process.env[envVar];
      return Boolean(password) && typeof candidate === 'string' && safeEqual(candidate, password);
    },
  };
}
