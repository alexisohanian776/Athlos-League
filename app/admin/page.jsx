import Link from 'next/link';
import { headers } from 'next/headers';
import AccountBar from '@/components/account/account-bar';
import ClubForm from '@/components/admin/club-form';
import DeleteClubButton from '@/components/admin/delete-club-button';
import PeoplePanel from '@/components/admin/people-panel';
import { listClubs } from '@/lib/clubs-db';
import { getUserById, listUsers } from '@/lib/users-db';
import { emailConfigured } from '@/lib/email';
import { currentUser } from '@/lib/current-user';
import { addClubAction, deleteClubAction, updateClubAction } from './actions';

export const metadata = { title: 'ATHLOS admin — Run clubs' };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await currentUser();
  const [clubs, users, me] = await Promise.all([
    listClubs(), listUsers(), session ? getUserById(session.id) : null,
  ]);
  const h = headers();
  const origin = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;

  return (
    <div className="dash">
      <AccountBar email={session?.email} role="admin" />
      <div className="dash-wrap">
        <div className="dash-head">
          <h1 className="dash-title">Run clubs</h1>
          <span className="dash-count">
            {clubs.length} clubs · {clubs.reduce((n, c) => n + c.members, 0).toLocaleString('en-US')} runners
          </span>
        </div>

        <div className="dash-card dash-new">
          <div className="dash-card-head">
            <span className="dash-card-name">Add a club</span>
          </div>
          <ClubForm club={null} action={addClubAction} submitLabel="Add club" />
        </div>

        {clubs.map((c) => (
          <div className="dash-card" key={c.id}>
            <div className="dash-card-head">
              <span className="dash-card-name">{c.name}</span>
              <span className={`dash-tag ${c.type === 'Partner' ? 'is-partner' : ''}`}>{c.type}</span>
              <span className="dash-card-meta">/run-clubs/{c.slug}</span>
              <div className="dash-card-spacer" />
              <span className="dash-card-meta">{c.members} members</span>
            </div>
            <ClubForm club={c} action={updateClubAction} submitLabel="Save changes" />
            <form action={deleteClubAction} className="dash-actions">
              <input type="hidden" name="id" value={c.id} />
              <div className="dash-actions-spacer" />
              <DeleteClubButton name={c.name} />
            </form>
          </div>
        ))}
        {/* People and usage are super-admin only. */}
        {me?.isSuper && !me.disabled && (
          <>
            <PeoplePanel users={users} clubs={clubs} origin={origin} meId={me.id}
              mailOn={emailConfigured()} />
            <p className="dash-hint" style={{ marginTop: 22 }}>
              <Link href="/admin/metrics" className="dash-btn dash-btn-ghost">Usage metrics →</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
