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
      <div className="ad"><div className="ad-wrap">
        <h1 className="ad-title">Signed out</h1>
        <p className="ad-login-note"><Link href="/login">Sign in again</Link>.</p>
      </div></div>
    );
  }

  /* Admins see every club here; leaders see only theirs. */
  const clubs = await listClubs();
  const mine = user.role === 'admin' ? clubs : clubs.filter((c) => c.id === user.clubId);

  return (
    <div className="ad">
      <AccountBar email={user.email} role={user.role} clubName={user.clubName} />
      <div className="ad-wrap">
        <div className="ad-head">
          <h1 className="ad-title">{user.role === 'admin' ? 'All run clubs' : 'My run club'}</h1>
          <span className="ad-count">
            {user.role === 'admin' ? `${clubs.length} clubs` : 'Your page on athlosleague.com'}
          </span>
        </div>

        {mine.length === 0 && (
          <div className="ad-card"><div className="ad-card-head">
            <span className="ad-card-name">No club assigned yet</span>
          </div>
          <p className="ad-hint" style={{ padding: '0 20px 20px' }}>
            The league has not linked your account to a club. Reply to your invite and they will sort it.
          </p></div>
        )}

        {mine.map((c) => (
          <div className="ad-card" key={c.id}>
            <div className="ad-card-head">
              <span className="ad-card-name">{c.name}</span>
              <span className={`ad-tag ${c.type === 'Partner' ? 'is-partner' : ''}`}>{c.type}</span>
              <Link className="ad-card-meta" href={`/run-clubs/${c.slug}`} target="_blank">
                /run-clubs/{c.slug} ↗
              </Link>
              <div className="ad-card-spacer" />
              <span className="ad-card-meta">{c.members} members</span>
            </div>
            <ClubForm club={c} action={updateMyClubAction} submitLabel="Save changes" leaderView />
          </div>
        ))}

        <p className="ad-hint">
          Region, club type and map position are set by the league. Ask them to change those.
        </p>
      </div>
    </div>
  );
}
