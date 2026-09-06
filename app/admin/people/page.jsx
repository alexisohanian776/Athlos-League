import Link from 'next/link';
import { headers } from 'next/headers';
import AccountBar from '@/components/account/account-bar';
import AdminTabs from '@/components/admin/admin-tabs';
import PeoplePanel from '@/components/admin/people-panel';
import { currentUser } from '@/lib/current-user';
import { getUserById, listUsers } from '@/lib/users-db';
import { listClubs } from '@/lib/clubs-db';
import { emailConfigured } from '@/lib/email';

export const metadata = { title: 'People — ATHLOS admin' };
export const dynamic = 'force-dynamic';

export default async function PeoplePage() {
  const session = await currentUser();
  const me = session ? await getUserById(session.id) : null;

  /* Middleware gates /admin, but this page is super-admin only and a server
     component is directly addressable, so it re-checks for itself. */
  if (!me?.isSuper || me.disabled) {
    return (
      <div className="dash">
        <AccountBar email={me?.email} role={me?.role} avatarUrl={me?.avatarUrl} />
        <AdminTabs isSuper={false} />
        <div className="dash-wrap">
          <h1 className="dash-title">Not available</h1>
          <p className="dash-login-note">
            People is super-admin only. <Link href="/admin">Back to run clubs</Link>.
          </p>
        </div>
      </div>
    );
  }

  const [clubs, users] = await Promise.all([listClubs(), listUsers()]);
  const h = headers();
  const origin = `${h.get('x-forwarded-proto') || 'https'}://${h.get('host')}`;

  return (
    <div className="dash">
      <AccountBar email={me.email} role={me.role} avatarUrl={me.avatarUrl}
        name={[me.firstName, me.lastName].filter(Boolean).join(' ')} />
      <AdminTabs isSuper />
      <div className="dash-wrap">
        <PeoplePanel users={users} clubs={clubs} origin={origin} meId={me.id}
          mailOn={emailConfigured()} />
      </div>
    </div>
  );
}
