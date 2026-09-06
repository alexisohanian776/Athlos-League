'use client';

import { upload } from '@vercel/blob/client';
import { useRef, useState } from 'react';

/* The hero shot printed on a meet's ticket stub.

   The URL stays a real, editable text input rather than a hidden one, so an
   image already living on another CDN can still be pasted — uploading just
   fills it in for you. */

const MAX_EDGE = 1600;          // the stub crops to 5:6, but the URL is reusable elsewhere
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

export default function MeetPhotoField({ slug, initialUrl }) {
  const [url, setUrl] = useState(initialUrl || '');
  const [state, setState] = useState('idle'); // idle | working | done | error
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setState('working');
    try {
      const resized = await downscale(file);
      const body = resized || file;
      if (body.size > MAX_UPLOAD) throw new Error('That image is too big. Try one under 20MB.');

      const result = await upload(`meets/${slug || 'new'}-${Date.now()}.jpg`, body, {
        access: 'public',
        handleUploadUrl: '/api/meet-photo-upload',
        contentType: resized ? 'image/jpeg' : file.type,
      });
      setUrl(result.url);
      setState('done');
    } catch (err) {
      setError(err?.message || 'That upload did not work.');
      setState('error');
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="dash-field is-wide mp-field">
      <span className="dash-label">Hero shot — printed on the stub</span>

      <div className="mp-row">
        <div className="mp-thumb">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" />
          ) : (
            <span className="mp-thumb-empty">No image</span>
          )}
        </div>

        <div className="mp-controls">
          <input
            ref={inputRef}
            className="ac-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPick}
            disabled={state === 'working'}
          />

          {/* The value the form actually submits — editable by hand. */}
          <input
            className="dash-input mp-url"
            name="photoUrl"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Upload above, or paste an image URL"
          />

          <div className="mp-notes">
            {state === 'working' && <span className="dash-hint">Resizing and uploading…</span>}
            {state === 'done' && <span className="dash-hint">Uploaded — save the meet to keep it.</span>}
            {state === 'error' && <span className="dash-hint mp-bad">{error}</span>}
            {state === 'idle' && (
              <span className="dash-hint">
                Landscape is fine — the stub crops to a tall 5:6 from the centre.
              </span>
            )}
            {url && (
              <button type="button" className="mp-clear" onClick={() => { setUrl(''); setState('idle'); }}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
