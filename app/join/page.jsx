import Link from 'next/link';
import Wordmark from '@/components/wordmark';
import { joinAction } from './actions';

export const metadata = { title: 'Join ATHLOS' };
/* Server-rendered, like sign-in: the fields and the button are in the HTML
   rather than waiting on a client chunk. */
export const dynamic = 'force-dynamic';

const MESSAGES = {
  mismatch: 'The two passwords do not match.',
  weak: 'Use at least 10 characters, with no leading or trailing space.',
  taken: null, // the specific reason arrives in `msg`
};

export default function JoinPage({ searchParams }) {
  const status = searchParams?.status;
  const error = status === 'taken' ? (searchParams?.msg || 'That did not work.') : MESSAGES[status];

  return (
    <div className="dash">
      <div className="dash-login">
        <div className="dash-login-inner">
          <Wordmark size={28} />
          <h1 className="dash-login-title">Start your stub collection</h1>
          <p className="dash-login-note">
            An ATHLOS account gets you a public profile and a ticket stub for
            every meet the league verifies you attended.
          </p>

          {error && <p className="dash-error" style={{ marginTop: 16 }}>{error}</p>}

          <form action={joinAction} className="dash-login-form">
            <div className="ac-pair">
              <div className="au-field">
                <label className="au-label" htmlFor="firstName">First name</label>
                <input className="dash-input au-input" id="firstName" name="firstName" type="text"
                  autoComplete="given-name" placeholder="First name" required />
              </div>
              <div className="au-field">
                <label className="au-label" htmlFor="lastName">Last name</label>
                <input className="dash-input au-input" id="lastName" name="lastName" type="text"
                  autoComplete="family-name" placeholder="Last name" />
              </div>
            </div>

            <div className="au-field">
              <label className="au-label" htmlFor="handle">Profile handle</label>
              <input className="dash-input au-input" id="handle" name="handle" type="text"
                defaultValue={searchParams?.handle || ''} placeholder="yourname" required
                minLength={3} maxLength={24} pattern="[A-Za-z0-9][A-Za-z0-9_-]*" />
              <p className="au-note">Your profile lives at athlosleague.com/u/yourname</p>
            </div>

            <div className="au-field">
              <label className="au-label" htmlFor="email">Email address</label>
              <input className="dash-input au-input" id="email" name="email" type="email"
                defaultValue={searchParams?.email || ''} autoComplete="email"
                placeholder="you@example.com" required />
            </div>

            <div className="au-field">
              <label className="au-label" htmlFor="password">Password</label>
              <input className="dash-input au-input" id="password" name="password" type="password"
                autoComplete="new-password" placeholder="At least 10 characters" required />
            </div>

            <div className="au-field">
              <label className="au-label" htmlFor="confirm">Retype password</label>
              <input className="dash-input au-input" id="confirm" name="confirm" type="password"
                autoComplete="new-password" placeholder="Retype the password" required />
            </div>

            <button className="dash-btn dash-btn-ink au-submit" type="submit">Create my account</button>
          </form>

          <p className="au-hint" style={{ marginTop: 18 }}>
            Already have one? <Link href="/login">Sign in</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
