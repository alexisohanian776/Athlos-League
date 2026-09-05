'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Wordmark from '../wordmark';

/* Shared shell for sign-in and invite-accept. */
export default function AuthForm({ mode, token, email, clubName, role }) {
  const params = useSearchParams();
  const isInvite = mode === 'invite';

  const formRef = useRef(null);
  const [form, setForm] = useState({ email: email || '', password: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  /* A password manager can fill these without firing React's onChange, which
     used to leave state empty. Sync from the DOM once after mount so the
     hints below match what is actually in the fields. */
  useEffect(() => {
    const t = setTimeout(() => {
      const el = formRef.current;
      if (!el) return;
      const read = (name) => el.elements[name]?.value ?? '';
      setForm((p) => ({
        email: p.email || read('email'),
        password: p.password || read('password'),
        confirm: p.confirm || read('confirm'),
      }));
    }, 250);
    return () => clearTimeout(t);
  }, []);

  const mismatch = isInvite && form.confirm.length > 0 && form.password !== form.confirm;
  const tooShort = isInvite && form.password.length > 0 && form.password.length < 10;

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    /* Read straight from the form, not from state — this is what makes an
       autofilled sign-in work. */
    const data = new FormData(e.currentTarget);
    const values = {
      email: String(data.get('email') || '').trim(),
      password: String(data.get('password') || ''),
      confirm: String(data.get('confirm') || ''),
    };

    if (isInvite) {
      if (values.password.length < 10) { setError('Use at least 10 characters.'); return; }
      if (values.password !== values.confirm) { setError('Those two passwords do not match.'); return; }
    } else if (!values.email || !values.password) {
      setError('Enter your email and password.');
      return;
    }

    setPending(true);
    const res = await fetch(isInvite ? '/api/invite-accept' : '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isInvite ? { token, password: values.password } : { email: values.email, password: values.password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || 'Something went wrong.');
      setPending(false);
      return;
    }
    /* Hard navigation so the freshly-set session cookie is used, rather than
       a cached client-router result from before sign-in. Only same-site paths
       are followed, so `next` can't be used to bounce someone off-site. */
    const requested = params.get('next');
    const fallback = body.role === 'admin' ? '/admin' : '/club';
    const target = requested && /^\/(?!\/)/.test(requested) ? requested : fallback;
    window.location.assign(target);
  }

  return (
    <div className="ad-login-inner">
      <Wordmark size={28} />
      <h1 className="ad-login-title">{isInvite ? 'Set your password' : 'Sign in'}</h1>
      <p className="ad-login-note">
        {isInvite
          ? <>You&rsquo;re joining as {role === 'admin' ? 'an admin' : <>the leader of <strong>{clubName || 'your club'}</strong></>}. Choose a password for <strong>{email}</strong>.</>
          : 'Run club leaders and league staff.'}
      </p>

      <form className="ad-login-form" ref={formRef} onSubmit={onSubmit} noValidate>
        {!isInvite && (
          <div className="au-field">
            <label className="au-label" htmlFor="email">Email address</label>
            <input id="email" name="email" className="ad-input au-input" type="email" autoComplete="username"
              placeholder="you@example.com" value={form.email} onChange={set('email')} autoFocus />
          </div>
        )}

        <div className="au-field">
          <label className="au-label" htmlFor="password">
            {isInvite ? 'Type a new password' : 'Password'}
          </label>
          <input
            id="password"
            name="password"
            className="ad-input au-input"
            type={show ? 'text' : 'password'}
            autoComplete={isInvite ? 'new-password' : 'current-password'}
            placeholder={isInvite ? 'At least 10 characters' : 'Your password'}
            value={form.password}
            onChange={set('password')}
            autoFocus={isInvite}
          />
          {tooShort && <p className="au-note">Needs at least 10 characters.</p>}
        </div>

        {isInvite && (
          <div className="au-field">
            <label className="au-label" htmlFor="confirm">Retype the same password</label>
            <input
              id="confirm"
              name="confirm"
              className={`ad-input au-input ${mismatch ? 'is-bad' : ''}`}
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Type it again to confirm"
              value={form.confirm}
              onChange={set('confirm')}
            />
            {mismatch && <p className="au-note is-bad">These two do not match yet.</p>}
          </div>
        )}

        <label className="au-show">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          <span>Show password</span>
        </label>

        {error && <p className="ad-error">{error}</p>}

        <button className="ad-btn ad-btn-ink au-submit" type="submit" disabled={pending}>
          {pending ? 'Checking…' : isInvite ? 'Set password and continue' : 'Sign in'}
        </button>

        {isInvite && (
          <p className="au-hint">Both boxes must match, and be at least 10 characters.</p>
        )}
      </form>
    </div>
  );
}
