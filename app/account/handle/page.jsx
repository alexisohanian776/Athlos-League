import Link from 'next/link';
import { redirect } from 'next/navigation';
import Wordmark from '@/components/wordmark';
import { currentUser } from '@/lib/current-user';
import { getUserById, suggestHandle } from '@/lib/users-db';
import { setHandleAction } from './actions';

export const metadata = { title: 'Pick your handle — ATHLOS' };
export const dynamic = 'force-dynamic';

export default async function HandlePage({ searchParams }) {
  const session = await currentUser();
  if (!session) redirect('/login?next=/account/handle');

  const me = await getUserById(session.id);
  if (!me) redirect('/login');

  const next = searchParams?.next || '/account';
  /* Someone who already has one is here on purpose — let them change it,
     but do not pretend it is their first time. */
  const first = !me.handle;
  const suggested = searchParams?.handle || me.handle || (await suggestHandle(me));

  return (
    <div className="dash">
      <div className="dash-login">
        <div className="dash-login-inner">
          <Wordmark size={28} />
          <h1 className="dash-login-title">{first ? 'Pick your handle' : 'Change your handle'}</h1>
          <p className="dash-login-note">
            It is your address on ATHLOS — where your ticket stubs live, and how
            people find you.
          </p>

          {searchParams?.error && <p className="dash-error hd-error">{searchParams.error}</p>}

          <form action={setHandleAction} className="dash-login-form">
            <input type="hidden" name="next" value={next} />

            <div className="au-field">
              <label className="au-label" htmlFor="handle">Your handle</label>
              <div className="hd-row">
                <span className="hd-prefix">athlosleague.com/fans/</span>
                <input className="dash-input au-input hd-input" id="handle" name="handle" type="text"
                  defaultValue={suggested} required minLength={3} maxLength={24}
                  pattern="[A-Za-z0-9][A-Za-z0-9_-]*" autoFocus />
              </div>
              <p className="au-note">
                3–24 characters. Letters, numbers, hyphens and underscores.
              </p>
            </div>

            <button className="dash-btn dash-btn-ink au-submit" type="submit">
              {first ? 'Claim it and continue' : 'Save handle'}
            </button>
          </form>

          {!first && (
            <p className="au-hint" style={{ marginTop: 16 }}>
              <Link href="/account">Back to your account</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
