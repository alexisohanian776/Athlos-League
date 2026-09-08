import Link from 'next/link';
import AccountBar from '@/components/account/account-bar';
import AdminTabs from '@/components/admin/admin-tabs';
import ChatRoom from '@/components/admin/chat-room';
import { currentUser } from '@/lib/current-user';
import { getUserById, listUsers } from '@/lib/users-db';
import { recentMessages } from '@/lib/chat-db';

export const metadata = { title: 'Chat — ATHLOS admin' };
export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const session = await currentUser();
  const me = session ? await getUserById(session.id) : null;

  /* Middleware gates /admin, but a server component is directly
     addressable, so this re-checks rather than trusting the nav. */
  if (!me || me.role !== 'admin' || me.disabled) {
    return (
      <div className="dash">
        <AccountBar email={me?.email} role={me?.role} avatarUrl={me?.avatarUrl} />
        <AdminTabs isSuper={false} />
        <div className="dash-wrap">
          <h1 className="dash-title">Not available</h1>
          <p className="dash-login-note">
            Chat is for the admin team. <Link href="/">Back to the league</Link>.
          </p>
        </div>
      </div>
    );
  }

  const [messages, users] = await Promise.all([recentMessages(), listUsers()]);
  const admins = users.filter((u) => u.role === 'admin' && !u.disabled).length;

  return (
    <div className="dash">
      <AccountBar email={me.email} role={me.role} avatarUrl={me.avatarUrl}
        name={[me.firstName, me.lastName].filter(Boolean).join(' ')} />
      <AdminTabs isSuper={Boolean(me.isSuper && !me.disabled)} />
      <div className="dash-wrap">
        <div className="dash-head">
          <h1 className="dash-title">Chat</h1>
          <span className="dash-count">
            {admins} admins · visible only to the admin team
          </span>
        </div>

        <div className="dash-card ch-card">
          <ChatRoom initial={messages} meId={me.id} canModerate={Boolean(me.isSuper)} />
        </div>

        <p className="dash-hint" style={{ marginTop: 14 }}>
          Updates arrive within a few seconds while this tab is open. Not a
          notification system — nobody is emailed or alerted.
        </p>
      </div>
    </div>
  );
}
