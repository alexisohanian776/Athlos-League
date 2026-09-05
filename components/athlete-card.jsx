'use client';

import Link from 'next/link';
import { useRef } from 'react';
import WinnerRing from './winner-ring';

const ordinal = (n) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

/* A stable hash so each card's scatter is the same on every render. Anything
   random here would differ between server and client and break hydration. */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/* Laid-by-hand angles and offsets — small enough that the grid still reads as
   a grid, big enough that it stops looking machine-set. */
function scatter(seed) {
  const h = hash(seed);
  const spin = (((h % 1000) / 1000) * 3.4 - 1.7).toFixed(2);        // -1.7 to 1.7 deg
  const dx = ((((h >> 10) % 1000) / 1000) * 8 - 4).toFixed(1);       // -4 to 4 px
  const dy = ((((h >> 20) % 1000) / 1000) * 12 - 5).toFixed(1);      // -5 to 7 px
  return { '--spin': `${spin}deg`, '--dx': `${dx}px`, '--dy': `${dy}px` };
}

/* A collectible card: pointer position tilts it in 3D and drags a specular
   sheen across the foil, so the shine tracks the light rather than animating
   on its own. No flip — everything worth reading is on the face. */
export default function AthleteCard({ card: c }) {
  const el = useRef(null);
  const raf = useRef(0);

  const onMove = (e) => {
    const node = el.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      node.style.setProperty('--ry', `${(px - 0.5) * 10}deg`);
      node.style.setProperty('--rx', `${-(py - 0.5) * 10}deg`);
      node.style.setProperty('--mx', `${px * 100}%`);
      node.style.setProperty('--my', `${py * 100}%`);
      node.style.setProperty('--lift', '1');
    });
  };

  const onLeave = () => {
    const node = el.current;
    if (!node) return;
    cancelAnimationFrame(raf.current);
    for (const [k, v] of [['--ry', '0deg'], ['--rx', '0deg'], ['--mx', '50%'], ['--my', '50%'], ['--lift', '0']]) {
      node.style.setProperty(k, v);
    }
  };

  /* The chip always carries the country now — winning is shown by the ring,
     so the two pieces of information no longer compete for the same slot. */
  const won = !c.committed && c.place === 1;
  const label = c.committed ? 'Committed' : c.code;

  const pose = scatter(`${c.slug}-${c.year}-${c.event}`);

  return (
    <Link
      className="at-scene"
      style={pose}
      href={`/athletes/${c.slug}`}
      aria-label={`${c.name} — ${c.event} ${c.year}${c.mark ? `, ${c.mark}${c.unit}` : ''}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onBlur={onLeave}
    >
      <div className={`at-card ${won ? 'is-winner' : ''}`} ref={el}>
        <div className={`at-photo ${c.tone}`}>
          {c.photo && <img src={c.photo} alt="" loading="lazy" />}
        </div>
        <div className="at-shade" />
        <div className="at-foil" />
        <div className="at-sheen" />
        <div className="at-holo" />
        {won
          ? <WinnerRing id={`${c.slug}-${c.year}-${c.event.replace(/\W+/g, '')}`} />
          : <div className="at-frameline" />}

        <div className="at-top">
          <span className={`at-chip ${c.committed ? 'is-new' : ''}`}>
            {label}
          </span>
          <span className="at-place">
            {c.committed ? c.code : c.status || `#${String(c.place).padStart(2, '0')}`}
          </span>
        </div>

        <div className="at-front-body">
          <div className="at-name">{c.name}</div>
          <div className="at-event">{c.event} · {c.year}</div>

          <div className="at-face-mark">
            {c.committed ? (
              <span className="at-mark-soft">On the line</span>
            ) : (
              <span className="at-mark-value">
                {c.mark}{c.unit && <span className="at-mark-unit">{c.unit}</span>}
              </span>
            )}
            {c.marks.length > 0 && (
              <span className="at-badges">
                {c.marks.map((m) => <span key={m} className="at-badge">{m}</span>)}
              </span>
            )}
          </div>

          <div className="at-sub">
            {c.committed
              ? `Best ${c.mark}${c.unit}`
              : c.place ? ordinal(c.place) : c.status}
          </div>
        </div>
      </div>
    </Link>
  );
}
