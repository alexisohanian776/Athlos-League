'use client';

import { upload } from '@vercel/blob/client';
import { useRef, useState } from 'react';

/* The file goes straight from the browser to Blob, and only the resulting
   URL travels with the form. The <img> and the hidden input are both plain
   markup, so the field still shows the current photo with no JS at all. */
export default function AvatarField({ initialUrl, fallback }) {
  const [url, setUrl] = useState(initialUrl || '');
  const [state, setState] = useState('idle'); // idle | uploading | done | error
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function onPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setState('uploading');
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.]+/g, '-').slice(-40);
      const blob = await upload(`avatars/${Date.now()}-${safeName}`, file, {
        access: 'public',
        handleUploadUrl: '/api/avatar-upload',
      });
      setUrl(blob.url);
      setState('done');
    } catch (err) {
      /* Size and type are enforced when the token is minted, so a rejection
         arrives here rather than vanishing silently. */
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
          disabled={state === 'uploading'}
        />
        {/* what the form actually submits */}
        <input type="hidden" name="avatarUrl" value={url} />

        {state === 'uploading' && <p className="au-note">Uploading…</p>}
        {state === 'done' && <p className="au-note">Ready — hit Save profile to keep it.</p>}
        {state === 'error' && <p className="au-note is-bad">{error}</p>}
        {state === 'idle' && <p className="au-note">JPG, PNG, WEBP or GIF, up to 5MB.</p>}
      </div>
    </div>
  );
}
