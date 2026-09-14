import Link from 'next/link';
import { notFound } from 'next/navigation';
import AccountBar from '@/components/account/account-bar';
import AdminTabs from '@/components/admin/admin-tabs';
import { currentUser } from '@/lib/current-user';
import { getUserById } from '@/lib/users-db';
import {
  STAGES, CLOSED_STAGES, MONEY_KINDS, getDeal, listContacts, listYears, listDealEvents,
  conflictsFor, dealOwners,
} from '@/lib/deals-db';
import DealFields from '@/components/admin/deal-fields';
import AddMoneyForm, { MoneyInput } from '@/components/admin/money-form';
import {
  saveDealAction, deleteDealAction, escalateAction,
  saveContactAction, touchContactAction, deleteContactAction,
  saveYearAction, updateYearAction, deleteYearAction, moveStageAction,
} from '../actions';

export const dynamic = 'force-dynamic';

const ROLES = {
  primary: 'Primary',
  alpha: 'Alpha',
  contact: 'Contact',
};

const usd = (n) => (n === null || n === undefined ? '—' : `$${n.toLocaleString('en-US')}`);

const daysSince = (value) => Math.floor((Date.now() - new Date(value).getTime()) / 86400000);

function ago(value) {
  if (!value) return null;
  const days = daysSince(value);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export async function generateMetadata({ params }) {
  const deal = await getDeal(params.id);
  return { title: deal ? `${deal.company} — ATHLOS pipeline` : 'Pipeline — ATHLOS admin' };
}

export default async function DealPage({ params, searchParams }) {
  const session = await currentUser();
  const deal = await getDeal(params.id);
  if (!deal) notFound();

  const [me, contacts, years, events, conflicts, owners] = await Promise.all([
    session ? getUserById(session.id) : null,
    listContacts(deal.id),
    listYears(deal.id),
    listDealEvents(deal.id),
    conflictsFor(deal.id),
    dealOwners(),
  ]);

  const nextYear = new Date().getUTCFullYear() + 1;

  return (
    <div className="dash pl-page">
      <AccountBar email={me?.email} role={me?.role} avatarUrl={me?.avatarUrl}
        name={[me?.firstName, me?.lastName].filter(Boolean).join(' ')} />
      <AdminTabs isSuper={Boolean(me?.isSuper && !me.disabled)} />

      <div className="dash-wrap">
        {/* Above the title, not opposite it. On every other admin page that
            right-hand slot holds a stat, so a nav control sitting there reads
            as metadata. */}
        <div className="dash-head pl-detail-head">
          <div>
            <Link className="pl-back" href="/admin/pipeline">← Pipeline</Link>
            <h1 className="dash-title">{deal.company}</h1>
          </div>
        </div>

        {searchParams?.error && <p className="dash-error">{searchParams.error}</p>}
        {searchParams?.saved === '0' && <p className="pl-dim">Nothing had changed, so nothing was saved.</p>}

        {/* Stage as five buttons rather than a select: one click to move a
            deal, and no client JavaScript to make a select submit. */}
        <div className="at-tabs pl-stage-strip">
          <form action={moveStageAction}>
            <input type="hidden" name="id" value={deal.id} />
            <input type="hidden" name="stage" value="" />
            <button className={`dash-btn ${deal.stage ? 'dash-btn-ghost' : 'dash-btn-ink'} tip`}
              type="submit" disabled={!deal.stage}
              data-tip="Clears the stage. Where a company sits before anyone has worked it.">
              No stage
            </button>
          </form>
          <span className="pl-stage-split" aria-hidden="true" />
          {STAGES.map((s) => (
            <form action={moveStageAction} key={s.key}>
              <input type="hidden" name="id" value={deal.id} />
              <input type="hidden" name="stage" value={s.key} />
              <button className={`dash-btn ${deal.stage === s.key ? 'dash-btn-ink' : 'dash-btn-ghost'}`}
                type="submit" disabled={deal.stage === s.key}>{s.label}</button>
            </form>
          ))}

          {/* Outcomes, not steps — kept visually apart so a stage move does
              not put Lost next to Terms as if it were the next one along. */}
          <span className="pl-stage-split" aria-hidden="true" />
          {CLOSED_STAGES.map((c) => (
            <form action={moveStageAction} key={c.key}>
              <input type="hidden" name="id" value={deal.id} />
              <input type="hidden" name="stage" value={c.key} />
              <button className={`dash-btn ${deal.stage === c.key ? 'dash-btn-ink' : 'dash-btn-ghost'} tip`}
                type="submit" disabled={deal.stage === c.key} data-tip={c.hint}>{c.label}</button>
            </form>
          ))}

          <div className="dash-actions-spacer" />

          <form action={escalateAction}>
            <input type="hidden" name="id" value={deal.id} />
            <input type="hidden" name="on" value={deal.escalated ? '0' : '1'} />
            {!deal.escalated && (
              <input className="dash-input pl-flag-note" name="note" maxLength={200}
                placeholder="Why does Alexis need to step in?" />
            )}
            <button className={`dash-btn ${deal.escalated ? 'dash-btn-danger' : 'dash-btn-ghost'} tip tip-end`}
              type="submit"
              data-tip={deal.escalated
                ? 'Clears the flag and takes this off the Needs Alexis list.'
                : 'Puts this on the Needs Alexis list so he knows to nudge the alpha personally.'}>
              {deal.escalated ? 'Clear flag' : 'Needs Alexis'}
            </button>
          </form>
        </div>

        {deal.escalated && (
          <p className="pl-banner pl-banner-flag">
            Flagged for Alexis{deal.escalatedNote ? ` — ${deal.escalatedNote}` : ''}
          </p>
        )}

        {conflicts.length > 0 && (
          <p className="pl-banner pl-banner-warn">
            Exclusivity: {conflicts.length === 1 ? 'another deal is' : `${conflicts.length} other deals are`} in{' '}
            <strong>{deal.category}</strong> and already at Terms or better —{' '}
            {conflicts.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ', '}
                <Link href={`/admin/pipeline/${c.id}`}>{c.company} ({c.stageLabel})</Link>
              </span>
            ))}.
          </p>
        )}

        <div className="pl-cols">
          <div>
            <div className="dash-card pl-card">
              <h2 className="pl-card-title">The deal</h2>
              <form action={saveDealAction}>
                <input type="hidden" name="id" value={deal.id} />
                <DealFields deal={deal} owners={owners} />
                <div className="pl-save">
                  <div className="dash-actions-spacer" />
                  <button className="dash-btn dash-btn-ink" type="submit">Save</button>
                </div>
              </form>

              {/* Outside the save form: a nested <form> is invalid HTML and the
                  delete would submit the edit instead. */}
              <form className="pl-danger" action={deleteDealAction}>
                <input type="hidden" name="id" value={deal.id} />
                <button className="pl-danger-btn tip" type="submit"
                  data-tip="Deletes the deal, its contacts, its money and its history. There is no undo.">
                  Delete this deal
                </button>
              </form>
            </div>

            {/* Named so the save and delete redirects can land back here
                rather than at the top of the page. */}
            <div className="dash-card pl-card" id="money">
              <h2 className="pl-card-title">Money</h2>
              {years.length === 0 && <p className="pl-dim">No numbers yet.</p>}
              {years.length > 0 && (
                <div className="pl-years">
                  {years.map((y, i) => {
                    /* Grouped under one year label: six rows all reading 2025
                       is noise, not information. */
                    const sameYear = i > 0 && years[i - 1].year === y.year;
                    if (String(searchParams?.edit) === String(y.id)) {
                      return (
                        <form className="pl-year-edit" action={updateYearAction} key={y.id}>
                          <input type="hidden" name="dealId" value={deal.id} />
                          <input type="hidden" name="id" value={y.id} />
                          <input className="dash-input" type="number" name="year" min={2020} max={2040}
                            defaultValue={y.year} aria-label="Season" />
                          <MoneyInput defaultValue={y.amount ?? ''} />
                          <select className="dash-input" name="kind" defaultValue={y.kind} aria-label="What the money is">
                            {MONEY_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                          </select>
                          <select className="dash-input" name="guaranteed" defaultValue={y.guaranteed ? '1' : '0'}
                            aria-label="Guaranteed or optioned">
                            <option value="1">Guaranteed</option>
                            <option value="0">Optioned</option>
                          </select>
                          <button className="dash-btn dash-btn-ink" type="submit">Save</button>
                          <Link className="pl-year-cancel" scroll={false}
                            href={`/admin/pipeline/${deal.id}`}>Cancel</Link>
                          <input className="dash-input pl-year-note-input" name="note" maxLength={300}
                            defaultValue={y.note} placeholder="What it was — free water, shelf ads, a content shoot…"
                            aria-label="What this was" />
                        </form>
                      );
                    }
                    return (
                      <div className={`pl-year ${sameYear ? 'is-same-year' : ''}`} key={y.id}>
                        <span className="pl-year-n">{sameYear ? '' : y.year}</span>
                        <span className="pl-year-amt">{usd(y.amount)}</span>
                        <span className={`dash-tag pl-kind pl-kind-${y.kind}`}>{y.kindLabel}</span>
                        <span className={`dash-tag ${y.guaranteed ? 'pl-tag-won' : 'pl-tag-engaged'}`}>
                          {y.guaranteed ? 'Guaranteed' : 'Optioned'}
                        </span>
                        {y.note && <span className="pl-year-note">{y.note}</span>}
                        <Link className="pl-year-edit-btn pl-year-del tip tip-end" scroll={false}
                          href={`/admin/pipeline/${deal.id}?edit=${y.id}`}
                          data-tip="Edit this line, or delete it from there." aria-label="Edit this line">
                          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"
                            fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
                            <path d="M11.3 1.9l2.8 2.8L5.4 13.4l-3.5.7.7-3.5z" />
                          </svg>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}

              {years.some((y) => String(searchParams?.edit) === String(y.id)) && (
                <form className="pl-year-delete-row" action={deleteYearAction}>
                  <input type="hidden" name="dealId" value={deal.id} />
                  <input type="hidden" name="id" value={searchParams.edit} />
                  <button className="pl-danger-btn tip" type="submit"
                    data-tip="Removes this line. The deal and its other seasons stay.">
                    Delete this line
                  </button>
                </form>
              )}

              {years.length > 0 && (
                <div className="pl-year-total">
                  {MONEY_KINDS.map((k) => {
                    const sum = years.filter((y) => y.kind === k.key)
                      .reduce((n, y) => n + (y.amount || 0), 0);
                    return sum ? <span key={k.key}>{k.short} {usd(sum)}</span> : null;
                  })}
                </div>
              )}

              {!years.some((y) => String(searchParams?.edit) === String(y.id)) && (
                <AddMoneyForm dealId={deal.id} kinds={MONEY_KINDS} nextYear={nextYear}
                  action={saveYearAction} />
              )}
            </div>
          </div>

          <div>
            <div className="dash-card pl-card" id="people">
              <h2 className="pl-card-title">People</h2>
              {contacts.length === 0 && <p className="pl-dim">Nobody on this one yet.</p>}

              {contacts.map((c) => (
                <div className={`pl-person pl-person-${c.role}`} key={c.id}>
                  <div className="pl-person-head">
                    <strong>{c.name}</strong>
                    <span className={`dash-tag pl-role pl-role-${c.role}`}>{ROLES[c.role]}</span>
                    <div className="dash-actions-spacer" />
                    <form action={touchContactAction}>
                      <input type="hidden" name="dealId" value={deal.id} />
                      <input type="hidden" name="id" value={c.id} />
                      <button className="dash-btn dash-btn-ghost pl-mini tip tip-end" type="submit"
                        data-tip="Records that you spoke to them today, so the stalest contact stays obvious.">
                        Touched
                      </button>
                    </form>
                    <form action={deleteContactAction}>
                      <input type="hidden" name="dealId" value={deal.id} />
                      <input type="hidden" name="id" value={c.id} />
                      <button className="pl-x tip tip-end" type="submit"
                        data-tip="Removes this person from the deal.">✕</button>
                    </form>
                  </div>
                  <div className="pl-person-meta">
                    {c.title && <span>{c.title}</span>}
                    {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                    {/* Never-touched is where every imported contact starts,
                        so it stays quiet. Magenta is for someone we were
                        talking to and then stopped. */}
                    <span className={c.lastTouchedAt && daysSince(c.lastTouchedAt) > 60 ? 'pl-stale' : ''}>
                      {c.lastTouchedAt ? `last touched ${ago(c.lastTouchedAt)}` : 'never touched'}
                    </span>
                  </div>
                  {c.notes && <p className="pl-person-note">{c.notes}</p>}
                </div>
              ))}

              <form className="pl-person-add" action={saveContactAction}>
                <input type="hidden" name="dealId" value={deal.id} />
                <input className="dash-input" name="name" placeholder="Name" required maxLength={120} />
                <input className="dash-input" name="email" type="email" placeholder="Email (optional)" maxLength={200} />
                <input className="dash-input" name="title" placeholder="Title (optional)" maxLength={120} />
                <select className="dash-input" name="role" defaultValue="contact" aria-label="Role">
                  <option value="contact">Contact</option>
                  <option value="primary">Primary</option>
                  <option value="alpha">Alpha — blesses the deal</option>
                </select>
                <button className="dash-btn dash-btn-ghost" type="submit">Add person</button>
              </form>
            </div>

            <div className="dash-card pl-card">
              <h2 className="pl-card-title">History</h2>
              <ul className="pl-feed">
                {events.map((e) => (
                  <li key={e.id}>
                    {e.field ? `${e.field}: ` : ''}
                    {e.oldValue ? <s>{e.oldValue}</s> : null}
                    {e.oldValue ? ' → ' : ''}
                    {e.newValue || e.kind}
                    <em> {e.who} · {ago(e.createdAt)}</em>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
