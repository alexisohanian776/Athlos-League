'use client';

import { upload } from '@vercel/blob/client';
import { useEffect, useRef, useState } from 'react';
import Stub from '../stub';

/* The stub preview is the photo control. Clicking it opens a picker with two
   ways in: a file from this computer, or a search of the ATHLOS library in
   Scoreplay. Either way the form ends up holding one URL. */

const MAX_EDGE = 1600;
const MAX_UPLOAD = 20 * 1024 * 1024;

async function downscale(file) {
  if (typeof createImageBitmap !== 'function') return null;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1.5 * 1024 * 1024) return null;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
  } catch {
    return null;
  }
}

export default function StubPhotoPicker({ meet, compact = true }) {
  const [url, setUrl] = useState(meet?.photoUrl || '');
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('library');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);   // null = not searched yet
  const [scope, setScope] = useState('');         // what the current results represent
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  /* Opening the library shows this meet's own race first — the admin can
     still search for anything else from there. */
  useEffect(() => {
    if (!open || tab !== 'library' || results !== null) return;
    let cancelled = false;
    (async () => {
      setBusy('searching');
      try {
        const params = new URLSearchParams({
          city: meet?.city || '', year: meet?.year || '', name: meet?.name || '',
        });
        const res = await fetch(`/api/scoreplay/search?${params}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || 'Search failed.');
        setResults(json.media || []);
        setQuery(json.query || '');
        setScope(json.matchedMeet
          ? `Photos from ${meet?.name || 'this meet'}`
          : 'No photos found for this meet yet — showing the library');
      } catch (err) {
        if (!cancelled) { setError(err.message); setResults([]); }
      } finally {
        if (!cancelled) setBusy('');
      }
    })();
    return () => { cancelled = true; };
  }, [open, tab, results, meet?.city, meet?.year, meet?.name]);

  async function search(e) {
    e?.preventDefault();
    setError('');
    setBusy('searching');
    try {
      const res = await fetch(`/api/scoreplay/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Search failed.');
      setResults(json.media || []);
      setScope(`Results for “${query}”`);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setBusy('');
    }
  }

  async function choose(item) {
    setError('');
    setBusy(`import:${item.id}`);
    try {
      const res = await fetch('/api/scoreplay/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, slug: meet?.slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed.');
      setUrl(json.url);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setBusy('uploading');
    try {
      const resized = await downscale(file);
      const body = resized || file;
      if (body.size > MAX_UPLOAD) throw new Error('That image is too big. Try one under 20MB.');
      const result = await upload(`meets/${meet?.slug || 'new'}-${Date.now()}.jpg`, body, {
        access: 'public',
        handleUploadUrl: '/api/meet-photo-upload',
        contentType: resized ? 'image/jpeg' : file.type,
      });
      setUrl(result.url);
      setOpen(false);
    } catch (err) {
      setError(err?.message || 'That upload did not work.');
      if (fileRef.current) fileRef.current.value = '';
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="sp-wrap">
      <div className="dash-label sp-caption">Stub preview</div>

      <div className="sp-stub">
        <Stub meet={{ ...meet, photoUrl: url }} holder="Fan name" holderId={0} compact={compact} />

        <button type="button" className={`sp-overlay ${url ? 'has-photo' : ''}`} onClick={() => setOpen(true)}>
          <span className="sp-overlay-inner">
            <span className="sp-plus" aria-hidden="true">+</span>
            <span className="sp-overlay-text">
              {url ? 'Change photo' : 'Click here to add a photo'}
            </span>
          </span>
        </button>
      </div>

      {/* what the form submits */}
      <input type="hidden" name="photoUrl" value={url} />

      {url && (
        <button type="button" className="mp-clear sp-remove" onClick={() => setUrl('')}>
          Remove photo
        </button>
      )}

      {open && (
        <div className="sp-scrim" onClick={() => setOpen(false)}>
          <div className="sp-modal" role="dialog" aria-modal="true" aria-label="Choose a photo"
            onClick={(e) => e.stopPropagation()}>
            <div className="sp-modal-head">
              <div className="sp-tabs">
                <button type="button" className={`sp-tab ${tab === 'library' ? 'is-active' : ''}`}
                  onClick={() => setTab('library')}>ATHLOS library</button>
                <button type="button" className={`sp-tab ${tab === 'upload' ? 'is-active' : ''}`}
                  onClick={() => setTab('upload')}>Upload a file</button>
              </div>
              <button type="button" className="sp-x" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>

            {error && <p className="dash-error sp-error">{error}</p>}

            {tab === 'library' ? (
              <div className="sp-body">
                {/* Nested forms are invalid, and this sits inside the meet
                    form — so this is a div with an explicit submit handler. */}
                <div className="sp-search">
                  <input
                    className="dash-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }}
                    placeholder="Search by file name — KIPYEGON, GLAMSHOOT, ATHLOS…"
                  />
                  <button type="button" className="dash-btn dash-btn-ink" onClick={search}
                    disabled={busy === 'searching'}>
                    {busy === 'searching' ? 'Searching…' : 'Search'}
                  </button>
                </div>

                {scope && <p className="sp-scope">{scope}</p>}
                {results === null && busy === 'searching' && (
                  <p className="sp-hint">Looking for photos from this meet…</p>
                )}
                {results?.length === 0 && busy !== 'searching' && (
                  <p className="sp-hint">Nothing matched that. Try a shorter term.</p>
                )}

                <div className="sp-grid">
                  {(results || []).map((item) => (
                    <button type="button" key={item.id} className="sp-item" onClick={() => choose(item)}
                      disabled={Boolean(busy)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.thumb} alt="" loading="lazy" />
                      <span className="sp-item-name">{item.name}</span>
                      {busy === `import:${item.id}` && <span className="sp-item-busy">Importing…</span>}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="sp-body sp-upload">
                <input ref={fileRef} className="ac-file" type="file"
                  accept="image/jpeg,image/png,image/webp" onChange={onPick}
                  disabled={busy === 'uploading'} />
                <p className="sp-hint">
                  {busy === 'uploading'
                    ? 'Resizing and uploading…'
                    : 'JPG, PNG or WEBP. Straight off the camera is fine — it gets resized here.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
