import Link from 'next/link';
import { notFound } from 'next/navigation';
import LeagueNav from '@/components/league-nav';
import LeagueFooter from '@/components/league-footer';
import PhotoCrop from '@/components/photo-crop';
import Avatar from '@/components/avatar';
import GoingStack from '@/components/clubs/going-stack';
import { CLUB_DETAIL, CLUB_FAN_TONES } from '@/lib/clubs';
import { getClub, listClubs } from '@/lib/clubs-db';

export const revalidate = 60;

export async function generateStaticParams() {
  const clubs = await listClubs();
  return clubs.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }) {
  const club = await getClub(params.slug);
  if (!club) return {};
  return {
    title: `${club.name} — ATHLOS Run Clubs`,
    description: `${club.name}, ${club.city} · ${club.hood}. Led by ${club.organizer}.`,
  };
}

export default async function ClubPage({ params }) {
  const club = await getClub(params.slug);
  if (!club) notFound();

  /* Only RUNPAC has authored page content in the design; the rest render
     from their directory record until their content lands. */
  const detail = CLUB_DETAIL[club.slug] || {};
  const { photos = [], runs = [], roster = [] } = detail;

  /* Bio and links come from the database so club leaders can edit them; the
     authored map is the fallback for clubs seeded before those columns. */
  const about = club.about ? club.about.split(/\n\s*\n/).filter(Boolean) : (detail.about || []);
  const socials = [
    club.instagram && { net: 'Instagram', handle: club.instagram, icon: 'ig' },
    club.strava && { net: 'Strava', handle: club.strava },
    club.website && { net: 'Website', handle: club.website.replace(/^https?:\/\//, '') },
  ].filter(Boolean);
  const links = socials.length ? socials : (detail.socials || []);

  return (
    <div className="league">
      <LeagueNav active="Run Clubs" />

      <header className="cp-hero">
        <div className="cp-hero-inner">
          <div className="cp-hero-logo">
            <PhotoCrop
              tone={club.tone}
              mono={club.name.slice(0, 2)}
              monoSize={120}
              style={{ position: 'absolute', inset: 0 }}
            />
          </div>
          <div className="cp-hero-info">
            <Link href="/run-clubs" className="cp-back lg-mono">← All run clubs</Link>
            <div className="cp-hero-tags">
              <span
                className={`cl-card-tag lg-mono ${club.type === 'Partner' ? 'is-partner' : ''}`}
                style={{ position: 'static' }}
              >
                {club.type === 'Partner' ? 'Partner club' : 'Official'}
              </span>
              <span className="lg-mono cp-since">Est. {club.founded}</span>
            </div>
            <h1 className="lg-display cp-name">{club.name}</h1>
            <div className="cp-meta">
              <div>
                <div className="lg-mono cp-k">City</div>
                <div className="cp-v">{club.city} · {club.hood}</div>
              </div>
              <div>
                <div className="lg-mono cp-k">Members</div>
                <div className="cp-v">{club.members.toLocaleString('en-US')}</div>
              </div>
              {/* Only shown when we actually know who runs the club. */}
              {club.organizer && (
                <div>
                  <div className="lg-mono cp-k">Organizer</div>
                  <div className="cp-v">{club.organizer}</div>
                </div>
              )}
              {club.next && (
                <div>
                  <div className="lg-mono cp-k">Next run</div>
                  <div className="cp-v">{club.next}</div>
                </div>
              )}
            </div>
            <div className="cp-hero-actions">
              <a href="#" className="lg-btn lg-btn-red lg-btn-lg">Join this club →</a>
              {links.length > 0 && (
                <div className="cp-socials">
                  {links.map((s) => (
                    <a key={s.net} href="#" className="cp-social lg-mono" target="_blank" rel="noopener noreferrer">
                      {s.net}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {photos.length > 0 && (
        <section className="cp-photos">
          {photos.map((tone, i) => (
            <div className="cp-photo" key={`${tone}-${i}`}>
              <PhotoCrop tone={tone} mono={club.code} monoSize={40} style={{ position: 'absolute', inset: 0 }} />
            </div>
          ))}
        </section>
      )}

      <div className="cp-body">
        <main className="cp-main">
          {runs.length > 0 && (
            <section>
              <div className="cp-sec-head">
                <h2 className="lg-display cp-sec-title">Upcoming runs</h2>
                <span className="lg-mono cp-sec-note">RSVPs are public · just show up</span>
              </div>
              <div className="cp-runs">
                {runs.map((r) => (
                  <div className="cp-run" key={`${r.dow}-${r.date}`}>
                    <div className="cp-run-when">
                      <span className="lg-mono cp-run-dow">{r.dow}</span>
                      <span className="lg-display cp-run-date">{r.date}</span>
                      <span className="lg-mono-data cp-run-time">{r.time}</span>
                    </div>
                    <div className="cp-run-detail">
                      <h3 className="cp-run-plan">{r.plan}</h3>
                      <div className="cp-run-facts">
                        <span className="cp-run-loc">{r.loc}</span>
                        <span className="lg-mono cp-run-pace">{r.pace}</span>
                      </div>
                      <GoingStack faces={r.faces} going={r.going} />
                    </div>
                    <div className="cp-run-cta">
                      <button className="lg-btn lg-btn-ink lg-btn-sm" type="button">RSVP</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {about.length > 0 && (
            <section className="cp-about">
              <h2 className="lg-display cp-sec-title">About</h2>
              {about.map((p) => <p className="lg-serif cp-about-p" key={p.slice(0, 24)}>{p}</p>)}
              {links.length > 0 && (
                <div className="cp-about-socials">
                  {links.map((s) => (
                    <a key={s.net} href="#" className="cp-about-social" target="_blank" rel="noopener noreferrer">
                      <span className="lg-mono cp-about-net">{s.net}</span>
                      <span className="cp-about-handle">{s.handle}</span>
                    </a>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>

        <aside className="cp-aside">
          <div className="cp-card">
            <div className="cp-card-num lg-mono-data">{club.members}</div>
            <div className="lg-mono cp-card-label">members strong</div>
            <a href="#" className="lg-btn lg-btn-red" style={{ width: '100%', marginTop: 18 }}>
              Join this club →
            </a>
          </div>
          {roster.length > 0 && (
            <div className="cp-card">
              <div className="cp-members-head">
                <span className="lg-mono cp-card-label">Members</span>
                <span className="lg-mono cp-members-count">{club.members} total</span>
              </div>
              <div className="cp-members-grid">
                {roster.map((n, i) => (
                  <Avatar key={n} name={n} size={40} tone={CLUB_FAN_TONES[i % CLUB_FAN_TONES.length]} />
                ))}
              </div>
              <p className="lg-mono cp-members-note">Sign in to see the full roster.</p>
            </div>
          )}
        </aside>
      </div>

      <LeagueFooter />
    </div>
  );
}
