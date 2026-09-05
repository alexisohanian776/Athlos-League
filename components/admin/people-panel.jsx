import { inviteUserAction, reissueInviteAction, removeUserAction } from '@/app/admin/actions';
import InviteLinkRow from './invite-link-row';

export default function PeoplePanel({ users, clubs, origin }) {
  return (
    <>
      <div className="ad-head" style={{ marginTop: 48 }}>
        <h1 className="ad-title">People</h1>
        <span className="ad-count">
          {users.filter((u) => u.role === 'admin').length} admins ·{' '}
          {users.filter((u) => u.role === 'leader').length} club leaders
        </span>
      </div>

      <div className="ad-card ad-new">
        <div className="ad-card-head"><span className="ad-card-name">Invite someone</span></div>
        <form action={inviteUserAction}>
          <div className="ad-grid">
            <label className="ad-field is-wide">
              <span className="ad-label">Email</span>
              <input className="ad-input" name="email" type="email" required placeholder="leader@example.com" />
            </label>
            <label className="ad-field">
              <span className="ad-label">Name</span>
              <input className="ad-input" name="name" placeholder="Optional" />
            </label>
            <label className="ad-field">
              <span className="ad-label">Role</span>
              <select className="ad-select" name="role" defaultValue="leader">
                <option value="leader">Club leader</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="ad-field">
              <span className="ad-label">Club (leaders only)</span>
              <select className="ad-select" name="clubId" defaultValue="">
                <option value="">—</option>
                {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <div className="ad-actions">
            <button className="ad-btn ad-btn-ink" type="submit">Create invite</button>
            <p className="ad-hint">
              Creates the account and a 14-day invite link. Send them the link — there is no automated email yet.
            </p>
          </div>
        </form>
      </div>

      {users.map((u) => (
        <div className="ad-card" key={u.id}>
          <div className="ad-card-head">
            <span className="ad-card-name">{u.name || u.email}</span>
            <span className={`ad-tag ${u.role === 'admin' ? 'is-partner' : ''}`}>{u.role}</span>
            {u.clubName && <span className="ad-card-meta">{u.clubName}</span>}
            <div className="ad-card-spacer" />
            <span className="ad-card-meta">
              {u.hasPassword
                ? (u.lastLoginAt ? `last in ${new Date(u.lastLoginAt).toLocaleDateString('en-GB')}` : 'never signed in')
                : u.invitePending ? 'invite pending' : 'no password set'}
            </span>
          </div>

          <div className="ad-actions" style={{ paddingTop: 16 }}>
            <span className="ad-card-meta">{u.email}</span>
            {u.lockedUntil && new Date(u.lockedUntil) > new Date() && (
              <span className="ad-tag is-partner">locked</span>
            )}
            <div className="ad-actions-spacer" />
            <form action={reissueInviteAction}>
              <input type="hidden" name="id" value={u.id} />
              <button className="ad-btn ad-btn-ghost" type="submit">
                {u.hasPassword ? 'Send reset link' : 'New invite link'}
              </button>
            </form>
            <form action={removeUserAction}>
              <input type="hidden" name="id" value={u.id} />
              <button className="ad-btn ad-btn-danger" type="submit">Remove</button>
            </form>
          </div>

          {u.inviteToken && <InviteLinkRow url={`${origin}/invite/${u.inviteToken}`} />}
        </div>
      ))}
    </>
  );
}
