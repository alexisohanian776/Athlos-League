import PhotoCrop from '../photo-crop';
import Avatar from '../avatar';
import { CONFIRMED, SEASON_EVENTS } from '@/lib/schedule';

const KICKER = { London: 'United Kingdom', 'New York': 'United States' };
const MONO = { London: 'LDN', 'New York': 'NYC' };

function ConfirmedRow({ names, tones, total }) {
  return (
    <div className="sc-confirmed">
      <div className="sc-avatars">
        {names.map((n, i) => (
          <div key={n} className="sc-avatar-wrap" style={{ zIndex: names.length - i }}>
            <Avatar name={n} size={36} tone={tones[i]} />
          </div>
        ))}
      </div>
      <a href="#" className="sc-confirmed-link">+{total} confirmed →</a>
    </div>
  );
}

export default function UpcomingCard({ meet: m }) {
  const c = CONFIRMED[m.city];
  return (
    <article className="sc-card">
      <div className="sc-card-photo">
        <PhotoCrop
          tone={m.tone}
          mono={MONO[m.city]}
          monoSize={120}
          style={{ position: 'absolute', inset: 0 }}
        />
        <div className="sc-card-photo-shade" />
        <div className="sc-card-photo-top">
          {m.ticketsLive
            ? <span className="lg-live">Tickets live</span>
            : <span className="sc-soon lg-mono">Tickets soon</span>}
          <span className="sc-count">
            <span className="lg-mono-data sc-count-n">{m.days}</span>
            <span className="lg-mono">days to go</span>
          </span>
        </div>
        <div className="sc-card-photo-name">
          <span className="lg-mono sc-card-kicker">{KICKER[m.city]}</span>
          <h2 className="lg-display sc-card-city">{m.name}</h2>
        </div>
      </div>

      <div className="sc-card-body">
        <div className="sc-when">
          <span className="lg-mono-data sc-when-date">{m.dow} · {m.date}</span>
          <span className="lg-mono sc-when-time">{m.time}</span>
        </div>
        <div className="sc-venue">
          <a className="sc-venue-name sc-venue-link" href={m.map} target="_blank" rel="noopener noreferrer">
            {m.venue}
            <svg className="sc-pin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z" />
              <circle cx="12" cy="10" r="2.4" />
            </svg>
          </a>
          <div className="lg-mono sc-venue-area">{m.area}</div>
        </div>
        <div className="sc-events">
          {SEASON_EVENTS.map((e) => <span key={e} className="sc-event-chip lg-mono">{e}</span>)}
        </div>
        <ConfirmedRow names={c.names} tones={c.tones} total={c.total} />
        <div className="sc-card-cta">
          {m.ticketsLive
            ? <a href={m.ticketUrl} target="_blank" rel="noopener noreferrer" className="lg-btn lg-btn-red lg-btn-lg">Get tickets →</a>
            : <a href="#" className="lg-btn lg-btn-ghost lg-btn-lg">Notify me when tickets drop</a>}
        </div>
      </div>
    </article>
  );
}
