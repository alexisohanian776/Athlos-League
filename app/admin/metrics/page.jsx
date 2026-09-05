import Link from 'next/link';
import AccountBar from '@/components/account/account-bar';
import { currentUser } from '@/lib/current-user';
import { getUserById, usageMetrics } from '@/lib/users-db';
import { listClubs } from '@/lib/clubs-db';
import { SEASONS } from '@/lib/season-cards';

export const metadata = { title: 'Usage — ATHLOS admin' };
export const dynamic = 'force-dynamic';

/* Dates are pinned to UTC so the server and the browser render the same
   string — see the People panel for what happens when they don't. */
const shortDay = (iso) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${iso}T00:00:00Z`));

export default async function MetricsPage() {
  const session = await currentUser();
  const me = session ? await getUserById(session.id) : null;

  /* Middleware gates /admin, but this page is super-admin only and a server
     component is directly addressable, so it re-checks for itself. */
  if (!me?.isSuper || me.disabled) {
    return (
      <div className="dash">
        <AccountBar email={me?.email} role={me?.role} avatarUrl={me?.avatarUrl} />
        <div className="dash-wrap">
          <h1 className="dash-title">Not available</h1>
          <p className="dash-login-note">
            Usage is super-admin only. <Link href="/admin">Back to admin</Link>.
          </p>
        </div>
      </div>
    );
  }

  const [{ counts, signins, daily, recent }, clubs] = await Promise.all([
    usageMetrics(),
    listClubs(),
  ]);

  const runners = clubs.reduce((n, c) => n + c.members, 0);
  const athletes = new Set(SEASONS.flatMap((s) => s.cards.map((c) => c.slug))).size;
  const peak = Math.max(1, ...daily.map((d) => d.n));

  const stats = [
    { label: 'People', value: counts.users, note: `${counts.admins} admin · ${counts.leaders} leader` },
    { label: 'Signed in, 30d', value: counts.active30, note: `of ${counts.users} accounts` },
    { label: 'Sign-ins, 7d', value: signins.week, note: `${signins.month} in 30d` },
    { label: 'Invites pending', value: counts.pending, note: counts.revoked ? `${counts.revoked} revoked` : 'none revoked' },
    { label: 'Run clubs', value: clubs.length, note: `${runners.toLocaleString('en-US')} runners` },
    { label: 'Athlete cards', value: athletes, note: `${SEASONS.length} seasons` },
  ];

  return (
    <div className="dash">
      <AccountBar email={me.email} role={me.role} avatarUrl={me.avatarUrl}
        name={[me.firstName, me.lastName].filter(Boolean).join(' ')} />
      <div className="dash-wrap">
        <div className="dash-head">
          <h1 className="dash-title">Usage</h1>
          <span className="dash-count">Super admin · {signins.total} sign-ins recorded</span>
        </div>

        <div className="mx-stats">
          {stats.map((s) => (
            <div className="dash-card mx-stat" key={s.label}>
              <div className="mx-stat-label">{s.label}</div>
              <div className="mx-stat-value">{s.value}</div>
              <div className="mx-stat-note">{s.note}</div>
            </div>
          ))}
        </div>

        <div className="dash-card">
          <div className="dash-card-head">
            <span className="dash-card-name">Sign-ins, last 14 days</span>
            <div className="dash-card-spacer" />
            <span className="dash-card-meta">peak {peak}/day</span>
          </div>
          <div className="mx-chart">
            {daily.map((d) => (
              <div className="mx-bar-col" key={d.day} title={`${d.day} · ${d.n}`}>
                <div className="mx-bar" style={{ height: `${Math.round((d.n / peak) * 100)}%` }} />
                <span className="mx-bar-n">{d.n || ''}</span>
                <span className="mx-bar-day">{shortDay(d.day)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card">
          <div className="dash-card-head">
            <span className="dash-card-name">Per person</span>
            <div className="dash-card-spacer" />
            <span className="dash-card-meta">most recent first</span>
          </div>
          <div className="mx-table">
            <div className="mx-row mx-row-head">
              <span>Name</span><span>Role</span><span>Sign-ins</span><span>Last seen</span>
            </div>
            {recent.map((r) => (
              <div className="mx-row" key={r.email}>
                <span className="mx-who">
                  {[r.first_name, r.last_name].filter(Boolean).join(' ') || r.email}
                  <em>{r.email}</em>
                </span>
                <span>
                  {r.is_super ? 'super admin' : r.role}
                  {r.disabled && <span className="dash-tag is-revoked mx-revoked">revoked</span>}
                </span>
                <span>{r.logins}</span>
                <span>{r.last_login || 'never'}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="dash-hint" style={{ marginTop: 18 }}>
          Sign-ins are the only usage the app records. Page views and clicks are
          not tracked anywhere, so nothing here is inferred.
        </p>
      </div>
    </div>
  );
}
