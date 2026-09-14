'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/money';

export function MoneyInput({ defaultValue = '', ...rest }) {
  const [value, setValue] = useState(formatMoney(defaultValue));
  return (
    <input className="dash-input" name="amount" value={value} inputMode="numeric"
      onChange={(e) => setValue(formatMoney(e.target.value))}
      placeholder="$250,000" aria-label="Amount" {...rest} />
  );
}

/* The add form is a client component for two reasons: the amount formats as
   you type, and it has to clear itself afterwards.

   It does not redirect on success. The action revalidates and the page
   re-renders in place, which keeps the scroll position — and avoids the trap
   that a redirect to the same path differing only by #hash is treated as
   scroll-only, so nothing refetches and the click looks like it did
   nothing. */
export default function AddMoneyForm({ dealId, kinds, nextYear, action }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  return (
    <form
      className="pl-year-add"
      action={async (formData) => {
        const result = await action(formData);
        if (result?.error) { setError(result.error); return; }
        setError('');
        setAmount('');
        setNote('');
      }}
    >
      <input type="hidden" name="dealId" value={dealId} />
      <input className="dash-input" type="number" name="year" min={2020} max={2040}
        defaultValue={nextYear} aria-label="Season" />
      <input className="dash-input" name="amount" value={amount} inputMode="numeric"
        onChange={(e) => setAmount(formatMoney(e.target.value))}
        placeholder="$250,000" aria-label="Amount" />
      <select className="dash-input" name="kind" defaultValue="cash" aria-label="What the money is">
        {kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
      </select>
      <select className="dash-input" name="guaranteed" defaultValue="1" aria-label="Guaranteed or optioned">
        <option value="1">Guaranteed</option>
        <option value="0">Optioned</option>
      </select>
      <button className="dash-btn dash-btn-ghost" type="submit">Add</button>
      <input className="dash-input pl-year-note-input" name="note" maxLength={300}
        value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="What it was — free water, shelf ads, a content shoot…" aria-label="What this was" />
      {error && <p className="dash-error pl-year-error">{error}</p>}
    </form>
  );
}
