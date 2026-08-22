export default function SocialGlyph({ icon }) {
  if (icon === 'ig') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (icon === 'x') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.9 2H22l-7.3 8.3L23 22h-6.8l-5-6.5L5.2 22H2l7.7-8.9L1.5 2h6.9l4.5 6 5-6Zm-1.2 18h1.9L7.4 4H5.4l12.3 16Z" />
      </svg>
    );
  }
  return null;
}
