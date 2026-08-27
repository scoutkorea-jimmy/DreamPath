// Legal.jsx — modal viewer + consent block + cookie banner
// All consents flow through `recordConsent()` which POSTs to /api/consents
// for the GDPR audit trail.

const { useState: useStateL, useEffect: useEffectL } = React;

async function recordConsent(type, version, granted, opts = {}) {
  try {
    const headers = { 'content-type': 'application/json' };
    if (window.DreamPathAuth && window.DreamPathAuth.token) {
      headers['authorization'] = 'Bearer ' + window.DreamPathAuth.token;
    }
    await fetch('/api/consents', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        consent_type: type,
        version,
        granted: granted ? 1 : 0,
        email: opts.email,
        application_id: opts.application_id,
        lang: document.documentElement.lang || 'ko',
      }),
    });
  } catch {}
}
window.recordConsent = recordConsent;

// Modal showing the full legal document body
function LegalModal({ doc, lang, onClose }) {
  if (!doc) return null;
  const isKo = lang === 'ko';
  const t = (doc[lang] || doc.en || doc.ko || {});
  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="legal-title" style={{maxWidth:760}}>
        <button type="button" className="auth-close" onClick={onClose} aria-label={isKo ? '닫기' : 'Close'}>×</button>
        <div style={{fontSize:11,letterSpacing:'0.06em',textTransform:'uppercase',color:'var(--fg-muted)',fontWeight:700}}>
          v{doc.version} · {doc.effective}
        </div>
        <h2 id="legal-title">{t.title}</h2>
        {t.summary && <p className="auth-sub">{t.summary}</p>}
        <div className="legal-body" dangerouslySetInnerHTML={{ __html: t.body || '' }} />
        <div style={{textAlign:'right',marginTop:18}}>
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            {isKo ? '닫기' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
window.LegalModal = LegalModal;

// One consent line with checkbox + "View full text" link
function ConsentRow({ doc, lang, value, onChange, required, openDoc }) {
  const isKo = lang === 'ko';
  const t = (doc && (doc[lang] || doc.en || doc.ko)) || {};
  return (
    <label className="consent-row">
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} required={required} />
      <span className="consent-text">
        {required && <span className="consent-required" aria-label={isKo ? '필수' : 'required'}>(필수)</span>}
        <span>{t.title}</span>
        <button type="button" className="consent-view" onClick={(e) => { e.preventDefault(); openDoc(doc); }}>
          {isKo ? '전문 보기' : 'View'} ↗
        </button>
      </span>
    </label>
  );
}
window.ConsentRow = ConsentRow;

// Cookie / analytics consent banner shown until decided
function CookieBanner({ lang, c }) {
  const isKo = lang === 'ko';
  const KEY = 'dp_consent_analytics';
  const [decided, setDecided] = useStateL(() => localStorage.getItem(KEY) != null);
  const [showDoc, setShowDoc] = useStateL(false);
  const doc = c && c.legal && c.legal.analytics_cookies;
  if (decided || !doc) return null;

  const accept = () => {
    localStorage.setItem(KEY, '1');
    recordConsent('analytics', doc.version, true);
    setDecided(true);
  };
  const decline = () => {
    localStorage.setItem(KEY, '0');
    recordConsent('analytics', doc.version, false);
    // Stop the analytics-store from buffering further events
    if (window.DreamPathAnalytics && window.DreamPathAnalytics.flush) {
      window.DreamPathAnalytics.flush();
    }
    setDecided(true);
  };

  const t = (doc[lang] || doc.en || doc.ko || {});
  return (
    <>
      <div className="cookie-banner" role="region" aria-label={isKo ? '쿠키 동의' : 'Cookie consent'}>
        <div className="cookie-banner-text">
          <strong>{t.title}</strong>
          <span>{t.summary}</span>
        </div>
        <div className="cookie-banner-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowDoc(true)}>{isKo ? '자세히' : 'Details'}</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={decline}>{isKo ? '거부' : 'Decline'}</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={accept}>{isKo ? '동의' : 'Accept'}</button>
        </div>
      </div>
      {showDoc && <LegalModal doc={doc} lang={lang} onClose={() => setShowDoc(false)} />}
    </>
  );
}
window.CookieBanner = CookieBanner;
