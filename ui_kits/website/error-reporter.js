// error-reporter.js — capture client-side errors and send to /api/errors.
// Runs early so it catches initialization errors too.
(function () {
  const KEY = 'dp_session_id';
  function sid() { return sessionStorage.getItem(KEY) || ''; }

  function send(level, source, message, stack, meta) {
    try {
      const payload = JSON.stringify({
        level, source,
        message: String(message || '').slice(0, 1000),
        stack: stack ? String(stack).slice(0, 4000) : null,
        path: window.location.pathname + window.location.search,
        session_id: sid(),
        meta,
      });
      const url = '/api/errors';
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
      } else {
        fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
      }
    } catch {}
  }

  window.addEventListener('error', (e) => {
    // Some errors are noise (extensions); skip if we have no message
    if (!e.message) return;
    send('error', 'unhandled', e.message, e.error && e.error.stack, {
      filename: e.filename, lineno: e.lineno, colno: e.colno,
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason || {};
    send('error', 'rejection', r.message || String(r), r.stack, null);
  });

  window.DreamPathErrors = {
    report: (message, meta) => send('error', 'manual', message, null, meta || null),
    info:   (message, meta) => send('info',  'manual', message, null, meta || null),
  };
})();
