import { headers } from 'next/headers';
import AccountBar from '@/components/account/account-bar';
import ClubForm from '@/components/admin/club-form';
import DeleteClubButton from '@/components/admin/delete-club-button';
import PeoplePanel from '@/components/admin/people-panel';
import { listClubs } from '@/lib/clubs-db';
import { listUsers } from '@/lib/users-db';
import { currentUser } from '@/lib/current-user';
import { addClubAction, deleteClubAction, updateClubAction } from './actions';

export const metadata = { title: 'ATHLOS admin — Run clubs' };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await currentUser();
  const [clubs, users] = await Promise.all([listClubs(), listUsers()]);
  const h = headers();
  const origin = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;

  return (
    <div className="ad">
      <AccountBar email={session?.email} role="admin" />
      <div className="ad-wrap">
        <div className="ad-head">
          <h1 className="ad-title">Run clubs</h1>
          <span className="ad-count">
            {clubs.length} clubs · {clubs.reduce((n, c) => n + c.members, 0).toLocaleString('en-US')} runners
          </span>
        </div>

        <div className="ad-card ad-new">
          <div className="ad-card-head">
            <span className="ad-card-name">Add a club</span>
          </div>
          <ClubForm club={null} action={addClubAction} submitLabel="Add club" />
        </div>

        {clubs.map((c) => (
          <div className="ad-card" key={c.id}>
            <div className="ad-card-head">
              <span className="ad-card-name">{c.name}</span>
              <span className={`ad-tag ${c.type === 'Partner' ? 'is-partner' : ''}`}>{c.type}</span>
              <span className="ad-card-meta">/run-clubs/{c.slug}</span>
              <div className="ad-card-spacer" />
              <span className="ad-card-meta">{c.members} members</span>
            </div>
            <ClubForm club={c} action={updateClubAction} submitLabel="Save changes" />
            <form action={deleteClubAction} className="ad-actions">
              <input type="hidden" name="id" value={c.id} />
              <div className="ad-actions-spacer" />
              <DeleteClubButton name={c.name} />
            </form>
          </div>
        ))}
        <PeoplePanel users={users} clubs={clubs} origin={origin} />
      </div>
    </div>
  );
}
