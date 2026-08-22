'use client';

/* Deleting removes the club and its public page — confirm first. */
export default function DeleteClubButton({ name }) {
  return (
    <button
      className="ad-btn ad-btn-danger"
      type="submit"
      onClick={(e) => {
        if (!window.confirm(`Delete ${name}? This removes its page from the site.`)) {
          e.preventDefault();
        }
      }}
    >
      Delete
    </button>
  );
}
