/* MR / PB / SB mark pill. */
export default function MarkPill({ mark }) {
  const cls = mark === 'MR' ? 'lg-mark-mr' : mark === 'PB' ? 'lg-mark-pb' : 'lg-mark-sb';
  return <span className={`lg-mark ${cls}`}>{mark}</span>;
}
