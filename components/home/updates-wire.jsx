import Link from 'next/link';
import { UPDATES } from '@/lib/feed';

const catClass = (cat) =>
  cat === 'Brand' ? 'is-brand' : cat === 'Meet' ? 'is-meet' : 'is-athlete';

export default function UpdatesWire() {
  return (
    <section className="hm-wire">
      <div className="hm-wrap">
        <div className="hm-wire-head">
          <h2 className="lg-display">League updates</h2>
          <Link href="/news" className="lg-mono" style={{ color: 'var(--accent)' }}>
            All updates →
          </Link>
        </div>
        <div className="hm-wire-list">
          {UPDATES.map((u, i) => (
            <Link className="hm-wire-item" href="/news" key={u.title}>
              <span className="hm-wire-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div className={`lg-mono hm-wire-cat ${catClass(u.cat)}`}>{u.cat}</div>
                <h3>{u.title}</h3>
                <p className="hm-wire-teaser">{u.teaser}</p>
                <div className="hm-wire-meta">
                  <span>{u.date}</span>
                  <span>▲ {u.votes}</span>
                  <span>{u.comments} comments</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
