/* Sends one test message so the Resend key and domain can be checked without
   touching anyone else's inbox.
   Usage: node --env-file=.env.local scripts/email-test.mjs you@example.com */
import { emailConfigured, sendInviteEmail } from '../lib/email.js';

const to = process.argv[2];
if (!to) { console.error('Usage: scripts/email-test.mjs <address>'); process.exit(1); }
if (!emailConfigured()) { console.error('RESEND_API_KEY is not set.'); process.exit(1); }

const result = await sendInviteEmail({
  to, name: 'Test Person', role: 'admin',
  url: 'https://athlosleague.com/invite/this-is-a-test-link-not-a-real-invite',
});
console.log(result.error ? `FAILED — ${result.error}` : `sent — id ${result.id}`);
