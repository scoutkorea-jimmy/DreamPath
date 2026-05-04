// theme-store.js — light / dark / system theme controller.
//
// Persists the user's choice in localStorage as 'dp_theme' with values
//   'light' | 'dark' | 'system'   (default: 'system')
// and writes the resolved value to <html data-theme>. site.css and the
// admin shell read CSS variables that flip on that attribute.
//
// Components subscribe via window.DreamPathTheme.subscribe(fn) and read the
// current state with .get(). Changing the choice with .set(next) updates
// localStorage, the DOM, and notifies subscribers.
(function () {
  const STORAGE_KEY = 'dp_theme';
  const VALID = new Set(['light', 'dark', 'system']);

  const subs = new Set();

  function readStored() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return VALID.has(v) ? v : 'system';
    } catch { return 'system'; }
  }

  function systemPrefersDark() {
    try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; }
    catch { return false; }
  }

  function resolve(choice) {
    if (choice === 'dark') return 'dark';
    if (choice === 'light') return 'light';
    return systemPrefersDark() ? 'dark' : 'light';
  }

  function apply(choice) {
    const resolved = resolve(choice);
    document.documentElement.setAttribute('data-theme', resolved);
    // Hint the browser so form controls / scrollbars match. Avoid setting
    // 'light dark' here because we want the chrome to follow our explicit
    // choice rather than the OS preference when the user picked one.
    document.documentElement.style.colorScheme = resolved;
  }

  let _choice = readStored();
  apply(_choice);

  // React to OS changes when the user is on 'system'.
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMqChange = () => { if (_choice === 'system') { apply('system'); notify(); } };
    if (mq.addEventListener) mq.addEventListener('change', onMqChange);
    else if (mq.addListener) mq.addListener(onMqChange);
  } catch {}

  // Cross-tab sync — another tab toggled the theme.
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && VALID.has(e.newValue) && e.newValue !== _choice) {
      _choice = e.newValue;
      apply(_choice);
      notify();
    }
  });

  function notify() { subs.forEach(fn => { try { fn(); } catch (e) {} }); }

  function set(next) {
    if (!VALID.has(next) || next === _choice) return;
    _choice = next;
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    apply(_choice);
    notify();
  }

  window.DreamPathTheme = {
    /** 'light' | 'dark' | 'system' — what the user picked. */
    get choice() { return _choice; },
    /** 'light' | 'dark' — what is actually rendered right now. */
    get resolved() { return resolve(_choice); },
    set,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
})();
