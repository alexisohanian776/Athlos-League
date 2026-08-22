'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminBar() {
  const router = useRouter();
  async function signOut() {
    await fetch('/api/admin-logout', { method: 'POST' });
    router.replace('/admin/login');
  }
  return (
    <div className="ad-bar">
      <span className="ad-bar-title">ATHLOS admin</span>
      <div className="ad-bar-spacer" />
      <Link className="ad-btn ad-btn-ghost" href="/run-clubs" target="_blank">View site ↗</Link>
      <button className="ad-btn ad-btn-ghost" type="button" onClick={signOut}>Sign out</button>
    </div>
  );
}
