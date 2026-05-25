// ProgramDetail.jsx — long-form details fetched from D1 + card metadata from KV
const { useState: useStatePD, useEffect: useEffectPD } = React;

function ProgramDetail({ go, lang, programId, c }) {
  const isKo = lang === 'ko';
  const list = (c && c.programs) || window.PROGRAMS;
  const p = list.find(x => x.id === programId) || list[0];
  const d = ((c && c.program_detail && c.program_detail[lang]) || {});
  const iconName = p.icon || 'sparkles';

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
  const countListItems = (s) => ((s || '').match(/<li\b/gi) || []).length;
  const stats = [
    { label: isKo ? 'Duration' : 'Duration', value: (details && details.duration) || p.meta[0] },
    { label: isKo ? 'Format' : 'Format', value: (details && details.format) || p.meta[1] },
    { label: isKo ? 'Courses' : 'Courses', value: countListItems(curriculum) || '3+' },
    { label: isKo ? 'Outcomes' : 'Outcomes', value: countListItems(outcomes) || '5+' },
  ];
  const sections = [
    {
      key: 'overview',
      eyebrow: isKo ? 'Why this track' : 'Why this track',
      title: d.overview_h,
      html: overview,
      fallback: d.overview_body,
      tone: 'intro',
    },
    {
      key: 'curriculum',
      eyebrow: isKo ? 'Course map' : 'Course map',
      title: isKo ? '커리큘럼' : 'Curriculum',
      html: curriculum,
      tone: 'curriculum',
    },
    {
      key: 'outcomes',
      eyebrow: isKo ? 'What you gain' : 'What you gain',
      title: d.learn_h || (isKo ? '배우는 내용' : 'What you will learn'),
      html: outcomes,
      fallbackList: Array.isArray(d.learn_items) ? d.learn_items : [],
      tone: 'outcomes',
    },
    {
      key: 'prereq',
      eyebrow: isKo ? 'Who should apply' : 'Who should apply',
      title: d.eligibility_h,
      html: prerequisites,
      fallback: d.eligibility_body,
      tone: 'eligibility',
    },
  ];

  return (
    <div data-screen-label="Program Detail">
      <div className="pd-header" style={{'--c1': p.color, '--c2': 'var(--midnight-purple)'}}>
        <div className="inner">
          <div className="pd-back" onClick={() => go('programs')}
            role="button" tabIndex="0"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go('programs'); } }}>
            ← {d.back_link}
          </div>
          <div className="pd-kicker">{p.kicker}</div>
          <div className="pd-hero-grid">
            <div className="pd-hero-copy">
              <h1 className={'pd-title' + (isKo ? '' : ' en')}>{isKo ? p.title_ko : p.title_en}</h1>
              <p className="pd-sub">{isKo ? p.sub_ko : p.sub_en}</p>
              <div className="pd-meta">
                {p.meta.map((m, i) => <span key={i} className="m">{m}</span>)}
                <span className="m">{p.level}</span>
              </div>
            </div>
            <div className="pd-hero-card" aria-hidden="true">
              <div className="pd-hero-card-icon">
                <i data-lucide={iconName} width="34" height="34" strokeWidth="1.7"></i>
              </div>
              <div className="pd-hero-card-kicker">CUFS Micro-Degree</div>
              <div className="pd-hero-card-title">{isKo ? 'Designed for global learners' : 'Designed for global learners'}</div>
              <div className="pd-hero-card-text">{isKo ? '온라인 학습, 실전 과목 구성, 커리어 연결까지 한 번에 이어지는 과정입니다.' : 'Built to connect online study, practical coursework, and career momentum in one track.'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="pd-body">
        <div className="pd-main">
          <section className="pd-stat-strip" aria-label="Program snapshot">
            {stats.map((stat) => (
              <div key={stat.label} className="pd-stat-card">
                <div className="pd-stat-label">{stat.label}</div>
                <div className="pd-stat-value">{stat.value}</div>
              </div>
            ))}
          </section>

          {sections.map((section) => {
            const showHtml = hasHtml(section.html);
            const showList = !showHtml && Array.isArray(section.fallbackList) && section.fallbackList.length > 0;
            const showText = !showHtml && !showList && section.fallback;
            if (!showHtml && !showList && !showText) return null;
            return (
              <section key={section.key} className={'pd-section-card pd-tone-' + section.tone}>
                <div className="pd-section-eyebrow">{section.eyebrow}</div>
                <h3 className={isKo ? '' : 'en'}>{section.title}</h3>
                {showHtml && <div className="pd-rich" dangerouslySetInnerHTML={{ __html: section.html }} />}
                {showText && <p>{section.fallback}</p>}
                {showList && (
                  <ul className="pd-fallback-list">
                    {section.fallbackList.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                )}
              </section>
            );
          })}

          {(details && (details.instructor_name || hasHtml(instructorBio))) && (
            <section className="pd-section-card pd-tone-instructor">
              <div className="pd-section-eyebrow">{isKo ? 'Faculty' : 'Faculty'}</div>
              <h3 className={isKo ? '' : 'en'}>{isKo ? '강사' : 'Instructor'}</h3>
              {details.instructor_name && (
                <p className="pd-instructor-line">
                  <strong>{details.instructor_name}</strong>
                  {details.instructor_title && <span> · {details.instructor_title}</span>}
                </p>
              )}
              {hasHtml(instructorBio) && <div className="pd-rich" dangerouslySetInnerHTML={{ __html: instructorBio }} />}
            </section>
          )}
        </div>

        <aside className="pd-side">
          <div className="pd-side-kicker">
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
          <div className="pd-side-note">
            {isKo ? '각 과정은 온라인 기반으로 운영되며, 실제 적용 가능한 결과물과 다음 단계 연결을 목표로 구성됩니다.' : 'Each track is structured around online delivery, practical outputs, and a clear next-step pathway.'}
          </div>
          <button className="btn btn-primary btn-block" style={{marginTop:20}} onClick={() => go('apply')}>
            {d.apply_cta} →
          </button>
        </aside>
      </div>
    </div>
  );
}
window.ProgramDetail = ProgramDetail;
