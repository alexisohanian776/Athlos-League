import Link from 'next/link';
import PhotoCrop from '../photo-crop';
import Avatar from '../avatar';
import { listClubs } from '@/lib/clubs-db';

export default async function RunClubs() {
  const clubs = await listClubs();
  return (
    <section className="hm-clubs">
      <div className="hm-wrap hm-clubs-grid">
        <div>
          <div className="lg-section-eyebrow hm-clubs-eyebrow">Official ATHLOS Run Clubs</div>
          <h2 className="lg-display hm-clubs-title">The crew you<br />run with.</h2>
          <p className="hm-clubs-note">
            The track meet you watch on TV. The crew you run with on Saturday.
            Six cities and counting.
          </p>
          <Link href="/run-clubs" className="lg-btn lg-btn-ink">Start a club</Link>
          <div className="hm-clubs-map">
            <PhotoCrop tone="ph-field">
              <div className="hm-clubs-map-label lg-mono">
                Map · {new Set(clubs.map((c) => c.city)).size} club cities
              </div>
              {clubs.map((c) => (
                <span
                  key={c.name}
                  className="hm-clubs-pin"
                  style={{ left: `${c.mapX}%`, top: `${c.mapY}%` }}
                />
              ))}
            </PhotoCrop>
          </div>
        </div>

        <div className="lg-card hm-clubs-list">
          {clubs.map((c) => (
            <Link className="hm-club" href={`/run-clubs/${c.slug}`} key={c.slug}>
              <Avatar name={c.city} size={48} tone={c.tone} />
              <div>
                <div className="hm-club-name">{c.name}</div>
                <div className="lg-mono hm-club-next">Next run · {c.next}</div>
              </div>
              <div className="hm-club-count">
                {c.members}
                <span>members</span>
              </div>
              <span className="lg-mono hm-club-view">View →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
