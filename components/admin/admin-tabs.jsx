'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* Section navigation for the admin area. People and Usage are super-admin
   only, so they are passed in rather than assumed — a plain admin never sees
   a tab they would be bounced out of. */
const BASE = [
  { href: '/admin', label: 'Run Clubs' },
  { href: '/admin/meets', label: 'Meets' },
  { href: '/admin/attendance', label: 'Attendance' },
];

const SUPER = [
  { href: '/admin/people', label: 'People' },
  { href: '/admin/metrics', label: 'Usage' },
];

export default function AdminTabs({ isSuper = false }) {
  const pathname = usePathname();
  const tabs = isSuper ? [...BASE, ...SUPER] : BASE;

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
          </Link>
        );
      })}
    </nav>
  );
}
