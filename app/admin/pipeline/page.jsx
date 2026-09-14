import Link from 'next/link';
import AccountBar from '@/components/account/account-bar';
import AdminTabs from '@/components/admin/admin-tabs';
import { currentUser } from '@/lib/current-user';
import { getUserById } from '@/lib/users-db';
import {
  STAGES, listDeals, dealCounts, dealOwners, dealYearsInUse, recentDealEvents,
} from '@/lib/deals-db';
import DealFields from '@/components/admin/deal-fields';
import { addDealAction } from './actions';

export const metadata = { title: 'Pipeline — ATHLOS admin' };
export const dynamic = 'force-dynamic';

/* Whole dollars, abbreviated — a strip of $22,088,625 is unreadable. */
function money(n) {
  if (!n) return '$0';
  if (n >= 1000000) return `$${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function ago(value) {
  if (!value) return '';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export default async function PipelinePage({ searchParams }) {
  /* Every filter comes off the query string and is checked against an
     allow-list, so a hand-typed ?stage= cannot reach the query. */
  const stage = STAGES.some((s) => s.key === searchParams?.stage) ? searchParams.stage : 'all';
  const escalated = searchParams?.flagged === '1';
  const q = String(searchParams?.q || '').slice(0, 120);
  const owner = String(searchParams?.owner || 'all').slice(0, 80);
  const year = Number(searchParams?.year) || null;

  const session = await currentUser();
  const [me, deals, counts, owners, yearsInUse, events] = await Promise.all([
    session ? getUserById(session.id) : null,
    listDeals({ stage, q, owner, escalated, year }),
    dealCounts(year),
    dealOwners(),
    dealYearsInUse(),
    recentDealEvents(12),
  ]);

  /* Filters other than the one being changed have to survive the click. */
  const href = (patch) => {
    const p = new URLSearchParams();
    const next = { stage, q, owner, year, flagged: escalated ? '1' : '', ...patch };
    if (next.stage && next.stage !== 'all') p.set('stage', next.stage);
    if (next.q) p.set('q', next.q);
    if (next.owner && next.owner !== 'all') p.set('owner', next.owner);
    if (next.year) p.set('year', String(next.year));
    if (next.flagged === '1') p.set('flagged', '1');
    const s = p.toString();
    return s ? `/admin/pipeline?${s}` : '/admin/pipeline';
  };

  return (
    <div className="dash">
      <AccountBar email={me?.email} role={me?.role} avatarUrl={me?.avatarUrl}
        name={[me?.firstName, me?.lastName].filter(Boolean).join(' ')} />
      <AdminTabs isSuper={Boolean(me?.isSuper && !me.disabled)} />

      <div className="dash-wrap">
        <div className="dash-head">
          <h1 className="dash-title">Pipeline</h1>
          <span className="dash-count">
            {counts.total} deals · {counts.escalated} need Alexis
          </span>
        </div>

        {searchParams?.error && <p className="dash-error">{searchParams.error}</p>}

        <div className="mx-stats pl-stats">
          {STAGES.map((s) => (
            <Link key={s.key} href={href({ stage: stage === s.key ? 'all' : s.key })}
              className={`dash-card mx-stat pl-stat ${stage === s.key ? 'is-on' : ''}`}>
              <div className="mx-stat-label">{s.label}</div>
              <div className="mx-stat-value">{counts.byStage[s.key]}</div>
            </Link>
          ))}
          <div className="dash-card mx-stat pl-stat pl-stat-money">
            <div className="mx-stat-label">{year ? `${year} money` : 'All seasons'}</div>
            <div className="mx-stat-value">{money(counts.guaranteed)}</div>
            <div className="mx-stat-note">guaranteed · {money(counts.optioned)} optioned</div>
          </div>
        </div>

        <div className="pl-filters">
          {/* A plain GET form, so search works with no JavaScript at all. */}
          <form className="pl-search" method="get" action="/admin/pipeline">
            {stage !== 'all' && <input type="hidden" name="stage" value={stage} />}
            {owner !== 'all' && <input type="hidden" name="owner" value={owner} />}
            {year && <input type="hidden" name="year" value={year} />}
            {escalated && <input type="hidden" name="flagged" value="1" />}
            <input className="dash-input pl-search-input" type="search" name="q" defaultValue={q}
              placeholder="Company, contact, category or notes — try ESSENTIA" />
            <button className="dash-btn dash-btn-ghost" type="submit">Search</button>
          </form>

          <div className="at-tabs pl-pills">
            <Link className={`dash-btn ${escalated ? 'dash-btn-ink' : 'dash-btn-ghost'} tip`}
              data-tip="Deals someone has flagged for Alexis to nudge personally."
              href={href({ flagged: escalated ? '' : '1' })}>
              Needs Alexis ({counts.escalated})
            </Link>
            {yearsInUse.map((y) => (
              <Link key={y} className={`dash-btn ${year === y ? 'dash-btn-ink' : 'dash-btn-ghost'}`}
                href={href({ year: year === y ? null : y })}>{y}</Link>
            ))}
            {(stage !== 'all' || q || owner !== 'all' || year || escalated) && (
              <Link className="dash-btn dash-btn-ghost" href="/admin/pipeline">Clear</Link>
            )}
          </div>

          {owners.length > 0 && (
            <div className="at-tabs pl-pills">
              <span className="pl-pills-label">Lead</span>
              {owners.map((o) => (
                <Link key={o.name} className={`dash-btn ${owner === o.name ? 'dash-btn-ink' : 'dash-btn-ghost'}`}
                  href={href({ owner: owner === o.name ? 'all' : o.name })}>
                  {o.name} ({o.count})
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="dash-card mx-table">
          <div className="mx-row pl-row mx-row-head">
            <span>Deal</span>
            <span>Stage</span>
            <span>Lead</span>
            <span>Money</span>
            <span>Touched</span>
          </div>

          {deals.length === 0 && <div className="at-empty">No deals match that.</div>}

          {deals.map((d) => (
            <Link className={`mx-row pl-row pl-deal ${d.escalated ? 'is-flagged' : ''}`}
              key={d.id} href={`/admin/pipeline/${d.id}`}>
              <span className="mx-who">
                <strong className="pl-company">
                  {d.escalated && <span className="pl-flag tip" data-tip={d.escalatedNote || 'Flagged for Alexis'}>★</span>}
                  {d.company}
                </strong>
                <em>
                  {d.name !== d.company ? d.name : d.category || '—'}
                  {d.parentCompany && ` · renewal of ${d.parentCompany}`}
                </em>
              </span>
              <span><span className={`dash-tag pl-tag pl-tag-${d.stage}`}>{d.stageLabel}</span></span>
              <span className="pl-dim">{d.ownerName || '—'}</span>
              <span className="pl-money">
                {d.guaranteed ? money(d.guaranteed) : ''}
                {d.optioned ? <em className="pl-opt">{d.guaranteed ? ' + ' : ''}{money(d.optioned)}</em> : ''}
                {!d.guaranteed && !d.optioned ? '—' : ''}
              </span>
              <span className="pl-dim">{d.lastTouchpoint ? ago(d.lastTouchpoint) : '—'}</span>
            </Link>
          ))}
        </div>

        <div className="pl-cols">
          <div className="dash-card">
            <h2 className="dash-card-title">Add a deal</h2>
            <form action={addDealAction}>
              <DealFields owners={owners} />
              <div className="dash-actions">
                <div className="dash-actions-spacer" />
                <button className="dash-btn dash-btn-ink" type="submit">Add deal</button>
              </div>
            </form>
          </div>

          <div className="dash-card">
            <h2 className="dash-card-title">Recent changes</h2>
            {events.length === 0 && <p className="pl-dim">Nothing has changed since the import.</p>}
            <ul className="pl-feed">
              {events.map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/pipeline/${e.dealId}`}>{e.company}</Link>
                  {' — '}
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
  );
}
