// About.jsx — Executive Summary structure (per official docx, 2026-04-28)
function About({ lang }) {
  const isKo = lang === 'ko';

  const sections = [
    {
      kicker: isKo ? '프로그램 개요' : 'PROGRAM OVERVIEW',
      title: isKo
        ? 'Dream Path는 한국어 교육 접근성을\n넓히기 위해 설계된 구조적 국제교육 이니셔티브입니다.'
        : 'A structured international education initiative\ndesigned to expand access to Korean language education.',
      body: isKo
        ? 'Dream Path는 한국어 교육에 대한 접근성을 확대하고, 글로벌 차원의 참여를 강화하기 위해 설계된 구조적 국제교육 이니셔티브입니다.'
        : 'Dream Path is a structured international education initiative designed to expand access to Korean language education and enhance global engagement.',
    },
  ];

  const blocks = [
    {
      kicker: isKo ? '정책 정합성' : 'POLICY ALIGNMENT',
      heading: isKo ? '국가 교육 정책과의 정합성' : 'Aligned with national education policy',
      items: isKo ? [
        '한국 교육의 국제화를 지원',
        '한국어 학습의 글로벌 확산',
        'K-컬처를 통한 소프트파워 기여',
        '평생학습 및 디지털 교육 정책과 정합',
      ] : [
        'Supports internationalization of Korean education',
        'Expands Korean language learning globally',
        'Contributes to soft power through K-culture',
        'Aligns with lifelong learning and digital education policies',
      ],
    },
    {
      kicker: isKo ? '핵심 특징' : 'KEY FEATURES',
      heading: isKo ? '운영 원칙' : 'Operating principles',
      items: isKo ? [
        '정부가 인정하는 학술 파트너',
        '구조화된 마이크로 디그리 시스템',
        '투명한 커뮤니케이션 (보장 표현 사용 금지)',
        '학습자 보호 프레임워크',
      ] : [
        'Government-recognized academic partner',
        'Structured micro-degree system',
        'Transparent communication (no guarantee claims)',
        'Learner protection framework',
      ],
    },
    {
      kicker: isKo ? '기대 효과' : 'EXPECTED IMPACT',
      heading: isKo ? '장기적 임팩트' : 'Long-term impact',
      items: isKo ? [
        '글로벌 한국어 학습자 확대',
        '한국 연계 교육 생태계 강화',
        '국제 학생 파이프라인 확장',
        '인력 이동성에 대한 장기적 기여',
      ] : [
        'Increased global Korean language adoption',
        'Strengthened Korea-linked education ecosystem',
        'Expanded international student pipeline',
        'Long-term contribution to workforce mobility',
      ],
    },
    {
      kicker: isKo ? '컴플라이언스 접근' : 'COMPLIANCE APPROACH',
      heading: isKo ? '경계의 명확화' : 'Clear boundaries',
      items: isKo ? [
        '비자/취업 보장과의 명확한 분리',
        '공식 채널과의 정합 (EPS, Study in Korea)',
        '투명한 학습자 커뮤니케이션',
      ] : [
        'Clear separation from visa/employment guarantees',
        'Alignment with official channels (EPS, Study in Korea)',
        'Transparent learner communication',
      ],
    },
  ];

  return (
    <div data-screen-label="About">
      <div className="phead">
        <div className="inner">
          <div className="sec-kicker">{isKo ? '프로젝트 소개 · Executive Summary' : 'ABOUT · EXECUTIVE SUMMARY'}</div>
          <h1 className={isKo ? '' : 'en'}>
            {sections[0].title}
          </h1>
          <p>{sections[0].body}</p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="about-grid">
            {blocks.map((b, i) => (
              <div key={i} className="about-block">
                <div className="sec-kicker">◆ {b.kicker}</div>
                <h3 className="about-block-title">{b.heading}</h3>
                <ul className="about-list">
                  {b.items.map((it, j) => <li key={j}>{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{background:'var(--bg-muted)'}}>
        <div className="container-narrow">
          <div className="sec-kicker">{isKo ? '전략적 가치' : 'STRATEGIC VALUE'}</div>
          <h2 className={'sec-title' + (isKo ? '' : ' en')}>
            {isKo
              ? 'Dream Path는 글로벌 학습자가\n한국과 만나는 준비된 생태계입니다.'
              : 'Dream Path is a preparatory ecosystem\nfor global learners to engage with Korea.'}
          </h2>
          <p style={{fontSize:18, color:'var(--fg-secondary)', lineHeight:1.7, marginTop:24}}>
            {isKo
              ? 'Dream Path는 글로벌 학습자가 구조화된 교육 경로를 통해 한국과 연결될 수 있도록 돕는 준비 생태계(preparatory ecosystem) 역할을 수행합니다.'
              : 'Dream Path serves as a preparatory ecosystem that enables global learners to engage with Korea through structured educational pathways.'}
          </p>
        </div>
      </section>
    </div>
  );
}
window.About = About;
