'use client';

import { useMemo, useState } from 'react';

/* Pick up to five league athletes, in order. The order is the ranking shown
   on the profile, so picking is append-and-remove rather than a checkbox
   set — position one should be deliberate. */
const MAX = 5;

export default function FavouritesPicker({ athletes, initial = [] }) {
  const [picked, setPicked] = useState(() => initial.filter((s) => athletes.some((a) => a.slug === s)));
  const [filter, setFilter] = useState('');

  const bySlug = useMemo(
    () => Object.fromEntries(athletes.map((a) => [a.slug, a])),
    [athletes]
  );

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return athletes.filter((a) => !picked.includes(a.slug) && (!q || a.name.toLowerCase().includes(q)));
  }, [athletes, picked, filter]);

  const add = (slug) => setPicked((p) => (p.length >= MAX || p.includes(slug) ? p : [...p, slug]));
  const remove = (slug) => setPicked((p) => p.filter((s) => s !== slug));
  const move = (slug, dir) => setPicked((p) => {
    const i = p.indexOf(slug);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= p.length) return p;
    const next = [...p];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  return (
    <div className="fv">
      {/* one field, the ranking preserved by order */}
      <input type="hidden" name="favourites" value={picked.join(',')} />

      <div className="fv-picked">
        {picked.length === 0 && <p className="au-note">Nobody picked yet — choose up to five below.</p>}
        {picked.map((slug, i) => (
          <div className="fv-chip" key={slug}>
            <span className="fv-rank">{i + 1}</span>
            <span className="fv-chip-name">{bySlug[slug]?.name || slug}</span>
            <span className="fv-chip-tools">
              <button type="button" onClick={() => move(slug, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" onClick={() => move(slug, 1)} disabled={i === picked.length - 1} aria-label="Move down">↓</button>
              <button type="button" onClick={() => remove(slug)} aria-label="Remove">✕</button>
            </span>
          </div>
        ))}
      </div>

      {picked.length < MAX && (
        <>
          <input
            className="dash-input au-input fv-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={`Search ${athletes.length} athletes…`}
          />
          <div className="fv-list">
            {shown.slice(0, 40).map((a) => (
              <button type="button" key={a.slug} className="fv-option" onClick={() => add(a.slug)}>
                <span>{a.name}</span>
                <span className="lg-mono fv-code">{a.code}</span>
              </button>
            ))}
            {shown.length === 0 && <p className="au-note">No athlete matches that.</p>}
          </div>
        </>
      )}
    </div>
  );
}
