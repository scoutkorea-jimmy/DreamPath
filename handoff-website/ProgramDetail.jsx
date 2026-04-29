// ProgramDetail.jsx
function ProgramDetail({ go, lang, programId, c }) {
  const isKo = lang === 'ko';
  const list = (c && c.programs) || window.PROGRAMS;
  const p = list.find(x => x.id === programId) || list[0];
  return (
    <div data-screen-label="Program Detail">
      <div className="pd-header" style={{'--c1': p.color, '--c2': '#4D006E'}}>
        <div className="inner">
          <div className="pd-back" onClick={() => go('programs')}>← {isKo ? '모든 프로그램' : 'All programs'}</div>
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
          <h3 className={isKo ? '' : 'en'}>{isKo ? '프로그램 개요' : 'Overview'}</h3>
          <p>{isKo
            ? '이 프로그램은 파트너 교육기관이 설계한 온라인 커리큘럼을 기반으로, 스카우트 네트워크 내 추천 학습자에게 제공됩니다. 주간 라이브 세션, 과제 기반 학습, 그리고 멘토 매칭을 포함합니다.'
            : 'This program is built on an online curriculum designed by our partner institution and delivered to learners nominated by their national scout organization. It includes weekly live sessions, project-based learning, and mentor matching.'}</p>

          <h3 style={{marginTop:32}} className={isKo ? '' : 'en'}>{isKo ? '배우는 내용' : 'What you will learn'}</h3>
          <ul style={{color:'var(--fg-secondary)',lineHeight:1.8,fontSize:16,paddingLeft:20}}>
            <li>{isKo ? '주제별 핵심 프레임워크와 사례' : 'Core frameworks and case studies'}</li>
            <li>{isKo ? '실무 중심의 주간 과제' : 'Weekly practical assignments'}</li>
            <li>{isKo ? '한국 학생·전문가와의 네트워킹' : 'Networking with Korean students & practitioners'}</li>
            <li>{isKo ? '수료 후 포트폴리오 산출물' : 'A portfolio outcome after completion'}</li>
          </ul>

          <h3 style={{marginTop:32}} className={isKo ? '' : 'en'}>{isKo ? '지원 자격' : 'Who should apply'}</h3>
          <p>{isKo
            ? '소속 국가 스카우트 조직(NSO) 에서 활동 중이거나 추천받은 청년. 18세 이상 권장. 기본 영어 또는 한국어.'
            : 'Youth active in, or nominated by, a National Scout Organization. 18+ recommended. Basic English or Korean.'}</p>
        </div>

        <aside className="pd-side">
          <div style={{fontSize:12,letterSpacing:'0.14em',textTransform:'uppercase',fontWeight:700,color:'var(--scouting-purple)',marginBottom:16}}>
            {isKo ? '프로그램 정보' : 'Program info'}
          </div>
          <div className="row"><span className="k">{isKo ? '기간' : 'Length'}</span><span className="v">{p.meta[0]}</span></div>
          <div className="row"><span className="k">{isKo ? '방식' : 'Format'}</span><span className="v">{p.meta[1]}</span></div>
          <div className="row"><span className="k">{isKo ? '언어' : 'Language'}</span><span className="v">{p.meta[2]}</span></div>
          <div className="row"><span className="k">{isKo ? '레벨' : 'Level'}</span><span className="v">{p.level}</span></div>
          <div className="row"><span className="k">{isKo ? '상태' : 'Status'}</span><span className="v" style={{color:'var(--forest-green)'}}>{p.status}</span></div>
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginTop:20}} onClick={() => go('apply')}>
            {isKo ? '지금 지원하기' : 'Apply now'} →
          </button>
        </aside>
      </div>
    </div>
  );
}
window.ProgramDetail = ProgramDetail;
