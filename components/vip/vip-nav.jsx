import Link from 'next/link';
import Wordmark from '../wordmark';
import { NAV, NAV_HREF } from '@/lib/league';

export default function VipNav({ cta = true }) {
  return (
    <nav className="vip-nav">
      <Link href="/" aria-label="ATHLOS home">
        <Wordmark size={24} light />
      </Link>
      <div className="vip-nav-links">
        {NAV.map((l) => (
          <Link
            key={l}
            className={`vip-nav-link ${l === 'VIP' ? 'is-on' : ''}`}
            href={NAV_HREF[l] || '#'}
            aria-current={l === 'VIP' ? 'page' : undefined}
          >
            {l}
          </Link>
        ))}
      </div>
      <div className="vip-nav-spacer" />
      {cta && <a href="#details" className="vip-btn vip-btn-red vip-btn-sm">Your evening</a>}
    </nav>
  );
}
