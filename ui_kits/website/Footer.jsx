// Footer.jsx — content-driven via c.footer
function Footer({ go, lang, c }) {
  const isKo = lang === 'ko';
  const f = ((c && c.footer && c.footer[lang]) || {});
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-bg" aria-hidden="true" />
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="wm" aria-hidden="true">{c.brand.wordmark_mark || 'KoreaDream'}<span className="pt">{c.brand.wordmark_accent || 'Path'}</span></div>
            <p>{isKo ? c.brand.footer_tagline_ko : c.brand.footer_tagline_en}</p>
          </div>
          <div className="footer-col">
            <h2 className="fc-h">{f.col_programs}</h2>
            <button type="button" onClick={() => go('programs')}>{f.link_all}</button>
            <button type="button" onClick={() => go('programs')}>{f.link_micro}</button>
            <button type="button" onClick={() => go('programs')}>{f.link_bachelor}</button>
            <button type="button" onClick={() => go('apply')}>{f.link_apply}</button>
          </div>
          <div className="footer-col">
            <h2 className="fc-h">{f.col_about}</h2>
            <button type="button" onClick={() => go('about')}>{f.link_project}</button>
            <button type="button" onClick={() => go('team')}>{f.link_team || (isKo ? '프로젝트 팀 소개' : 'Project team')}</button>
            <button type="button" onClick={() => go('partners')}>{f.link_partners}</button>
            <button type="button" onClick={() => go('stories')}>{f.link_stories}</button>
            <button type="button" onClick={() => go('news')}>{f.link_news}</button>
          </div>
          <div className="footer-col">
            <h2 className="fc-h">{f.col_contact}</h2>
            <a href={`mailto:${c.brand.email}`}>{c.brand.email}</a>
            <button type="button" onClick={() => go('contact')}>{f.link_faq}</button>
            <a href={`mailto:${c.brand.partners_email}`}>{f.link_partners_inquiry}</a>
          </div>
        </div>
        <div className="footer-bot">
          <div>{f.rights}</div>
        </div>
      </div>
    </footer>
  );
}
window.Footer = Footer;
