import PhotoCrop from '../photo-crop';
import { VIP_SUMMARY } from '@/lib/vip';

/* Was the RSVP block. The form is gone — VIP is confirmed by invitation now,
   so this is the run-of-play summary only. */
export default function VipDetails() {
  return (
    <section className="vip-rsvp" id="details">
      <div className="vip-shell">
        <div className="vip-rsvp-grid">
          <div>
            <div className="vip-eyebrow">Your evening · London</div>
            <h2 className="vip-display vip-rsvp-title">The details.</h2>
            <p className="vip-body" style={{ marginTop: 20 }}>
              Your access covers the carpet and the stadium, end to end. The team
              will be in touch with your carpet time and seat before the night.
            </p>
            <p className="vip-body" style={{ marginTop: 14 }}>
              Anything you need on the night — access, dietary, press — reach the
              league directly and we&rsquo;ll sort it.
            </p>
          </div>

          <div className="vip-aside-card vip-details-card">
            <div className="vip-aside-img">
              <PhotoCrop tone="ph-wine" caption="Hero portrait" style={{ position: 'absolute', inset: 0 }} />
            </div>
            <div className="vip-aside-list">
              {VIP_SUMMARY.map(([k, v]) => (
                <div className="vip-aside-row" key={k}>
                  <span className="vip-aside-k">{k}</span>
                  <span className="vip-aside-v">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
