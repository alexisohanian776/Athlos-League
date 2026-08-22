import Link from 'next/link';
import { notFound } from 'next/navigation';
import LeagueNav from '@/components/league-nav';
import LeagueFooter from '@/components/league-footer';
import PhotoCrop, { initials } from '@/components/photo-crop';
import MarkPill from '@/components/mark-pill';
import SocialGlyph from '@/components/athlete/social-glyph';
import AthletePosts from '@/components/athlete/athlete-posts';
import { ALL_ATHLETE_SLUGS, getAthleteProfile, relatedAthletes } from '@/lib/athlete-profiles';
import { ATHLETES, MEETS, daysUntil } from '@/lib/league';

export const revalidate = 3600;

export function generateStaticParams() {
  const slugs = new Set([...ALL_ATHLETE_SLUGS, ...ATHLETES.map((a) => a.slug)]);
  return [...slugs].map((slug) => ({ slug }));
}

export function generateMetadata({ params }) {
  const a = getAthleteProfile(params.slug);
  if (!a) return {};
  return {
    title: `${a.name} — ATHLOS`,
    description: `${a.name}, ${a.event}, ${a.country}. ATHLOS race history and marks.`,
  };
}

export default function AthleteProfilePage({ params }) {
  const a = getAthleteProfile(params.slug);
  if (!a) notFound();

  const related = relatedAthletes(a.slug);
  const london = { ...MEETS[0], days: daysUntil(MEETS[0].iso) };

  return (
    <div className="league">
      <LeagueNav active="Athletes" />

      <header className="pf-hero">
        <div className="pf-hero-photo">
          <PhotoCrop
            tone={a.tone}
            mono={initials(a.name)}
            monoSize={260}
            style={{ position: 'absolute', inset: 0 }}
          />
          <span className="pf-hero-code lg-mono-data">{a.code}</span>
        </div>
        <div className="pf-hero-info">
          <div className="pf-hero-eyebrow lg-mono">Elite · {a.event} · {a.country}</div>
          <h1 className="lg-display pf-hero-name">{a.name}</h1>

          <div className="pf-hero-meta">
            <div><div className="lg-mono pf-k">Event</div><div className="pf-v">{a.event}</div></div>
            <div><div className="lg-mono pf-k">Country</div><div className="pf-v">{a.country}</div></div>
            {a.hometown && (
              <div><div className="lg-mono pf-k">Hometown</div><div className="pf-v">{a.hometown}</div></div>
            )}
          </div>

          {(a.sponsors.length > 0 || a.socials.length > 0) && (
            <div className="pf-hero-rows">
              {a.sponsors.length > 0 && (
                <div className="pf-sponsor">
                  <span className="lg-mono pf-k">Sponsor</span>
                  <span className="pf-sponsor-name">{a.sponsors.join(' · ')}</span>
                </div>
              )}
              {a.socials.length > 0 && (
                <div className="pf-socials">
                  {a.socials.map((s) => (
                    <a key={s.net} href="#" className="pf-social" target="_blank" rel="noopener noreferrer">
                      <SocialGlyph icon={s.icon} /><span>{s.handle}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {a.bio.length > 0 && (
            <div className="pf-bio lg-serif">
              {a.bio.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
            </div>
          )}
        </div>
      </header>

      <div className="pf-body">
        {a.history.length > 0 && (
          <section className="pf-sec">
            <div className="pf-sec-head">
              <div className="lg-section-eyebrow">On the ATHLOS stage</div>
              <h2 className="lg-display pf-sec-title">Race history</h2>
            </div>
            <div className="pf-table-wrap">
              <table className="pf-table">
                <thead>
                  <tr>
                    <th>Year</th><th>Meet</th><th>Event</th><th className="ta-c">Finish</th>
                    <th className="ta-r">Time</th><th className="ta-r">Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {a.history.map((r) => (
                    <tr key={`${r.year}-${r.event}`} className={r.marks.includes('MR') ? 'is-mr' : ''}>
                      <td className="lg-mono-data pf-year">{r.year}</td>
                      <td className="pf-meet">{r.meet}</td>
                      <td className="lg-mono pf-ev">{r.event}</td>
                      <td className="ta-c">
                        <span className={`pf-place ${r.place ? '' : 'is-out'}`}>{r.place || r.status}</span>
                      </td>
                      <td className="ta-r lg-mono-data pf-time">{r.mark}</td>
                      <td className="ta-r pf-marks">{r.marks.map((m) => <MarkPill key={m} mark={m} />)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {a.bests.length > 0 ? (
          <section className="pf-sec">
            <div className="pf-sec-head">
              <div className="lg-section-eyebrow">Beyond this league</div>
              <h2 className="lg-display pf-sec-title">Career bests</h2>
            </div>
            <div className="pf-bests">
              {a.bests.map((b) => (
                <div key={b.event} className="pf-best">
                  <div className="lg-mono pf-best-ev">{b.event}</div>
                  <div className="lg-mono-data pf-best-mark">{b.mark}</div>
                  <div className="pf-best-meta">
                    {b.wr && <span className="pf-wr">World record</span>}
                    <span className="lg-mono pf-best-where">{b.where} · {b.year}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : a.athlosBests.length > 0 && (
          <section className="pf-sec">
            <div className="pf-sec-head">
              <div className="lg-section-eyebrow">On this stage</div>
              <h2 className="lg-display pf-sec-title">ATHLOS bests</h2>
            </div>
            <div className="pf-bests">
              {a.athlosBests.map((b) => (
                <div key={b.event} className="pf-best">
                  <div className="lg-mono pf-best-ev">{b.event}</div>
                  <div className="lg-mono-data pf-best-mark">{b.mark}</div>
                  <div className="pf-best-meta">
                    {b.mr && <span className="pf-wr">Meet record</span>}
                    <span className="lg-mono pf-best-where">{b.where} · {b.year}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {a.posts.length > 0 && <AthletePosts first={a.first} posts={a.posts} />}

      {a.confirmed2026 && (
        <section className="pf-up">
          <div className="pf-up-accent" />
          <div className="pf-up-inner">
            <div>
              <div className="lg-section-eyebrow" style={{ color: 'var(--accent)' }}>Up next · Confirmed</div>
              <h2 className="lg-display pf-up-title">{a.first} races {london.name}</h2>
              <p className="lg-serif pf-up-sub">
                <a className="pf-venue-link" href={london.map} target="_blank" rel="noopener noreferrer">{london.venue}</a>
                {' '}· {london.area} — {london.date}, {london.time}. Seven events on the card.
              </p>
            </div>
            <div className="pf-up-side">
              <div className="pf-up-count">
                <span className="lg-mono-data">{london.days}</span>
                <span className="lg-mono pf-up-days">days out</span>
              </div>
              <a href={london.ticketUrl} target="_blank" rel="noopener noreferrer" className="lg-btn lg-btn-red lg-btn-lg">
                Get tickets →
              </a>
            </div>
          </div>
        </section>
      )}

      <div className="pf-body">
        <section className="pf-sec">
          <div className="pf-sec-head">
            <div className="lg-section-eyebrow">Also on the line</div>
            <h2 className="lg-display pf-sec-title">More from the league</h2>
          </div>
          <div className="pf-related">
            {related.map((r) => (
              <Link key={r.slug} href={`/athletes/${r.slug}`} className="pf-rel">
                <PhotoCrop tone={r.tone} mono={initials(r.name)} monoSize={88} style={{ position: 'absolute', inset: 0 }} />
                <div className="pf-rel-shade" />
                <div className="pf-rel-body">
                  <span className="lg-mono pf-rel-ev">{r.event} · {r.code}</span>
                  <h3 className="lg-display pf-rel-name">{r.name}</h3>
                  <div className="pf-rel-mark">
                    {r.note === 'MR' && <MarkPill mark="MR" />}
                    <span className="lg-mono-data">{r.mark}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <LeagueFooter />
    </div>
  );
}
