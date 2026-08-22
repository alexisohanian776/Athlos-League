import AdminBar from '@/components/admin/admin-bar';
import ClubForm from '@/components/admin/club-form';
import DeleteClubButton from '@/components/admin/delete-club-button';
import { listClubs } from '@/lib/clubs-db';
import { addClubAction, deleteClubAction, updateClubAction } from './actions';

export const metadata = { title: 'ATHLOS admin — Run clubs' };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const clubs = await listClubs();

  return (
    <div className="ad">
      <AdminBar />
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
      </div>
    </div>
  );
}
