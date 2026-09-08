'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/* The flare polls rather than being handed down from each page: the tabs
   render on six admin pages, and this way the count appears without
   navigating and there is one place that knows how to get it. */
const UNREAD_MS = 15000;

/* Section navigation for the admin area. People and Usage are super-admin
   only, so they are passed in rather than assumed — a plain admin never sees
   a tab they would be bounced out of. */
const BASE = [
  { href: '/admin', label: 'Run Clubs' },
  { href: '/admin/meets', label: 'Meets' },
  { href: '/admin/attendance', label: 'Attendance' },
  { href: '/admin/chat', label: 'Chat' },
];

const SUPER = [
  { href: '/admin/people', label: 'People' },
  { href: '/admin/metrics', label: 'Usage' },
];

export default function AdminTabs({ isSuper = false }) {
  const pathname = usePathname();
  const tabs = isSuper ? [...BASE, ...SUPER] : BASE;
  const [unread, setUnread] = useState(0);
  const onChat = pathname.startsWith('/admin/chat');

  useEffect(() => {
    /* Reading the chat is what clears it, so no need to poll while sitting
       in there — the chat itself reports what has been seen. */
    if (onChat) { setUnread(0); return undefined; }

    let stop = false;
    let timer;

    async function check() {
      try {
        const res = await fetch('/api/chat/unread', { cache: 'no-store' });
        if (res.ok) {
          const { count } = await res.json();
          if (!stop) setUnread(count || 0);
        }
      } catch {
        /* A failed poll leaves the last known count alone. */
      }
    }

    async function tick() {
      if (stop) return;
      if (document.visibilityState === 'visible') await check();
      timer = setTimeout(tick, UNREAD_MS);
    }

    /* Coming back to a backgrounded tab checks straight away rather than
       waiting out the interval — otherwise a tab opened in the background
       shows no flare for up to fifteen seconds after you switch to it. */
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);

    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [onChat, pathname]);

  return (
    <nav className="dash-tabs" aria-label="Admin sections">
      {tabs.map((t) => {
        /* /admin matches only itself; the rest match their subtree. */
        const active = t.href === '/admin' ? pathname === '/admin' : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`dash-tab ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {t.label}
            {t.href === '/admin/chat' && unread > 0 && (
              <span className="dash-flare" aria-label={`${unread} unread`}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
