import VipNav from '@/components/vip/vip-nav';
import VipDetails from '@/components/vip/vip-details';
import {
  VipEvening, VipFoot, VipGallery, VipHero, VipPlaybook,
} from '@/components/vip/vip-sections';

export const metadata = {
  title: 'ATHLOS London — VIP',
  description: 'One night. Seven events. The best seat in the stadium.',
};

export default function VipPage() {
  return (
    <div className="vip">
      <VipNav />
      <VipHero />
      <VipEvening />
      <VipPlaybook />
      <VipGallery />
      <VipDetails />
      <VipFoot />
    </div>
  );
}
