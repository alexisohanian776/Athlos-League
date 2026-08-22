import LeagueNav from '@/components/league-nav';
import LeagueFooter from '@/components/league-footer';
import AthletesIndex from '@/components/athletes-index';

export const metadata = {
  title: 'ATHLOS — Athletes',
  description: 'Every card the league has minted, season by season.',
};

export default function AthletesPage() {
  return (
    <div className="league">
      <LeagueNav active="Athletes" />
      <AthletesIndex />
      <LeagueFooter />
    </div>
  );
}
