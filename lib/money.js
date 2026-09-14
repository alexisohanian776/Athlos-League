/* Money formatting, shared by the client inputs and the server parse so the
   two can never disagree about what "$1,250,000" means. */

/* 200000 -> "$200,000". Presentation only: parseMoney strips it all back. */
export function formatMoney(raw) {
  const digits = String(raw ?? '').replace(/[^0-9]/g, '');
  return digits ? `$${Number(digits).toLocaleString('en-US')}` : '';
}

/* "$1,250,000" -> 1250000. Returns null for anything that is not a figure. */
export function parseMoney(raw) {
  const t = String(raw ?? '').replace(/[$,\s]/g, '');
  if (!t || !/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Math.round(Number(t));
  return Number.isFinite(n) ? n : null;
}
