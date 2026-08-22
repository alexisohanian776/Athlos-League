'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Wordmark from '../wordmark';

export default function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setPending(true);
    setError('');
    const res = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.replace('/admin');
      return;
    }
    const body = await res.json().catch(() => ({}));
    setError(body.error || 'Something went wrong.');
    setPending(false);
  }

  return (
    <div className="ad-login-inner">
      <Wordmark size={28} />
      <h1 className="ad-login-title">Admin</h1>
      <p className="ad-login-note">Edit run clubs and league content. Staff only.</p>
      <form className="ad-login-form" onSubmit={onSubmit}>
        <label className="ad-label" htmlFor="ad-pw">Admin password</label>
        <input
          id="ad-pw"
          className="ad-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p className="ad-error">{error}</p>}
        <button className="ad-btn ad-btn-ink" type="submit" disabled={!password || pending}>
          {pending ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
