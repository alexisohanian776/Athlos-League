/* Home is the season schedule: the 2026 meets up top, the past-meets archive
   below. (The earlier "direction C" home lives in components/home/ and is no
   longer routed.) */
import LeagueNav from '@/components/league-nav';
import LeagueFooter from '@/components/league-footer';
import UpcomingCard from '@/components/schedule/upcoming-card';
import ScheduleArchive from '@/components/schedule/schedule-archive';
import { MEETS, daysUntil } from '@/lib/league';

/* The meet countdowns are computed, so the page is regenerated hourly. */
export const revalidate = 3600;

export const metadata = {
  title: 'ATHLOS League',
  description: 'The fastest women on Earth line up in London this September. Seven events in one night.',
};

export default function HomePage() {
  const now = new Date();
  const meets = MEETS.map((m) => ({ ...m, days: daysUntil(m.iso, now) }));

  return (
    <div className="league">
      <LeagueNav />

      <header className="sc-head">
        <div className="lg-section-eyebrow">One city · One night</div>
        <h1 className="lg-display sc-title">The 2026 season</h1>
        <p className="lg-serif sc-intro">
          The fastest women on Earth line up in London this September. Seven
          events in one night. Here is where and when.
        </p>
      </header>

      <section className={`sc-upcoming ${meets.length === 1 ? 'is-single' : ''}`}>
        {meets.map((m) => <UpcomingCard key={m.city} meet={m} />)}
      </section>

      <ScheduleArchive />

      <LeagueFooter />
    </div>
  );
}
