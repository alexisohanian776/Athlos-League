import Link from 'next/link';
import AccountBar from '@/components/account/account-bar';
import AdminTabs from '@/components/admin/admin-tabs';
import StubPhotoPicker from '@/components/admin/stub-photo-picker';
import { CITIES } from '@/lib/cities';
import DeleteClubButton from '@/components/admin/delete-club-button';
import { currentUser } from '@/lib/current-user';
import { getUserById } from '@/lib/users-db';
import { listMeets } from '@/lib/meets-db';
import { createMeetAction, deleteMeetAction, updateMeetAction } from './actions';

export const metadata = { title: 'Meets — ATHLOS admin' };
export const dynamic = 'force-dynamic';

const TONES = ['ph-wine', 'ph-plum', 'ph-ember', 'ph-field', 'ph-dusk', 'ph-clay'];

const factsText = (facts) => (facts || []).map((f) => `${f.label}: ${f.value}`).join('\n');

function Field({ label, name, defaultValue, type = 'text', placeholder, wide, hint }) {
  return (
    <label className={`dash-field ${wide ? 'is-wide' : ''}`}>
      <span className="dash-label">{label}</span>
      <input className="dash-input" name={name} type={type} defaultValue={defaultValue ?? ''}
        placeholder={placeholder} />
      {hint && <span className="dash-hint">{hint}</span>}
    </label>
  );
}

/* A meet that does not exist yet still needs something to draw. */
const BLANK = { slug: '', name: 'New meet', year: '', heldOn: null, venue: '', area: '',
  tone: 'ph-wine', facts: [], attendance: null, photoUrl: null };

function MeetForm({ meet, action, submitLabel }) {
  return (
    <form action={action}>
      {meet && <input type="hidden" name="id" value={meet.id} />}
      <div className="mt-split">
      <div className="mt-form">
      <div className="dash-grid">
        {!meet && <Field label="Slug" name="slug" placeholder="2027-london" hint="Used in URLs. Cannot be changed later." />}
        <Field label="Name" name="name" defaultValue={meet?.name} placeholder="ATHLOS London 2026" wide />
        <Field label="Date" name="heldOn" defaultValue={meet?.heldOn} type="date"
          hint="The year on the stub comes from this" />
        <Field label="Venue" name="venue" defaultValue={meet?.venue} placeholder="Stone X Stadium" />

        <label className="dash-field is-wide">
          <span className="dash-label">Location</span>
          <input className="dash-input" name="location" list="mt-cities"
            defaultValue={[meet?.city, meet?.country].filter(Boolean).join(', ')}
            placeholder="London, United Kingdom" />
          <span className="dash-hint">Start typing a city — or write your own.</span>
        </label>
        <Field label="Attendance" name="attendance" type="number" defaultValue={meet?.attendance ?? ''}
          hint="Shown on the stub" />
        <Field label="Capacity" name="capacity" type="number" defaultValue={meet?.capacity ?? ''} />
        <Field label="Events" name="events" type="number" defaultValue={meet?.events ?? ''} />

        <label className="dash-field">
          <span className="dash-label">Duotone</span>
          <select className="dash-select" name="tone" defaultValue={meet?.tone || 'ph-wine'}>
            {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>


        <label className="dash-field is-wide">
          <span className="dash-label">Headline — one sentence on the stub</span>
          <input className="dash-input" name="headline" defaultValue={meet?.headline || ''}
            placeholder="Faith Kipyegon took the mile in 4:17.78 — a meet record." />
        </label>

        <label className="dash-field is-wide">
          <span className="dash-label">Fun facts — one per line, &ldquo;Label: Value&rdquo;</span>
          <textarea className="dash-input dash-textarea" name="facts" rows={5}
            defaultValue={factsText(meet?.facts)}
            placeholder={'Meet records: 3\nWeather: 62°F, clear\nPrize purse: $663,000'} />
          <span className="dash-hint">Up to eight. The stub shows the first four.</span>
        </label>

        <label className="dash-field mt-check">
          <span className="dash-label">Published</span>
          <input type="checkbox" name="published" defaultChecked={meet ? meet.published : true} />
        </label>
      </div>

      <div className="dash-actions">
        <button className="dash-btn dash-btn-ink" type="submit">{submitLabel}</button>
      </div>
      </div>
      <div className="mt-preview">
        <StubPhotoPicker meet={meet || BLANK} />
      </div>
      </div>
    </form>
  );
}

export default async function MeetsAdminPage() {
  const session = await currentUser();
  const [me, meets] = await Promise.all([
    session ? getUserById(session.id) : null,
    listMeets({ includeUnpublished: true }),
  ]);

  return (
    <div className="dash">
      <AccountBar email={me?.email} role={me?.role} avatarUrl={me?.avatarUrl}
        name={[me?.firstName, me?.lastName].filter(Boolean).join(' ')} />
      <AdminTabs isSuper={Boolean(me?.isSuper && !me.disabled)} />
      <div className="dash-wrap">
        {/* One list, shared by every form on the page. */}
        <datalist id="mt-cities">
          {CITIES.map((c) => <option key={c} value={c} />)}
        </datalist>

        <div className="dash-head">
          <h1 className="dash-title">Meets</h1>
          <span className="dash-count">
            {meets.length} meets · {meets.reduce((n, m) => n + (m.verifiedCount || 0), 0)} verified attendees
          </span>
        </div>


        <div className="dash-card dash-new">
          <div className="dash-card-head"><span className="dash-card-name">Add a meet</span></div>
          <MeetForm meet={null} action={createMeetAction} submitLabel="Add meet" />
        </div>

        {meets.map((meet) => (
          <div className="dash-card" key={meet.id}>
            <div className="dash-card-head">
              <span className="dash-card-name">{meet.name}</span>
              {!meet.published && <span className="dash-tag">draft</span>}
              <span className="dash-card-meta">/{meet.slug}</span>
              <div className="dash-card-spacer" />
              <span className="dash-card-meta">{meet.verifiedCount || 0} verified</span>
            </div>

            <MeetForm meet={meet} action={updateMeetAction} submitLabel="Save meet" />

            <form action={deleteMeetAction} className="dash-actions">
              <input type="hidden" name="id" value={meet.id} />
              <div className="dash-actions-spacer" />
              <DeleteClubButton name={meet.name} />
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
