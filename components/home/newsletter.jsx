export default function Newsletter() {
  return (
    <section className="hm-news">
      <div className="lg-mono" style={{ color: 'var(--accent)', marginBottom: 20 }}>Newsletter</div>
      <h2 className="lg-display hm-news-title">The 2026 season is coming.</h2>
      <p className="hm-news-note">
        Get every athlete announcement, meet update, and ticket release first.
      </p>
      <div className="hm-news-form">
        <input className="input" type="email" placeholder="you@email.com" aria-label="Email address" />
        <button className="lg-btn lg-btn-red lg-btn-lg" type="button">Sign me up</button>
      </div>
      <p className="hm-news-fine">
        Creates a free account too — comment on posts and join run clubs.
      </p>
    </section>
  );
}
