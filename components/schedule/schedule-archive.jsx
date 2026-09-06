'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Avatar from '../avatar';
import MarkPill from '../mark-pill';
import { MEET_RESULTS } from '@/lib/results';
import { FAN_TONES } from '@/lib/schedule';
import { slugify } from '@/lib/slug';

/* Every athlete name links to its public profile route. Those pages are not
   built yet, so these currently 404 — same as the Athletes index cards. */
function AthleteLink({ name, className = '' }) {
  return (
    <Link
      href={`/athletes/${slugify(name)}`}
      className={`sc-alink ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {name}
    </Link>
  );
}

function FanStack({ fans = [], total, verified = 0, size = 32, onClaim }) {
  const avatars = fans.length > 0 && (
    <div className="sc-avatars">
      {fans.slice(0, 6).map((f, i) => (
        <div key={f.handle || f.name} className="sc-avatar-wrap" style={{ zIndex: 6 - i }}>
          {f.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="sc-avatar-img" src={f.avatarUrl} alt="" width={size} height={size} />
          ) : (
            <Avatar name={f.name} size={size} tone={FAN_TONES[i % FAN_TONES.length]} />
          )}
        </div>
      ))}
    </div>
  );

  /* Crowd size is what the league typed in admin; `verified` is how many
     people have actually proved they were there. They are different numbers
     and the label says which is which. */
  const headline = Number.isFinite(total) && total !== null
    ? `${total.toLocaleString('en-US')} in the stands`
    : verified > 0 ? `${verified} verified` : 'Be the first';

  if (onClaim) {
    return (
      <button type="button" className="sc-fanstack is-cta" onClick={(e) => { e.stopPropagation(); onClaim(); }}>
        {avatars}
        <span className="sc-fanstack-text">
          <span className="sc-fanstack-count lg-mono-data">{headline}</span>
          <span className="sc-fanstack-cta lg-mono">Become ATHLOS verified →</span>
        </span>
      </button>
    );
  }

  return (
    <div className="sc-fanstack">
      {avatars}
      <span className="sc-fanstack-count lg-mono-data">{headline}</span>
      {verified > 0 && <span className="lg-mono sc-fanstack-label">{verified} verified</span>}
    </div>
  );
}

function ResultsTable({ ev }) {
  const winnerMR = Boolean(ev.athletes[0]?.marks.includes('MR'));
  return (
    <div className="sc-ev">
      <div className="sc-ev-head">
        <span className="lg-display sc-ev-name">{ev.event}</span>
        {winnerMR && <MarkPill mark="MR" />}
      </div>
      <div className="sc-ev-rows">
        {ev.athletes.map((a) => (
          <div key={a.who} className={`sc-res ${a.place === '1' ? 'is-win' : ''}`}>
            <span className="lg-mono-data sc-res-place">{a.place}</span>
            <AthleteLink name={a.who} className="sc-res-who" />
            <span className="lg-mono sc-res-code">{a.code}</span>
            <span className="lg-mono-data sc-res-time">{a.time}</span>
            <span className="sc-res-marks">{a.marks.map((m) => <MarkPill key={m} mark={m} />)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* The headline marks used to be re-typed into schedule.js. They are just the
   meet records inside the results, so read them from there and the two can no
   longer drift apart. */
function marqueeFor(year) {
  return (MEET_RESULTS[year] || [])
    .flatMap((ev) => ev.athletes
      .filter((a) => a.marks?.includes('MR'))
      .map((a) => ({ who: a.who, ev: ev.event, mark: a.time, note: 'MR' })))
    .slice(0, 3);
}

function PastMeet({ meet: p, open, onToggle, onClaim }) {
  const results = MEET_RESULTS[p.year] || [];
  const marquee = marqueeFor(p.year);
  return (
    <div className={`sc-meet ${open ? 'is-open' : ''}`}>
      <button type="button" className="sc-meet-head" aria-expanded={open} onClick={onToggle}>
        <div className="sc-past-when">
          <span className="lg-display sc-past-year">{p.year}</span>
          <span className="lg-mono-data sc-past-date">{p.dateLabel}</span>
          <span className="lg-mono sc-past-venue">
            {[p.venue, p.area || [p.city, p.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
          </span>
        </div>
        <div className="sc-past-marquee">
          <div className="lg-mono sc-past-label">{p.events} events · Meet records</div>
          <div className="sc-past-marks">
            {marquee.map((w) => (
              <div key={w.who} className="sc-mark-row">
                <span className="sc-mark-who">{w.who}</span>
                <span className="lg-mono sc-mark-ev">{w.ev}</span>
                <span className="lg-mono-data sc-mark-time">{w.mark}</span>
                {w.note && <MarkPill mark={w.note} />}
              </div>
            ))}
          </div>
        </div>
        <div className="sc-past-go">
          <span className="sc-toggle lg-mono">
            {open ? 'Hide results' : 'View results'}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="sc-chev" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </div>
      </button>

      {open && (
        <div className="sc-meet-panel">
          <div className="sc-attend">
            <div className="sc-attend-left">
              <FanStack fans={p.fans} total={p.attendance} verified={p.verifiedCount} size={40} />
              <div className="sc-attend-copy">
                <div className="sc-attend-title">Were you in the stands?</div>
                <p className="lg-serif sc-attend-sub">
                  Get ATHLOS verified — create a free account (or sign in), send a
                  photo of your ticket or a selfie from the meet, and we&rsquo;ll pin
                  your badge to {p.name}.
                </p>
              </div>
            </div>
            <button type="button" className="lg-btn lg-btn-red lg-btn-lg" onClick={() => onClaim(p)}>
              Become ATHLOS verified →
            </button>
          </div>

          <div className="sc-results">
            {results.map((ev) => <ResultsTable key={ev.event} ev={ev} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function ClaimModal({ meet, onClose }) {
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!meet) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [meet, onClose]);

  if (!meet) return null;

  return (
    <div className="sc-modal-backdrop" onClick={onClose}>
      <div
        className="sc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sc-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="sc-modal-x" onClick={onClose} aria-label="Close">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="lg-section-eyebrow">Were you there?</div>
        <h3 className="lg-display sc-modal-title" id="sc-modal-title">Become<br />ATHLOS verified</h3>
        <p className="lg-serif sc-modal-intro">
          Prove you were at ATHLOS New York {meet.year} and we&rsquo;ll pin a verified
          attendance badge to your profile and this meet.
        </p>
        <ol className="sc-steps">
          <li>
            <span className="sc-step-n lg-mono-data">1</span>
            <div>
              <div className="sc-step-t">Sign in, or make a free account</div>
              <div className="lg-serif sc-step-d">It takes a minute and gives you a profile to collect stubs on.</div>
            </div>
          </li>
          <li>
            <span className="sc-step-n lg-mono-data">2</span>
            <div>
              <div className="sc-step-t">Upload your proof</div>
              <div className="lg-serif sc-step-d">
                A photo of your ticket, or a selfie from the stands. Straight off
                your phone is fine.
              </div>
            </div>
          </li>
          <li>
            <span className="sc-step-n lg-mono-data">3</span>
            <div>
              <div className="sc-step-t">We verify within 48 hours</div>
              <div className="lg-serif sc-step-d">
                Your ticket stub appears on your profile, keeping the date, the
                venue and the crowd that night.
              </div>
            </div>
          </li>
        </ol>
        <div className="sc-modal-form">
          <Link href={`/verify/${meet.slug}`} className="lg-btn lg-btn-red lg-btn-lg">
            Upload my proof →
          </Link>
          <p className="sc-modal-fine">
            You will be asked to sign in first if you are not already.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ScheduleArchive({ meets = [] }) {
  const [openYear, setOpenYear] = useState('2025');
  const [claim, setClaim] = useState(null);

  return (
    <>
      <section className="sc-archive">
        <div className="sc-archive-head">
          <div className="lg-section-eyebrow">The archive</div>
          <h2 className="lg-display sc-archive-title">Past meets</h2>
        </div>
        <div className="sc-past-list">
          {meets.map((p) => (
            <PastMeet
              key={p.slug}
              meet={p}
              open={openYear === p.year}
              onToggle={() => setOpenYear(openYear === p.year ? null : p.year)}
              onClaim={setClaim}
            />
          ))}
        </div>
      </section>
      <ClaimModal meet={claim} onClose={() => setClaim(null)} />
    </>
  );
}
