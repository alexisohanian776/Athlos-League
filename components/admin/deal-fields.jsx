/* The shared body of the add and edit forms. Two real call sites, so this is
   reuse rather than an abstraction invented ahead of need. */
import { STAGES, CLOSED_STAGES, PROSPECT_STAGE } from '@/lib/deals-db';

export default function DealFields({ deal = null, owners = [], deals = [] }) {
  return (
    <>
      <div className="pl-grid">
        <label className="pl-field">
          <span className="dash-label">Company</span>
          <input className="dash-input" name="company" defaultValue={deal?.company || ''} required maxLength={120} />
        </label>

        <label className="pl-field">
          <span className="dash-label">Deal name</span>
          <input className="dash-input" name="name" defaultValue={deal?.name || ''} maxLength={160}
            placeholder="Leave blank to match the company" />
        </label>

        <label className="pl-field">
          <span className="dash-label">Stage</span>
          <select className="dash-input" name="stage" defaultValue={deal?.stage || 'engaged'}>
            {/* Grouped so the closed stages read as outcomes rather than as
                two more steps after Closed Won. */}
            <optgroup label="In the funnel">
              {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </optgroup>
            <optgroup label="Off the funnel">
              <option value={PROSPECT_STAGE.key}>{PROSPECT_STAGE.label}</option>
              {CLOSED_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </optgroup>
          </select>
        </label>

        <label className="pl-field">
          <span className="dash-label">Sales lead</span>
          {/* A list, not a select: most leads have no account here, and a new
              name has to be typeable. */}
          <input className="dash-input" name="ownerName" defaultValue={deal?.ownerName || ''}
            list="pl-owners" maxLength={80} />
          <datalist id="pl-owners">
            {owners.map((o) => <option key={o.name} value={o.name} />)}
          </datalist>
        </label>

        <label className="pl-field">
          <span className="dash-label">Category</span>
          <input className="dash-input" name="category" defaultValue={deal?.category || ''} maxLength={120}
            placeholder="Beverage - Water" />
        </label>

        {deal && (
          <label className="pl-field">
            <span className="dash-label">Last touchpoint</span>
            <input className="dash-input" type="date" name="lastTouchpoint"
              defaultValue={deal?.lastTouchpoint || ''} />
          </label>
        )}
      </div>

      {deal && (
        <>
          <div className="pl-grid">
            <label className="pl-field">
              <span className="dash-label">Status</span>
              <input className="dash-input" name="statusNote" defaultValue={deal.statusNote} maxLength={200} />
            </label>

            <label className="pl-field">
              <span className="dash-label">Renewal of</span>
              <select className="dash-input" name="parentDealId" defaultValue={deal.parentDealId || ''}>
                <option value="">—</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.stageLabel})</option>
                ))}
              </select>
            </label>
          </div>

          <label className="pl-field">
            <span className="dash-label">Next meeting / steps</span>
            <textarea className="dash-input" name="nextSteps" rows={2} defaultValue={deal.nextSteps} maxLength={2000} />
          </label>
        </>
      )}

      <label className="pl-field">
        <span className="dash-label">Notes</span>
        <textarea className="dash-input" name="notes" rows={deal ? 4 : 2} defaultValue={deal?.notes || ''}
          maxLength={4000} placeholder="Exclusivity flags go here — typing ESSENTIA CONFLICT keeps it findable by search." />
      </label>
    </>
  );
}
