// Partners.jsx + Stories.jsx + News.jsx + Contact.jsx (bundled)
const PARTNER_GLYPHS = {
  CUFS: 'campus',
  WOSM: 'scout-fleur',
  APR:  'globe',
  NSOs: 'community',
};

function Partners({ lang, c }) {
  const isKo = lang === 'ko';
  const list = (c && c.partners) || window.PARTNERS;
  return (
    <div data-screen-label="Partners">
      <div className="phead">
        <div className="inner">
          <div className="sec-kicker">PARTNERS</div>
          <h1 className={isKo ? '' : 'en'}>
            {isKo ? '신뢰받는\n네트워크 위에서.' : 'Built on a\ntrusted network.'}
          </h1>
          <p>{isKo
            ? 'DreamPath는 파트너 교육기관, 글로벌 스카우트 조직, 후원 기관과 함께 운영됩니다.'
            : 'DreamPath operates with partner universities, global scout organizations, and supporting institutions.'}</p>
        </div>
      </div>
      <section className="section">
        <div className="container">
          <div className="partners-grid">
            {list.map((p, i) => {
              const glyph = PARTNER_GLYPHS[p.name] || 'community';
              return (
                <div key={i} className="partner">
                  <div className="partner-logo" style={{'--c': p.color}} aria-hidden="true">
                    <img src={`../assets/icons/${glyph}.svg`} alt="" width="28" height="28" className="partner-glyph" />
                    <span className="partner-mark">{p.name}</span>
                  </div>
                  <div className="partner-body">
                    <div className="partner-role">{isKo ? p.role_ko : p.role_en}</div>
                    <div className={'partner-name' + (isKo ? '' : ' en')}>{p.name}</div>
                    <div className="partner-full">{p.full}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stories({ lang, c }) {
  const isKo = lang === 'ko';
  const list = (c && c.stories) || window.STORIES;
  return (
    <div data-screen-label="Stories">
      <div className="phead">
        <div className="inner">
          <div className="sec-kicker">STORIES</div>
          <h1 className={isKo ? '' : 'en'}>
            {isKo ? '먼저 걸어간 사람들.' : 'People who walked\nthe path first.'}
          </h1>
          <p>{isKo
            ? '첫 코호트의 학습자들이 전하는 이야기.'
            : 'Voices from our first cohort of learners.'}</p>
        </div>
      </div>
      <section className="section">
        <div className="container">
          <div className="stories-grid">
            {list.map((s, i) => (
              <div key={i} className="story" style={{'--c1': s.tag_color, '--c2': '#622599'}}>
                <span className="tag" style={{background: s.tag_color + '22', color: s.tag_color}}>{s.tag}</span>
                <blockquote className={isKo ? '' : 'en'}>"{isKo ? s.quote_ko : s.quote_en}"</blockquote>
                <div className="story-foot">
                  <div className="story-avatar" aria-hidden="true">
                    <img src="../assets/placeholder-student.svg" alt="" />
                    <span className="story-initial">{s.name ? s.name[0] : ''}</span>
                  </div>
                  <div>
                    <div className="story-name">{s.name}</div>
                    <div className="story-prog">{s.program}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function News({ lang, c }) {
  const isKo = lang === 'ko';
  const list = (c && c.news) || window.NEWS;
  return (
    <div data-screen-label="News">
      <div className="phead">
        <div className="inner">
          <div className="sec-kicker">NEWS</div>
          <h1 className={isKo ? '' : 'en'}>
            {isKo ? '프로젝트 소식.' : 'Project news.'}
          </h1>
          <p>{isKo
            ? '파트너십, 운영 업데이트, 커뮤니티 이벤트.'
            : 'Partnerships, operating updates, and community events.'}</p>
        </div>
      </div>
      <section className="section">
        <div className="container-narrow">
          <div className="news-list">
            {list.map((n, i) => (
              <div key={i} className="news-item">
                <span className="news-tag" style={{background: n.tag_color + '22', color: n.tag_color}}>{n.tag}</span>
                <span className="news-date">{n.date}</span>
                <span className={'news-title' + (isKo ? '' : ' en')}>{isKo ? n.title_ko : n.title_en}</span>
                <i data-lucide="arrow-up-right" width="18" height="18" strokeWidth="1.75" style={{color:'var(--fg-muted)'}}></i>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Contact({ lang, c }) {
  const isKo = lang === 'ko';
  const list = (c && c.faq) || window.FAQ;
  const [open, setOpen] = React.useState(null);
  return (
    <div data-screen-label="Contact">
      <div className="phead">
        <div className="inner">
          <div className="sec-kicker">CONTACT · FAQ</div>
          <h1 className={isKo ? '' : 'en'}>
            {isKo ? '궁금한 건 먼저 FAQ.' : 'Start with the FAQ.'}
          </h1>
          <p>{isKo
            ? '답이 없으면 언제든 hello@dreampath.org 로 연락주세요.'
            : "If you don't see the answer, reach us at hello@dreampath.org."}</p>
        </div>
      </div>
      <section className="section">
        <div className="container-narrow">
          <div className="faq-list">
            {list.map((f, i) => (
              <div key={i} className={'faq-item' + (open === i ? ' open' : '')} onClick={() => setOpen(open === i ? null : i)}>
                <div className="faq-q">
                  <h4 className={isKo ? '' : 'en'}>{isKo ? f.q_ko : f.q_en}</h4>
                  <div className="faq-icon"><i data-lucide="plus" width="18" height="18" strokeWidth="2"></i></div>
                </div>
                <div className="faq-a">{isKo ? f.a_ko : f.a_en}</div>
              </div>
            ))}
          </div>

          <div style={{marginTop:56,padding:40,background:'var(--bg-muted)',borderRadius:28,textAlign:'center'}}>
            <div className="sec-kicker">{isKo ? '파트너 기관' : 'For partner institutions'}</div>
            <h3 style={{fontFamily:isKo?'var(--font-kr)':'var(--font-en)',fontSize:28,fontWeight:700,margin:'8px 0 16px'}}>
              {isKo ? '파트너십을 제안하고 싶으신가요?' : 'Interested in partnering with us?'}
            </h3>
            <p style={{color:'var(--fg-secondary)',fontSize:16,margin:'0 0 20px'}}>
              {isKo ? '교육기관, NSO, 후원기관의 문의를 환영합니다.' : 'We welcome inquiries from universities, NSOs, and supporting institutions.'}
            </p>
            <button className="btn btn-primary">partners@dreampath.org →</button>
          </div>
        </div>
      </section>
    </div>
  );
}

window.Partners = Partners;
window.Stories = Stories;
window.News = News;
window.Contact = Contact;
