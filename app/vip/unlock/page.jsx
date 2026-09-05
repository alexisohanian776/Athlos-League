import VipNav from '@/components/vip/vip-nav';
import VipUnlockForm from '@/components/vip/vip-unlock-form';

export const metadata = {
  title: 'ATHLOS London — VIP',
  description: 'Invite only.',
};

export default function VipUnlockPage() {
  return (
    <div className="vip">
      <VipNav cta={false} />
      <div className="vip-gate">
        <VipUnlockForm />
      </div>
    </div>
  );
}
