import { Suspense } from 'react';
import AuthForm from '@/components/account/auth-form';

export const metadata = { title: 'Sign in — ATHLOS' };

export default function LoginPage() {
  return (
    <div className="ad">
      <div className="ad-login">
        <Suspense fallback={null}>
          <AuthForm mode="login" />
        </Suspense>
      </div>
    </div>
  );
}
