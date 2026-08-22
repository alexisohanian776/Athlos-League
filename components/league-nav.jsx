import Link from 'next/link';
import Wordmark from './wordmark';
import { NAV, NAV_HREF } from '@/lib/league';

/* Two variants in the design: the home nav carries a search field and a red
   sign-up; interior pages mark the active section and use the ink sign-up. */
export default function LeagueNav({ active, search = false, signup = 'ink', navClassName = '' }) {
  return (
    <nav className={`lg-nav ${navClassName}`} style={search ? { gap: 36 } : undefined}>
      <Link href="/" aria-label="ATHLOS home">
        <Wordmark size={24} />
      </Link>
      <div className="lg-nav-links">
        {NAV.map((l) => (
          <Link
            key={l}
            className={`lg-nav-link ${l === active ? 'is-active' : ''}`}
            href={NAV_HREF[l] || '#'}
            aria-current={l === active ? 'page' : undefined}
          >
            {l}
          </Link>
        ))}
      </div>
      <div className="lg-nav-spacer" />
      {search && (
        <div className="hm-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" strokeLinecap="round" />
          </svg>
          <span>Search athletes, events…</span>
        </div>
      )}
      <a href="#" className="lg-btn lg-btn-ghost lg-btn-sm">Sign in</a>
      <a href="#" className={`lg-btn lg-btn-${signup} lg-btn-sm`}>Sign up</a>
    </nav>
  );
}
