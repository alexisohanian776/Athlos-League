'use client';

import Link from 'next/link';

export default function AccountBar({ email, role, clubName, avatarUrl, name }) {
  /* Hard navigation so the cleared cookie takes effect immediately. */
  async function signOut() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.assign('/login');
  }
  return (
    <div className="dash-bar">
      <span className="dash-bar-title">
        {role === 'admin' ? 'ATHLOS admin' : `Run club · ${clubName || '—'}`}
      </span>
      {avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="dash-bar-avatar" src={avatarUrl} alt="" width={26} height={26} />
      )}
      <span className="dash-card-meta">{name || email}</span>
      <div className="dash-bar-spacer" />
      {role === 'admin' && <Link className="dash-btn dash-btn-ghost" href="/admin">Admin</Link>}
      <Link className="dash-btn dash-btn-ghost" href="/account">Account</Link>
      <Link className="dash-btn dash-btn-ghost" href="/run-clubs" target="_blank">View site ↗</Link>
      <button className="dash-btn dash-btn-ghost" type="button" onClick={signOut}>Sign out</button>
    </div>
  );
}
