// Programs.jsx — list + filter, content-driven via c.page_heros.programs
const { useState: useStateP } = React;

function Programs({ go, lang, c }) {
  const isKo = lang === 'ko';
  const [filter, setFilter] = useStateP('all');
  const all = (c && c.programs) || window.PROGRAMS;
  const shown = filter === 'all' ? all : all.filter(p => p.level === filter);
  const h = ((c && c.page_heros && c.page_heros.programs && c.page_heros.programs[lang]) || {});

  // Build filter list from levels actually present in the data.
  const levels = Array.from(new Set(all.map(p => p.level).filter(Boolean)));
  const filters = ['all', ...levels];

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
