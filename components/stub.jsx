import PhotoCrop from './photo-crop';

/* A ticket stub for one meet. Server-rendered: no interactivity, so no
   client JS. The notches and perforation are drawn in CSS rather than
   images, so a stub stays crisp at any size and in either theme. */

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/* 'YYYY-MM-DD' is split by hand rather than passed to Date, which would
   shift the day for anyone west of UTC. */
function parts(iso) {
  if (!iso) return { day: '', month: '', year: '' };
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return { day: String(Number(d)), month: MONTHS[Number(m) - 1] || '', year: y };
}

/* A stub is a physical object: same meet, same holder, same serial, always. */
function serial(meetSlug, holderId) {
  const seed = `${meetSlug}:${holderId ?? 'x'}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String(Math.abs(h) % 1000000).padStart(6, '0');
}

export default function Stub({ meet, holder, holderId, compact = false }) {
  const { day, month, year } = parts(meet.heldOn);
  const facts = (meet.facts || []).slice(0, compact ? 2 : 4);
  const crowd = Number.isFinite(meet.attendance) && meet.attendance !== null ? meet.attendance : null;

  return (
    <article className={`stub ${compact ? 'is-compact' : ''}`}>
      <div className="stub-top">
        <div className="stub-photo">
          {meet.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meet.photoUrl} alt="" />
          ) : (
            <PhotoCrop tone={meet.tone} mono={meet.year} monoSize={compact ? 54 : 70} />
          )}
          <div className="stub-photo-veil" />
        </div>

        <div className="stub-head">
          <span className="stub-brand">ATHLOS</span>
          <span className="stub-serial">NO. {serial(meet.slug, holderId)}</span>
        </div>

        <div className="stub-date">
          <span className="stub-day">{day}</span>
          <span className="stub-month">{month}</span>
          <span className="stub-year">{year}</span>
        </div>

        <div className="stub-where">
          <div className="stub-venue">{meet.venue || meet.name}</div>
          <div className="stub-area">{meet.area || [meet.city, meet.country].filter(Boolean).join(', ')}</div>
        </div>
      </div>

      {/* the tear: notches either side, perforation between */}
      <div className="stub-tear" aria-hidden="true">
        <span className="stub-notch stub-notch-l" />
        <span className="stub-perf" />
        <span className="stub-notch stub-notch-r" />
      </div>

      <div className="stub-bottom">
        {crowd !== null && (
          <div className="stub-crowd">
            <span className="stub-crowd-n">{crowd.toLocaleString('en-US')}</span>
            <span className="stub-crowd-l">in the stands</span>
          </div>
        )}

        {meet.headline && <p className="stub-headline">{meet.headline}</p>}

        {facts.length > 0 && (
          <dl className="stub-facts">
            {facts.map((f, i) => (
              <div className="stub-fact" key={`${f.label}-${i}`}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="stub-foot">
          <span className="stub-holder">{holder || 'ATHLOS verified'}</span>
          <span className="stub-code" aria-hidden="true">
            {Array.from({ length: 22 }).map((_, i) => (
              <i key={i} style={{ opacity: (serial(meet.slug, holderId).charCodeAt(i % 6) + i) % 3 ? 1 : 0.25 }} />
            ))}
          </span>
        </div>
      </div>
    </article>
  );
}
