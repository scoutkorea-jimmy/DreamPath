// auth-store.js — minimal user session store backed by /api/auth.
// Token persisted in localStorage as 'dp_user_token'; user object cached in memory.
(function() {
  const TOKEN_KEY = 'dp_user_token';
  let _user = null;
  let _ready = false;
  const subscribers = new Set();

  function emit() { subscribers.forEach(fn => { try { fn(); } catch (e) {} }); }

  function token() { return localStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function fetchMe() {
    const t = token();
    if (!t) { _user = null; _ready = true; emit(); return null; }
    try {
      const res = await fetch('/api/auth/me', { headers: { authorization: 'Bearer ' + t } });
      if (!res.ok) { setToken(''); _user = null; _ready = true; emit(); return null; }
      const data = await res.json();
      _user = data.user || null;
      _ready = true;
      emit();
      return _user;
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
      body: JSON.stringify({ email, password, password_confirm, name, phone_country, phone_national, lang }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'signup_failed');
    // When activation is required, the worker returns no token — the user
    // sees the "check your email" screen and finishes via /activate.
    if (data.activation_required) {
      return { activation_required: true, email, expires_at: data.activation_expires_at, dev_code: data.activation_code || null };
    }
    setToken(data.token);
    _user = data.user;
    emit();
    return _user;
  }
  // Used by ActivateAccountView after a successful POST /api/auth/activate
  // so the UI can transition to "logged in" without forcing a fresh login.
  function adoptSession(t, user) {
    if (!t) return;
    setToken(t);
    _user = user || null;
    _ready = true;
    emit();
  }

  async function login({ email, password }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'login_failed');
    setToken(data.token);
    _user = data.user;
    emit();
    return _user;
  }

  async function logout() {
    const t = token();
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: { authorization: 'Bearer ' + t } });
    } catch {}
    setToken('');
    _user = null;
    emit();
  }

  // Authenticated fetch helper
  async function authFetch(url, init = {}) {
    const headers = { ...(init.headers || {}) };
    const t = token();
    if (t) headers['authorization'] = 'Bearer ' + t;
    return fetch(url, { ...init, headers });
  }

  function subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  window.DreamPathAuth = {
    get user() { return _user; },
    get ready() { return _ready; },
    get token() { return token(); },
    fetchMe, signup, login, logout, authFetch, subscribe, adoptSession,
  };

  // Kick off initial fetch
  fetchMe();
})();
