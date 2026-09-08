'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Avatar from '../avatar';

/* Near-realtime, by polling every few seconds.

   Not push: Vercel functions are short-lived and Neon speaks HTTP, so
   holding a socket open per admin would mean adding a service. Polling a
   cheap "anything after id N" query is honest about what it is and needs no
   extra infrastructure. */
const POLL_MS = 4000;

/* Formatted here rather than on the server: this is the one place a local
   clock is the right clock, since it is "how long ago for me". */
function ago(iso) {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 45) return 'just now';
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.round(secs / 3600)}h ago`;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
    .format(new Date(iso));
}

export default function ChatRoom({ initial = [], meId, canModerate = false }) {
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [live, setLive] = useState(true);

  const listRef = useRef(null);
  const pinnedRef = useRef(true);   // is the reader at the bottom?

  const lastId = messages.length ? messages[messages.length - 1].id : 0;

  const merge = useCallback((incoming) => {
    if (!incoming?.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const added = incoming.filter((m) => !seen.has(m.id));
      return added.length ? [...prev, ...added] : prev;
    });
  }, []);

  /* Poll, but only while the tab is visible — a background tab does not need
     to keep hitting the database. */
  useEffect(() => {
    let stop = false;
    let timer;

    async function tick() {
      if (stop) return;
      if (document.visibilityState === 'visible') {
        try {
          const res = await fetch(`/api/chat?after=${lastId}`, { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            merge(json.messages);
            setLive(true);
          } else if (res.status === 403) {
            setLive(false);
          }
        } catch {
          setLive(false);
        }
      }
      timer = setTimeout(tick, POLL_MS);
    }

    timer = setTimeout(tick, POLL_MS);
    return () => { stop = true; clearTimeout(timer); };
  }, [lastId, merge]);

  /* Being in the room is what marks messages read. Sent on mount and
     whenever the newest id moves, so the flare clears for this person
     without waiting for a navigation. */
  useEffect(() => {
    if (!lastId) return;
    fetch('/api/chat/unread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upTo: lastId }),
    }).catch(() => {});
  }, [lastId]);

  /* Follow new messages only if the reader had not scrolled up to read
     history — otherwise it yanks the view away mid-sentence. */
  useEffect(() => {
    const el = listRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  async function send(e) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not send.');
      merge(json.messages);
      setDraft('');
      pinnedRef.current = true;
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function remove(id) {
    setError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Could not delete.');
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="ch">
      <div className="ch-list" ref={listRef} onScroll={onScroll}>
        {messages.length === 0 && (
          <p className="ch-empty">
            Nothing here yet. This is for the admin team — nobody outside it can read this.
          </p>
        )}

        {messages.map((m, i) => {
          /* Consecutive messages from one person share a header. */
          const prev = messages[i - 1];
          const grouped = prev && prev.userId === m.userId
            && new Date(m.createdAt) - new Date(prev.createdAt) < 5 * 60 * 1000;

          return (
            <div className={`ch-msg ${grouped ? 'is-grouped' : ''} ${m.userId === meId ? 'is-mine' : ''}`} key={m.id}>
              <div className="ch-gutter">
                {!grouped && (m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="ch-avatar" src={m.avatarUrl} alt="" width={30} height={30} />
                ) : (
                  <Avatar name={m.who} size={30} tone="ph-plum" />
                ))}
              </div>

              <div className="ch-body">
                {!grouped && (
                  <div className="ch-meta">
                    <span className="ch-who">{m.who}</span>
                    <span className="ch-time">{ago(m.createdAt)}</span>
                  </div>
                )}
                {/* Rendered as text — never as markup. */}
                <div className="ch-text">{m.body}</div>
              </div>

              {(m.userId === meId || canModerate) && (
                <button type="button" className="ch-del" onClick={() => remove(m.id)}
                  aria-label="Delete message">✕</button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="dash-error ch-error">{error}</p>}
      {!live && <p className="ch-stale">Not receiving updates — reload to reconnect.</p>}

      <form className="ch-form" onSubmit={send}>
        <textarea
          className="dash-input ch-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            /* Enter sends, Shift+Enter writes a new line. */
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          rows={2}
          maxLength={2000}
          placeholder="Message the admin team — Enter to send, Shift+Enter for a new line"
        />
        <button className="dash-btn dash-btn-ink ch-send" type="submit" disabled={sending || !draft.trim()}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
