const TONES = ['ph-wine', 'ph-plum', 'ph-ember', 'ph-field', 'ph-dusk', 'ph-clay'];

/* One form shape for both add and edit. `club` is null when adding. */
export default function ClubForm({ club, action, submitLabel, leaderView = false }) {
  const v = club || {};
  return (
    <form action={action}>
      {club && <input type="hidden" name="id" value={club.id} />}
      <div className="dash-grid">
        <Field label="Club name" name="name" defaultValue={v.name} wide required />
        <Field label="City" name="city" defaultValue={v.city} required />
        <Field label="Neighbourhood" name="hood" defaultValue={v.hood} />

        {!leaderView && (
          <>
            <Select label="Type" name="type" defaultValue={v.type || 'Official'} options={['Official', 'Partner']} />
            <Select label="Region" name="region" defaultValue={v.region || 'North America'} options={['North America', 'Europe']} />
            <Field label="Country code" name="code" defaultValue={v.code || 'USA'} maxLength={3} />
          </>
        )}
        <Field label="Founded" name="founded" defaultValue={v.founded} maxLength={4} />

        <Field label="Organizer" name="organizer" defaultValue={v.organizer} />
        <Field label="Members" name="members" defaultValue={v.members ?? 0} type="number" />
        <Field label="Next run" name="next" defaultValue={v.next} placeholder="Sat 9:00 AM" />
        <Select label="Duotone" name="tone" defaultValue={v.tone || 'ph-wine'} options={TONES} />

        {!leaderView && (
          <>
            <Field label="Map X %" name="mapX" defaultValue={v.mapX ?? ''} type="number" step="0.1" />
            <Field label="Map Y %" name="mapY" defaultValue={v.mapY ?? ''} type="number" step="0.1" />
          </>
        )}
        <Field label="Photo URL" name="photo" defaultValue={v.photo} wide placeholder="Image URL — optional" />
        <Field label="Website" name="website" defaultValue={v.website} placeholder="https://" />
        <Field label="Instagram" name="instagram" defaultValue={v.instagram} placeholder="@handle" />
        <label className="dash-field is-wide" style={{ gridColumn: '1 / -1' }}>
          <span className="dash-label">About — one paragraph per blank line</span>
          <textarea className="dash-input dash-textarea" name="about" rows={5} defaultValue={v.about ?? ''} />
        </label>
      </div>
      <div className="dash-actions">
        <button className="dash-btn dash-btn-ink" type="submit">{submitLabel}</button>
        <p className="dash-hint">
          {leaderView ? 'Changes go live on your public club page.' : 'Map X/Y are percentages across the locator map.'}
        </p>
      </div>
    </form>
  );
}

function Field({ label, name, wide, ...rest }) {
  return (
    <label className={`dash-field ${wide ? 'is-wide' : ''}`}>
      <span className="dash-label">{label}</span>
      <input className="dash-input" name={name} {...rest} defaultValue={rest.defaultValue ?? ''} />
    </label>
  );
}

function Select({ label, name, defaultValue, options }) {
  return (
    <label className="dash-field">
      <span className="dash-label">{label}</span>
      <select className="dash-select" name={name} defaultValue={defaultValue}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
