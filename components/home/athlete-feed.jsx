'use client';

import { useState } from 'react';
import PostCard from '../post-card';
import { POSTS, POST_FILTERS } from '@/lib/feed';

export default function AthleteFeed() {
  const [filter, setFilter] = useState('Latest');
  const shown = POSTS.filter((p) => filter === 'Latest' || p.cat === filter);

  return (
    <section className="hm-sec">
      <div className="hm-wrap">
        <div className="hm-sec-head">
          <div>
            <div className="lg-section-eyebrow" style={{ marginBottom: 12 }}>
              The feed · Newest first
            </div>
            <h2 className="lg-display hm-sec-title">From our athletes</h2>
          </div>
          <p className="hm-sec-note">
            Straight from their feeds and ours. Hover a frame — move across the foil.
          </p>
        </div>
        <div className="hm-chips" role="group" aria-label="Filter the feed">
          {POST_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`lg-chip ${filter === f ? 'is-active' : ''}`}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="cards-grid">
          {shown.map((p, i) => (
            <PostCard key={`${p.athlete}-${i}`} post={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
