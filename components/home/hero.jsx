import PhotoCrop from '../photo-crop';

/* Dark split hero: the feature story on the left, the next meet's live
   ticket countdown on the right. `days` is computed by the page. */
export default function HomeHero({ meets }) {
  const [next, then] = meets;   // `then` is undefined in a single-city season
  return (
    <section className="hm-hero">
      <div className="hm-hero-grid">
        <div className="hm-feature">
          <PhotoCrop
            tone="ph-field"
            mono="FK"
            monoSize={420}
            protect
            caption="Faith Kipyegon · Mile · 4:17.78 MR · Icahn Stadium 2025"
            className="hm-feature-photo"
          />
          <div className="hm-feature-body">
            <div className="hm-feature-kicker">
              <span className="lg-mono hm-tag-red">Feature</span>
              <span className="lg-mono" style={{ color: 'rgba(255,255,255,.85)' }}>
                The Mile · In her own words
              </span>
            </div>
            <h1 className="lg-display hm-feature-title">
              She ran the mile in <em>4:17.78.</em>
            </h1>
            <p className="hm-feature-note">
              A meet record — and the fastest mile ever run on the ATHLOS stage.
              Faith breaks down the pace and the last 400 that broke the field.
            </p>
            <a href="#" className="lg-btn lg-btn-red lg-btn-lg">Read the story</a>
          </div>
        </div>

        <div className="hm-side">
          <div className="hm-panel hm-count">
            {next.ticketsLive && (
              <div className="lg-live" style={{ alignSelf: 'flex-start' }}>Tickets live</div>
            )}
            <div className="lg-mono hm-count-label">Next meet</div>
            <div className="lg-display hm-count-meet">{next.name}</div>
            <div className="hm-count-num">
              <b>{next.days}</b>
              <span>days<br />out</span>
            </div>
            <dl className="hm-count-rows">
              {[
                ['When', `${next.dow} · ${next.date}`],
                ['Time', next.time],
                ['Venue', `${next.venue} · ${next.area}`],
              ].map(([k, v]) => (
                <div className="hm-count-row" key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <a href={next.ticketUrl} target="_blank" rel="noopener noreferrer" className="lg-btn lg-btn-red">
              Get tickets →
            </a>
          </div>

          {then && (
          <div className="hm-panel hm-next">
            <div>
              <div className="lg-mono hm-next-label">Then</div>
              <div className="hm-next-name">{then.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="hm-next-date">{then.date}</div>
              <div className="hm-next-days">{then.days} days out</div>
            </div>
          </div>
          )}
        </div>
      </div>
    </section>
  );
}
