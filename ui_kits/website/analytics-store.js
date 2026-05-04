// analytics-store.js — lightweight, batched, beacon-friendly visitor tracking.
// Public site auto-records pageviews on route changes and click events on
// any element marked with data-track or [data-track-as].
(function () {
  const SESSION_KEY = 'dp_session_id';
  const ENDPOINT = '/api/analytics';
  const FLUSH_AFTER_MS = 4000;
  const FLUSH_AFTER_N  = 12;

  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return 's-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function sessionId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) { id = uuid(); sessionStorage.setItem(SESSION_KEY, id); }
    return id;
  }

  function utmFromUrl() {
    try {
      const usp = new URLSearchParams(window.location.search);
      return {
        utm_source:   usp.get('utm_source')   || undefined,
        utm_medium:   usp.get('utm_medium')   || undefined,
        utm_campaign: usp.get('utm_campaign') || undefined,
      };
    } catch { return {}; }
  }

  let queue = [];
  let timer = null;

  // Honor analytics consent. If user explicitly declined, drop everything.
  function consented() {
    const v = localStorage.getItem('dp_consent_analytics');
    return v !== '0';  // null (undecided) defaults to allow first-party-only tracking
  }
  // Admin preview iframes load with ?preview=1 — never count those as real traffic.
  function isPreview() {
    try { return new URLSearchParams(location.search).get('preview') === '1'; }
    catch { return false; }
  }

  function push(ev) {
    if (!consented() || isPreview()) return;
    queue.push({
      session_id: sessionId(),
      ts: new Date().toISOString(),
      lang: document.documentElement.lang || 'ko',
      referrer: document.referrer || '',
      ...utmFromUrl(),
      ...ev,
    });
    if (queue.length >= FLUSH_AFTER_N) flush();
    else schedule();
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(flush, FLUSH_AFTER_MS);
  }
  function flush() {
    clearTimeout(timer); timer = null;
    if (queue.length === 0) return;
    const events = queue.slice();
    queue = [];
    const body = JSON.stringify({ events });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
        return;
      }
    } catch {}
    fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }
  // Flush on tab close/hide
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);

  // ── Public API ──────────────────────────────────────────────────────────
  function pageview(opts = {}) {
    push({
      type: 'pageview',
      path: window.location.pathname,
      view: opts.view,
    });
  }
  function track(target, opts = {}) {
    push({
      type: 'click',
      path: window.location.pathname,
      view: opts.view,
      target,
    });
  }
  function event(name, opts = {}) {
    push({
      type: 'event',
      path: window.location.pathname,
      view: opts.view,
      target: name,
    });
  }

  // ── Auto-tracking ───────────────────────────────────────────────────────
  // First pageview
  pageview();

  // Track route changes via custom event from App.jsx (dispatched on every go())
  window.addEventListener('dp-route-change', (e) => {
    pageview({ view: e.detail && e.detail.view });
  });

  // Click tracking: any element with data-track or data-track-as
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('[data-track-as], [data-track]');
    if (!el) return;
    const target = el.getAttribute('data-track-as') || el.getAttribute('data-track')
      || (el.textContent || '').trim().slice(0, 80);
    track(target);
  }, true);

  window.DreamPathAnalytics = { pageview, track, event, flush };
})();
