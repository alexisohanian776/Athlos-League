/* Winner treatment: a hyper-red ring with "WINNER" running around the card.
   Replaces the old chip, which used to overwrite the athlete's country code.

   Each edge gets its own path drawn in reading direction — a single path
   around the perimeter makes the glyphs run upside down along the bottom and
   right, which reads as a bug rather than a flourish. */

const LABEL = 'WINNER · ';

/* 5:7 to match the card. Sharp corners — this is a trading card, not a chip. */
const RING = 'M 14,14 H 486 V 686 H 14 Z';

const EDGES = [
  { key: 't', d: 'M 42,33 H 458', reps: 5 },   // left to right
  { key: 'r', d: 'M 467,42 V 658', reps: 7 },   // top to bottom
  { key: 'b', d: 'M 42,673 H 458', reps: 5 },   // left to right, never reversed
  { key: 'l', d: 'M 33,658 V 42', reps: 7 },    // bottom to top
];

export default function WinnerRing({ id }) {
  return (
    <svg
      className="at-winner"
      viewBox="0 0 500 700"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <path id={`wr-${id}`} d={RING} fill="none" />
        {EDGES.map((e) => <path key={e.key} id={`we-${id}-${e.key}`} d={e.d} fill="none" />)}
      </defs>

      <use href={`#wr-${id}`} className="at-winner-ring" />

      {EDGES.map((e) => (
        <text key={e.key} className="at-winner-text">
          <textPath href={`#we-${id}-${e.key}`} startOffset="0">
            {LABEL.repeat(e.reps)}
          </textPath>
        </text>
      ))}
    </svg>
  );
}
