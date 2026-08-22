import Link from 'next/link';
import { MEET_RECORDS, NAV_HREF } from '@/lib/league';

export default function RecordsStrip() {
  return (
    <section className="hm-records">
      <div className="hm-wrap">
        <div className="hm-records-head">
          <h2 className="lg-display">ATHLOS meet records</h2>
          <span className="lg-mono" style={{ color: 'rgba(255,255,255,.45)' }}>
            The marks to beat · 2024–2025
          </span>
          <span style={{ flex: 1 }} />
          {/* The prototype pointed this at Schedule.html; with Schedule folded
              into home, every season's results live on the Athletes index. */}
          <Link href={NAV_HREF.Athletes} className="lg-mono" style={{ color: 'var(--accent)' }}>
            All results →
          </Link>
        </div>
        <div className="hm-records-grid">
          {MEET_RECORDS.map((r) => (
            <div className="hm-record" key={r.ev}>
              <div className="lg-mono hm-record-ev">{r.ev}</div>
              <div className="hm-record-mark">{r.t}</div>
              <div className="hm-record-who">{r.who}</div>
              <div className="hm-record-yr">&rsquo;{r.yr}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
