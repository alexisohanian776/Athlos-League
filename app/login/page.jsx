import AuthForm from '@/components/account/auth-form';

export const metadata = { title: 'Sign in — ATHLOS' };
/* `next` is read here rather than with useSearchParams inside the form, so
   the form is server-rendered into the HTML. Behind a Suspense boundary it
   only existed once the client chunk ran, which left the page blank — no
   fields, no button — whenever that chunk was blocked or slow. */
export const dynamic = 'force-dynamic';

export default function LoginPage({ searchParams }) {
  const next = typeof searchParams?.next === 'string' ? searchParams.next : null;
  return (
    <div className="dash">
      <div className="dash-login">
        <AuthForm mode="login" next={next} />
      </div>
    </div>
  );
}
