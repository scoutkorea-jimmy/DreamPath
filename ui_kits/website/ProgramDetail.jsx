// ProgramDetail.jsx — long-form details fetched from D1 + card metadata from KV
const { useState: useStatePD, useEffect: useEffectPD } = React;

function ProgramDetail({ go, lang, programId, c }) {
  const isKo = lang === 'ko';
  const list = (c && c.programs) || window.PROGRAMS;
  const p = list.find(x => x.id === programId) || list[0];
  const d = ((c && c.program_detail && c.program_detail[lang]) || {});

  const [details, setDetails] = useStatePD(null);
  useEffectPD(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/programs/' + encodeURIComponent(p.id) + '/details');
        if (cancelled) return;
        if (res.ok) setDetails(await res.json());
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [p.id]);

  const overview = details && (isKo ? details.overview_ko : details.overview_en);
  const curriculum = details && (isKo ? details.curriculum_ko : details.curriculum_en);
  const outcomes = details && (isKo ? details.outcomes_ko : details.outcomes_en);
  const prerequisites = details && (isKo ? details.prerequisites_ko : details.prerequisites_en);
  const instructorBio = details && (isKo ? details.instructor_bio_ko : details.instructor_bio_en);
  const hasHtml = (s) => s && s.replace(/<[^>]+>/g, '').trim().length > 0;

  return (
    <div data-screen-label="Program Detail">
      <div className="pd-header" style={{'--c1': p.color, '--c2': '#4D006E'}}>
        <div className="inner">
          <div className="pd-back" onClick={() => go('programs')}
            role="button" tabIndex="0"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go('programs'); } }}>
            ← {d.back_link}
          </div>
          <div className="pd-kicker">{p.kicker}</div>
          <h1 className={'pd-title' + (isKo ? '' : ' en')}>{isKo ? p.title_ko : p.title_en}</h1>
          <p className="pd-sub">{isKo ? p.sub_ko : p.sub_en}</p>
          <div className="pd-meta">
            {p.meta.map((m, i) => <span key={i} className="m">{m}</span>)}
            <span className="m">{p.level}</span>
          </div>
        </div>
      </div>

      <div className="pd-body">
        <div>
          <h3 className={isKo ? '' : 'en'}>{d.overview_h}</h3>
          {hasHtml(overview)
            ? <div className="pd-rich" dangerouslySetInnerHTML={{ __html: overview }} />
            : <p>{d.overview_body}</p>}

          {hasHtml(curriculum) && (
            <>
              <h3 style={{marginTop:32}} className={isKo ? '' : 'en'}>{isKo ? '커리큘럼' : 'Curriculum'}</h3>
              <div className="pd-rich" dangerouslySetInnerHTML={{ __html: curriculum }} />
            </>
          )}

          <h3 style={{marginTop:32}} className={isKo ? '' : 'en'}>{d.learn_h || (isKo ? '배우는 내용' : 'What you will learn')}</h3>
          {hasHtml(outcomes)
            ? <div className="pd-rich" dangerouslySetInnerHTML={{ __html: outcomes }} />
            : (
              <ul style={{color:'var(--fg-secondary)',lineHeight:1.8,fontSize:16,paddingLeft:20}}>
                {(Array.isArray(d.learn_items) ? d.learn_items : []).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            )}

          <h3 style={{marginTop:32}} className={isKo ? '' : 'en'}>{d.eligibility_h}</h3>
          {hasHtml(prerequisites)
            ? <div className="pd-rich" dangerouslySetInnerHTML={{ __html: prerequisites }} />
            : <p>{d.eligibility_body}</p>}

          {(details && (details.instructor_name || hasHtml(instructorBio))) && (
            <>
              <h3 style={{marginTop:32}} className={isKo ? '' : 'en'}>{isKo ? '강사' : 'Instructor'}</h3>
              {details.instructor_name && (
                <p style={{margin:'0 0 8px'}}>
                  <strong>{details.instructor_name}</strong>
                  {details.instructor_title && <span style={{color:'var(--fg-secondary)'}}> · {details.instructor_title}</span>}
                </p>
              )}
              {hasHtml(instructorBio) && <div className="pd-rich" dangerouslySetInnerHTML={{ __html: instructorBio }} />}
            </>
          )}
        </div>

        <aside className="pd-side">
          <div style={{fontSize:12,letterSpacing:'0.14em',textTransform:'uppercase',fontWeight:700,color:'var(--scouting-purple)',marginBottom:16}}>
            {d.info_kicker}
          </div>
          <div className="row"><span className="k">{d.label_length}</span><span className="v">{(details && details.duration) || p.meta[0]}</span></div>
          <div className="row"><span className="k">{d.label_format}</span><span className="v">{(details && details.format) || p.meta[1]}</span></div>
          <div className="row"><span className="k">{d.label_language}</span><span className="v">{(details && details.language_required) || p.meta[2]}</span></div>
          {details && details.start_date && (
            <div className="row"><span className="k">{isKo ? '시작' : 'Starts'}</span><span className="v">{details.start_date}</span></div>
          )}
          {details && details.cohort_size && (
            <div className="row"><span className="k">{isKo ? '정원' : 'Cohort size'}</span><span className="v">{details.cohort_size}</span></div>
          )}
          {details && details.certification && (
            <div className="row"><span className="k">{isKo ? '수료증' : 'Certification'}</span><span className="v">{details.certification}</span></div>
          )}
          <div className="row"><span className="k">{d.label_level}</span><span className="v">{p.level}</span></div>
          <div className="row"><span className="k">{d.label_status}</span><span className="v" style={{color:'var(--forest-green)'}}>{p.status}</span></div>
          {details && details.cost_full != null && (
            <div className="row"><span className="k">{isKo ? '비용' : 'Cost'}</span><span className="v">${details.cost_full} {details.cost_currency || 'USD'}</span></div>
          )}
          <button className="btn btn-primary btn-block" style={{marginTop:20}} onClick={() => go('apply')}>
            {d.apply_cta} →
          </button>
        </aside>
      </div>
    </div>
  );
}
window.ProgramDetail = ProgramDetail;
