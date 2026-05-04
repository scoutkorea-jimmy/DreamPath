// Scholarships.jsx — placeholder page; content owner will fill in via admin.
function Scholarships({ go, lang, c }) {
  const isKo = lang === 'ko';
  const s = (c && c.scholarships) || {};
  const hero = (s.hero && s.hero[lang]) || {};
  const items = s.items || [];

  return (
    <div data-screen-label="Scholarships">
      <div className="phead">
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
