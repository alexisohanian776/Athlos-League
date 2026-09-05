import AuthForm from '@/components/account/auth-form';
import { findByInvite } from '@/lib/users-db';

export const metadata = { title: 'Accept your invite — ATHLOS' };
export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }) {
  const user = await findByInvite(params.token);

  if (!user) {
    return (
      <div className="dash">
        <div className="dash-login">
          <div className="dash-login-inner">
            <h1 className="dash-login-title">Link expired</h1>
            <p className="dash-login-note">
              This invite has expired or already been used. Ask the league to send a new one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash">
      <div className="dash-login">
        <AuthForm mode="invite" token={params.token} email={user.email}
          clubName={user.clubName} role={user.role} />
      </div>
    </div>
  );
}
