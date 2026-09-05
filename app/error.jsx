'use client';

/* Without this, a client-side crash unmounts the tree and leaves a blank
   page with nothing in the console — which is exactly what a blank screen
   after sign-in looked like. The digest is the key to the server log. */
export default function ErrorBoundary({ error, reset }) {
  return (
    <div className="dash">
      <div className="dash-login">
        <div className="dash-login-inner">
          <h1 className="dash-login-title">Something broke</h1>
          <p className="dash-login-note">
            This page hit an error and stopped. Reloading usually clears it.
          </p>
          {error?.digest && (
            <p className="dash-error" style={{ marginTop: 14 }}>Reference {error.digest}</p>
          )}
          <div className="dash-login-form">
            <button className="dash-btn dash-btn-ink" type="button" onClick={() => reset()}>
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
