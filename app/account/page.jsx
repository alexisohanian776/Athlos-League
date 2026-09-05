import AccountBar from '@/components/account/account-bar';
import { currentUser } from '@/lib/current-user';
import { getUserById } from '@/lib/users-db';
import { changePasswordAction } from './actions';

export const metadata = { title: 'Your account — ATHLOS' };
export const dynamic = 'force-dynamic';

/* Rendered on the server, like the sign-in form: the fields and the button
   are in the HTML rather than waiting on a client chunk. */
const MESSAGES = {
  ok: { tone: 'ok', text: 'Password changed. It applies the next time you sign in.' },
  wrong: { tone: 'err', text: 'That current password is not right.' },
  mismatch: { tone: 'err', text: 'The two new passwords do not match.' },
  weak: { tone: 'err', text: 'Use at least 10 characters, with no leading or trailing space.' },
};

export default async function AccountPage({ searchParams }) {
  const session = await currentUser();
  const user = session ? await getUserById(session.id) : null;
  const message = MESSAGES[searchParams?.status];

  return (
    <div className="ad">
      <AccountBar email={user?.email} role={user?.role} clubName={user?.clubName} />
      <div className="ad-wrap">
        <div className="ad-head">
          <h1 className="ad-title">Your account</h1>
          <span className="ad-count">{user?.email}</span>
        </div>

        <div className="ad-card ac-card">
          <div className="ad-card-head">
            <span className="ad-card-name">Change password</span>
          </div>

          <div className="ac-body">
            {message && (
              <p className={message.tone === 'ok' ? 'ac-ok' : 'ad-error'}>{message.text}</p>
            )}

            <form action={changePasswordAction} className="ac-form">
              <div className="au-field">
                <label className="au-label" htmlFor="current">Current password</label>
                <input className="ad-input au-input" id="current" name="current" type="password"
                  autoComplete="current-password" placeholder="Your current password" required />
              </div>
              <div className="au-field">
                <label className="au-label" htmlFor="next">New password</label>
                <input className="ad-input au-input" id="next" name="next" type="password"
                  autoComplete="new-password" placeholder="At least 10 characters" required />
              </div>
              <div className="au-field">
                <label className="au-label" htmlFor="confirm">Retype new password</label>
                <input className="ad-input au-input" id="confirm" name="confirm" type="password"
                  autoComplete="new-password" placeholder="Retype the new password" required />
              </div>
              <button className="ad-btn ad-btn-ink au-submit" type="submit">Change password</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
