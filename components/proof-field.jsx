'use client';

import { upload } from '@vercel/blob/client';
import { useRef, useState } from 'react';

/* Upload the proof photo straight to Blob and hand the form the URL. The
   image is downscaled first — a phone photo is 5-10MB and nobody needs that
   to read a ticket. */

const MAX_EDGE = 1600;
const MAX_UPLOAD = 12 * 1024 * 1024;

async function downscale(file) {
  if (typeof createImageBitmap !== 'function') return null;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 2 * 1024 * 1024) return null;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.86));
  } catch {
    return null;
  }
}

export default function ProofField({ userId }) {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState('');
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
      if (body.size > MAX_UPLOAD) throw new Error('That image is too big. Try one under 12MB.');

      const result = await upload(`proofs/${userId}-${Date.now()}.jpg`, body, {
        access: 'public',
        handleUploadUrl: '/api/proof-upload',
        contentType: resized ? 'image/jpeg' : file.type,
      });
      setUrl(result.url);
      setPreview(URL.createObjectURL(body));
      setState('done');
    } catch (err) {
      setError(err?.message || 'That upload did not work.');
      setState('error');
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="vf-proof">
      <input type="hidden" name="proofUrl" value={url} />

      {preview ? (
        <div className="vf-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Your proof" />
        </div>
      ) : (
        <div className="vf-drop">Ticket photo or a selfie from the stands</div>
      )}

      <input
        ref={inputRef}
        className="ac-file"
        id="proof"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onPick}
        disabled={state === 'working'}
      />

      {state === 'working' && <p className="au-note">Uploading…</p>}
      {state === 'done' && <p className="au-note">Attached. Send it when you are ready.</p>}
      {state === 'error' && <p className="au-note is-bad">{error}</p>}
    </div>
  );
}
