import { inviteUserAction, reissueInviteAction, removeUserAction } from '@/app/admin/actions';
import InviteLinkRow from './invite-link-row';

/* Dates must format identically on the server and in the browser, or React
   throws a hydration mismatch and unmounts the whole tree — the page paints
   and then goes blank. Pinning the zone to UTC keeps the two in agreement;
   `toLocaleDateString` alone uses each runtime's own zone. */
const formatDay = (value) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC' }).format(new Date(value));

export default function PeoplePanel({ users, clubs, origin }) {
  return (
    <>
      <div className="dash-head" style={{ marginTop: 48 }}>
        <h1 className="dash-title">People</h1>
        <span className="dash-count">
          {users.filter((u) => u.role === 'admin').length} admins ·{' '}
          {users.filter((u) => u.role === 'leader').length} club leaders
        </span>
      </div>

      <div className="dash-card dash-new">
        <div className="dash-card-head"><span className="dash-card-name">Invite someone</span></div>
        <form action={inviteUserAction}>
          <div className="dash-grid">
            <label className="dash-field is-wide">
              <span className="dash-label">Email</span>
              <input className="dash-input" name="email" type="email" required placeholder="leader@example.com" />
            </label>
            <label className="dash-field">
              <span className="dash-label">Name</span>
              <input className="dash-input" name="name" placeholder="Optional" />
            </label>
            <label className="dash-field">
              <span className="dash-label">Role</span>
              <select className="dash-select" name="role" defaultValue="leader">
                <option value="leader">Club leader</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="dash-field">
              <span className="dash-label">Club (leaders only)</span>
              <select className="dash-select" name="clubId" defaultValue="">
                <option value="">—</option>
                {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <div className="dash-actions">
            <button className="dash-btn dash-btn-ink" type="submit">Create invite</button>
            <p className="dash-hint">
              Creates the account and a 14-day invite link. Send them the link — there is no automated email yet.
            </p>
          </div>
        </form>
      </div>

      {users.map((u) => (
        <div className="dash-card" key={u.id}>
          <div className="dash-card-head">
            <span className="dash-card-name">{u.name || u.email}</span>
            <span className={`dash-tag ${u.role === 'admin' ? 'is-partner' : ''}`}>{u.role}</span>
            {u.clubName && <span className="dash-card-meta">{u.clubName}</span>}
            <div className="dash-card-spacer" />
            <span className="dash-card-meta">
              {u.hasPassword
                ? (u.lastLoginAt ? `last in ${formatDay(u.lastLoginAt)}` : 'never signed in')
                : u.invitePending ? 'invite pending' : 'no password set'}
            </span>
          </div>

          <div className="dash-actions" style={{ paddingTop: 16 }}>
            <span className="dash-card-meta">{u.email}</span>
            {u.locked && <span className="dash-tag is-partner">locked</span>}
            <div className="dash-actions-spacer" />
            <form action={reissueInviteAction}>
              <input type="hidden" name="id" value={u.id} />
              <button className="dash-btn dash-btn-ghost" type="submit">
                {u.hasPassword ? 'Send reset link' : 'New invite link'}
              </button>
            </form>
            <form action={removeUserAction}>
              <input type="hidden" name="id" value={u.id} />
              <button className="dash-btn dash-btn-danger" type="submit">Remove</button>
            </form>
          </div>

          {u.inviteToken && <InviteLinkRow url={`${origin}/invite/${u.inviteToken}`} />}
        </div>
      ))}
    </>
  );
}
