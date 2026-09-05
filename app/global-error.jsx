'use client';

/* Last resort: catches failures in the root layout itself, where error.jsx
   never gets a chance to render. Ships its own markup because the layout
   that would normally provide it is the thing that failed. */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#F0EFEB', color: '#0D040B',
        fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
        <div style={{ maxWidth: 380 }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>Something broke</h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: '#5A4E56' }}>
            This page hit an error and stopped. Reloading usually clears it.
          </p>
          {error?.digest && (
            <p style={{ fontSize: 12, letterSpacing: '.08em', color: '#B3001B' }}>
              Reference {error.digest}
            </p>
          )}
          <button type="button" onClick={() => reset()}
            style={{ height: 48, padding: '0 22px', border: 0, borderRadius: 999,
              background: '#0D040B', color: '#F5F1E8', fontSize: 15, cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
