/* Home is the season schedule: the 2026 meets up top, the past-meets archive
   below. (The earlier "direction C" home lives in components/home/ and is no
   longer routed.) */
import LeagueNav from '@/components/league-nav';
import LeagueFooter from '@/components/league-footer';
import UpcomingCard from '@/components/schedule/upcoming-card';
import ScheduleArchive from '@/components/schedule/schedule-archive';
import { pastMeetsForArchive } from '@/lib/meets-db';
import { MEETS, daysUntil } from '@/lib/league';

/* The meet countdowns are computed, so the page is regenerated hourly. */
/* Reads club and meet records the league edits in admin, and the Neon
   driver is uncached, so this renders per request rather than being
   prerendered — edits show up immediately. */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ATHLOS League',
  description: 'The fastest women on Earth line up in London this September. Seven events in one night.',
};

export default async function HomePage() {
  /* Meets come from the database now, so attendance typed in admin shows up
     here. updateMeetAction revalidates '/', so the hourly cache below never
     holds a stale number for long. */
  const pastMeets = await pastMeetsForArchive();
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

      <ScheduleArchive meets={pastMeets} />

      <LeagueFooter />
    </div>
  );
}
