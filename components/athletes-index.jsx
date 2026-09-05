'use client';

import { useMemo, useState } from 'react';
import AthleteCard from './athlete-card';
import { ALL_EVENTS, EVENT_OPTIONS, SEASONS, seasonMeta } from '@/lib/season-cards';

export default function AthletesIndex() {
  const [filter, setFilter] = useState(ALL_EVENTS);

  const seasons = useMemo(
    () =>
      SEASONS.map((s) => ({
        ...s,
        cards: s.cards.filter((c) => filter === ALL_EVENTS || c.event === filter),
      })).filter((s) => s.cards.length),
    [filter]
  );

  const total = seasons.reduce((n, s) => n + s.cards.length, 0);

  return (
    <>
      <header className="at-head">
        <div className="at-head-row">
          <div>
            <div className="lg-section-eyebrow" style={{ marginBottom: 12 }}>
              Every athlete · Every season
            </div>
            <h1 className="lg-display at-head-title">Athletes</h1>
          </div>
          <p className="at-head-note">
            Every card the league has minted, season by season. Tilt one to catch
            the light. Click through for the full profile.
          </p>
        </div>

        <div className="at-filters" role="group" aria-label="Filter by event">
          {EVENT_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              className={`lg-chip ${filter === e ? 'is-active' : ''}`}
              aria-pressed={filter === e}
              onClick={() => setFilter(e)}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="at-actions">
          <div className="at-count" aria-live="polite">{total} cards</div>
        </div>
      </header>

      {seasons.map((s) => (
        <section className="at-season" key={s.year} aria-labelledby={`season-${s.year}`}>
          <div className="at-season-bar">
            <h2 className="at-season-year" id={`season-${s.year}`}>{s.year}</h2>
            {s.upcoming && <span className="at-upcoming">Upcoming</span>}
            <div className="at-season-meta">
              {seasonMeta(s.year)} · {s.cards.length} cards
            </div>
          </div>
          <div className="at-grid">
            {s.cards.map((c, i) => (
              <AthleteCard key={`${c.slug}-${c.event}-${i}`} card={c} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
