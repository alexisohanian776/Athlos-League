import Link from 'next/link';
import PhotoCrop from '../photo-crop';
import Wordmark from '../wordmark';
import { NAV_HREF } from '@/lib/league';
import { VIP_GALLERY, VIP_HERO_FACTS, VIP_PLAYBOOK, VIP_TIMELINE } from '@/lib/vip';

export function VipHero() {
  return (
    <header className="vip-hero">
      <PhotoCrop
        tone="ph-dusk"
        className="vip-hero-img"
        caption="London hero frame"
      />
      <div className="vip-hero-scrim" />
      <div className="vip-hero-inner">
        <div className="vip-eyebrow">ATHLOS London · VIP</div>
        <h1 className="vip-display vip-hero-title">
          One night. Seven events. The best seat in the stadium.
        </h1>
        <div className="vip-hero-facts">
          {VIP_HERO_FACTS.map(([k, v]) => (
            <div key={k}>
              <div className="vip-fact-k">{k}</div>
              <div className="vip-fact-v">{v}</div>
            </div>
          ))}
        </div>
        <div className="vip-hero-cta">
          <a href="#evening" className="vip-btn vip-btn-red">See the evening →</a>
          <a href="#details" className="vip-btn vip-btn-line">Your details</a>
        </div>
      </div>
    </header>
  );
}

export function VipEvening() {
  return (
    <section className="vip-sec" id="evening">
      <div className="vip-shell">
        <div className="vip-sec-head">
          <div>
            <div className="vip-eyebrow">The evening</div>
            <h2 className="vip-display vip-sec-title">5 til 10.</h2>
          </div>
          <p className="vip-body vip-sec-note">
            Two halves to the night. The carpet runs for two hours, then the
            stadium takes over for three. Your access covers both, end to end.
          </p>
        </div>
        <div className="vip-time">
          {VIP_TIMELINE.map((t) => (
            <div className="vip-time-cell" key={t.name}>
              <div className="vip-eyebrow">{t.tag}</div>
              <div className="vip-time-h">{t.time}</div>
              <div className="vip-time-n">{t.name}</div>
              <p className="vip-time-d">{t.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function VipPlaybook() {
  return (
    <section className="vip-sec" style={{ paddingTop: 0 }}>
      <div className="vip-shell">
        <div className="vip-sec-head">
          <div>
            <div className="vip-eyebrow">On site</div>
            <h2 className="vip-display vip-sec-title">The playbook.</h2>
          </div>
          <p className="vip-body vip-sec-note">
            Same run of play as last year: red carpet, then a private reception,
            then the hospitality space for the rest of the night.
          </p>
        </div>
        <div className="vip-play">
          {VIP_PLAYBOOK.map((p) => (
            <article className="vip-play-card" key={p.name}>
              <div className="vip-play-img">
                <PhotoCrop tone={p.tone} caption={p.shot} style={{ position: 'absolute', inset: 0 }} />
              </div>
              <div className="vip-play-body">
                <div className="vip-play-step">{p.step}</div>
                <h3 className="vip-play-name">{p.name}</h3>
                <p className="vip-play-copy">{p.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function VipGallery() {
  return (
    <section className="vip-sec" style={{ paddingTop: 0 }}>
      <div className="vip-shell">
        <div className="vip-sec-head">
          <div>
            <div className="vip-eyebrow">Last year</div>
            <h2 className="vip-display vip-sec-title">The room.</h2>
          </div>
          <p className="vip-body vip-sec-note">
            Shot at the 2025 meets. Drop replacements straight from Scoreplay.
          </p>
        </div>
        <div className="vip-gal">
          {VIP_GALLERY.map((g) => (
            <div key={g.shot}>
              <PhotoCrop tone={g.tone} caption={g.shot} style={{ position: 'absolute', inset: 0 }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function VipFoot() {
  return (
    <div className="vip-shell">
      <div className="vip-next">
        <div>
          <div className="vip-eyebrow">Next city</div>
          <div className="vip-display vip-next-title">New York · VIP</div>
          <p className="vip-body" style={{ marginTop: 10, fontSize: 16 }}>
            Icahn Stadium, October 2026. Details to come.
          </p>
        </div>
        <Link href={NAV_HREF.Schedule} className="vip-btn vip-btn-line">See the schedule</Link>
      </div>
      <div className="vip-foot">
        <Wordmark size={22} light />
        <div className="vip-foot-links">
          <Link href={NAV_HREF.Schedule}>Schedule</Link>
          <Link href={NAV_HREF.Athletes}>Athletes</Link>
          <Link href={NAV_HREF['Run Clubs']}>Run Clubs</Link>
          <a href="#details">VIP</a>
        </div>
        <div className="vip-mono">© 2026 ATHLOS</div>
      </div>
    </div>
  );
}
