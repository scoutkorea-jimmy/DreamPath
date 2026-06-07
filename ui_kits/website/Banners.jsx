// Banners.jsx — homepage popup banner ads.
// Shows up to 3 image banners in a modal on the first homepage load of a
// session. Controls: "Close" (hide for this session) and "Don't show again
// today" (hide for the rest of the calendar day, persisted in localStorage).
// Public site is English-only, so the UI strings here are English regardless
// of the language toggle. Banners are pure images (operator-uploaded to R2);
// an optional link opens in a new tab when the image is clicked.
function BannerAdModal({ view, c }) {
  const { useState, useEffect } = React;

  const banners = (c && c.banners) || {};
  const items = (Array.isArray(banners.items) ? banners.items : [])
    .filter(b => b && b.active !== false && b.image)
    .slice(0, 3);
  const featureOn = banners.enabled !== false && items.length > 0;

  // Today key (local date) for the "don't show today" suppression.
  const todayKey = (() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  })();

  function suppressed() {
    try {
      if (localStorage.getItem('dp_banner_hide_day') === todayKey) return true;   // don't-show-today
      if (sessionStorage.getItem('dp_banner_closed') === '1') return true;          // closed this session
    } catch {}
    return false;
  }

  // Don't fight the cookie-consent banner. If an analytics-consent doc is
  // configured AND the visitor hasn't decided yet, the CookieBanner is on
  // screen — defer the ad so two popups don't compete (consent is the legal
  // priority). The ad then appears on a later home visit. No cookie doc, or
  // already decided → no deferral.
  function cookiePending() {
    if (!(c && c.legal && c.legal.analytics_cookies)) return false;
    try { return localStorage.getItem('dp_consent_analytics') == null; } catch { return false; }
  }

  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  // Decide visibility whenever the route or banner set changes. Only ever
  // shows on the home view; never re-opens once closed/suppressed.
  useEffect(() => {
    if (view === 'home' && featureOn && !suppressed() && !cookiePending()) setOpen(true);
    else setOpen(false);
  }, [view, featureOn, items.length]);

  // Re-init lucide icons (close X / arrows) once the modal mounts.
  useEffect(() => { if (open) setTimeout(() => window.lucide && window.lucide.createIcons(), 0); }, [open, idx]);

  // Escape closes (treated as a session Close), matching modal conventions.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open || !featureOn) return null;

  function close() { try { sessionStorage.setItem('dp_banner_closed', '1'); } catch {} setOpen(false); }
  function hideToday() { try { localStorage.setItem('dp_banner_hide_day', todayKey); } catch {} setOpen(false); }
  function clickBanner(b) { if (b.link) { try { window.open(b.link, '_blank', 'noopener'); } catch {} } }

  const multi = items.length > 1;
  const cur = items[Math.min(idx, items.length - 1)];

  return (
    <div className="bnr-overlay" role="dialog" aria-modal="true" aria-label="Announcement" onClick={close}>
      <div className="bnr-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="bnr-close" onClick={close} aria-label="Close">
          <i data-lucide="x" width="20" height="20" strokeWidth="2" aria-hidden="true"></i>
        </button>

        <div className="bnr-stage">
          {cur.link
            ? <button type="button" className="bnr-imgbtn" onClick={() => clickBanner(cur)} aria-label={cur.alt || 'Open'}>
                <img src={cur.image} alt={cur.alt || 'Banner'} />
              </button>
            : <img className="bnr-img" src={cur.image} alt={cur.alt || 'Banner'} />}

          {multi && (
            <>
              <button type="button" className="bnr-nav prev" aria-label="Previous"
                onClick={() => setIdx(i => (i - 1 + items.length) % items.length)}>
                <i data-lucide="chevron-left" width="22" height="22" strokeWidth="2"></i>
              </button>
              <button type="button" className="bnr-nav next" aria-label="Next"
                onClick={() => setIdx(i => (i + 1) % items.length)}>
                <i data-lucide="chevron-right" width="22" height="22" strokeWidth="2"></i>
              </button>
            </>
          )}
        </div>

        {multi && (
          <div className="bnr-dots" role="tablist" aria-label="Banners">
            {items.map((_, i) => (
              <button key={i} type="button" className={'bnr-dot' + (i === idx ? ' on' : '')}
                aria-label={'Banner ' + (i + 1)} aria-selected={i === idx} onClick={() => setIdx(i)} />
            ))}
          </div>
        )}

        <div className="bnr-foot">
          <button type="button" className="btn btn-ghost btn-sm" onClick={hideToday}>Don't show again today</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={close}>Close</button>
        </div>
      </div>
    </div>
  );
}

window.BannerAdModal = BannerAdModal;
