import Link from 'next/link';
import AccountBar from '@/components/account/account-bar';
import AdminTabs from '@/components/admin/admin-tabs';
import StubPhotoPicker from '@/components/admin/stub-photo-picker';
import { CITIES } from '@/lib/cities';
import { CityPicker, HeadlineField, TonePicker, WeatherField } from '@/components/admin/meet-fields';
import { headlineFor } from '@/lib/meet-copy';
import DeleteClubButton from '@/components/admin/delete-club-button';
import { currentUser } from '@/lib/current-user';
import { getUserById } from '@/lib/users-db';
import { listMeets } from '@/lib/meets-db';
import { createMeetAction, deleteMeetAction, updateMeetAction } from './actions';

export const metadata = { title: 'Meets — ATHLOS admin' };
export const dynamic = 'force-dynamic';

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
const BLANK = { slug: '', name: 'New meet', year: '', heldOn: null, venue: '',
  tone: 'ph-wine', attendance: null, photoUrl: null };

function MeetForm({ meet, action, submitLabel, suggestion }) {
  return (
    <form action={action} data-meet={meet?.slug || 'new'}>
      {meet && <input type="hidden" name="id" value={meet.id} />}
      <div className="mt-split">
      <div className="mt-form">
      <div className="dash-grid">
        {!meet && <Field label="Slug" name="slug" placeholder="2027-london" hint="Used in URLs. Cannot be changed later." />}
        <Field label="Name" name="name" defaultValue={meet?.name} placeholder="ATHLOS London 2026" wide />
        <Field label="Date" name="heldOn" defaultValue={meet?.heldOn} type="date"
          hint="The year on the stub comes from this" />
        <Field label="Venue" name="venue" defaultValue={meet?.venue} placeholder="Stone X Stadium" />

        <CityPicker cities={CITIES}
          initial={[meet?.city, meet?.country].filter(Boolean).join(', ')} />
        <Field label="Attendance" name="attendance" type="number" defaultValue={meet?.attendance ?? ''}
          hint="Shown on the stub" />
        <Field label="Events" name="events" type="number" defaultValue={meet?.events ?? ''} />

        <TonePicker initial={meet?.tone || 'ph-wine'} />


        <HeadlineField initial={meet?.headline || ''} suggestion={suggestion} />

        <WeatherField initial={meet?.weather || ''} slug={meet?.slug} />
        <Field label="Prize purse" name="prizePurse" defaultValue={meet?.prizePurse}
          placeholder="$663,000" hint="Include the currency symbol" />

        <div className="dash-field">
          <span className="dash-label">Meet records</span>
          <div className="mt-derived">
            {meet ? (meet.meetRecords > 0 ? meet.meetRecords : 'None yet') : '—'}
          </div>
          <span className="dash-hint">Counted from the results. Not editable.</span>
        </div>

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
        <div className="dash-head">
          <h1 className="dash-title">Meets</h1>
          <span className="dash-count">
            {meets.length} meets · {meets.reduce((n, m) => n + (m.verifiedCount || 0), 0)} verified attendees
          </span>
        </div>


        <div className="dash-card dash-new">
          <div className="dash-card-head"><span className="dash-card-name">Add a meet</span></div>
          <MeetForm meet={null} action={createMeetAction} submitLabel="Add meet" suggestion="" />
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

            <MeetForm meet={meet} action={updateMeetAction} submitLabel="Save meet"
              suggestion={headlineFor(meet.year)} />

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
