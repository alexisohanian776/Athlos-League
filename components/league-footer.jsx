import Wordmark from './wordmark';
import { MEETS } from '@/lib/league';

const SOCIALS = ['Instagram', 'TikTok', 'X / Twitter', 'YouTube'];

export default function LeagueFooter() {
  return (
    <footer className="lg-foot">
      <div className="lg-foot-grid">
        <div>
          <Wordmark size={30} />
          <p className="lg-foot-blurb">
            The fastest women on Earth.<br />Two cities. One season.
          </p>
        </div>
        <div>
          <div className="lg-foot-head">2026 Season</div>
          {MEETS.map((m) => (
            <div className="lg-foot-meet" key={m.city}>
              <div className="lg-foot-meet-name">{m.name}</div>
              <div className="lg-foot-meet-date">{m.date}</div>
            </div>
          ))}
        </div>
        <div>
          <div className="lg-foot-head">Follow</div>
          {SOCIALS.map((s) => (
            <a className="lg-foot-link" key={s} href="#">{s}</a>
          ))}
        </div>
        <div>
          <div className="lg-foot-head">Stay in the lap</div>
          <div className="lg-foot-form">
            <input className="lg-foot-input" type="email" placeholder="you@email.com" aria-label="Email address" />
            <button className="lg-btn lg-btn-red lg-btn-sm" type="button">Join</button>
          </div>
        </div>
      </div>
      <div className="lg-foot-base">
        <span>© 2026 ATHLOS League</span>
        <span>Built on consistency.</span>
      </div>
    </footer>
  );
}
