// ProgramDetail.jsx — content-driven via c.program_detail
function ProgramDetail({ go, lang, programId, c }) {
  const isKo = lang === 'ko';
  const list = (c && c.programs) || window.PROGRAMS;
  const p = list.find(x => x.id === programId) || list[0];
  const d = ((c && c.program_detail && c.program_detail[lang]) || {});
  const learnItems = Array.isArray(d.learn_items) ? d.learn_items : [];

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
          <p>{d.overview_body}</p>

          <h3 style={{marginTop:32}} className={isKo ? '' : 'en'}>{d.learn_h}</h3>
          <ul style={{color:'var(--fg-secondary)',lineHeight:1.8,fontSize:16,paddingLeft:20}}>
            {learnItems.map((item, i) => <li key={i}>{item}</li>)}
          </ul>

          <h3 style={{marginTop:32}} className={isKo ? '' : 'en'}>{d.eligibility_h}</h3>
          <p>{d.eligibility_body}</p>
        </div>

        <aside className="pd-side">
          <div style={{fontSize:12,letterSpacing:'0.14em',textTransform:'uppercase',fontWeight:700,color:'var(--scouting-purple)',marginBottom:16}}>
            {d.info_kicker}
          </div>
          <div className="row"><span className="k">{d.label_length}</span><span className="v">{p.meta[0]}</span></div>
          <div className="row"><span className="k">{d.label_format}</span><span className="v">{p.meta[1]}</span></div>
          <div className="row"><span className="k">{d.label_language}</span><span className="v">{p.meta[2]}</span></div>
          <div className="row"><span className="k">{d.label_level}</span><span className="v">{p.level}</span></div>
          <div className="row"><span className="k">{d.label_status}</span><span className="v" style={{color:'var(--forest-green)'}}>{p.status}</span></div>
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginTop:20}} onClick={() => go('apply')}>
            {d.apply_cta} →
          </button>
        </aside>
      </div>
    </div>
  );
}
window.ProgramDetail = ProgramDetail;
