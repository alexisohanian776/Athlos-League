import Link from 'next/link';
import Wordmark from '@/components/wordmark';
import { confirmEmail } from '@/lib/users-db';

export const metadata = { title: 'Email confirmed — ATHLOS' };
export const dynamic = 'force-dynamic';

export default async function ConfirmPage({ params }) {
  const user = await confirmEmail(params.token);

  return (
    <div className="dash">
      <div className="dash-login">
        <div className="dash-login-inner">
          <Wordmark size={28} />
          <h1 className="dash-login-title">{user ? 'You are confirmed' : 'That link is spent'}</h1>
          <p className="dash-login-note">
            {user
              ? 'Your email is verified. You can now be verified as having attended a meet.'
              : 'This confirmation link has already been used, or it is not one of ours. If your account already works, there is nothing to do.'}
          </p>
          <div className="dash-login-form">
            <Link className="dash-btn dash-btn-ink" href={user?.handle ? `/u/${user.handle}` : '/'}>
              {user?.handle ? 'Go to my profile' : 'Back to the league'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
