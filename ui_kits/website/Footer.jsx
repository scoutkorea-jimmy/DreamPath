// Footer.jsx — content-driven via c.footer.columns (admin-editable).
// Each column has { title_ko, title_en, items[] }. Items are { label_ko,
// label_en, icon, kind, target } where kind ∈ {'view','url','email'} and
// target is the SPA view id, the absolute URL, or the email address.
// Bottom-row "rights" text and version stamp render below the columns.
function Footer({ go, lang, c }) {
  const isKo = lang === 'ko';
  const f = (c && c.footer) || {};
  const rights = (f[lang] && f[lang].rights) || '';
  // Operator-preferred display order: 소개 → 프로그램 → 문의 → 법률/약관.
  // Sorted at render time so older KV blobs (which may have a different
  // saved order) end up in the requested layout without forcing a re-save.
  // Unknown ids land at the end in their original order.
  const PREFERRED_ORDER = ['about', 'programs', 'contact', 'legal'];
  const rawCols = Array.isArray(f.columns) ? f.columns : [];
  const columns = [...rawCols].sort((a, b) => {
    const ai = PREFERRED_ORDER.indexOf(a && a.id);
    const bi = PREFERRED_ORDER.indexOf(b && b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  const legal = (c && c.legal) || {};

  // `kind: 'legal'` items open a LegalModal with c.legal[target]. The opened
  // doc is held in local state and unmounted when the user closes the modal.
  const [legalDoc, setLegalDoc] = React.useState(null);

  function activate(item, e) {
    if (!item) return;
    const k = item.kind || 'view';
    if (k === 'view') {
      if (e) e.preventDefault();
      if (item.target && go) go(item.target);
    } else if (k === 'legal') {
      if (e) e.preventDefault();
      const doc = legal && legal[item.target];
      if (doc) setLegalDoc(doc);
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
        {/* Top row: nav columns only (소개 → 프로그램 → 문의 → 법률/약관).
            Brand block moved down to the bottom band per operator request. */}
        <div className="footer-top footer-top-cols">
          {columns.map((col, ci) => (
            <div className="footer-col" key={col.id || ci}>
              <h2 className="fc-h">{(isKo ? col.title_ko : col.title_en) || col.title_en || col.title_ko || ''}</h2>
              {(col.items || []).map((it, ii) => {
                const label = (isKo ? it.label_ko : it.label_en) || it.label_en || it.label_ko || '';
                const icon = it.icon ? (
                  <i data-lucide={it.icon} width="14" height="14" strokeWidth="2" style={{marginRight:8,verticalAlign:'-2px',opacity:0.8}} aria-hidden="true"></i>
                ) : null;
                const kind = it.kind || 'view';
                if (kind === 'view' || kind === 'legal') {
                  return (
                    <button key={ii} type="button" onClick={(e) => activate(it, e)}>
                      {icon}{label}
                    </button>
                  );
                }
                return (
                  <a key={ii} href={hrefFor(it)} target={kind === 'url' ? '_blank' : undefined} rel={kind === 'url' ? 'noopener' : undefined}>
                    {icon}{label}
                  </a>
                );
              })}
            </div>
          ))}
        </div>
        {/* Bottom band: brand wordmark + tagline on the left, rights and
            version stamp on the right. Visually anchors the footer and
            keeps the brand prominent without competing with the nav cols. */}
        <div className="footer-bot footer-bot-with-brand">
          <div className="footer-brand">
            <div className="wm" aria-hidden="true">{c.brand.wordmark_mark || 'KoreaDream'}<span className="pt">{c.brand.wordmark_accent || 'Path'}</span></div>
            <p>{isKo ? c.brand.footer_tagline_ko : c.brand.footer_tagline_en}</p>
          </div>
          <div className="footer-bot-meta">
            <div>{rights}</div>
            <div className="footer-ver" title="Site version (AA.bbb.cc)">
              v {window.DREAMPATH_VERSION || '00.000.00'}
            </div>
          </div>
        </div>
      </div>
      {legalDoc && window.LegalModal && (
        <window.LegalModal doc={legalDoc} lang={lang} onClose={() => setLegalDoc(null)} />
      )}
    </footer>
  );
}
window.Footer = Footer;
