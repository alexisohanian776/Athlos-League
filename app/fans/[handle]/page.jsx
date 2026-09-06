import Link from 'next/link';
import { notFound } from 'next/navigation';
import Avatar from '@/components/avatar';
import AthleteCard from '@/components/athlete-card';
import LeagueNav from '@/components/league-nav';
import LeagueFooter from '@/components/league-footer';
import Stub from '@/components/stub';
import { getUserByHandle } from '@/lib/users-db';
import { stubsFor } from '@/lib/meets-db';
import { getClubById } from '@/lib/clubs-db';
import { cardForAthlete } from '@/lib/season-cards';

export const dynamic = 'force-dynamic';

/* A name already ending in s takes a bare apostrophe — Alexis', not
   Alexis's. Same for names ending in an s-sound spelled z or x. */
function possessive(name) {
  const n = String(name || '').trim();
  return /[sxz]$/i.test(n) ? `${n}\u2019` : `${n}\u2019s`;
}

export async function generateMetadata({ params }) {
  const user = await getUserByHandle(params.handle);
  if (!user) return { title: 'Not found — ATHLOS' };
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || `@${user.handle}`;
  return {
    title: `${name} — ATHLOS`,
    description: user.bio || `${name} on ATHLOS.`,
  };
}

export default async function FanProfile({ params }) {
  const user = await getUserByHandle(params.handle);
  if (!user || user.disabled) notFound();

  const [stubs, club] = await Promise.all([
    stubsFor(user.id),
    user.clubId ? getClubById(user.clubId) : null,
  ]);

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || `@${user.handle}`;
  const years = [...new Set(stubs.map((s) => s.year))].sort();
  const cities = [...new Set(stubs.map((s) => s.city).filter(Boolean))];
  const favourites = (user.favourites || []).map(cardForAthlete).filter(Boolean);

  const socials = [
    user.instagram && { net: 'Instagram', handle: user.instagram.replace(/^@/, ''),
      href: `https://instagram.com/${user.instagram.replace(/^@/, '')}` },
    user.strava && { net: 'Strava', handle: user.strava.replace(/^@/, ''),
      href: user.strava.startsWith('http') ? user.strava : `https://strava.com/athletes/${user.strava}` },
  ].filter(Boolean);

  /* The numbers are only what the stubs prove — nothing inferred. */
  const stats = [
    { k: stubs.length === 1 ? 'Meet' : 'Meets', v: stubs.length },
    years.length > 0 && { k: 'Since', v: years[0] },
    cities.length > 0 && { k: cities.length === 1 ? 'City' : 'Cities', v: cities.length },
  ].filter(Boolean);

  return (
    <div className="league">
      <LeagueNav />

      <header className="fn-hero">
        <div className="fn-wrap">
          <div className="fn-id">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="fn-avatar" src={user.avatarUrl} alt="" width={132} height={132} />
            ) : (
              <Avatar name={name} size={132} tone="ph-plum" />
            )}

            <div className="fn-id-copy">
              <div className="fn-eyebrow lg-mono">
                In the stands{user.city ? ` · ${user.city}` : ''}
              </div>
              <h1 className="lg-display fn-name">{name}</h1>
              <div className="lg-mono fn-handle">@{user.handle}</div>

              {user.bio && <p className="fn-bio lg-serif">{user.bio}</p>}

              <div className="fn-rows">
                {club && (
                  <Link className="fn-club" href={`/run-clubs/${club.slug}`}>
                    <Avatar name={club.city} size={28} tone={club.tone} />
                    <span className="fn-club-copy">
                      <span className="lg-mono fn-club-k">Runs with</span>
                      <span className="fn-club-name">{club.name}</span>
                    </span>
                  </Link>
                )}

                {socials.length > 0 && (
                  <div className="fn-socials">
                    {socials.map((s) => (
                      <a key={s.net} href={s.href} className="fn-social"
                        target="_blank" rel="noopener noreferrer">
                        <span className="lg-mono">{s.net}</span>
                        <span className="fn-social-h">@{s.handle}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="fn-stats">
            {stats.map((s) => (
              <div className="fn-stat" key={s.k}>
                <div className="fn-stat-v">{s.v}</div>
                <div className="lg-mono fn-stat-k">{s.k}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="fn-body">
        <section className="fn-sec">
          <div className="fn-sec-head">
            <div className="lg-section-eyebrow">Verified attendance</div>
            <h2 className="lg-display fn-sec-title">The stubs</h2>
          </div>

          {stubs.length === 0 ? (
            <p className="stub-empty">
              No verified meets yet. A stub appears here once the league confirms
              they were in the stands. <Link href="/">See the schedule →</Link>
            </p>
          ) : (
            <div className="stub-grid">
              {stubs.map((meet) => (
                <Stub key={meet.id} meet={meet} holder={name} holderId={user.id} />
              ))}
            </div>
          )}
        </section>

        {favourites.length > 0 && (
          <section className="fn-sec">
            <div className="fn-sec-head">
              <div className="lg-section-eyebrow">Who they watch</div>
              <h2 className="lg-display fn-sec-title">
                {possessive(name.split(' ')[0])} top {favourites.length}
              </h2>
            </div>
            <div className="fn-faves">
              {favourites.map((card, i) => (
                <div className="fn-fave" key={card.slug}>
                  <span className="fn-fave-rank lg-mono-data">{i + 1}</span>
                  <AthleteCard card={card} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <LeagueFooter />
    </div>
  );
}
