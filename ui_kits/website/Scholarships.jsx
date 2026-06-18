// Scholarships.jsx — board (게시판) of EXTERNAL scholarship opportunities.
// This page does NOT advertise scholarships KoreaDreamPath runs; it curates
// and links out to third-party scholarships for reference only. Data lives in
// content KV under `scholarships` (intro disclaimer + items[]), edited in
// admin → Content → Scholarships. Public front is English-only.
const { useState: useStateSch, useMemo: useMemoSch } = React;
function Scholarships({ go, lang, c }) {
  const isKo = lang === 'ko';
  const s = (c && c.scholarships) || {};
  // Hero copy from the unified page_heros.scholarships (admin → 페이지 헤더).
  const ph = ((c && c.page_heros && c.page_heros.scholarships && (c.page_heros.scholarships.en || c.page_heros.scholarships[lang])) || {});
  const hero = { kicker: ph.kicker, title_l1: ph.title_l1, title_l2: ph.title_l2, sub: ph.sub };
  const hb = window.useHeroBg((c && c.page_heros && c.page_heros.scholarships) || {});
  const intro = (s.intro && (s.intro.en || s.intro[lang])) || '';
  const items = Array.isArray(s.items) ? s.items : [];

  // Distinct categories (in first-seen order) drive the filter chips.
  const cats = useMemoSch(() => {
    const seen = [];
    items.forEach(it => { const k = (it.category || '').trim(); if (k && seen.indexOf(k) === -1) seen.push(k); });
    return seen;
  }, [items]);
  const [cat, setCat] = useStateSch('all');
  const [openId, setOpenId] = useStateSch(null);
  const visible = cat === 'all' ? items : items.filter(it => (it.category || '').trim() === cat);

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
          {intro ? (
            <div className="schol-note">
              <i data-lucide="info" width="18" height="18" aria-hidden="true"></i>
              <p>{intro}</p>
            </div>
          ) : null}

          {cats.length > 1 ? (
            <div className="schol-filters" role="tablist" aria-label="Scholarship categories">
              <button type="button" className={'schol-chip' + (cat === 'all' ? ' is-active' : '')} onClick={() => setCat('all')}>
                {isKo ? '전체' : 'All'}
              </button>
              {cats.map(cName => (
                <button type="button" key={cName} className={'schol-chip' + (cat === cName ? ' is-active' : '')} onClick={() => setCat(cName)}>
                  {cName}
                </button>
              ))}
            </div>
          ) : null}

          {visible.length === 0 ? (
            <div className="schol-empty">
              {isKo ? '곧 게시됩니다.' : 'Listings are being added — check back soon.'}
            </div>
          ) : (
            <div className="schol-board">
              {visible.map((it, i) => {
                const id = it.id || ('s' + i);
                const open = openId === id;
                const hasDetails = !!(it.details && String(it.details).trim());
                return (
                  <article key={id} className={'schol-row' + (open ? ' is-open' : '')}>
                    <div className="schol-row-top">
                      {it.category ? <span className="schol-cat">{it.category}</span> : null}
                      {it.deadline ? (
                        <span className="schol-deadline">
                          <i data-lucide="calendar" width="13" height="13" aria-hidden="true"></i>{it.deadline}
                        </span>
                      ) : null}
                    </div>
                    <h3 className={isKo ? '' : 'en'}>{it.title}</h3>
                    {it.provider ? <div className="schol-provider">{it.provider}</div> : null}
                    {(it.amount || it.region) ? (
                      <div className="schol-meta">
                        {it.amount ? <span><i data-lucide="award" width="14" height="14" aria-hidden="true"></i>{it.amount}</span> : null}
                        {it.region ? <span><i data-lucide="globe" width="14" height="14" aria-hidden="true"></i>{it.region}</span> : null}
                      </div>
                    ) : null}
                    {it.summary ? <p className="schol-summary">{it.summary}</p> : null}
                    {hasDetails && open ? <div className="schol-details">{it.details}</div> : null}
                    <div className="schol-row-foot">
                      {hasDetails ? (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpenId(open ? null : id)}
                          aria-expanded={open}>
                          {open ? (isKo ? '접기' : 'Less') : (isKo ? '자세히' : 'Details')}
                        </button>
                      ) : <span />}
                      {it.link ? (
                        <a className="btn btn-secondary btn-sm" href={it.link} target="_blank" rel="noopener noreferrer">
                          {isKo ? '바로가기' : 'Learn more'} <i data-lucide="arrow-up-right" width="14" height="14" aria-hidden="true"></i>
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
window.Scholarships = Scholarships;
