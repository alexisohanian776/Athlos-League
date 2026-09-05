import Link from 'next/link';
import AccountBar from '@/components/account/account-bar';
import Stub from '@/components/stub';
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

function MeetForm({ meet, action, submitLabel }) {
  return (
    <form action={action}>
      {meet && <input type="hidden" name="id" value={meet.id} />}
      <div className="dash-grid">
        {!meet && <Field label="Slug" name="slug" placeholder="2027-london" hint="Used in URLs. Cannot be changed later." />}
        <Field label="Name" name="name" defaultValue={meet?.name} placeholder="ATHLOS London 2026" wide />
        <Field label="Date" name="heldOn" defaultValue={meet?.heldOn} placeholder="2026-09-18" hint="YYYY-MM-DD" />
        <Field label="Year" name="year" defaultValue={meet?.year} placeholder="2026" />
        <Field label="Venue" name="venue" defaultValue={meet?.venue} placeholder="Stone X Stadium" />
        <Field label="Area" name="area" defaultValue={meet?.area} placeholder="Hendon, London" />
        <Field label="City" name="city" defaultValue={meet?.city} placeholder="London" />
        <Field label="Country" name="country" defaultValue={meet?.country} placeholder="GBR" />
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

        <Field label="Photo URL" name="photoUrl" defaultValue={meet?.photoUrl} placeholder="Image URL — optional" wide />

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
      <div className="dash-wrap">
        <div className="dash-head">
          <h1 className="dash-title">Meets</h1>
          <span className="dash-count">
            {meets.length} meets · {meets.reduce((n, m) => n + (m.verifiedCount || 0), 0)} verified attendees
          </span>
        </div>

        <p className="dash-hint" style={{ marginBottom: 20 }}>
          <Link href="/admin" className="dash-btn dash-btn-ghost">← Run clubs</Link>{' '}
          <Link href="/admin/attendance" className="dash-btn dash-btn-ghost">Attendance queue</Link>
        </p>

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

            <div className="mt-split">
              <div className="mt-form"><MeetForm meet={meet} action={updateMeetAction} submitLabel="Save meet" /></div>
              <div className="mt-preview">
                <div className="dash-label" style={{ marginBottom: 10 }}>Stub preview</div>
                <Stub meet={meet} holder="Fan name" holderId={0} compact />
              </div>
            </div>

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
