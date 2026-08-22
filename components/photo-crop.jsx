/* Brand-styled photo placeholder: duotone field, grain, ghosted monogram.
   Pass `src` once real imagery is wired up and it renders in place. */
export default function PhotoCrop({
  tone = 'ph-wine',
  src,
  alt = '',
  mono,
  monoSize = 120,
  caption,
  tag,
  protect,
  className = '',
  style,
  children,
}) {
  return (
    <div className={`lg-photo ${tone} ${className}`} style={style}>
      {src && <img src={src} alt={alt} />}
      {!src && mono && (
        <div className="lg-photo-monogram" style={{ fontSize: monoSize }}>{mono}</div>
      )}
      {protect && <div className="lg-photo-protect" />}
      {tag && <div className="lg-photo-tag">{tag}</div>}
      {caption && <div className="lg-photo-caption">{caption}</div>}
      {children}
    </div>
  );
}

export const initials = (name, max = 2) =>
  name.split(' ').map((w) => w[0]).join('').slice(0, max);
