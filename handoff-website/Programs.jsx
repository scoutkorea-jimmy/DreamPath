// Programs.jsx — list + filter
const { useState: useStateP } = React;

function Programs({ go, lang, c }) {
  const isKo = lang === 'ko';
  const [filter, setFilter] = useStateP('all');
  const all = (c && c.programs) || window.PROGRAMS;
  const shown = filter === 'all' ? all : all.filter(p => p.level === filter);

  return (
    <div data-screen-label="Programs">
      <div className="phead">
        <div className="inner">
          <div className="sec-kicker">PROGRAMS</div>
          <h1 className={isKo ? '' : 'en'}>
            {isKo ? '4개의 학습 경로.\n모두 온라인.' : 'Four learning paths.\nAll online.'}
          </h1>
          <p>{isKo
            ? '마이크로디그리부터 정규 학위까지. 여러분의 다음 스텝에 맞는 프로그램을 선택하세요.'
            : 'From micro-degrees to full online degrees. Choose the next step that fits you.'}</p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="filters">
            {['all','Beginner','Intermediate','All'].map(f => (
              <span key={f} className={'filter-chip' + (filter === f ? ' on' : '')} onClick={() => setFilter(f)}>
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
