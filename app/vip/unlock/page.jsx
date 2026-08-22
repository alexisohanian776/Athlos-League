import VipUnlockForm from '@/components/vip/vip-unlock-form';

export const metadata = {
  title: 'ATHLOS London — VIP',
  description: 'Invite only.',
};

export default function VipUnlockPage() {
  return (
    <div className="vip vip-gate">
      <VipUnlockForm />
    </div>
  );
}
