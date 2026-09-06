'use client';

import Link from 'next/link';

/* The bar is identity and exit only. Section navigation lives in the tabs
   below it, so the wordmark is the way home and the name is the way to your
   own account — the two things that used to be separate pills. */
export default function AccountBar({ email, role, clubName, avatarUrl, name }) {
  /* Hard navigation so the cleared cookie takes effect immediately. */
  async function signOut() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.assign('/login');
  }

  const home = role === 'admin' ? '/admin' : '/club';

  return (
    <div className="dash-bar">
      <Link className="dash-bar-title" href={home}>
        {role === 'admin' ? 'ATHLOS admin' : `Run club · ${clubName || '—'}`}
      </Link>

      <Link className="dash-me" href="/account">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="dash-bar-avatar" src={avatarUrl} alt="" width={26} height={26} />
        ) : (
          <span className="dash-me-dot" aria-hidden="true" />
        )}
        <span className="dash-me-name">{name || email}</span>
      </Link>

      <div className="dash-bar-spacer" />
      <Link className="dash-btn dash-btn-ghost" href="/run-clubs" target="_blank">View site ↗</Link>
      <button className="dash-btn dash-btn-ghost" type="button" onClick={signOut}>Sign out</button>
    </div>
  );
}
