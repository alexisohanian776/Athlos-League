import Link from 'next/link';

/* Outcome of the last action on the People page.

   Sending mail is best effort, so this distinguishes three things that used
   to look identical: the email went, email is switched off entirely, and the
   email was attempted and failed. Only the first means the person will hear
   about it. */
const NOTICES = {
  sent: (who, _d, kind) => ({
    tone: 'ok',
    text: kind === 'reset'
      ? `Reset link emailed to ${who}.`
      : `Invite emailed to ${who}.`,
  }),
  mailoff: (who) => ({
    tone: 'warn',
    text: `Link created for ${who}, but email is switched off — copy it below and send it yourself.`,
  }),
  mailfail: (who, detail) => ({
    tone: 'bad',
    text: `Link created for ${who}, but the email did not send: ${detail || 'unknown error'}. Copy it below and send it yourself.`,
  }),
  removed: (who) => ({ tone: 'ok', text: `Removed ${who || 'that account'}.` }),
  role: (_w, detail) => ({ tone: 'ok', text: `Role changed to ${detail || 'updated'}.` }),
  revoked: () => ({ tone: 'ok', text: 'Access revoked. Any pending invite for them is dead.' }),
  restored: () => ({ tone: 'ok', text: 'Access restored.' }),
  nouser: () => ({ tone: 'bad', text: 'That account no longer exists.' }),
};

export default function Notice({ notice, who, detail, kind }) {
  const build = NOTICES[notice];
  if (!build) return null;
  const { tone, text } = build(who, detail, kind);

  return (
    <div className={`nt nt-${tone}`} role="status">
      <span className="nt-dot" aria-hidden="true" />
      <span className="nt-text">{text}</span>
      {/* Clearing the query is what dismisses it, so a reload does not
          resurrect a stale message. */}
      <Link className="nt-x" href="/admin/people" aria-label="Dismiss">✕</Link>
    </div>
  );
}
