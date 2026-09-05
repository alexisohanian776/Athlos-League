'use client';

import { useState } from 'react';

export default function VipUnlockForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setPending(true);
    setError('');
    const res = await fetch('/api/vip-unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      /* Hard navigation, not router.replace: the gate cookie was only just
         set, and Next's client router would serve /vip from a cache created
         before it existed — bouncing straight back here. */
      window.location.assign('/vip');
      return;
    }
    const body = await res.json().catch(() => ({}));
    setError(body.error || 'Something went wrong.');
    setPending(false);
  }

  return (
    <div className="vip-gate-inner">
      <div className="vip-eyebrow">ATHLOS London · VIP</div>
      <h1 className="vip-display vip-gate-title">Invite only.</h1>
      <p className="vip-body vip-gate-note">
        The VIP evening is capacity-limited and confirmed by the league. Enter the
        access password from your invitation to see the run of play.
      </p>

      <form className="vip-gate-form" onSubmit={onSubmit}>
        <label className="vip-label" htmlFor="vip-pw">Access password</label>
        <input
          id="vip-pw"
          className="vip-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoFocus
        />
        {error && <p className="vip-gate-error">{error}</p>}
        <button className="vip-btn vip-btn-red" type="submit" disabled={!password || pending}>
          {pending ? 'Checking…' : 'Enter →'}
        </button>
      </form>

      <p className="vip-fine vip-gate-fine">
        Lost your password? Reply to your invitation and the team will resend it.
      </p>
    </div>
  );
}
