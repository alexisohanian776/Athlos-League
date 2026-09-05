'use client';

import { upload } from '@vercel/blob/client';
import { useRef, useState } from 'react';

/* The file goes straight from the browser to Blob, and only the resulting
   URL travels with the form. The <img> and the hidden input are both plain
   markup, so the field still shows the current photo with no JS at all. */

const MAX_EDGE = 640;          // displayed at 72px, so this is already generous on retina
const MAX_UPLOAD = 12 * 1024 * 1024;

/* Phone cameras produce 5-10MB files for something shown at 72px. Resizing
   in the browser keeps the upload small and sidesteps the size limit
   entirely; if the format is one canvas cannot decode (HEIC, say) we fall
   back to sending the original and let the size check speak. */
async function downscale(file) {
  if (typeof createImageBitmap !== 'function') return null;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    if (!blob) return null;
    /* An already-small file gains nothing from re-encoding. */
    if (blob.size >= file.size && file.size <= MAX_UPLOAD) return null;
    return blob;
  } catch {
    return null;
  }
}

export default function AvatarField({ initialUrl, fallback, userId }) {
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

      if (body.size > MAX_UPLOAD) {
        throw new Error('That image is too big to process. Try one under 12MB.');
      }

      /* The id prefix has to match what /api/avatar-upload will accept —
         it scopes the upload to this account before minting a token. */
      const ext = resized ? 'jpg' : (file.name.split('.').pop() || 'jpg').slice(0, 5);
      const blob = await upload(`avatars/${userId}-${Date.now()}.${ext}`, body, {
        access: 'public',
        handleUploadUrl: '/api/avatar-upload',
        contentType: resized ? 'image/jpeg' : file.type,
      });
      setUrl(blob.url);
      setState('done');
    } catch (err) {
      setError(err?.message || 'That upload did not work.');
      setState('error');
      if (inputRef.current) inputRef.current.value = '';
    }
  }

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

        {state === 'working' && <p className="au-note">Resizing and uploading…</p>}
        {state === 'done' && <p className="au-note">Ready — hit Save profile to keep it.</p>}
        {state === 'error' && <p className="au-note is-bad">{error}</p>}
        {state === 'idle' && <p className="au-note">JPG, PNG, WEBP or GIF. Straight off your phone is fine — it gets resized here.</p>}
      </div>
    </div>
  );
}
