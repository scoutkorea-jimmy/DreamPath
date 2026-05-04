// Footer.jsx — content-driven via c.footer.columns (admin-editable).
// Each column has { title_ko, title_en, items[] }. Items are { label_ko,
// label_en, icon, kind, target } where kind ∈ {'view','url','email'} and
// target is the SPA view id, the absolute URL, or the email address.
// Bottom-row "rights" text and version stamp render below the columns.
function Footer({ go, lang, c }) {
  const isKo = lang === 'ko';
  const f = (c && c.footer) || {};
  const rights = (f[lang] && f[lang].rights) || '';
  const columns = Array.isArray(f.columns) ? f.columns : [];

  function activate(item, e) {
    if (!item) return;
    const k = item.kind || 'view';
    if (k === 'view') {
      if (e) e.preventDefault();
      if (item.target && go) go(item.target);
    }
    // 'url' and 'email' use the native <a> href; nothing to do.
  }
  function hrefFor(item) {
    const k = item.kind || 'view';
    if (k === 'email') return 'mailto:' + (item.target || '');
    if (k === 'url')   return item.target || '#';
    return '#';
  }

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-bg" aria-hidden="true" />
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="wm" aria-hidden="true">{c.brand.wordmark_mark || 'KoreaDream'}<span className="pt">{c.brand.wordmark_accent || 'Path'}</span></div>
            <p>{isKo ? c.brand.footer_tagline_ko : c.brand.footer_tagline_en}</p>
          </div>
          {columns.map((col, ci) => (
            <div className="footer-col" key={col.id || ci}>
              <h2 className="fc-h">{(isKo ? col.title_ko : col.title_en) || col.title_en || col.title_ko || ''}</h2>
              {(col.items || []).map((it, ii) => {
                const label = (isKo ? it.label_ko : it.label_en) || it.label_en || it.label_ko || '';
                const icon = it.icon ? (
                  <i data-lucide={it.icon} width="14" height="14" strokeWidth="2" style={{marginRight:8,verticalAlign:'-2px',opacity:0.8}} aria-hidden="true"></i>
                ) : null;
                if ((it.kind || 'view') === 'view') {
                  return (
                    <button key={ii} type="button" onClick={(e) => activate(it, e)}>
                      {icon}{label}
                    </button>
                  );
                }
                return (
                  <a key={ii} href={hrefFor(it)} target={it.kind === 'url' ? '_blank' : undefined} rel={it.kind === 'url' ? 'noopener' : undefined}>
                    {icon}{label}
                  </a>
                );
              })}
            </div>
          ))}
        </div>
        <div className="footer-bot">
          <div>{rights}</div>
          <div className="footer-ver" title="Site version (AA.bbb.cc)">
            v {window.DREAMPATH_VERSION || '00.000.00'}
          </div>
        </div>
      </div>
    </footer>
  );
}
window.Footer = Footer;
