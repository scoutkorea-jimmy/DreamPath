// Scholarships.jsx — placeholder page; content owner will fill in via admin.
function Scholarships({ go, lang, c }) {
  const isKo = lang === 'ko';
  const s = (c && c.scholarships) || {};
  // Hero copy: prefer unified page_heros.scholarships (admin → 페이지 헤더),
  // fall back to legacy c.scholarships.hero.
  const ph = ((c && c.page_heros && c.page_heros.scholarships && c.page_heros.scholarships[lang]) || {});
  const legacy = (s.hero && s.hero[lang]) || {};
  const hero = { kicker: ph.kicker || legacy.kicker, title_l1: ph.title_l1 || legacy.title_l1, title_l2: ph.title_l2 || legacy.title_l2, sub: ph.sub || legacy.sub };
  const hb = window.useHeroBg((c && c.page_heros && c.page_heros.scholarships) || {});
  const items = s.items || [];

  return (
    <div data-screen-label="Scholarships">
      <div className={('phead ' + hb.cls).trim()} style={hb.style}>
        <div className="inner">
          <div className="sec-kicker">{hero.kicker}</div>
          <h1 className={isKo ? '' : 'en'}>
            {hero.title_l1}{hero.title_l2 ? <><br/>{hero.title_l2}</> : null}
          </h1>
          <p>{hero.sub}</p>
        </div>
      </div>
      <section className="section">
        <div className="container">
          {items.length === 0 ? (
            <div style={{padding:'60px 24px',textAlign:'center',color:'var(--fg-muted)',background:'var(--bg-muted)',borderRadius:18}}>
              {isKo ? '곧 게시됩니다.' : 'Coming soon.'}
            </div>
          ) : (
            <div className="scholarship-grid">
              {items.map((it, i) => (
                <article key={it.id || i} className="scholarship-card" style={{'--c': it.color || 'var(--scouting-purple)'}}>
                  <div className="scholarship-stripe" />
                  <h3 className={isKo ? '' : 'en'}>{isKo ? it.title_ko : it.title_en}</h3>
                  <p>{isKo ? it.summary_ko : it.summary_en}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
window.Scholarships = Scholarships;
