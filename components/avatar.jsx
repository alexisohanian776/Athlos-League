import { initials } from './photo-crop';

export default function Avatar({ name, size = 40, tone = 'ph-wine' }) {
  return (
    <div className={`lg-avatar ${tone}`} style={{ width: size, height: size }}>
      <span style={{ fontSize: size * 0.36 }}>{initials(name)}</span>
    </div>
  );
}
