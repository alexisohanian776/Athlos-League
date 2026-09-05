/* Creates the ATHLOS staff admin accounts and prints their invite links.
   Idempotent: re-running reissues a fresh 14-day token for anyone who has
   not set a password yet, and skips anyone who has.
   Usage: node --env-file=.env.local scripts/seed-staff.mjs [origin] */
import { sql } from '../lib/db.js';
import { inviteUser } from '../lib/users-db.js';

const ORIGIN = process.argv[2] || 'https://athlosleague.com';

const STAFF = [
  { first: 'Kayla',   last: 'Green',     title: 'Acting President',                   email: 'k@athlos.com' },
  { first: 'Olivia',  last: 'Witherite', title: 'Head of Social & Content',           email: 'olivia.witherite@athlos.com' },
  { first: 'Myles',   last: 'Thompson',  title: 'Creative & Brand',                   email: 'myles.thompson@athlos.com' },
  { first: 'Adrian',  last: 'Guzman',    title: 'Creative & Brand',                   email: 'adrian.guzman@athlos.com' },
  { first: 'Shirene', last: 'Niksadat',  title: 'Creative Producer / Project Manager', email: 'shirene.niksadat@athlos.com' },
  { first: 'Devin',   last: 'Fonrose',   title: 'Video & Content Production',         email: 'devin.fonrose@athlos.com' },
  { first: 'Erin',    last: 'Bailey',    title: 'Creator, Community & Events',        email: 'erin@momentummanagement.co' },
  { first: 'Gracie',  last: 'Issel',     title: 'Creator & Community Coordinator',    email: 'gracie@momentummanagement.co' },
  { first: 'Megan',   last: 'Knoblock',  title: 'Sponsorships Sales',                 email: 'mknoblock@oakviewgroup.com' },
];

const links = [];
for (const p of STAFF) {
  const existing = await sql`SELECT id, password_hash FROM users WHERE email = ${p.email.toLowerCase()}`;
  if (existing[0]?.password_hash) {
    links.push({ who: `${p.first} ${p.last}`, email: p.email, link: '(already set a password — skipped)' });
    continue;
  }
  const { user, token } = await inviteUser({
    email: p.email, name: `${p.first} ${p.last}`, role: 'admin', clubId: null,
  });
  await sql`
    UPDATE users SET first_name = ${p.first}, last_name = ${p.last}, title = ${p.title}
    WHERE id = ${user.id}
  `;
  links.push({ who: `${p.first} ${p.last}`, email: p.email, link: `${ORIGIN}/invite/${token}` });
}

console.log(`\n${links.length} staff accounts · admin role · invites valid 14 days\n`);
for (const l of links) console.log(`${l.who}\n  ${l.email}\n  ${l.link}\n`);
console.table(await sql`
  SELECT id, email, first_name, last_name, title, role,
         password_hash IS NOT NULL AS has_password
  FROM users ORDER BY id`);
