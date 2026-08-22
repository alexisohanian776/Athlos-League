import AdminLoginForm from '@/components/admin/admin-login-form';

export const metadata = { title: 'ATHLOS admin' };

export default function AdminLoginPage() {
  return (
    <div className="ad">
      <div className="ad-login">
        <AdminLoginForm />
      </div>
    </div>
  );
}
