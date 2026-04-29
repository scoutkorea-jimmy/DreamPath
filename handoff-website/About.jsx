// About.jsx
function About({ lang }) {
  const isKo = lang === 'ko';
  return (
    <div data-screen-label="About">
      <div className="phead">
        <div className="inner">
          <div className="sec-kicker">{isKo ? '프로젝트 소개' : 'ABOUT THE PROJECT'}</div>
          <h1 className={isKo ? '' : 'en'}>
            {isKo ? '교육 접근성은, 이미\n존재하는 네트워크 위에서.' : 'Access to education, built on\na network that already exists.'}
          </h1>
          <p>{isKo
            ? 'DreamPath TF는 월드스카우트 네트워크를 학습자 파이프라인으로 전환하는 독립 이니셔티브입니다. CUFS와 독립된 조직으로, 향후 복수 교육기관과 확장 가능한 파트너 모델을 지향합니다.'
            : 'DreamPath TF is an independent initiative that turns the World Scout Network into a learner pipeline. We operate independently from CUFS and aim to expand across multiple institutions.'}</p>
        </div>
      </div>

      <section className="section">
        <div className="container-narrow">
          <div className="sec-kicker">{isKo ? '미션' : 'MISSION'}</div>
          <h2 className={'sec-title' + (isKo ? '' : ' en')}>
            {isKo ? '170개국에 이미 연결된 청년과 지도자들.\n같은 길에 학습을 올려놓습니다.' : 'Youth and leaders already connected across 170 countries.\nWe lay learning on the same path.'}
          </h2>
          <p style={{fontSize:18,color:'var(--fg-secondary)',lineHeight:1.7,marginTop:32}}>
            {isKo
              ? '전 세계 170여 개국의 스카우트 조직은 교육 접근성에 관심 있는 청년과 지도자들이 이미 연결된 거대한 네트워크입니다. DreamPath는 이 기존 네트워크를 학습자 파이프라인으로 전환해, 온라인·마이크로디그리 형태로 한국 고등교육에 접근할 수 있도록 설계된 구조입니다.'
              : 'Scout organizations across 170+ countries form a global network of youth and leaders already invested in education access. DreamPath turns this existing network into a learner pipeline for Korean higher education — delivered online, through micro-degrees and full online degrees.'}
          </p>
        </div>
      </section>

      <section className="section" style={{background:'var(--bg-muted)'}}>
        <div className="container">
          <div className="sec-kicker">{isKo ? '팀' : 'TEAM'}</div>
          <h2 className={'sec-title' + (isKo ? '' : ' en')}>
            {isKo ? '교육·재무·실무.' : 'Education · Finance · Operations.'}
          </h2>
          <p className="sec-sub">{isKo
            ? 'DreamPath TF는 세 영역으로 나뉘어 운영됩니다.'
            : 'DreamPath TF is organized across three functional areas.'}</p>
          <div className="team-grid">
            <div className="team-card">
              <div className="team-role">{isKo ? '교육' : 'EDUCATION'}</div>
              <div className="team-name">{isKo ? '프로그램 설계' : 'Program Design'}</div>
              <p className="team-desc">{isKo
                ? '파트너 대학과 커리큘럼을 조율하고 학습 경로를 설계합니다.'
                : 'Coordinates curriculum with partner universities and designs learning paths.'}</p>
            </div>
            <div className="team-card">
              <div className="team-role">{isKo ? '재무' : 'FINANCE'}</div>
              <div className="team-name">{isKo ? '자원·장학' : 'Resources · Scholarship'}</div>
              <p className="team-desc">{isKo
                ? '장학 지원 구조와 파트너 기여 모델을 운영합니다.'
                : 'Manages the scholarship structure and partner contribution model.'}</p>
            </div>
            <div className="team-card">
              <div className="team-role">{isKo ? '실무 총괄' : 'OPERATIONS'}</div>
              <div className="team-name">{isKo ? '파트너십·모집' : 'Partnerships · Recruitment'}</div>
              <p className="team-desc">{isKo
                ? '모집 채널 설계, 파트너 커뮤니케이션, 운영 문서 체계를 구축합니다.'
                : 'Designs recruitment channels, partner communications, and operational documentation.'}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
window.About = About;
