// About.jsx — Executive Summary structure, fully driven by c.about.exec.
//
// Pre-2026-05-04 this file was hardcoded; admin edits to c.about did not
// reflect on the live page (CLAUDE_TASKS.md P0). It now reads every string
// from c.about.exec, with the bundled defaults in content-store.js acting
// as the fallback when KV is missing the section.
function About({ lang, c }) {
  const isKo = lang === 'ko';
  const ex = (c && c.about && c.about.exec) || {};

  // Per-language pickers — `exec.X.kicker_ko` for Korean, `exec.X.kicker_en` for English.
  // Falls back to '' if the field isn't authored yet so the page never crashes.
  const pick = (obj, key) => (obj && (obj[key + (isKo ? '_ko' : '_en')] || obj[key + '_en'] || obj[key + '_ko'])) || '';

  const hero    = ex.hero    || {};
  const blocks  = Array.isArray(ex.blocks) ? ex.blocks : [];
  const closing = ex.closing || {};
  const hb = window.useHeroBg(hero);

  return (
    <div data-screen-label="About">
      <div className={('phead ' + hb.cls).trim()} style={hb.style}>
        <div className="inner">
          <div className="sec-kicker">{pick(hero, 'kicker')}</div>
          <h1 className={isKo ? '' : 'en'}>{pick(hero, 'title')}</h1>
          <p>{pick(hero, 'body')}</p>
        </div>
      </div>

      {blocks.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="about-grid">
              {blocks.map((b, i) => {
                const items = (isKo ? b.items_ko : b.items_en) || b.items_en || b.items_ko || [];
                return (
                  <div key={i} className="about-block">
                    <div className="sec-kicker">◆ {isKo ? (b.kicker_ko || b.kicker_en) : (b.kicker_en || b.kicker_ko)}</div>
                    <h3 className="about-block-title">{isKo ? (b.heading_ko || b.heading_en) : (b.heading_en || b.heading_ko)}</h3>
                    <ul className="about-list">
                      {items.map((it, j) => <li key={j}>{it}</li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {(closing.title_ko || closing.title_en) && (
        <section className="section" style={{background:'var(--bg-muted)'}}>
          <div className="container-narrow">
            <div className="sec-kicker">{pick(closing, 'kicker')}</div>
            <h2 className={'sec-title' + (isKo ? '' : ' en')}>{pick(closing, 'title')}</h2>
            <p style={{fontSize:18, color:'var(--fg-secondary)', lineHeight:1.7, marginTop:24}}>
              {pick(closing, 'body')}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
window.About = About;
