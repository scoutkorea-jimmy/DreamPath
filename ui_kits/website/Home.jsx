// Home.jsx
function Home({ go, lang, c }) {
  const isKo = lang === 'ko';
  const t = { hero: c.hero[lang], how: c.how, programs: c.programs_section[lang], cta: c.cta_banner[lang] };
  return (
    <div>
      {/* HERO */}
      <section className="hero" data-screen-label="Hero" aria-labelledby="hero-title">
        <div className="hero-dots" aria-hidden="true">
          {/* Hero accent stars (brand sparkle motif). Color cycles three brand
              tones via CSS .d1–.d4 classes — stored `c.hero.dots[i].color` is
              kept in schema for back-compat but no longer drives the visual
              so the page always renders in-palette. */}
          {c.hero.dots.map((_d, i) => (
            <span key={i} className={'d d' + (i+1)} />
          ))}
        </div>
        <div className="hero-inner">
          <p className="hero-kicker">{t.hero.kicker}</p>
          <h1 id="hero-title" className={'hero-title' + (isKo ? '' : ' en')}>
            {t.hero.title_l1}<br />{t.hero.title_l2}
          </h1>
          <p className="hero-sub">{t.hero.sub}</p>
          <div className="hero-ctas">
            <button className="btn btn-lg btn-white" onClick={() => go('programs')} type="button">
              {t.hero.cta1} <i data-lucide={c.icons.cta_arrow} width="18" height="18" strokeWidth="2" aria-hidden="true"></i>
            </button>
            <button className="btn btn-lg btn-outline" onClick={() => go('about')} type="button">
              {t.hero.cta2}
            </button>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" data-screen-label="How it works" aria-labelledby="how-title">
        <div className="container">
          <p className="sec-kicker">{t.how.kicker}</p>
          <h2 id="how-title" className={'sec-title' + (isKo ? '' : ' en')}>{t.how.title}</h2>
          <ol className="steps" style={{listStyle:'none',padding:0,margin:0}}>
            {c.how.steps.map((s, i) => (
              <li key={i} className="step">
                <div className="step-icon" aria-hidden="true">
                  <i data-lucide={s.icon} width="28" height="28" strokeWidth="1.75"></i>
                </div>
                <div className="step-n">{s.n}</div>
                <h3 className="step-t">{isKo ? s.t_ko : s.t_en}</h3>
                <p className="step-d">{isKo ? s.d_ko : s.d_en}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* PARTNER STRIP — quiet trust band between "How" and "Programs".
          Each chip links to /partners. Logo image when available; stylized
          name fallback otherwise so the band stays present even before the
          operator uploads logos. */}
      {Array.isArray(c.partners) && c.partners.length > 0 && (
        <section className="partner-strip" aria-label={isKo ? '파트너' : 'Partners'}>
          <div className="container">
            <div className="partner-strip-kicker">{isKo ? '신뢰받는 파트너 네트워크' : 'TRUSTED PARTNER NETWORK'}</div>
            <div className="partner-strip-row">
              {c.partners.map((p, i) => {
                const inner = (
                  <>
                    {p.logo
                      ? <img src={p.logo} alt={p.name} loading="lazy" />
                      : <span className="partner-chip-text" style={{'--c': p.color || 'var(--scouting-purple)'}}>{p.name}</span>}
                    <span className="partner-chip-name">{p.name}</span>
                  </>
                );
                // With a website URL, the logo links out to the partner's site
                // in a new tab; otherwise it routes to the internal /partners page.
                return p.url
                  ? <a key={i} className="partner-chip" href={p.url} target="_blank" rel="noopener noreferrer"
                       title={p.full || p.name} aria-label={p.name}>{inner}</a>
                  : <button key={i} type="button" className="partner-chip" onClick={() => go('partners')}
                       title={p.full || p.name} aria-label={(isKo ? p.role_ko : p.role_en) || p.name}>{inner}</button>;
              })}
            </div>
          </div>
        </section>
      )}

      {/* PROGRAMS TEASER */}
      <section className="section" style={{background:'var(--bg-muted)'}} data-screen-label="Programs teaser" aria-labelledby="programs-title">
        <div className="container">
          <p className="sec-kicker">{t.programs.kicker}</p>
          <h2 id="programs-title" className={'sec-title' + (isKo ? '' : ' en')}>{t.programs.title}</h2>
          <p className="sec-sub">{t.programs.sub}</p>
          <div className="prog-grid">
            {c.programs.slice(0, 4).map(p => (
              <ProgramCard key={p.id} p={p} lang={lang} go={go} c={c} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="section-tight" aria-labelledby="cta-title">
        <div className="cta-banner">
          <div>
            <h2 id="cta-title">{t.cta.title}</h2>
            <p>{t.cta.sub}</p>
          </div>
          <div className="btn-wrap">
            <button className="btn btn-lg btn-white" onClick={() => go('apply')} type="button">
              {t.cta.cta} <i data-lucide={c.icons.cta_arrow} width="18" height="18" strokeWidth="2" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProgramCard({ p, lang, go, c }) {
  const isKo = lang === 'ko';
  return (
    <article className="prog" onClick={() => go('program', p.id)}
      role="link" tabIndex="0"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go('program', p.id); } }}
      aria-label={(isKo ? p.title_ko : p.title_en) + ' — ' + p.kicker}>
      <div className="prog-media" style={{'--c1': p.color, '--c2': shade(p.color, -20), '--accent': p.accent}} aria-hidden="true">
        <i data-lucide={p.icon} width="44" height="44" strokeWidth="1.5" className="prog-icon"></i>
        <div className="prog-chips">
          {p.meta.map((m, i) => <span key={i} className="pc">{m}</span>)}
        </div>
      </div>
      <p className="prog-kicker">{p.kicker}</p>
      <h3 className={'prog-title' + (isKo ? '' : ' en')}>{isKo ? p.title_ko : p.title_en}</h3>
      <p className="prog-sub">{isKo ? p.sub_ko : p.sub_en}</p>
      <div className="prog-arrow" aria-hidden="true">
        <i data-lucide={c.icons.card_arrow} width="20" height="20" strokeWidth="1.75"></i>
      </div>
    </article>
  );
}

function shade(hex, percent) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + percent));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + percent));
  const b = Math.max(0, Math.min(255, (n & 0xff) + percent));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

window.Home = Home;
window.ProgramCard = ProgramCard;
