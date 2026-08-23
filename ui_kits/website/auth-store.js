// auth-store.js — minimal user session store backed by /api/auth.
//
// v01.044: HttpOnly cookie is the primary session surface. The browser
// auto-attaches the dp_session cookie on same-origin fetches, so we
// don't read or store the token in JS at all on new sessions — an XSS
// payload can no longer reach the session token via document.cookie or
// localStorage.
//
// Backward compatibility: there are still tabs / installs out there
// holding a legacy localStorage token from before the cookie rollout.
// On init we try the cookie path first; if /api/auth/me says 401 we
// look for a legacy token and try once with the Bearer header. If
// that succeeds we promote the user state and clear the localStorage
// entry so the next request rides on the cookie alone.
(function() {
  const TOKEN_KEY = 'dp_user_token';   // legacy — read once on migration, then cleared
  let _user = null;
  let _ready = false;
  const subscribers = new Set();

  function emit() { subscribers.forEach(fn => { try { fn(); } catch (e) {} }); }

  function readLegacyToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
  }
  function clearLegacyToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
  }

  async function fetchMe() {
    // Cookie-first: same-origin fetches send dp_session automatically.
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
      // v01.097.05 — 서버가 익명에게 401 대신 200 { user: null } 을 준다.
      // 그 경우에도 아래 레거시 토큰 부트스트랩을 타야 하므로, "200 인데
      // user 가 없는" 응답은 성공으로 치지 않고 401 과 같은 길로 보낸다.
      const anonOk = res.ok && !((await res.clone().json().catch(() => ({}))).user);
      if (res.ok && !anonOk) {
        const data = await res.json();
        _user = data.user || null;
        _ready = true;
        // Cookie auth works → the dp_session cookie is authoritative. Drop any
        // stale legacy localStorage token so authFetch never attaches it as a
        // Bearer header (which would OVERRIDE the valid cookie server-side and
        // cause a spurious 401 on writes). Fixes "session expired" on message
        // send when both a valid cookie and an old dp_user_token are present.
        clearLegacyToken();
        emit();
        return _user;
      }
      // 401 path — if there's a legacy localStorage token, try one
      // Bearer-header bootstrap so users with old tokens stay logged in.
      if (res.status === 401 || anonOk) {
        const legacy = readLegacyToken();
        if (legacy) {
          const r2 = await fetch('/api/auth/me', {
            headers: { authorization: 'Bearer ' + legacy },
            credentials: 'same-origin',
          });
          const d2 = r2.ok ? await r2.json().catch(() => ({})) : null;
          if (d2 && d2.user) {
            const data = d2;
            _user = data.user || null;
            _ready = true;
            // Keep the legacy token in localStorage until the user
            // re-logs in — we still need it to authenticate writes
            // until the server-side cookie is set on next login.
            emit();
            return _user;
          }
          // Legacy token rejected by server → drop it so we stop
          // trying the slow Bearer path on every page load.
          clearLegacyToken();
        }
      }
      _user = null;
      _ready = true;
      emit();
      return null;
    } catch {
      _ready = true;
      emit();
      return null;
    }
  }

  async function signup({ email, password, password_confirm, name, phone_country, phone_national, lang }) {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password, password_confirm, name, phone_country, phone_national, lang }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'signup_failed');
    if (data.activation_required) {
      return { activation_required: true, email, expires_at: data.activation_expires_at };
    }
    // Server set the dp_session cookie via Set-Cookie. We do NOT touch
    // localStorage anymore — the cookie is the only place the token lives.
    _user = data.user;
    emit();
    return _user;
  }

  // Used by ActivateAccountView after a successful POST /api/auth/activate
  // so the UI can transition to "logged in" without a fresh login.
  function adoptSession(_unusedToken, user) {
    // The activation endpoint already set the dp_session cookie; we
    // intentionally ignore the token argument so it never lands in JS.
    _user = user || null;
    _ready = true;
    // If there's still a legacy localStorage entry from before, drop it
    // now that the cookie is authoritative.
    clearLegacyToken();
    emit();
  }

  async function login({ email, password }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'login_failed');
    // Cookie set by server. Drop any legacy localStorage token so XSS
    // can no longer reach the session.
    clearLegacyToken();
    _user = data.user;
    emit();
    return _user;
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {}
    clearLegacyToken();
    _user = null;
    emit();
  }

  // Authenticated fetch helper. Cookie is auto-attached on same-origin;
  // we only fall back to Authorization: Bearer for users still on the
  // legacy localStorage token (no cookie yet).
  async function authFetch(url, init = {}) {
    const headers = { ...(init.headers || {}) };
    const legacy = readLegacyToken();
    if (legacy && !headers['authorization'] && !headers['Authorization']) {
      headers['authorization'] = 'Bearer ' + legacy;
    }
    return fetch(url, { ...init, headers, credentials: 'same-origin' });
  }

  function subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  window.DreamPathAuth = {
    get user() { return _user; },
    get ready() { return _ready; },
    // Exposed for the rare component (Apply.jsx, Legal.jsx, Pages.jsx)
    // that still reads it to decide whether to add an Authorization
    // header. Returns '' once the localStorage entry has been cleared,
    // at which point the component should rely on credentials:
    // 'same-origin' (cookie) instead.
    get token() { return readLegacyToken(); },
    fetchMe, signup, login, logout, authFetch, subscribe, adoptSession,
  };

  fetchMe();
})();
