// ProgramDetail.jsx — long-form details fetched from D1 + card metadata from KV
const { useState: useStatePD, useEffect: useEffectPD } = React;

function ProgramDetail({ go, lang, programId, c }) {
  const isKo = lang === 'ko';
  const list = (c && c.programs) || window.PROGRAMS;
  const p = list.find(x => x.id === programId) || list[0];
  const d = ((c && c.program_detail && c.program_detail[lang]) || {});
  const iconName = p.icon || 'sparkles';

  const [details, setDetails] = useStatePD(null);
  const [facultyOpen, setFacultyOpen] = useStatePD(null);
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
  const courses = details && Array.isArray(details.courses_json) ? details.courses_json : [];
  const hasHtml = (s) => s && s.replace(/<[^>]+>/g, '').trim().length > 0;
  const countListItems = (s) => ((s || '').match(/<li\b/gi) || []).length;
  const stats = [
    { label: isKo ? 'Duration' : 'Duration', value: (details && details.duration) || p.meta[0] },
    { label: isKo ? 'Format' : 'Format', value: (details && details.format) || p.meta[1] },
    { label: isKo ? 'Courses' : 'Courses', value: courses.length || countListItems(curriculum) || '3+' },
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
  const whyCUFS = isKo ? {
    title: 'Why CUFS?',
    sub: 'Korea\'s #1 foreign language university with full AI support. This is not a random online course.',
    cards: [
      {
        icon: '🏛️',
        title: 'Government Accredited',
        body: 'Fully accredited by the Korean Ministry of Education. Part of the HUFS system, established in 1954.',
      },
      {
        icon: '🤖',
        title: 'AI-Powered Learning',
        body: 'AI Tutor, AI Chatbot, multilingual subtitles, and generative AI support shaped into real coursework.',
      },
      {
        icon: '📊',
        title: 'Proven Track Record',
        body: '52/52 evaluation indicators passed in the 2025 national remote university assessment, with strong scholarship support.',
      },
      {
        icon: '🧑‍🏫',
        title: 'Expert Faculty',
        body: 'Native-language professors, PhD-level tutors, and direct learner support designed for international students.',
      },
      {
        icon: '🌐',
        title: '12 Departments',
        body: 'Languages, business, K-beauty, safety, counseling, liberal arts, and convergence fields in one system.',
      },
      {
        icon: '🇰🇷',
        title: 'K-Career Magnet',
        body: 'A practical bridge from study to Korean career pathways, including K-Point aligned employment-visa advantages.',
      },
    ],
  } : {
    title: 'Why CUFS?',
    sub: 'Korea\'s #1 foreign language university with full AI support. This is not a random online course.',
    cards: [
      {
        icon: '🏛️',
        title: 'Government Accredited',
        body: 'Fully accredited by the Korean Ministry of Education. Part of the prestigious HUFS system, established in 1954.',
      },
      {
        icon: '🤖',
        title: 'AI-Powered Learning',
        body: 'AI Tutor, AI Chatbot, AI multilingual subtitles, and generative AI content support built into the learning experience.',
      },
      {
        icon: '📊',
        title: 'Proven Track Record',
        body: '52/52 evaluation indicators passed in the 2025 national remote university assessment, with strong scholarship support.',
      },
      {
        icon: '🧑‍🏫',
        title: 'Expert Faculty',
        body: 'Native-language professors, PhD-level tutors, and direct learner support designed for global students.',
      },
      {
        icon: '🌐',
        title: '12 Departments',
        body: 'English, Chinese, Japanese, Korean, business, K-beauty, safety, counseling, liberal arts, and convergence tracks in one ecosystem.',
      },
      {
        icon: '🇰🇷',
        title: 'K-Career Magnet',
        body: 'A practical bridge from education to Korean career pathways, including K-Point aligned employment-visa advantages.',
      },
    ],
  };
  const dreamPathDifferent = isKo ? {
    title: 'What Makes Dream Path Different',
    cards: [
      {
        icon: '🆓',
        title: 'Start FREE — Korean Alphabet in 2 Weeks',
        body: 'Try the free Hangul starter course first. No payment, no commitment, just a simple way to see if Korean learning fits you.',
        tag: 'Free Entry Point',
      },
      {
        icon: '🏠',
        title: 'DOME — Your Local Learning Hub',
        body: '5% of tuition goes back to your country to help build a local learning center. More students means faster DOME growth.',
        tag: 'Community Investment',
      },
      {
        icon: '🏆',
        title: 'Up to 100% Scholarship',
        body: 'Grade A is 30% off, Grade B is 50% off, and Grade C can become fully funded when 30+ students join from one region.',
        tag: 'Merit-Based',
      },
      {
        icon: '🌍',
        title: 'Scout Network — 170 Countries Strong',
        body: 'Dream Path is built on the World Scouting network, with local scout leaders acting as trusted guides and mentors.',
        tag: 'Trusted Network',
      },
    ],
  } : {
    title: 'What Makes Dream Path Different',
    cards: [
      {
        icon: '🆓',
        title: 'Start FREE — Korean Alphabet in 2 Weeks',
        body: 'Not sure if this is for you? Try the free Hangul course first. No payment, no commitment, just a low-risk entry point.',
        tag: 'Free Entry Point',
      },
      {
        icon: '🏠',
        title: 'DOME — Your Local Learning Hub',
        body: '5% of tuition goes back to your country to help build a physical learning center. More students means faster DOME growth.',
        tag: 'Community Investment',
      },
      {
        icon: '🏆',
        title: 'Up to 100% Scholarship',
        body: 'Grade A gives 30% off, Grade B gives 50% off, and Grade C can become fully funded when 30+ students join from one region.',
        tag: 'Merit-Based',
      },
      {
        icon: '🌍',
        title: 'Scout Network — 170 Countries Strong',
        body: 'Dream Path is built on the World Scouting network. Your local scout leader becomes your guide, mentor, and trusted support.',
        tag: 'Trusted Network',
      },
    ],
  };
  const costSection = isKo ? {
    title: 'How Much Does It Actually Cost?',
    compareLeftLabel: 'Study in Korea (1 year)',
    compareLeftValue: '$5,000-$15,000',
    compareLeftSub: '+ flight + housing + visa + food',
    compareRightLabel: 'Dream Path Micro-Degree',
    compareRightValue: '~$720',
    compareRightSub: 'Full micro-degree (12 credits) · $60/credit',
    lines: [
      '$60 per credit (about KRW 83,000) · Full micro-degree = about 12 credits = about $720 total',
      'Application fee: $22 (KRW 30,000, one-time) · Admission fee: waived for part-time students',
      'Pay in your local currency through your Dream Path partner',
      'With scholarship: Grade A about $504 · Grade B about $360 · Grade C $0',
    ],
  } : {
    title: 'How Much Does It Actually Cost?',
    compareLeftLabel: 'Study in Korea (1 year)',
    compareLeftValue: '$5,000-$15,000',
    compareLeftSub: '+ flight + housing + visa + food',
    compareRightLabel: 'Dream Path Micro-Degree',
    compareRightValue: '~$720',
    compareRightSub: 'Full micro-degree (12 credits) · $60/credit',
    lines: [
      '$60 per credit (about KRW 83,000) · Full micro-degree = about 12 credits = about $720 total',
      'Application fee: $22 (KRW 30,000, one-time) · Admission fee: waived for part-time students',
      'Pay in your local currency through your Dream Path partner',
      'With scholarship: Grade A about $504 · Grade B about $360 · Grade C $0',
    ],
  };

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
                {section.key === 'curriculum' && courses.length > 0 ? (
                  <div className="pd-course-grid">
                    {courses.map((course, i) => (
                      <article key={i} className="pd-course-card">
                        <div className="pd-course-top">
                          <span className="pd-course-sem">{course.semester || 'Course'}</span>
                        </div>
                        <h4 className={'pd-course-title' + (isKo ? '' : ' en')}>{isKo ? (course.title_ko || course.title_en) : (course.title_en || course.title_ko)}</h4>
                        <p className="pd-course-desc">{isKo ? (course.desc_ko || course.desc_en) : (course.desc_en || course.desc_ko)}</p>
                        <div className="pd-course-divider" aria-hidden="true"></div>
                        {course.faculty_name && (
                          <div className="pd-course-footer">
                            <button type="button" className="pd-faculty-btn" onClick={() => setFacultyOpen(course)}>
                              <span className="pd-faculty-avatar">{(course.faculty_name || '?').trim().charAt(0)}</span>
                              <span className="pd-faculty-copy">
                                <strong>{course.faculty_name}</strong>
                                {course.faculty_title && <em>{course.faculty_title}</em>}
                              </span>
                            </button>
                            {course.preview_url && (
                              <a href={course.preview_url} target="_blank" rel="noopener" className="pd-course-preview">
                                {isKo ? '강의 미리보기 보기' : 'Watch Lecture Preview'}
                              </a>
                            )}
                          </div>
                        )}
                        {!course.faculty_name && course.preview_url && (
                          <a href={course.preview_url} target="_blank" rel="noopener" className="pd-course-preview">
                            {isKo ? '강의 미리보기 보기' : 'Watch Lecture Preview'}
                          </a>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  showHtml && <div className="pd-rich" dangerouslySetInnerHTML={{ __html: section.html }} />
                )}
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

          <section className="pd-why-cufs">
            <div className="pd-why-cufs-head">
              <div className="pd-section-eyebrow">Why CUFS</div>
              <h3 className={isKo ? '' : 'en'}>{whyCUFS.title}</h3>
              <p>{whyCUFS.sub}</p>
            </div>
            <div className="pd-why-cufs-grid">
              {whyCUFS.cards.map((card) => (
                <article key={card.title} className="pd-why-cufs-card">
                  <div className="pd-why-cufs-icon" aria-hidden="true">{card.icon}</div>
                  <h4>{card.title}</h4>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="pd-different">
            <div className="pd-different-head">
              <div className="pd-section-eyebrow">Dream Path</div>
              <h3 className={isKo ? '' : 'en'}>{dreamPathDifferent.title}</h3>
            </div>
            <div className="pd-different-grid">
              {dreamPathDifferent.cards.map((card) => (
                <article key={card.title} className="pd-different-card">
                  <div className="pd-different-icon" aria-hidden="true">{card.icon}</div>
                  <h4>{card.title}</h4>
                  <p>{card.body}</p>
                  <div className="pd-different-tag">{card.tag}</div>
                </article>
              ))}
            </div>
          </section>

          <section className="pd-cost">
            <div className="pd-cost-head">
              <div className="pd-section-eyebrow">Pricing</div>
              <h3 className={isKo ? '' : 'en'}>{costSection.title}</h3>
            </div>
            <div className="pd-cost-compare">
              <div className="pd-cost-card is-old">
                <div className="pd-cost-label">{costSection.compareLeftLabel}</div>
                <div className="pd-cost-value old">{costSection.compareLeftValue}</div>
                <div className="pd-cost-sub">{costSection.compareLeftSub}</div>
              </div>
              <div className="pd-cost-arrow" aria-hidden="true">→</div>
              <div className="pd-cost-card is-new">
                <div className="pd-cost-label">{costSection.compareRightLabel}</div>
                <div className="pd-cost-value new">{costSection.compareRightValue}</div>
                <div className="pd-cost-sub">{costSection.compareRightSub}</div>
              </div>
            </div>
            <div className="pd-cost-lines">
              {costSection.lines.map((line) => <p key={line}>{line}</p>)}
            </div>
          </section>
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
      {facultyOpen && (
        <div className="pd-modal-backdrop" onClick={() => setFacultyOpen(null)} role="presentation">
          <div className="pd-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Faculty profile">
            <button type="button" className="pd-modal-close" onClick={() => setFacultyOpen(null)} aria-label="Close">×</button>
            <div className="pd-modal-head">
              {facultyOpen.faculty_image
                ? <img src={facultyOpen.faculty_image} alt={facultyOpen.faculty_name || 'Faculty'} className="pd-modal-photo" />
                : <div className="pd-modal-photo pd-modal-photo-fallback">{(facultyOpen.faculty_name || '?').trim().charAt(0)}</div>}
              <div>
                <div className="pd-section-eyebrow">{isKo ? 'Faculty profile' : 'Faculty profile'}</div>
                <h3 className={isKo ? '' : 'en'} style={{marginBottom:8}}>{facultyOpen.faculty_name}</h3>
                {facultyOpen.faculty_title && <p className="pd-modal-title">{facultyOpen.faculty_title}</p>}
              </div>
            </div>
            <div className="pd-modal-body">
              <p>{isKo ? (facultyOpen.faculty_bio_ko || facultyOpen.faculty_bio_en || '') : (facultyOpen.faculty_bio_en || facultyOpen.faculty_bio_ko || '')}</p>
              <div className="pd-modal-course">
                <strong>{isKo ? 'Linked course' : 'Linked course'}</strong>
                <span>{isKo ? (facultyOpen.title_ko || facultyOpen.title_en) : (facultyOpen.title_en || facultyOpen.title_ko)}</span>
              </div>
              {facultyOpen.preview_url && (
                <a href={facultyOpen.preview_url} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">
                  {isKo ? '강의 미리보기 보기' : 'Watch lecture preview'}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
window.ProgramDetail = ProgramDetail;
