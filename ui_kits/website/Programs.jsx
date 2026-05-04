// Programs.jsx — list + filter, content-driven via c.page_heros.programs
const { useState: useStateP, useEffect: useEffectP } = React;

function programCategory(p) {
  const raw = p.category || (p.kicker ? p.kicker.split('·')[0].trim() : '');
  return raw || '';
}

function Programs({ go, lang, c }) {
  const isKo = lang === 'ko';
  const all = (c && c.programs) || window.PROGRAMS;
  const h = ((c && c.page_heros && c.page_heros.programs && c.page_heros.programs[lang]) || {});

  // Read ?cat= from URL so footer category links land on a pre-filtered view
  const initialCat = (() => {
    const usp = new URLSearchParams(window.location.search);
    return (usp.get('cat') || '').toLowerCase();
  })();
  const [filter, setFilter] = useStateP('all');
  const [catFilter, setCatFilter] = useStateP(initialCat);

  useEffectP(() => {
    const onPop = () => {
      const usp = new URLSearchParams(window.location.search);
      setCatFilter((usp.get('cat') || '').toLowerCase());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Apply both filters (level chip + category from URL)
  let shown = all;
  if (catFilter) shown = shown.filter(p => programCategory(p).toLowerCase() === catFilter);
  if (filter !== 'all') shown = shown.filter(p => p.level === filter);

  // Build filter list from levels actually present in the (category-filtered) data
  const levels = Array.from(new Set(shown.map(p => p.level).filter(Boolean)));
  const filters = ['all', ...levels];

  // Category label (from any program with this category)
  const catLabel = catFilter
    ? (all.find(p => programCategory(p).toLowerCase() === catFilter) || {}).category
        || (all.find(p => programCategory(p).toLowerCase() === catFilter) || {}).kicker?.split('·')[0]?.trim()
        || ''
    : '';

  return (
    <div data-screen-label="Programs">
      <div className="phead">
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
          <div className="filters">
            {filters.map(f => (
              <span key={f}
                className={'filter-chip' + (filter === f ? ' on' : '')}
                onClick={() => setFilter(f)}
                role="button" tabIndex="0"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilter(f); } }}>
                {f === 'all' ? (isKo ? '전체' : 'All') : f}
              </span>
            ))}
          </div>
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
