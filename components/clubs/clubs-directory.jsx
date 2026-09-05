'use client';

import Link from 'next/link';
import { useState } from 'react';
import PhotoCrop, { initials } from '../photo-crop';

/* The locator map and the card grid share one `active` club, so hovering
   either highlights both. */
function ClubsMap({ clubs, active, setActive, label }) {
  return (
    <div className="cl-map">
      <div className="cl-map-grid" />
      <div className="cl-map-land" />
      <div className="cl-map-label lg-mono">{label}</div>
      {clubs.map((c) => (
        <button
          key={c.slug}
          type="button"
          className={`cl-pin ${active === c.slug ? 'is-active' : ''}`}
          style={{ left: `${c.mapX}%`, top: `${c.mapY}%` }}
          onMouseEnter={() => setActive(c.slug)}
          onMouseLeave={() => setActive(null)}
          onFocus={() => setActive(c.slug)}
          onBlur={() => setActive(null)}
          aria-label={`${c.name} · ${c.members} members`}
        >
          <span className="cl-pin-dot" />
          <span className="cl-pin-tip lg-mono">{c.name} · {c.members}</span>
        </button>
      ))}
    </div>
  );
}

function ClubCard({ club: c, active, setActive }) {
  return (
    <Link
      href={`/run-clubs/${c.slug}`}
      className={`cl-card ${active === c.slug ? 'is-active' : ''}`}
      onMouseEnter={() => setActive(c.slug)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(c.slug)}
      onBlur={() => setActive(null)}
    >
      <div className="cl-card-photo">
        <PhotoCrop
          tone={c.tone}
          mono={initials(c.city, 3)}
          monoSize={64}
          style={{ position: 'absolute', inset: 0 }}
        />
        <span className="cl-card-code lg-mono-data">{c.code}</span>
        <span className={`cl-card-tag lg-mono ${c.type === 'Partner' ? 'is-partner' : ''}`}>
          {c.type === 'Partner' ? 'Partner club' : 'Official'}
        </span>
      </div>
      <div className="cl-card-body">
        <div className="cl-card-top">
          <h3 className="lg-display cl-card-name">{c.name}</h3>
          <span className="lg-mono cl-card-members">{c.members.toLocaleString('en-US')} members</span>
        </div>
        <div className="lg-mono cl-card-hood">{c.city} · {c.hood}</div>
        {c.organizer && <div className="lg-mono cl-card-lead">Led by {c.organizer}</div>}
        <div className="cl-card-foot">
          <span className="cl-card-next"><span className="cl-next-dot" />Next run · {c.next}</span>
          <span className="cl-card-view lg-mono">View club →</span>
        </div>
      </div>
    </Link>
  );
}

export default function ClubsDirectory({ clubs }) {
  /* Both the filter and the map label come from the clubs themselves, so they
     can never advertise a region with nothing in it. */
  const regions = [...new Set(clubs.map((c) => c.region))].sort();
  const cities = [...new Set(clubs.map((c) => c.city))];
  const filters = regions.length > 1 ? ['All', ...regions] : [];
  const mapLabel = `Sponsored clubs · ${cities.length > 2 ? regions.join(' & ') : cities.join(', ')}`;
  const [active, setActive] = useState(null);
  const [region, setRegion] = useState('All');
  const shown = clubs.filter((c) => region === 'All' || c.region === region);

  return (
    <>
      <section className="cl-mapwrap">
        <ClubsMap clubs={clubs} active={active} setActive={setActive} label={mapLabel} />
      </section>

      <section className="cl-dir">
        <div className="cl-dir-head">
          <h2 className="lg-display cl-dir-title">Find your crew</h2>
          {filters.length > 0 && (
          <div className="cl-filters" role="group" aria-label="Filter by region">
            {filters.map((r) => (
              <button
                key={r}
                type="button"
                className={`lg-chip ${region === r ? 'is-active' : ''}`}
                aria-pressed={region === r}
                onClick={() => setRegion(r)}
              >
                {r}
              </button>
            ))}
          </div>
          )}
        </div>
        <div className="cl-grid">
          {shown.map((c) => (
            <ClubCard key={c.slug} club={c} active={active} setActive={setActive} />
          ))}
        </div>
      </section>
    </>
  );
}
