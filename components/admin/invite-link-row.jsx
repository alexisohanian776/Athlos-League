'use client';

import { useState } from 'react';

/* The invite link is shown once so it can be copied and sent manually. */
export default function InviteLinkRow({ url }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="dash-actions" style={{ paddingTop: 0 }}>
      <code className="dash-invite">{url}</code>
      <button
        className="dash-btn dash-btn-ghost"
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
      >
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}
