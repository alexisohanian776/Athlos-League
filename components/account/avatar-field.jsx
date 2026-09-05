'use client';

import { upload } from '@vercel/blob/client';
import { useCallback, useEffect, useRef, useState } from 'react';

/* Pick a photo, position it inside the circle, then it uploads. The file
   goes straight from the browser to Blob and only the URL travels with the
   form. The <img> and the hidden input are plain markup, so the field still
   shows the current photo with no JS at all. */

const VIEW = 288;              // the square the circle is inscribed in, in CSS px
const OUT = 640;               // what we actually write — generous for a 72px avatar
const MAX_UPLOAD = 12 * 1024 * 1024;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export default function AvatarField({ initialUrl, fallback, userId }) {
  const [url, setUrl] = useState(initialUrl || '');
  const [state, setState] = useState('idle'); // idle | cropping | working | done | error
  const [error, setError] = useState('');

  const [src, setSrc] = useState('');          // object URL of the picked file
  const [img, setImg] = useState(null);        // the decoded <img>
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const inputRef = useRef(null);
  const dragRef = useRef(null);

  /* Cover-fit: the smaller edge fills the circle, so there is never a gap. */
  const baseScale = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const scale = baseScale * zoom;
  const drawW = img ? img.naturalWidth * scale : 0;
  const drawH = img ? img.naturalHeight * scale : 0;
  const limitX = Math.max(0, (drawW - VIEW) / 2);
  const limitY = Math.max(0, (drawH - VIEW) / 2);

  /* Re-clamp whenever zoom changes, or zooming out could leave a gap. */
  useEffect(() => {
    setPos((p) => ({ x: clamp(p.x, -limitX, limitX), y: clamp(p.y, -limitY, limitY) }));
  }, [limitX, limitY]);

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  function reset() {
    setSrc((old) => { if (old) URL.revokeObjectURL(old); return ''; });
    setImg(null);
    setZoom(1);
    setPos({ x: 0, y: 0 });
    if (inputRef.current) inputRef.current.value = '';
  }

  function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    const objectUrl = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      setImg(el);
      setSrc(objectUrl);
      setZoom(1);
      setPos({ x: 0, y: 0 });
      setState('cropping');
    };
    el.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError('That image could not be opened. Try a JPG or PNG.');
      setState('error');
      if (inputRef.current) inputRef.current.value = '';
    };
    el.src = objectUrl;
  }

  /* ---- dragging ---- */
  const onPointerDown = (e) => {
    if (!img) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { px: e.clientX, py: e.clientY, ...pos };
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    setPos({
      x: clamp(d.x + (e.clientX - d.px), -limitX, limitX),
      y: clamp(d.y + (e.clientY - d.py), -limitY, limitY),
    });
  };
  const onPointerUp = (e) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };
  const onWheel = (e) => {
    if (!img) return;
    setZoom((z) => clamp(z * (e.deltaY < 0 ? 1.06 : 0.94), 1, 4));
  };
  const onKeyDown = (e) => {
    const step = e.shiftKey ? 16 : 4;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setPos((p) => ({ x: clamp(p.x + m[0], -limitX, limitX), y: clamp(p.y + m[1], -limitY, limitY) }));
  };

  /* ---- commit ---- */
  const save = useCallback(async () => {
    if (!img) return;
    setState('working');
    setError('');
    try {
      /* Map the visible square back to source pixels. A source point (u,v)
         lands at VIEW/2 + pos + (u - w/2) * scale, so inverting at the two
         edges gives the crop origin and a side of VIEW/scale. */
      const sSize = VIEW / scale;
      const sx = clamp(img.naturalWidth / 2 - (VIEW / 2 + pos.x) / scale, 0, Math.max(0, img.naturalWidth - sSize));
      const sy = clamp(img.naturalHeight / 2 - (VIEW / 2 + pos.y) / scale, 0, Math.max(0, img.naturalHeight - sSize));

      const canvas = document.createElement('canvas');
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Your browser could not process that image.');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUT, OUT);

      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.88));
      if (!blob) throw new Error('Your browser could not process that image.');
      if (blob.size > MAX_UPLOAD) throw new Error('That image is too big to process.');

      /* The id prefix has to match what /api/avatar-upload will accept —
         it scopes the upload to this account before minting a token. */
      const result = await upload(`avatars/${userId}-${Date.now()}.jpg`, blob, {
        access: 'public',
        handleUploadUrl: '/api/avatar-upload',
        contentType: 'image/jpeg',
      });
      setUrl(result.url);
      setState('done');
      reset();
    } catch (err) {
      setError(err?.message || 'That upload did not work.');
      setState('error');
    }
  }, [img, scale, pos, userId]);

  const cropping = state === 'cropping' && img;

  return (
    <div className="ac-avatar-row">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ac-avatar" src={url} alt="" width={72} height={72} />
      ) : (
        fallback
      )}

      <div className="au-field ac-avatar-field">
        <label className="au-label" htmlFor="avatar">Profile photo</label>
        <input
          ref={inputRef}
          className="ac-file"
          id="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onPick}
          disabled={state === 'working'}
        />
        {/* what the form actually submits */}
        <input type="hidden" name="avatarUrl" value={url} />

        {state === 'working' && <p className="au-note">Uploading…</p>}
        {state === 'done' && <p className="au-note">Ready — hit Save profile to keep it.</p>}
        {state === 'error' && <p className="au-note is-bad">{error}</p>}
        {(state === 'idle' || cropping) && (
          <p className="au-note">JPG, PNG, WEBP or GIF. Straight off your phone is fine.</p>
        )}
      </div>

      {cropping && (
        <div className="ac-crop-scrim" role="dialog" aria-modal="true" aria-label="Position your photo">
          <div className="ac-crop">
            <div className="ac-crop-head">Drag to move · scroll or slide to zoom</div>

            <div
              className="ac-crop-stage"
              style={{ width: VIEW, height: VIEW }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
              onKeyDown={onKeyDown}
              tabIndex={0}
              aria-label="Photo position. Use the arrow keys to nudge."
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="ac-crop-img"
                src={src}
                alt=""
                draggable={false}
                style={{
                  width: drawW,
                  height: drawH,
                  transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                }}
              />
              <div className="ac-crop-mask" />
            </div>

            <input
              className="ac-crop-zoom"
              type="range"
              min="1"
              max="4"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
            />

            <div className="ac-crop-actions">
              <button
                type="button"
                className="dash-btn dash-btn-ghost"
                onClick={() => { reset(); setState('idle'); }}
              >
                Cancel
              </button>
              <button type="button" className="dash-btn dash-btn-ink" onClick={save}>
                Use photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
