'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/* ---------- location ----------

   A datalist looked like a dropdown but behaved like a text box: it accepted
   anything typed, and matching varied by browser. This is a real combobox —
   nothing is committed unless it comes from the list, and the field the form
   submits only ever holds a listed value. The server checks again. */
export function CityPicker({ cities, initial = '' }) {
  const [value, setValue] = useState(initial);   // the committed selection
  const [text, setText] = useState(initial);     // what is typed
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return cities.slice(0, 60);
    const starts = cities.filter((c) => c.toLowerCase().startsWith(q));
    const contains = cities.filter((c) => !c.toLowerCase().startsWith(q) && c.toLowerCase().includes(q));
    return [...starts, ...contains].slice(0, 60);
  }, [cities, text]);

  useEffect(() => {
    const away = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) close(); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  });

  function close() {
    setOpen(false);
    /* Anything half-typed reverts, so the box never shows a city that is not
       the committed one. */
    setText(value);
  }
  function commit(city) {
    setValue(city);
    setText(city);
    setOpen(false);
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && open) { e.preventDefault(); if (matches[active]) commit(matches[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  };

  return (
    <label className="dash-field is-wide cb" ref={boxRef}>
      <span className="dash-label">Location</span>
      {/* only a listed city is ever submitted */}
      <input type="hidden" name="location" value={value} />
      <input
        className="dash-input cb-input"
        type="text"
        value={text}
        onChange={(e) => { setText(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Start typing a city"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {open && (
        <ul className="cb-list" role="listbox">
          {matches.map((c, i) => (
            <li key={c}>
              <button type="button" role="option" aria-selected={i === active}
                className={`cb-option ${i === active ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(c)}>
                {c}
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="cb-empty">No city matches that.</li>}
        </ul>
      )}
      <span className="dash-hint">
        {value ? `Set to ${value}` : 'Pick from the list — the stub prints this.'}
      </span>
    </label>
  );
}

/* ---------- weather ---------- */
export function WeatherField({ initial = '', slug }) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState('idle');
  const [note, setNote] = useState('');

  async function fetchWeather() {
    /* Read the sibling fields as they are now, rather than as they were when
       the page rendered — the admin may have just changed them. */
    const form = document.querySelector(`[data-meet="${slug || 'new'}"]`);
    const city = form?.querySelector('input[name="location"]')?.value || '';
    const date = form?.querySelector('input[name="heldOn"]')?.value || '';

    setState('working');
    setNote('');
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}&date=${encodeURIComponent(date)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lookup failed.');
      setValue(json.text);
      setNote(`From ${json.place} at ${String(json.at).replace('T', ' ')}`);
      setState('done');
    } catch (err) {
      setNote(err.message);
      setState('error');
    }
  }

  return (
    <label className="dash-field">
      <span className="dash-label">Weather</span>
      <div className="mf-row">
        <input className="dash-input" name="weather" type="text" value={value}
          onChange={(e) => setValue(e.target.value)} placeholder="62°F, clear" />
        <button type="button" className="mf-btn" onClick={fetchWeather} disabled={state === 'working'}>
          {state === 'working' ? '…' : 'Look up'}
        </button>
      </div>
      <span className={`dash-hint ${state === 'error' ? 'mf-bad' : ''}`}>
        {note || 'Shown on the stub. Look up fills it from the date and city.'}
      </span>
    </label>
  );
}

/* ---------- headline ---------- */
export function HeadlineField({ initial = '', suggestion = '' }) {
  const [value, setValue] = useState(initial);

  return (
    <label className="dash-field is-wide">
      <span className="dash-label">Headline — one sentence on the stub</span>
      <div className="mf-row">
        <input className="dash-input" name="headline" type="text" value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Faith Kipyegon took the mile in 4:17.78 — a meet record." />
        {suggestion && (
          <button type="button" className="mf-btn" onClick={() => setValue(suggestion)}>
            Generate
          </button>
        )}
      </div>
      <span className="dash-hint">
        {suggestion
          ? 'Generate writes the meet record from the results. Edit it freely.'
          : 'No results for this meet yet, so there is nothing to generate from.'}
      </span>
    </label>
  );
}

/* ---------- fallback colour ---------- */
const TONE_SWATCH = {
  'ph-wine': ['#1F0219', '#4A0A22'],
  'ph-plum': ['#0D040B', '#2A0A2E'],
  'ph-ember': ['#15080A', '#3A1410'],
  'ph-field': ['#0A140F', '#1E3A2A'],
  'ph-dusk': ['#100A1E', '#2E1840'],
  'ph-clay': ['#160B08', '#40231A'],
};

export function TonePicker({ initial = 'ph-wine' }) {
  const [tone, setTone] = useState(initial);
  return (
    <div className="dash-field">
      <span className="dash-label">Fallback colour</span>
      <input type="hidden" name="tone" value={tone} />
      <div className="mf-tones">
        {Object.entries(TONE_SWATCH).map(([key, [a, b]]) => (
          <button key={key} type="button" title={key}
            className={`mf-tone ${tone === key ? 'is-active' : ''}`}
            style={{ background: `linear-gradient(150deg, ${a}, ${b})` }}
            onClick={() => setTone(key)}
            aria-label={key} aria-pressed={tone === key} />
        ))}
      </div>
      <span className="dash-hint">Only seen until a photo is set.</span>
    </div>
  );
}
