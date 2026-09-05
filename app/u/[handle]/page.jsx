import { notFound } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/avatar';
import LeagueNav from '@/components/league-nav';
import LeagueFooter from '@/components/league-footer';
import Stub from '@/components/stub';
import { getUserByHandle } from '@/lib/users-db';
import { stubsFor } from '@/lib/meets-db';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const user = await getUserByHandle(params.handle);
  if (!user) return { title: 'Not found — ATHLOS' };
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || `@${user.handle}`;
  return { title: `${name} — ATHLOS` };
}

export default async function ProfilePage({ params }) {
  const user = await getUserByHandle(params.handle);
  if (!user || user.disabled) notFound();

  const stubs = await stubsFor(user.id);
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || `@${user.handle}`;
  const years = [...new Set(stubs.map((s) => s.year))];

  return (
    <div className="league">
      <LeagueNav />

      <header className="pr-head">
        <div className="pr-wrap">
          <div className="pr-id">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="pr-avatar" src={user.avatarUrl} alt="" width={96} height={96} />
            ) : (
              <Avatar name={name} size={96} tone="ph-plum" />
            )}
            <div>
              <h1 className="lg-display pr-name">{name}</h1>
              <div className="lg-mono pr-handle">@{user.handle}</div>
              {user.bio && <p className="pr-bio">{user.bio}</p>}
            </div>
          </div>

          <div className="pr-tally">
            <div className="pr-tally-n">{stubs.length}</div>
            <div className="lg-mono pr-tally-l">
              {stubs.length === 1 ? 'meet attended' : 'meets attended'}
              {years.length > 0 && ` · ${years.join(' · ')}`}
            </div>
          </div>
        </div>
      </header>

      <section className="pr-stubs">
        <div className="pr-wrap">
          <div className="lg-section-eyebrow">The stubs</div>
          {stubs.length === 0 ? (
            <p className="stub-empty">
              No verified meets yet. Stubs appear here once the league confirms
              someone was in the stands. <Link href="/">See the schedule →</Link>
            </p>
          ) : (
            <div className="stub-grid">
              {stubs.map((meet) => (
                <Stub key={meet.id} meet={meet} holder={name} holderId={user.id} />
              ))}
            </div>
          )}
        </div>
      </section>

      <LeagueFooter />
    </div>
  );
}
