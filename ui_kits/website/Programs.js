// Programs.jsx — list + filter, content-driven via c.page_heros.programs
const { useState: useStateP, useEffect: useEffectP } = React;

function programCategory(p) {
  const raw = p.category || (p.kicker ? p.kicker.split('·')[0].trim() : '');
  return raw || '';
}

function Programs({ go, lang, c }) {
  const isKo = lang === 'ko';
  // v01.097 — was `|| window.PROGRAMS`, a global that is defined nowhere in
  // the codebase. It read as a safety net but evaluated to undefined, so a
  // null/missing content key crashed straight into `.filter` instead. Fall
  // back to the shipped defaults, then to an empty list.
  const all = dpList(c && c.programs, 'programs');
  const h = ((c && c.page_heros && c.page_heros.programs && (c.page_heros.programs.en || c.page_heros.programs[lang])) || {});
  const hb = window.useHeroBg((c && c.page_heros && c.page_heros.programs) || {});
  function readCatFromUrl() {
    const usp = new URLSearchParams(window.location.search);
    return (usp.get('cat') || '').toLowerCase();
  }

  // Read ?cat= from URL so footer category links land on a pre-filtered view
  const initialCat = readCatFromUrl();
  const [catFilter, setCatFilter] = useStateP(initialCat);

  useEffectP(() => {
    const syncCatFilter = () => setCatFilter(readCatFromUrl());
    const onRouteChange = (e) => {
      if (!e.detail || e.detail.view === 'programs') syncCatFilter();
    };
    const onPop = () => syncCatFilter();
    syncCatFilter();
    window.addEventListener('popstate', onPop);
    window.addEventListener('dp-route-change', onRouteChange);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('dp-route-change', onRouteChange);
    };
  }, []);

  // 2026-08-23: 프로그램 등급(level)을 없앴다 — 필터도 함께 제거.
  // 카테고리 필터(?cat=)는 그대로 둔다.
  let shown = all;
  if (catFilter) shown = shown.filter(p => programCategory(p).toLowerCase() === catFilter);

  // Category label (from any program with this category)
  const catLabel = catFilter
    ? (all.find(p => programCategory(p).toLowerCase() === catFilter) || {}).category
        || (all.find(p => programCategory(p).toLowerCase() === catFilter) || {}).kicker?.split('·')[0]?.trim()
        || ''
    : '';

  return (
    <div data-screen-label="Programs">
      <div className={('phead ' + hb.cls).trim()} style={hb.style}>
        <div className="inner">
          <div className="sec-kicker">{h.kicker}</div>
          <h1 className={isKo ? '' : 'en'}>
            {h.title_l1}{h.title_l2 ? <><br/>{h.title_l2}</> : null}
          </h1>
          <p>{h.sub}</p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          {catFilter && (
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <span style={{padding:'4px 12px',borderRadius:999,background:'rgba(98,37,153,0.10)',color:'var(--scouting-purple)',fontSize:12,fontWeight:700,letterSpacing:'0.04em'}}>
                {(isKo ? '카테고리: ' : 'Category: ') + (catLabel || catFilter)}
              </span>
              <button type="button" className="btn btn-ghost btn-sm"
                onClick={() => { setCatFilter(''); go('programs'); }}>
                {isKo ? '필터 지우기' : 'Clear filter'}
              </button>
            </div>
          )}
          <div className="prog-grid">
            {shown.map(p => (
              <window.ProgramCard key={p.id} p={p} lang={lang} go={go} c={c} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
window.Programs = Programs;
