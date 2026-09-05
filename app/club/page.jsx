import Link from 'next/link';
import AccountBar from '@/components/account/account-bar';
import ClubForm from '@/components/admin/club-form';
import { currentUser } from '@/lib/current-user';
import { getUserById } from '@/lib/users-db';
import { listClubs } from '@/lib/clubs-db';
import { updateMyClubAction } from './actions';

export const metadata = { title: 'My run club — ATHLOS' };
export const dynamic = 'force-dynamic';

export default async function ClubDashboard() {
  const session = await currentUser();
  const user = session ? await getUserById(session.id) : null;

  if (!user) {
    return (
      <div className="dash"><div className="dash-wrap">
        <h1 className="dash-title">Signed out</h1>
        <p className="dash-login-note"><Link href="/login">Sign in again</Link>.</p>
      </div></div>
    );
  }

  /* Admins see every club here; leaders see only theirs. */
  const clubs = await listClubs();
  const mine = user.role === 'admin' ? clubs : clubs.filter((c) => c.id === user.clubId);

  return (
    <div className="dash">
      <AccountBar email={user.email} role={user.role} clubName={user.clubName} />
      <div className="dash-wrap">
        <div className="dash-head">
          <h1 className="dash-title">{user.role === 'admin' ? 'All run clubs' : 'My run club'}</h1>
          <span className="dash-count">
            {user.role === 'admin' ? `${clubs.length} clubs` : 'Your page on athlosleague.com'}
          </span>
        </div>

        {mine.length === 0 && (
          <div className="dash-card"><div className="dash-card-head">
            <span className="dash-card-name">No club assigned yet</span>
          </div>
          <p className="dash-hint" style={{ padding: '0 20px 20px' }}>
            The league has not linked your account to a club. Reply to your invite and they will sort it.
          </p></div>
        )}

        {mine.map((c) => (
          <div className="dash-card" key={c.id}>
            <div className="dash-card-head">
              <span className="dash-card-name">{c.name}</span>
              <span className={`dash-tag ${c.type === 'Partner' ? 'is-partner' : ''}`}>{c.type}</span>
              <Link className="dash-card-meta" href={`/run-clubs/${c.slug}`} target="_blank">
                /run-clubs/{c.slug} ↗
              </Link>
              <div className="dash-card-spacer" />
              <span className="dash-card-meta">{c.members} members</span>
            </div>
            <ClubForm club={c} action={updateMyClubAction} submitLabel="Save changes" leaderView />
          </div>
        ))}

        <p className="dash-hint">
          Region, club type and map position are set by the league. Ask them to change those.
        </p>
      </div>
    </div>
  );
}
