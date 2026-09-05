/* Emails the invite link to everyone with a pending invite.

   Dry run by default — it prints who would be mailed and stops. Add --send
   to actually deliver, because this reaches real inboxes.

   Usage:
     node --env-file=.env.local scripts/send-invites.mjs
     node --env-file=.env.local scripts/send-invites.mjs --send
     node --env-file=.env.local scripts/send-invites.mjs --send --only=k@athlos.com */
import { listUsers } from '../lib/users-db.js';
import { emailConfigured, sendInviteEmail } from '../lib/email.js';

const args = process.argv.slice(2);
const doSend = args.includes('--send');
const only = args.find((a) => a.startsWith('--only='))?.split('=')[1]?.toLowerCase();
const ORIGIN = args.find((a) => a.startsWith('--origin='))?.split('=')[1] || 'https://athlosleague.com';

if (doSend && !emailConfigured()) {
  console.error('RESEND_API_KEY is not set — nothing sent.');
  process.exit(1);
}

const pending = (await listUsers()).filter(
  (u) => u.invitePending && u.inviteToken && !u.disabled && (!only || u.email === only)
);

if (!pending.length) {
  console.log('No pending invites match.');
  process.exit(0);
}

console.log(`${pending.length} pending invite(s)${doSend ? '' : ' — DRY RUN, nothing will be sent'}\n`);

for (const u of pending) {
  const url = `${ORIGIN}/invite/${u.inviteToken}`;
  if (!doSend) {
    console.log(`would email ${u.email}  (${u.name || 'no name'}, ${u.role})`);
    continue;
  }
  const result = await sendInviteEmail({ to: u.email, name: u.name, role: u.role, url });
  const status = result.error ? `FAILED — ${result.error}` : result.skipped ? `skipped — ${result.skipped}` : `sent (${result.id})`;
  console.log(`${u.email.padEnd(34)} ${status}`);
}

if (!doSend) console.log('\nRe-run with --send to deliver.');
