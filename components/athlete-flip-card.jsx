'use client';

import Link from 'next/link';
import { useState } from 'react';

const ordinal = (n) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`);

/* The flip is hover-driven by CSS. Keyboard gets it via :focus-visible.
   Touch has no hover, so the first tap flips and the second navigates. */
export default function AthleteFlipCard({ card: c }) {
  const [flipped, setFlipped] = useState(false);

  function onClick(e) {
    const noHover =
      typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;
    if (noHover && !flipped) {
      e.preventDefault();
      setFlipped(true);
    }
  }

  return (
    <Link
      className={`at-scene ${flipped ? 'is-flipped' : ''}`}
      href={`/athletes/${c.slug}`}
      aria-label={`${c.name} — ${c.event} ${c.year}`}
      onClick={onClick}
      onBlur={() => setFlipped(false)}
    >
      <div className="at-flip">
        <div className="at-face at-front">
          <div className={`at-photo ${c.tone}`}>
            {c.photo && <img src={c.photo} alt="" />}
          </div>
          <div className="at-shade" />
          <div className="at-foil" />
          <div className="at-frameline" />
          <div className="at-top">
            <span
              className={`at-chip ${
                c.committed ? 'is-new' : c.place === 1 ? 'is-win' : ''
              }`}
            >
              {c.committed ? 'Committed' : c.place === 1 ? 'Winner' : c.code}
            </span>
            <span className="at-place">
              {c.committed
                ? c.code
                : c.status || `#${String(c.place).padStart(2, '0')}`}
            </span>
          </div>
          <div className="at-front-body">
            <div className="at-name">{c.name}</div>
            <div className="at-event">{c.event} · {c.year}</div>
          </div>
        </div>

        <div className="at-face at-back">
          <div className="at-frameline" />
          <div className="at-back-inner">
            <div>
              <div className="at-back-name">{c.name}</div>
              <div className="at-back-ev">{c.event} · {c.year}</div>
            </div>

            {c.committed ? (
              <div>
                <div className="at-mark at-mark-soft">On the line</div>
                <div className="at-mark-label">18 Sept · London</div>
                <div className="at-back-rows">
                  <div className="at-row">
                    <span>Best to date</span>
                    <span>{c.mark}{c.unit}</span>
                  </div>
                  <div className="at-row">
                    <span>Set</span>
                    <span>{c.setYear || 'ATHLOS'}</span>
                  </div>
                  <div className="at-row">
                    <span>Country</span>
                    <span>{c.code}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="at-mark">
                  {c.mark}
                  {c.unit && <span className="at-mark-unit">{c.unit}</span>}
                </div>
                <div className="at-mark-label">
                  {c.unit ? 'Distance' : 'Time'} · {c.year} final
                </div>
                <div className="at-back-rows">
                  <div className="at-row">
                    <span>Place</span>
                    <span>{c.place ? ordinal(c.place) : c.status}</span>
                  </div>
                  <div className="at-row">
                    <span>Country</span>
                    <span>{c.code}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="at-back-foot">
              <div className="at-badges">
                {c.marks.map((m) => (
                  <span key={m} className="at-badge">{m}</span>
                ))}
              </div>
              <span className="at-cta">Profile →</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
