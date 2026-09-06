import Link from 'next/link';
import AccountBar from '@/components/account/account-bar';
import Avatar from '@/components/avatar';
import AvatarField from '@/components/account/avatar-field';
import FavouritesPicker from '@/components/account/favourites-picker';
import { listClubs } from '@/lib/clubs-db';
import { ALL_ATHLETES } from '@/lib/season-cards';
import { currentUser } from '@/lib/current-user';
import { getUserById } from '@/lib/users-db';
import { changePasswordAction, updateProfileAction } from './actions';

export const metadata = { title: 'Your account — ATHLOS' };
export const dynamic = 'force-dynamic';

/* Rendered on the server, like the sign-in form: the fields and the buttons
   are in the HTML rather than waiting on a client chunk. */
const MESSAGES = {
  ok:        { tone: 'ok',  text: 'Password changed. It applies the next time you sign in.' },
  wrong:     { tone: 'err', text: 'That current password is not right.' },
  mismatch:  { tone: 'err', text: 'The two new passwords do not match.' },
  weak:      { tone: 'err', text: 'Use at least 10 characters, with no leading or trailing space.' },
  saved:     { tone: 'ok',  text: 'Profile saved.' },
  bademail:  { tone: 'err', text: 'That does not look like an email address.' },
  taken:     { tone: 'err', text: 'Another account already uses that email.' },
  badimage:  { tone: 'err', text: 'Use a JPG, PNG, WEBP or GIF for your photo.' },
  handle:    { tone: 'err', text: 'That handle did not work.' },
};
const PROFILE_STATUS = ['saved', 'bademail', 'taken', 'badimage', 'handle'];

export default async function AccountPage({ searchParams }) {
  const session = await currentUser();
  const [user, clubs] = await Promise.all([
    session ? getUserById(session.id) : null,
    listClubs(),
  ]);
  const status = searchParams?.status;
  const message = status === 'handle'
    ? { tone: 'err', text: searchParams?.msg || 'That handle did not work.' }
    : MESSAGES[status];
  const onProfile = PROFILE_STATUS.includes(status);
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  const note = (show) =>
    show && message ? (
      <p className={message.tone === 'ok' ? 'ac-ok' : 'dash-error'}>{message.text}</p>
    ) : null;

  return (
    <div className="dash">
      <AccountBar email={user?.email} role={user?.role} clubName={user?.clubName}
        avatarUrl={user?.avatarUrl} name={fullName} />
      <div className="dash-wrap">
        <div className="dash-head">
          <h1 className="dash-title">Your account</h1>
          <span className="dash-count">{user?.title || user?.role}</span>
        </div>

        {/* Someone who skipped the first-run prompt has no public profile
            until they claim one, so say so rather than leaving it blank. */}
        {user && !user.handle && (
          <div className="dash-card ac-nudge">
            <div>
              <strong>You have not picked a handle yet.</strong>{' '}
              Without one there is no public profile to pin your ticket stubs to.
            </div>
            <Link className="dash-btn dash-btn-ink" href="/account/handle">Pick a handle</Link>
          </div>
        )}

        <div className="dash-card ac-card">
          <div className="dash-card-head">
            <span className="dash-card-name">Profile</span>
          </div>

          <div className="ac-body">
            {note(onProfile)}

            <form action={updateProfileAction} className="ac-form">
              <AvatarField
                userId={user?.id}
                initialUrl={user?.avatarUrl}
                fallback={<Avatar name={fullName || user?.email || '?'} size={72} tone="ph-plum" />}
              />

              <div className="ac-pair">
                <div className="au-field">
                  <label className="au-label" htmlFor="firstName">First name</label>
                  <input className="dash-input au-input" id="firstName" name="firstName" type="text"
                    defaultValue={user?.firstName || ''} placeholder="First name"
                    autoComplete="given-name" />
                </div>
                <div className="au-field">
                  <label className="au-label" htmlFor="lastName">Last name</label>
                  <input className="dash-input au-input" id="lastName" name="lastName" type="text"
                    defaultValue={user?.lastName || ''} placeholder="Last name"
                    autoComplete="family-name" />
                </div>
              </div>

              <div className="ac-pair">
                <div className="au-field">
                  <label className="au-label" htmlFor="handle">Profile handle</label>
                  <input className="dash-input au-input" id="handle" name="handle" type="text"
                    defaultValue={user?.handle || ''} placeholder="yourname"
                    minLength={3} maxLength={24} />
                  <p className="au-note">
                    {user?.handle ? (
                      <>
                        Your profile:{' '}
                        <a className="ac-profile-link" href={`/fans/${user.handle}`}
                          target="_blank" rel="noopener noreferrer">
                          athlosleague.com/fans/{user.handle} ↗
                        </a>
                      </>
                    ) : 'Not set yet — pick one above.'}
                  </p>
                </div>
                <div className="au-field">
                  <label className="au-label" htmlFor="city">City</label>
                  <input className="dash-input au-input" id="city" name="city" type="text"
                    defaultValue={user?.city || ''} placeholder="Brooklyn, NY" />
                </div>
              </div>

              <div className="au-field">
                <label className="au-label" htmlFor="email">Email address</label>
                <input className="dash-input au-input" id="email" name="email" type="email"
                  defaultValue={user?.email || ''} placeholder="you@example.com"
                  autoComplete="email" required />
                <p className="au-note">This is what you sign in with.</p>
              </div>

              <div className="au-field">
                <label className="au-label" htmlFor="bio">Bio</label>
                <textarea className="dash-input dash-textarea au-input" id="bio" name="bio" rows={3}
                  maxLength={280} defaultValue={user?.bio || ''}
                  placeholder="A line or two. Where you run, why you watch." />
              </div>

              <div className="ac-pair">
                <div className="au-field">
                  <label className="au-label" htmlFor="instagram">Instagram</label>
                  <input className="dash-input au-input" id="instagram" name="instagram" type="text"
                    defaultValue={user?.instagram || ''} placeholder="@handle" />
                </div>
                <div className="au-field">
                  <label className="au-label" htmlFor="strava">Strava</label>
                  <input className="dash-input au-input" id="strava" name="strava" type="text"
                    defaultValue={user?.strava || ''} placeholder="Profile link or id" />
                </div>
              </div>

              <div className="au-field">
                <label className="au-label" htmlFor="clubId">Run club</label>
                <select className="dash-input au-input" id="clubId" name="clubId"
                  defaultValue={user?.clubId ?? ''}>
                  <option value="">Not with a club</option>
                  {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="au-field">
                <span className="au-label">Your top five athletes</span>
                <p className="au-note">They appear on your profile as cards, in this order.</p>
                <FavouritesPicker athletes={ALL_ATHLETES} initial={user?.favourites || []} />
              </div>

              <button className="dash-btn dash-btn-ink au-submit" type="submit">Save profile</button>
            </form>
          </div>
        </div>

        <div className="dash-card ac-card">
          <div className="dash-card-head">
            <span className="dash-card-name">Change password</span>
          </div>

          <div className="ac-body">
            {note(!onProfile)}

            <form action={changePasswordAction} className="ac-form">
              <div className="au-field">
                <label className="au-label" htmlFor="current">Current password</label>
                <input className="dash-input au-input" id="current" name="current" type="password"
                  autoComplete="current-password" placeholder="Your current password" required />
              </div>
              <div className="au-field">
                <label className="au-label" htmlFor="next">New password</label>
                <input className="dash-input au-input" id="next" name="next" type="password"
                  autoComplete="new-password" placeholder="At least 10 characters" required />
              </div>
              <div className="au-field">
                <label className="au-label" htmlFor="confirm">Retype new password</label>
                <input className="dash-input au-input" id="confirm" name="confirm" type="password"
                  autoComplete="new-password" placeholder="Retype the new password" required />
              </div>
              <button className="dash-btn dash-btn-ink au-submit" type="submit">Change password</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
