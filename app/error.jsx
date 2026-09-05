'use client';

/* Without this, a client-side crash unmounts the tree and leaves a blank
   page with nothing in the console — which is exactly what a blank screen
   after sign-in looked like. The digest is the key to the server log. */
export default function ErrorBoundary({ error, reset }) {
  return (
    <div className="ad">
      <div className="ad-login">
        <div className="ad-login-inner">
          <h1 className="ad-login-title">Something broke</h1>
          <p className="ad-login-note">
            This page hit an error and stopped. Reloading usually clears it.
          </p>
          {error?.digest && (
            <p className="ad-error" style={{ marginTop: 14 }}>Reference {error.digest}</p>
          )}
          <div className="ad-login-form">
            <button className="ad-btn ad-btn-ink" type="button" onClick={() => reset()}>
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
