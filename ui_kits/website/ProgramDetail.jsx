// ProgramDetail.jsx — long-form details fetched from D1 + card metadata from KV
const { useState: useStatePD, useEffect: useEffectPD } = React;

function ProgramDetail({ go, lang, programId, c }) {
  const isKo = lang === 'ko';
  const list = dpList(c && c.programs, 'programs');   // v01.097 — see dpList()
  const p = list.find(x => x.id === programId) || list[0];
  const d = ((c && c.program_detail && c.program_detail[lang]) || {});
  // v01.097 — if the programs list is empty (operator cleared it, or the KV
  // blob is mid-edit) `p` is undefined and every `p.*` below throws, blanking
  // the page. Show a real "not found" instead.
  if (!p) {
    return (
      <div className="container" style={{padding:'96px 24px',textAlign:'center',wordBreak:'keep-all',overflowWrap:'break-word'}}>
        <h1 style={{fontSize:22,lineHeight:1.5,margin:'0 0 12px',color:'var(--fg-primary)'}}>
          {isKo ? '프로그램을 찾을 수 없습니다' : 'Program not found'}
        </h1>
        <p style={{fontSize:15,lineHeight:1.7,margin:'0 0 28px',color:'var(--fg-muted)'}}>
          {isKo ? '주소가 바뀌었거나 공개가 중단된 프로그램일 수 있습니다.'
                : 'The link may have changed, or the program is no longer published.'}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => go && go('programs')}>
          {isKo ? '전체 프로그램 보기' : 'See all programs'}
        </button>
      </div>
    );
  }
  const iconName = p.icon || 'sparkles';
  // 2026-08-22: 파트너 기관 소개 영상 섹션을 뺐다(협의 문제). 영상 id 는
  // 남겨 두되 sections 배열에서 제외한다 — 재개 시 새 영상으로 교체할 자리.
  const introVideoId = '_AwgacO988A';   // eslint-disable-line no-unused-vars

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
    { icon: 'clock', label: isKo ? 'Duration' : 'Duration', value: (details && details.duration) || p.meta[0] },
    { icon: 'monitor', label: isKo ? 'Format' : 'Format', value: (details && details.format) || p.meta[1] },
    { icon: 'layers', label: isKo ? 'Courses' : 'Courses', value: courses.length || countListItems(curriculum) || '3+' },
  ];
  const sections = [
    {
      key: 'overview',
      icon: 'compass',
      eyebrow: isKo ? 'Why this track' : 'Why this track',
      title: d.overview_h,
      html: overview,
      fallback: d.overview_body,
      tone: 'intro',
    },
    {
      key: 'curriculum',
      icon: 'book-open',
      eyebrow: isKo ? 'Course map' : 'Course map',
      title: isKo ? '커리큘럼' : 'Curriculum',
      html: curriculum,
      tone: 'curriculum',
    },
    {
      key: 'prereq',
      icon: 'user-check',
      eyebrow: isKo ? 'Who should apply' : 'Who should apply',
      title: d.eligibility_h,
      html: prerequisites,
      fallback: d.eligibility_body,
      tone: 'eligibility',
    },
  ];
  // 2026-08-22: 협력 대학 협의 문제로 **파트너 기관 전용 섹션을 렌더하지 않는다.**
  // 아래 내용(인증·수상·헬프데스크 번호·비자 가점)은 전부 특정 기관에 대한
  // 구체적 주장이라, 기관명만 '협력 대학'으로 바꾸면 오히려 거짓이 된다.
  // 내용은 지우지 않고 남겨 둔다 — 관계가 정리되면 그때 다시 쓴다.
  // 프로그램 자체도 현재 c.programs_gate.hidden 으로 내려가 있어 이 페이지는
  // 도달 불가지만, 게이트를 다시 열었을 때 이 섹션이 되살아나면 안 된다.
  const SHOW_PARTNER_SECTION = false;
  const whyCUFS = isKo ? {
    title: 'Why CUFS?',
    sub: 'Korea\'s #1 foreign language university with full AI support. This is not a random online course.',
    cards: [
      {
        icon: 'landmark',
        title: 'Government Accredited',
        body: 'Fully accredited by the Korean Ministry of Education. Part of the HUFS system, established in 1954.',
      },
      {
        icon: 'bot',
        title: 'AI-Powered Learning',
        body: 'AI Tutor, AI Chatbot, multilingual subtitles, and generative AI built into real coursework. Winner of the Korea AI Innovation Award.',
      },
      {
        icon: 'chart-column',
        title: 'Proven Track Record',
        body: '52 of 52 evaluation indicators passed in the 2025 national remote university assessment. About 2 in 3 students receive scholarship support.',
      },
      {
        icon: 'users',
        title: 'World-Class Faculty',
        body: 'The most native-language professors of any Korean cyber university, plus PhD-level tutors and a 24/7 help desk reachable from overseas at +82-2-6907-6703.',
      },
      {
        icon: 'globe',
        title: '10 Faculties',
        body: 'English, Chinese, Japanese, Korean, Spanish, Vietnamese-Indonesian, Business, K-Beauty, Industrial Safety, and Counseling Psychology — all in one university.',
      },
      {
        icon: 'briefcase',
        title: 'K-Career Magnet',
        body: 'Micro-Degree completion adds K-Point +10 toward the Korean employment visa (E-7-4). The fastest bridge from education to working in Korea.',
      },
    ],
  } : {
    title: 'Why CUFS?',
    sub: 'Korea\'s #1 foreign language university with full AI support. This is not a random online course.',
    cards: [
      {
        icon: 'landmark',
        title: 'Government Accredited',
        body: 'Fully accredited by the Korean Ministry of Education. Part of the prestigious HUFS system, established in 1954.',
      },
      {
        icon: 'bot',
        title: 'AI-Powered Learning',
        body: 'AI Tutor, AI Chatbot, multilingual subtitles, and generative AI built into the learning experience. Winner of the Korea AI Innovation Award.',
      },
      {
        icon: 'chart-column',
        title: 'Proven Track Record',
        body: '52 of 52 evaluation indicators passed in the 2025 national remote university assessment. About 2 in 3 students receive scholarship support.',
      },
      {
        icon: 'users',
        title: 'World-Class Faculty',
        body: 'The most native-language professors of any Korean cyber university, plus PhD-level tutors and a 24/7 help desk reachable from overseas at +82-2-6907-6703.',
      },
      {
        icon: 'globe',
        title: '10 Faculties',
        body: 'English, Chinese, Japanese, Korean, Spanish, Vietnamese-Indonesian, Business, K-Beauty, Industrial Safety, and Counseling Psychology — all in one university.',
      },
      {
        icon: 'briefcase',
        title: 'K-Career Magnet',
        body: 'Micro-Degree completion adds K-Point +10 toward the Korean employment visa (E-7-4). The fastest bridge from education to working in Korea.',
      },
    ],
  };
  const dreamPathDifferent = isKo ? {
    title: 'What Makes Dream Path Different',
    cards: [
      {
        icon: 'gift',
        title: 'Start FREE — Korean Alphabet in 2 Weeks',
        body: 'Not sure if this is for you? Try the free Hangul course first. No payment, no commitment — just see if you enjoy learning Korean.',
        tag: 'Free Entry Point',
      },
      {
        icon: 'home',
        title: 'DOME — Your Local Learning Hub',
        body: '5% of tuition goes back to your country to help build a physical learning center. DOME stands for Dream · Opportunity · Meeting · Education. More students means faster DOME growth.',
        tag: 'Community Investment',
      },
      {
        icon: 'award',
        title: 'Scholarship Available',
        body: 'Scholarship criteria vary by country — based on academic performance, coursework and assignments, recommendations, and other factors. Please contact your local Dream Path country office for details.',
        tag: 'Merit-Based',
      },
      {
        icon: 'handshake',
        title: 'Global Partner Network',
        body: 'Dream Path works with trusted local education partners in each country. Your local coordinator is your guide, mentor, and support — helping you every step of the way.',
        tag: 'Local Support in Your Country',
      },
    ],
  } : {
    title: 'What Makes Dream Path Different',
    cards: [
      {
        icon: 'gift',
        title: 'Start FREE — Korean Alphabet in 2 Weeks',
        body: 'Not sure if this is for you? Try the free Hangul course first. No payment, no commitment — just see if you enjoy learning Korean.',
        tag: 'Free Entry Point',
      },
      {
        icon: 'home',
        title: 'DOME — Your Local Learning Hub',
        body: '5% of tuition goes back to your country to help build a physical learning center. DOME stands for Dream · Opportunity · Meeting · Education. More students means faster DOME growth.',
        tag: 'Community Investment',
      },
      {
        icon: 'award',
        title: 'Scholarship Available',
        body: 'Scholarship criteria vary by country — based on academic performance, coursework and assignments, recommendations, and other factors. Please contact your local Dream Path country office for details.',
        tag: 'Merit-Based',
      },
      {
        icon: 'handshake',
        title: 'Global Partner Network',
        body: 'Dream Path works with trusted local education partners in each country. Your local coordinator is your guide, mentor, and support — helping you every step of the way.',
        tag: 'Local Support in Your Country',
      },
    ],
  };
  const costSection = {
    title: 'How much does it actually cost?',
    sub: 'An honest side-by-side of studying in Korea in person versus earning the same micro-degree online with Dream Path.',
    offline: {
      icon: 'building-2',
      label: 'Study in Korea, in person',
      note: '1-year estimate',
      rows: [
        { icon: 'graduation-cap', label: 'Tuition', amount: '$5,000 – $10,000' },
        { icon: 'plane', label: 'Round-trip flight', amount: '$800 – $1,500' },
        { icon: 'home', label: 'Housing (12 months)', amount: '$4,000 – $8,000' },
        { icon: 'file-text', label: 'Visa & insurance', amount: '$200 – $500' },
        { icon: 'utensils', label: 'Food & living', amount: '$3,000 – $6,000' },
      ],
      total: '$15,000 – $30,000',
    },
    online: {
      icon: 'laptop',
      label: 'Dream Path micro-degree',
      note: '100% online',
      badge: 'Best value',
      rows: [
        { icon: 'graduation-cap', label: 'Tuition · 12 credits × $60', amount: '$720' },
        { icon: 'receipt', label: 'Application fee', amount: '$22' },
        { icon: 'plane', label: 'Flight', free: 'Not needed' },
        { icon: 'home', label: 'Housing', free: 'Not needed' },
        { icon: 'utensils', label: 'Food & living', free: 'Stay home' },
      ],
      total: '$742',
    },
    savingsLabel: 'You save',
    savingsAmount: '$14,258 – $29,258',
    savingsPct: 'Up to 97% less than studying in Korea',
    barTitle: 'Cost comparison · 1-year average',
    barOffline: { label: 'In Korea, in person', amount: '~ $22,500' },
    barOnline: { label: 'Dream Path, online', amount: '$742' },
    barNote: 'That is roughly $21,758 saved on the average year.',
    chips: ['No flight', 'No housing', 'No visa', 'No living costs', 'Study from home'],
    facts: [
      { big: '$60', label: 'per credit', sub: '≈ ₩83,000' },
      { big: '$720', label: 'full micro-degree', sub: '≈ 12 credits' },
      { big: '$22', label: 'application fee', sub: 'one-time · ₩30,000' },
    ],
    payNote: 'Pay in your local currency through your Dream Path partner.',
    scholarship: {
      title: 'Scholarships',
      body: 'Criteria vary by country — based on academic performance, coursework and assignments, recommendations, and other factors. Contact your local Dream Path country office for details.',
    },
    semesterNote: isKo
      ? '위 금액은 1년 전체 프로그램 비용입니다. 실제 등록금은 최대 프로그램 가격 범위 안에서, 수강 신청한 과목에 따라 부과됩니다.'
      : 'The total above covers the full 1-year program. What you actually pay is charged by the courses you register for, within the maximum of the program price.',
  };

  // Optional hero background image (per program) — overrides the color gradient
  // with the image + dark overlay (pd-header text is already white). On slow /
  // overseas links the image is skipped (or times out) and the color gradient
  // shows instead — keeps the page light. (v01.081)
  const pdStyle = {'--c1': p.color, '--c2': 'var(--midnight-purple)'};
  const pdImgReady = window.useImageReady ? window.useImageReady(p.bg_image) : false;
  if (p.bg_image && pdImgReady) {
    pdStyle.backgroundImage = `linear-gradient(rgba(17,9,38,0.62), rgba(17,9,38,0.62)), url("${p.bg_image}")`;
    pdStyle.backgroundSize = 'cover';
    pdStyle.backgroundPosition = p.bg_position || 'center';
    pdStyle.backgroundRepeat = 'no-repeat';
  }
  return (
    <div data-screen-label="Program Detail">
      <div className="pd-header" style={pdStyle}>
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

              </div>
            </div>
            <div className="pd-hero-card" aria-hidden="true">
              <div className="pd-hero-card-icon">
                <i data-lucide={iconName} width="34" height="34" strokeWidth="1.7"></i>
              </div>
              <div className="pd-hero-card-kicker">Micro-Degree</div>
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
                <span className="pd-stat-icon" aria-hidden="true"><i data-lucide={stat.icon} width="20" height="20"></i></span>
                <div className="pd-stat-text">
                  <div className="pd-stat-label">{stat.label}</div>
                  <div className="pd-stat-value">{stat.value}</div>
                </div>
              </div>
            ))}
          </section>

          {sections.map((section) => {
            if (section.key === 'video') {
              if (!section.video) return null;
              return (
                <section key={section.key} className={'pd-section-card pd-tone-' + section.tone}>
                  <div className="pd-section-head">
                    <span className="pd-section-icon" aria-hidden="true"><i data-lucide={section.icon} width="20" height="20"></i></span>
                    <div className="pd-section-headtext">
                      <div className="pd-section-eyebrow">{section.eyebrow}</div>
                      <h3 className={isKo ? '' : 'en'}>{section.title}</h3>
                    </div>
                  </div>
                  <div className="pd-video">
                    <iframe
                      src={'https://www.youtube-nocookie.com/embed/' + section.video}
                      title={section.title}
                      loading="lazy"
                      allow="encrypted-media; picture-in-picture; web-share"
                      allowFullScreen
                    ></iframe>
                  </div>
                </section>
              );
            }
            const showHtml = hasHtml(section.html);
            const showList = !showHtml && Array.isArray(section.fallbackList) && section.fallbackList.length > 0;
            const showText = !showHtml && !showList && section.fallback;
            if (!showHtml && !showList && !showText) return null;
            return (
              <section key={section.key} className={'pd-section-card pd-tone-' + section.tone}>
                <div className="pd-section-head">
                  <span className="pd-section-icon" aria-hidden="true"><i data-lucide={section.icon} width="20" height="20"></i></span>
                  <div className="pd-section-headtext">
                    <div className="pd-section-eyebrow">{section.eyebrow}</div>
                    <h3 className={isKo ? '' : 'en'}>{section.title}</h3>
                  </div>
                </div>
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
              <div className="pd-section-head">
                <span className="pd-section-icon" aria-hidden="true"><i data-lucide="presentation" width="20" height="20"></i></span>
                <div className="pd-section-headtext">
                  <div className="pd-section-eyebrow">{isKo ? 'Faculty' : 'Faculty'}</div>
                  <h3 className={isKo ? '' : 'en'}>{isKo ? '강사' : 'Instructor'}</h3>
                </div>
              </div>
              {details.instructor_name && (
                <p className="pd-instructor-line">
                  <strong>{details.instructor_name}</strong>
                  {details.instructor_title && <span> · {details.instructor_title}</span>}
                </p>
              )}
              {hasHtml(instructorBio) && <div className="pd-rich" dangerouslySetInnerHTML={{ __html: instructorBio }} />}
            </section>
          )}

          {SHOW_PARTNER_SECTION && (
          <section className="pd-why-cufs">
            <div className="pd-why-cufs-head">
              <div className="pd-section-eyebrow">Why CUFS</div>
              <h3 className={isKo ? '' : 'en'}>{whyCUFS.title}</h3>
              <p>{whyCUFS.sub}</p>
            </div>
            <div className="pd-why-cufs-grid">
              {whyCUFS.cards.map((card) => (
                <article key={card.title} className="pd-why-cufs-card">
                  <div className="pd-why-cufs-icon" aria-hidden="true"><i data-lucide={card.icon} width="24" height="24"></i></div>
                  <h4>{card.title}</h4>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </section>
          )}

          <section className="pd-different">
            <div className="pd-different-head">
              <div className="pd-section-eyebrow">Dream Path</div>
              <h3 className={isKo ? '' : 'en'}>{dreamPathDifferent.title}</h3>
            </div>
            <div className="pd-different-grid">
              {dreamPathDifferent.cards.map((card) => (
                <article key={card.title} className="pd-different-card">
                  <div className="pd-different-icon" aria-hidden="true"><i data-lucide={card.icon} width="24" height="24"></i></div>
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
              <p className="pd-cost-sub">{costSection.sub}</p>
            </div>
            <div className="pd-cost-breakdown">
              <div className="pd-cost-col is-offline">
                <div className="pd-cost-col-head">
                  <span className="pd-cost-col-icon" aria-hidden="true"><i data-lucide={costSection.offline.icon} width="20" height="20"></i></span>
                  <div>
                    <div className="pd-cost-col-title">{costSection.offline.label}</div>
                    <div className="pd-cost-col-note">{costSection.offline.note}</div>
                  </div>
                </div>
                {costSection.offline.rows.map((row) => (
                  <div key={row.label} className="pd-cost-row">
                    <span className="pd-cost-row-label"><i data-lucide={row.icon} width="18" height="18" aria-hidden="true"></i> {row.label}</span>
                    <span className="pd-cost-row-amt">{row.amount}</span>
                  </div>
                ))}
                <div className="pd-cost-col-total">
                  <span>Total</span>
                  <span className="pd-cost-col-total-amt">{costSection.offline.total}</span>
                </div>
              </div>
              <div className="pd-cost-col is-online">
                <div className="pd-cost-badge"><i data-lucide="check" width="13" height="13" aria-hidden="true"></i> {costSection.online.badge}</div>
                <div className="pd-cost-col-head">
                  <span className="pd-cost-col-icon" aria-hidden="true"><i data-lucide={costSection.online.icon} width="20" height="20"></i></span>
                  <div>
                    <div className="pd-cost-col-title">{costSection.online.label}</div>
                    <div className="pd-cost-col-note">{costSection.online.note}</div>
                  </div>
                </div>
                {costSection.online.rows.map((row) => (
                  <div key={row.label} className="pd-cost-row">
                    <span className={'pd-cost-row-label' + (row.free ? ' is-muted' : '')}><i data-lucide={row.icon} width="18" height="18" aria-hidden="true"></i> {row.label}</span>
                    {row.free
                      ? <span className="pd-cost-row-free"><i data-lucide="check" width="14" height="14" aria-hidden="true"></i> {row.free}</span>
                      : <span className="pd-cost-row-amt">{row.amount}</span>}
                  </div>
                ))}
                <div className="pd-cost-col-total">
                  <span>Total</span>
                  <span className="pd-cost-col-total-amt">{costSection.online.total}</span>
                </div>
              </div>
            </div>
            <div className="pd-savings-banner">
              <div className="pd-savings-label"><i data-lucide="trending-down" width="16" height="16" aria-hidden="true"></i> {costSection.savingsLabel}</div>
              <div className="pd-savings-amount">{costSection.savingsAmount}</div>
              <div className="pd-savings-pct"><i data-lucide="sparkles" width="15" height="15" aria-hidden="true"></i> {costSection.savingsPct}</div>
            </div>
            <div className="pd-savings-bar-wrap">
              <div className="pd-savings-bar-note">{costSection.barTitle}</div>
              <div className="pd-cost-bar">
                <div className="pd-cost-bar-head">
                  <span>{costSection.barOffline.label}</span>
                  <span className="pd-cost-bar-amt is-offline">{costSection.barOffline.amount}</span>
                </div>
                <div className="pd-cost-bar-track" role="img" aria-label={costSection.barOffline.label + ' ' + costSection.barOffline.amount}>
                  <div className="pd-cost-bar-fill is-offline" style={{width: '100%'}}></div>
                </div>
              </div>
              <div className="pd-cost-bar">
                <div className="pd-cost-bar-head">
                  <span>{costSection.barOnline.label}</span>
                  <span className="pd-cost-bar-amt is-online">{costSection.barOnline.amount}</span>
                </div>
                <div className="pd-cost-bar-track" role="img" aria-label={costSection.barOnline.label + ' ' + costSection.barOnline.amount}>
                  <div className="pd-cost-bar-fill is-online" style={{width: '3.3%'}}></div>
                </div>
              </div>
              <div className="pd-cost-bar-foot"><i data-lucide="arrow-down" width="16" height="16" aria-hidden="true"></i> {costSection.barNote}</div>
            </div>
            <div className="pd-zero-list">
              {costSection.chips.map((item) => (
                <span key={item} className="pd-zero-chip"><i data-lucide="check" width="14" height="14" aria-hidden="true"></i> {item}</span>
              ))}
            </div>
            <div className="pd-cost-facts">
              {costSection.facts.map((f) => (
                <div key={f.big} className="pd-cost-fact">
                  <div className="pd-cost-fact-big">{f.big}</div>
                  <div className="pd-cost-fact-label">{f.label}</div>
                  <div className="pd-cost-fact-sub">{f.sub}</div>
                </div>
              ))}
            </div>
            <p className="pd-cost-pay">{costSection.payNote}</p>
            <div className="pd-cost-callout is-info">
              <span className="pd-cost-callout-icon" aria-hidden="true"><i data-lucide="award" width="22" height="22"></i></span>
              <div>
                <div className="pd-cost-callout-title">{costSection.scholarship.title}</div>
                <p>{costSection.scholarship.body}</p>
              </div>
            </div>
            <div className="pd-cost-callout is-muted">
              <span className="pd-cost-callout-icon" aria-hidden="true"><i data-lucide="info" width="22" height="22"></i></span>
              <p>{costSection.semesterNote}</p>
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
          <div className="row"><span className="k">{d.label_status}</span><span className="v" style={{color:'var(--state-success)'}}>{p.status}</span></div>
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
