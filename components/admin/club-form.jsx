const TONES = ['ph-wine', 'ph-plum', 'ph-ember', 'ph-field', 'ph-dusk', 'ph-clay'];

/* One form shape for both add and edit. `club` is null when adding. */
export default function ClubForm({ club, action, submitLabel }) {
  const v = club || {};
  return (
    <form action={action}>
      {club && <input type="hidden" name="id" value={club.id} />}
      <div className="ad-grid">
        <Field label="Club name" name="name" defaultValue={v.name} wide required />
        <Field label="City" name="city" defaultValue={v.city} required />
        <Field label="Neighbourhood" name="hood" defaultValue={v.hood} />

        <Select label="Type" name="type" defaultValue={v.type || 'Official'} options={['Official', 'Partner']} />
        <Select label="Region" name="region" defaultValue={v.region || 'North America'} options={['North America', 'Europe']} />
        <Field label="Country code" name="code" defaultValue={v.code || 'USA'} maxLength={3} />
        <Field label="Founded" name="founded" defaultValue={v.founded} maxLength={4} />

        <Field label="Organizer" name="organizer" defaultValue={v.organizer} />
        <Field label="Members" name="members" defaultValue={v.members ?? 0} type="number" />
        <Field label="Next run" name="next" defaultValue={v.next} placeholder="Sat 9:00 AM" />
        <Select label="Duotone" name="tone" defaultValue={v.tone || 'ph-wine'} options={TONES} />

        <Field label="Map X %" name="mapX" defaultValue={v.mapX ?? ''} type="number" step="0.1" />
        <Field label="Map Y %" name="mapY" defaultValue={v.mapY ?? ''} type="number" step="0.1" />
        <Field label="Photo URL" name="photo" defaultValue={v.photo} wide placeholder="Blob URL — optional" />
      </div>
      <div className="ad-actions">
        <button className="ad-btn ad-btn-ink" type="submit">{submitLabel}</button>
        <p className="ad-hint">Map X/Y are percentages across the locator map.</p>
      </div>
    </form>
  );
}

function Field({ label, name, wide, ...rest }) {
  return (
    <label className={`ad-field ${wide ? 'is-wide' : ''}`}>
      <span className="ad-label">{label}</span>
      <input className="ad-input" name={name} {...rest} defaultValue={rest.defaultValue ?? ''} />
    </label>
  );
}

function Select({ label, name, defaultValue, options }) {
  return (
    <label className="ad-field">
      <span className="ad-label">{label}</span>
      <select className="ad-select" name={name} defaultValue={defaultValue}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
