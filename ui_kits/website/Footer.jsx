// Footer.jsx
function Footer({ go, lang, c }) {
  const isKo = lang === 'ko';
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-bg" aria-hidden="true" />
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="wm" aria-hidden="true">Dream<span className="pt">Path</span></div>
            <p>{isKo ? c.brand.footer_tagline_ko : c.brand.footer_tagline_en}</p>
          </div>
          <div className="footer-col">
            <h2 className="fc-h">{isKo ? '프로그램' : 'Programs'}</h2>
            <button type="button" onClick={() => go('programs')}>{isKo ? '전체 보기' : 'All programs'}</button>
            <button type="button" onClick={() => go('programs')}>Micro-degrees</button>
            <button type="button" onClick={() => go('programs')}>Online Bachelor</button>
            <button type="button" onClick={() => go('apply')}>{isKo ? '지원 방법' : 'How to apply'}</button>
          </div>
          <div className="footer-col">
            <h2 className="fc-h">{isKo ? '소개' : 'About'}</h2>
            <button type="button" onClick={() => go('about')}>{isKo ? '프로젝트' : 'The project'}</button>
            <button type="button" onClick={() => go('partners')}>{isKo ? '파트너' : 'Partners'}</button>
            <button type="button" onClick={() => go('stories')}>{isKo ? '스토리' : 'Stories'}</button>
            <button type="button" onClick={() => go('news')}>{isKo ? '소식' : 'News'}</button>
          </div>
          <div className="footer-col">
            <h2 className="fc-h">{isKo ? '문의' : 'Contact'}</h2>
            <a href={`mailto:${c.brand.email}`}>{c.brand.email}</a>
            <button type="button" onClick={() => go('contact')}>FAQ</button>
            <a href={`mailto:${c.brand.partners_email}`}>{isKo ? '파트너 문의' : 'For partners'}</a>
          </div>
        </div>
        <div className="footer-bot">
          <div>© 2025 DreamPath TF. {isKo ? '모든 권리 보유.' : 'All rights reserved.'}</div>
          <div><a href="admin.html" target="_blank" rel="noopener" style={{color:'rgba(255,255,255,0.85)'}}>{isKo ? '관리자 페이지 ↗' : 'Admin ↗'}</a></div>
        </div>
      </div>
    </footer>
  );
}
window.Footer = Footer;
