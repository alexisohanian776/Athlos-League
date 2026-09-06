import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import LeagueNav from '@/components/league-nav';
import LeagueFooter from '@/components/league-footer';
import Stub from '@/components/stub';
import ProofField from '@/components/proof-field';
import { currentUser } from '@/lib/current-user';
import { getUserById } from '@/lib/users-db';
import { getMeet, myClaims } from '@/lib/meets-db';
import { claimAction } from './actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const meet = await getMeet(params.slug);
  return { title: meet ? `Were you at ${meet.name}? — ATHLOS` : 'Not found — ATHLOS' };
}

const STATUS = {
  sent: { tone: 'ok', text: 'Sent. The league reviews claims within 48 hours.' },
  noproof: { tone: 'err', text: 'Attach a photo first — that is the proof.' },
  badproof: { tone: 'err', text: 'That image did not upload properly. Try again.' },
};

export default async function VerifyPage({ params, searchParams }) {
  const meet = await getMeet(params.slug);
  if (!meet) notFound();

  const session = await currentUser();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/verify/${params.slug}`)}`);

  const me = await getUserById(session.id);
  if (!me) redirect(`/login?next=${encodeURIComponent(`/verify/${params.slug}`)}`);

  const claim = (await myClaims(me.id)).find((c) => c.meetId === meet.id);
  const message = STATUS[searchParams?.status];
  const name = [me.firstName, me.lastName].filter(Boolean).join(' ') || me.email;

  return (
    <div className="league">
      <LeagueNav />

      <section className="vf">
        <div className="vf-wrap">
          <div className="vf-main">
            <div className="lg-section-eyebrow">Were you there?</div>
            <h1 className="lg-display vf-title">{meet.name}</h1>
            <p className="lg-serif vf-sub">
              {[meet.venue, meet.area].filter(Boolean).join(' · ')}
            </p>

            {message && (
              <p className={message.tone === 'ok' ? 'vf-ok' : 'dash-error'}>{message.text}</p>
            )}

            {claim?.status === 'approved' ? (
              <div className="vf-state">
                <p className="lg-serif">
                  You are verified for this meet. The stub is on your profile.
                </p>
                {me.handle && (
                  <Link className="lg-btn lg-btn-ink" href={`/fans/${me.handle}`}>See my stubs →</Link>
                )}
              </div>
            ) : (
              <>
                {claim?.status === 'pending' && (
                  <p className="vf-note lg-mono">
                    A claim is already in the queue. Sending another photo replaces it.
                  </p>
                )}
                {claim?.status === 'rejected' && (
                  <p className="vf-note lg-mono">
                    Your last claim was not accepted. You can send a different photo.
                  </p>
                )}
                {!me.emailVerified && (
                  <p className="vf-note lg-mono">
                    Confirm your email as well — check your inbox. The league needs it before verifying you.
                  </p>
                )}

                <form action={claimAction} className="vf-form">
                  <input type="hidden" name="slug" value={meet.slug} />

                  <div className="au-field">
                    <label className="au-label" htmlFor="proof">Your proof</label>
                    <ProofField userId={me.id} />
                  </div>

                  <div className="au-field">
                    <label className="au-label" htmlFor="note">Anything to add? Optional</label>
                    <textarea className="dash-input dash-textarea" id="note" name="note" rows={3}
                      maxLength={500} placeholder="Where you sat, who you came with, what you remember." />
                  </div>

                  <button className="lg-btn lg-btn-red lg-btn-lg" type="submit">Send for verification</button>
                  <p className="vf-fine lg-mono">Reviewed within 48 hours. You will see the stub appear on your profile.</p>
                </form>
              </>
            )}
          </div>

          <aside className="vf-aside">
            <div className="lg-section-eyebrow" style={{ marginBottom: 14 }}>What you get</div>
            <Stub meet={meet} holder={name} holderId={me.id} />
          </aside>
        </div>
      </section>

      <LeagueFooter />
    </div>
  );
}
