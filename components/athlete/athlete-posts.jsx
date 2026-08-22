import PostCard from '../post-card';

export default function AthletePosts({ first, posts }) {
  return (
    <section className="pf-sec pf-sec-dark">
      <div className="pf-sec-head">
        <div className="lg-section-eyebrow">Straight from her feed</div>
        <h2 className="lg-display pf-sec-title" style={{ color: '#fff' }}>Latest from {first}</h2>
      </div>
      <div className="pf-socials-grid">
        {posts.map((p, i) => <PostCard key={`${p.cat}-${i}`} post={p} />)}
      </div>
      <a href="#" className="lg-btn lg-btn-red">Follow {first} on Instagram →</a>
    </section>
  );
}
