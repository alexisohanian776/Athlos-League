import Avatar from '../avatar';
import { CLUB_FAN_TONES } from '@/lib/clubs';

export default function GoingStack({ faces, going }) {
  const extra = going - faces.length;
  return (
    <div className="cp-going">
      <div className="cp-going-avatars">
        {faces.map((n, i) => (
          <div key={n} className="cp-going-wrap" style={{ zIndex: faces.length - i }}>
            <Avatar name={n} size={30} tone={CLUB_FAN_TONES[i % CLUB_FAN_TONES.length]} />
          </div>
        ))}
        {extra > 0 && <div className="cp-going-more lg-mono">+{extra}</div>}
      </div>
      <span className="lg-mono cp-going-label">{going} going</span>
    </div>
  );
}
