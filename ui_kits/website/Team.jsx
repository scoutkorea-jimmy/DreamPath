// Team.jsx — project team page (linked from footer)
function Team({ go, lang, c }) {
  const isKo = lang === 'ko';
  const t = (c && c.project_team) || {};
  const hero = (t.hero && t.hero[lang]) || {};
  const sections = t.sections || [];
  const cta = (t.cta && t.cta[lang]) || {};

  return (
    <div data-screen-label="Project Team">
      <div className="phead">
        <div className="inner">
          <div className="sec-kicker">{hero.kicker}</div>
          <h1 className={isKo ? '' : 'en'}>
            {hero.title_l1}{hero.title_l2 ? <><br/>{hero.title_l2}</> : null}
          </h1>
          <p>{hero.sub}</p>
        </div>
      </div>

      {sections.map((s, si) => (
        <section key={si} className="section" style={si % 2 === 1 ? { background: 'var(--bg-muted)' } : null}>
          <div className="container">
            <div className="sec-kicker">{isKo ? s.kicker_ko : s.kicker_en}</div>
            <div className="team-page-grid">
              {(s.members || []).map((m, mi) => (
                <article key={mi} className="team-page-card">
                  <div className="team-page-photo" style={{backgroundImage: m.image ? `url(${m.image})` : 'none'}}>
                    {!m.image && (m.name || '?').charAt(0)}
                  </div>
                  <div className="team-page-body">
                    <div className="team-page-name">{isKo ? (m.name || m.name_en) : (m.name_en || m.name)}</div>
                    <div className="team-page-role">{isKo ? m.role_ko : m.role_en}</div>
                    <p className="team-page-bio">{isKo ? m.bio_ko : m.bio_en}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="section-tight">
        <div className="container-narrow">
          <div className="cta-banner" style={{padding:'56px 48px'}}>
            <div>
              <div className="sec-kicker" style={{color:'rgba(255,255,255,0.85)'}}>{cta.kicker}</div>
              <h2>{cta.title}</h2>
              <p>{cta.sub}</p>
            </div>
            <div className="btn-wrap">
              <a className="btn btn-lg btn-white" href={`mailto:${cta.email || 'info@koreadreampath.com'}`}>
                {cta.button} <i data-lucide="arrow-right" width="18" height="18" strokeWidth="2" aria-hidden="true"></i>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
window.Team = Team;
