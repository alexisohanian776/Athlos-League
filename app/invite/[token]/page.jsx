import { Suspense } from 'react';
import AuthForm from '@/components/account/auth-form';
import { findByInvite } from '@/lib/users-db';

export const metadata = { title: 'Accept your invite — ATHLOS' };
export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }) {
  const user = await findByInvite(params.token);

  if (!user) {
    return (
      <div className="ad">
        <div className="ad-login">
          <div className="ad-login-inner">
            <h1 className="ad-login-title">Link expired</h1>
            <p className="ad-login-note">
              This invite has expired or already been used. Ask the league to send a new one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ad">
      <div className="ad-login">
        <Suspense fallback={null}>
          <AuthForm mode="invite" token={params.token} email={user.email}
            clubName={user.clubName} role={user.role} />
        </Suspense>
      </div>
    </div>
  );
}
