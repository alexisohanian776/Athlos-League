'use client';

import { useRef } from 'react';
import PhotoCrop, { initials } from './photo-crop';

/* Holographic post card: pointer position drives the 3D tilt and the
   cursor-tracked foil and glare. */
export default function PostCard({ post: p }) {
  const el = useRef(null);
  const raf = useRef(0);
  const isTeam = p.source === 'ATHLOS team';

  const onMove = (e) => {
    const node = el.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      node.style.setProperty('--ry', `${(px - 0.5) * 16}deg`);
      node.style.setProperty('--rx', `${-(py - 0.5) * 16}deg`);
      node.style.setProperty('--mx', `${px * 100}%`);
      node.style.setProperty('--my', `${py * 100}%`);
    });
  };

  const onLeave = () => {
    const node = el.current;
    if (!node) return;
    cancelAnimationFrame(raf.current);
    node.style.setProperty('--ry', '0deg');
    node.style.setProperty('--rx', '0deg');
    node.style.setProperty('--mx', '50%');
    node.style.setProperty('--my', '50%');
  };

  return (
    <a href="#" className="card-scene" aria-label={`${p.athlete} — ${p.cat}`}>
      <div ref={el} className="tcard" onPointerMove={onMove} onPointerLeave={onLeave}>
        <PhotoCrop
          tone={p.tone}
          mono={initials(p.athlete)}
          monoSize={170}
          className="tcard-photo"
          style={{ position: 'absolute', inset: 0 }}
        />
        <div className="tcard-shade" />
        <div className="tcard-holo" />
        <div className="tcard-glare" />
        <div className="tcard-frame" />

        <div className="tcard-top">
          <span className={`tcard-source ${isTeam ? 'is-team' : ''}`}>{p.source}</span>
          <span className="tcard-time lg-mono-data">{p.time}</span>
        </div>

        <span className="tcard-cat">{p.cat}</span>

        <div className="tcard-body">
          <div className="tcard-byline">
            <span className="tcard-name">{p.athlete}</span>
            {!isTeam && <span className="tcard-handle lg-mono">{p.handle}</span>}
          </div>
          <p className="tcard-caption lg-serif">{p.body}</p>
          <span className="tcard-view lg-mono">
            {isTeam ? 'ATHLOS original' : `View on ${p.source} →`}
          </span>
        </div>
      </div>
    </a>
  );
}
