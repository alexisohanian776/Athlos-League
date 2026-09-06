import Link from 'next/link';
import LeagueNav from '@/components/league-nav';
import LeagueFooter from '@/components/league-footer';
import ClubsDirectory from '@/components/clubs/clubs-directory';
import { clubStats, listClubs } from '@/lib/clubs-db';

export const metadata = {
  title: 'ATHLOS — Run Clubs',
  description: 'Find an official ATHLOS run club near you, or start one in your city.',
};

/* Reads club and meet records the league edits in admin, and the Neon
   driver is uncached, so this renders per request rather than being
   prerendered — edits show up immediately. */
export const dynamic = 'force-dynamic';

export default async function RunClubsPage() {
  const [clubs, stats] = await Promise.all([listClubs(), clubStats()]);
  return (
    <div className="league">
      <LeagueNav active="Run Clubs" />

      <header className="cl-hero">
        <div className="cl-hero-inner">
          <div className="lg-section-eyebrow" style={{ color: 'var(--green-ink)' }}>Community</div>
          <h1 className="lg-display cl-title">ATHLOS<br />Run Clubs</h1>
          <p className="lg-serif cl-pitch">
            The track meet you watch on TV. The crew you run with on Saturday.
          </p>
          <div className="cl-stats">
            <div className="cl-stat">
              <span className="lg-mono-data cl-stat-n">{stats.clubs}</span>
              <span className="lg-mono cl-stat-l">clubs</span>
            </div>
            <div className="cl-stat">
              <span className="lg-mono-data cl-stat-n">{stats.regions}</span>
              <span className="lg-mono cl-stat-l">regions</span>
            </div>
            <div className="cl-stat">
              <span className="lg-mono-data cl-stat-n">{stats.runners.toLocaleString('en-US')}</span>
              <span className="lg-mono cl-stat-l">runners</span>
            </div>
          </div>
          <a href="#start" className="lg-btn lg-btn-ink lg-btn-lg cl-hero-cta">
            Start a club in your city →
          </a>
        </div>
      </header>

      <ClubsDirectory clubs={clubs} />

      <section className="cl-start" id="start">
        <div className="cl-start-inner">
          <div>
            <div className="lg-section-eyebrow" style={{ color: 'var(--accent)' }}>Lead your city</div>
            <h2 className="lg-display cl-start-title">Start an Official<br />ATHLOS Run Club</h2>
            <p className="lg-serif cl-start-sub">
              No club in your city yet? Bring one to life. Tell us where you run and
              why — League Ops reviews every application within 48 hours.
            </p>
          </div>
          <a href="#" className="lg-btn lg-btn-red lg-btn-lg">Apply to start a club →</a>
        </div>
      </section>

      <LeagueFooter />

      <a href="#start" className="cl-sticky lg-btn lg-btn-red">Start a club →</a>
    </div>
  );
}
