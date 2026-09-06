import Link from 'next/link';
import AccountBar from '@/components/account/account-bar';
import AdminTabs from '@/components/admin/admin-tabs';
import Avatar from '@/components/avatar';
import { currentUser } from '@/lib/current-user';
import { getUserById } from '@/lib/users-db';
import { claimCounts, listClaims } from '@/lib/meets-db';
import { reviewAttendanceAction } from './actions';

export const metadata = { title: 'Attendance — ATHLOS admin' };
export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default async function AttendancePage({ searchParams }) {
  const status = TABS.some((t) => t.key === searchParams?.status) ? searchParams.status : 'pending';
  const session = await currentUser();
  const [me, claims, counts] = await Promise.all([
    session ? getUserById(session.id) : null,
    listClaims(status),
    claimCounts(),
  ]);

  return (
    <div className="dash">
      <AccountBar email={me?.email} role={me?.role} avatarUrl={me?.avatarUrl}
        name={[me?.firstName, me?.lastName].filter(Boolean).join(' ')} />
      <AdminTabs isSuper={Boolean(me?.isSuper && !me.disabled)} />
      <div className="dash-wrap">
        <div className="dash-head">
          <h1 className="dash-title">Attendance</h1>
          <span className="dash-count">
            {counts.pending} pending · {counts.approved} approved · {counts.rejected} rejected
          </span>
        </div>


        <div className="at-tabs">
          {TABS.map((t) => (
            <Link key={t.key} href={`/admin/attendance?status=${t.key}`}
              className={`dash-btn ${status === t.key ? 'dash-btn-ink' : 'dash-btn-ghost'}`}>
              {t.label} ({counts[t.key]})
            </Link>
          ))}
        </div>

        {claims.length === 0 && (
          <div className="dash-card">
            <div className="at-empty">Nothing {status} right now.</div>
          </div>
        )}

        {claims.map((c) => (
          <div className="dash-card" key={c.id}>
            <div className="dash-card-head">
              {c.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="dash-bar-avatar" src={c.avatarUrl} alt="" width={26} height={26} />
              ) : (
                <Avatar name={c.who} size={26} tone="ph-plum" />
              )}
              <span className="dash-card-name">{c.who}</span>
              {c.handle && (
                <Link className="dash-card-meta" href={`/u/${c.handle}`} target="_blank">@{c.handle} ↗</Link>
              )}
              <div className="dash-card-spacer" />
              <span className="dash-card-meta">{c.meetName}</span>
            </div>

            <div className="cl-body">
              <div className="cl-proof">
                {c.proofUrl ? (
                  <a href={c.proofUrl} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.proofUrl} alt="Attendance proof" />
                  </a>
                ) : (
                  <div className="cl-noproof">No image attached</div>
                )}
              </div>
              <div className="cl-meta">
                <div className="dash-label">Email</div>
                <p className="cl-line">{c.email}</p>
                {c.note && (
                  <>
                    <div className="dash-label">What they said</div>
                    {/* Fan-written text: rendered as text, never as markup. */}
                    <p className="cl-line cl-note">{c.note}</p>
                  </>
                )}
                <div className="dash-label">Claimed</div>
                <p className="cl-line">{String(c.createdAt).slice(0, 16).replace('T', ' ')}</p>
              </div>
            </div>

            <div className="dash-actions">
              <div className="dash-actions-spacer" />
              {status !== 'approved' && (
                <form action={reviewAttendanceAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="status" value="approved" />
                  <button className="dash-btn dash-btn-ink" type="submit">Approve</button>
                </form>
              )}
              {status !== 'rejected' && (
                <form action={reviewAttendanceAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <button className="dash-btn dash-btn-danger" type="submit">Reject</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
