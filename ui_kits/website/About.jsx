// About.jsx — content-driven via c.about
function About({ lang, c }) {
  const isKo = lang === 'ko';
  const a = (c && c.about) || {};
  const hero = (a.hero && a.hero[lang]) || {};
  const mission = (a.mission && a.mission[lang]) || {};
  const team = (a.team && a.team[lang]) || {};
  const cards = (a.team && a.team.cards) || [];

  return (
    <div data-screen-label="About">
      <div className="phead">
        <div className="inner">
          <div className="sec-kicker">{hero.kicker}</div>
          <h1 className={isKo ? '' : 'en'}>
            {hero.title_l1}{hero.title_l2 ? <>{'\n'}<br/>{hero.title_l2}</> : null}
          </h1>
          <p>{hero.sub}</p>
        </div>
      </div>

      <section className="section">
        <div className="container-narrow">
          <div className="sec-kicker">{mission.kicker}</div>
          <h2 className={'sec-title' + (isKo ? '' : ' en')}>
            {mission.title_l1}{mission.title_l2 ? <><br/>{mission.title_l2}</> : null}
          </h2>
          <p style={{fontSize:18,color:'var(--fg-secondary)',lineHeight:1.7,marginTop:32}}>
            {mission.body}
          </p>
        </div>
      </section>

      <section className="section" style={{background:'var(--bg-muted)'}}>
        <div className="container">
          <div className="sec-kicker">{team.kicker}</div>
          <h2 className={'sec-title' + (isKo ? '' : ' en')}>
            {team.title_l1}{team.title_l2 ? <><br/>{team.title_l2}</> : null}
          </h2>
          <p className="sec-sub">{team.sub}</p>
          <div className="team-grid">
            {cards.map((card, i) => (
              <div className="team-card" key={i}>
                <div className="team-role">{isKo ? card.role_ko : card.role_en}</div>
                <div className="team-name">{isKo ? card.name_ko : card.name_en}</div>
                <p className="team-desc">{isKo ? card.desc_ko : card.desc_en}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
window.About = About;
