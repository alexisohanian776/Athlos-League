'use client';

import Link from 'next/link';

export default function AccountBar({ email, role, clubName }) {
  /* Hard navigation so the cleared cookie takes effect immediately. */
  async function signOut() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.assign('/login');
  }
  return (
    <div className="ad-bar">
      <span className="ad-bar-title">
        {role === 'admin' ? 'ATHLOS admin' : `Run club · ${clubName || '—'}`}
      </span>
      <span className="ad-card-meta">{email}</span>
      <div className="ad-bar-spacer" />
      {role === 'admin' && <Link className="ad-btn ad-btn-ghost" href="/admin">Admin</Link>}
      <Link className="ad-btn ad-btn-ghost" href="/account">Account</Link>
      <Link className="ad-btn ad-btn-ghost" href="/run-clubs" target="_blank">View site ↗</Link>
      <button className="ad-btn ad-btn-ghost" type="button" onClick={signOut}>Sign out</button>
    </div>
  );
}
