/* Suggested stub copy, derived from the results.

   Server-only: MEET_RESULTS is large and has no business in a client
   bundle, so the suggestion is computed on the server and handed to the
   form as a string. */
import { MEET_RESULTS } from './results.js';

const isField = (event) => /JUMP|THROW|PUT/.test(event);

/* Field events read "7.13m", track events "10.98" or "4:17.78". */
function markPhrase(event, time) {
  const t = String(time);
  if (isField(event)) return t.endsWith('m') ? t : `${t}m`;
  return t;
}

const verb = (event) => (isField(event) ? 'won' : 'took');

/* The line most worth printing: a meet record by the winner, preferred over
   an ordinary win. Among several records the first in the results order
   wins, which is the order the events were actually run. */
export function headlineFor(year) {
  const events = MEET_RESULTS[String(year)] || [];
  if (!events.length) return '';

  const winners = events
    .map((ev) => ({ event: ev.event, athlete: ev.athletes.find((a) => String(a.place) === '1') }))
    .filter((x) => x.athlete);

  if (!winners.length) return '';

  const record = winners.find((w) => w.athlete.marks?.includes('MR'));
  const pick = record || winners[0];
  const { event, athlete } = pick;
  const where = event.toLowerCase().replace('hurdles', 'hurdles');

  const line = `${athlete.who} ${verb(event)} the ${where} in ${markPhrase(event, athlete.time)}`;
  return record ? `${line} — a meet record.` : `${line}.`;
}
