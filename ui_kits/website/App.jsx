// App.jsx — root router with editable content store + auth modal
const { useState: useStateR, useEffect: useEffectR } = React;

function useContent() {
  const [c, setC] = useStateR(() => window.DreamPathContent.load());
  useEffectR(() => {
    const h = () => setC(window.DreamPathContent.load());
    window.addEventListener('dp-content-changed', h);
    return () => window.removeEventListener('dp-content-changed', h);
  }, []);
  return c;
}
window.useContent = useContent;

// Friendly URL <-> view-state mapping. Update both when navigating.
const VIEW_TO_PATH = {
  home: '/', about: '/about', programs: '/programs', apply: '/apply',
  partners: '/partners', stories: '/stories', news: '/news', contact: '/contact',
  team: '/team', scholarships: '/scholarships', member: '/member', receipt: '/receipt',
  err401: '/401', err403: '/403', err404: '/404', err500: '/500', err503: '/503', offline: '/offline',
};
const PATH_TO_VIEW = Object.fromEntries(Object.entries(VIEW_TO_PATH).map(([v, p]) => [p, v]));

function viewFromLocation() {
  const path = window.location.pathname;
  if (path.startsWith('/program/')) return 'program';
  if (path.startsWith('/news/'))    return 'newsdetail';
  if (path.startsWith('/stories/')) return 'storydetail';
  if (path === '/' || path === '') return 'home';
  return PATH_TO_VIEW[path] || PATH_TO_VIEW[path.replace(/\/$/, '')] || 'err404';
}
// Pull the trailing id segment out of a /collection/:id URL (decoded, no slash).
function detailIdFromPath(prefix) {
  const p = window.location.pathname;
  if (!p.startsWith(prefix)) return '';
  return decodeURIComponent(p.slice(prefix.length).replace(/\/$/, ''));
}

function App() {
  const [view, setView] = useStateR(viewFromLocation);
  const [programId, setProgramId] = useStateR(() => {
    const p = window.location.pathname;
    if (p.startsWith('/program/')) return decodeURIComponent(p.slice('/program/'.length).replace(/\/$/, ''));
    return localStorage.getItem('dp_prog') || 'korean-studies';
  });
  // Detail-page ids for /news/:id and /stories/:id. Restored from URL on
  // direct page load + on browser back/forward.
  const [newsId, setNewsId]   = useStateR(() => detailIdFromPath('/news/'));
  const [storyId, setStoryId] = useStateR(() => detailIdFromPath('/stories/'));
  const [lang, setLang] = useStateR(() => localStorage.getItem('dp_lang') || 'ko');
  const [authOpen, setAuthOpen] = useStateR(false);
  const [authMode, setAuthMode] = useStateR('login');
  const content = useContent();

  useEffectR(() => {
    localStorage.setItem('dp_view', view);
    localStorage.setItem('dp_lang', lang);
    localStorage.setItem('dp_prog', programId);
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => window.lucide && window.lucide.createIcons(), 50);
  }, [view, lang, programId, content]);

  useEffectR(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Per-route SEO meta. Reads c.og.{default, pages[view]} and updates
  // <title>, <meta name=description>, og:title, og:description, og:image,
  // og:url. Empty fields cascade: page → default → static <head> values.
  useEffectR(() => {
    if (!content || !content.og) return;
    const og = content.og;
    const pageKey = view === 'program' ? 'programs' : view;  // /program/:id reuses Programs OG
    const page = (og.pages && og.pages[pageKey]) || {};
    const def = og.default || {};
    const pickLang = (k) => (lang === 'ko' ? page[k + '_ko'] || def[k + '_ko'] : page[k + '_en'] || def[k + '_en']) || '';
    const title = pickLang('title');
    const desc = pickLang('desc');
    const image = page.image || def.image || '';
    const url = window.location.origin + window.location.pathname;

    function setMeta(selector, attr, value) {
      if (!value) return;
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        const [, prop] = selector.match(/\[([^=]+)="([^"]+)"\]/) || [];
        const m = selector.match(/\[([a-z]+)="([^"]+)"\]/);
        if (m) el.setAttribute(m[1], m[2]);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    }
    if (title) document.title = title;
    setMeta('meta[name="description"]', 'content', desc);
    setMeta('meta[property="og:title"]', 'content', title || document.title);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[property="og:image"]', 'content', image);
    setMeta('meta[property="og:url"]', 'content', url);
  }, [view, lang, content]);

  // Listen for "open auth" events from anywhere in the tree
  useEffectR(() => {
    const onOpen = (e) => {
      setAuthMode((e.detail && e.detail.mode) || 'login');
      setAuthOpen(true);
    };
    window.addEventListener('dp-open-auth', onOpen);
    return () => window.removeEventListener('dp-open-auth', onOpen);
  }, []);

  const go = (v, arg, opts) => {
    if (v === 'program' && arg) setProgramId(arg);
    if (v === 'newsdetail'  && arg) setNewsId(arg);
    if (v === 'storydetail' && arg) setStoryId(arg);
    setView(v);
    // Push a real URL so back-button + sharing work
    const newPath =
      v === 'program'     && arg ? '/program/'   + encodeURIComponent(arg) :
      v === 'newsdetail'  && arg ? '/news/'      + encodeURIComponent(arg) :
      v === 'storydetail' && arg ? '/stories/'   + encodeURIComponent(arg) :
      (VIEW_TO_PATH[v] || '/');
    let qs = '';
    if (opts && typeof opts === 'object') {
      const usp = new URLSearchParams();
      Object.entries(opts).forEach(([k, val]) => { if (val != null && val !== '') usp.set(k, String(val)); });
      const s = usp.toString();
      if (s) qs = '?' + s;
    }
    if (window.location.pathname !== newPath || qs !== window.location.search) {
      window.history.pushState({ v, arg }, '', newPath + qs);
      // Notify analytics-store of the route change
      window.dispatchEvent(new CustomEvent('dp-route-change', { detail: { view: v, arg } }));
    }
  };

  // Handle browser back/forward
  useEffectR(() => {
    const onPop = () => {
      const v = viewFromLocation();
      setView(v);
      if (v === 'program') {
        const id = detailIdFromPath('/program/');
        if (id) setProgramId(id);
      } else if (v === 'newsdetail') {
        const id = detailIdFromPath('/news/');
        if (id) setNewsId(id);
      } else if (v === 'storydetail') {
        const id = detailIdFromPath('/stories/');
        if (id) setStoryId(id);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Offline auto-redirect (only when navigator says offline; user can still
  // browse cached app shell). When back online, popstate-restores last view.
  useEffectR(() => {
    const onOffline = () => {
      if (view !== 'offline') {
        setView('offline');
        window.history.pushState({}, '', '/offline');
      }
    };
    window.addEventListener('offline', onOffline);
    return () => window.removeEventListener('offline', onOffline);
  }, [view]);

  // Safe render — Babel-in-browser parses each .jsx file lazily, so on a
  // cold load (especially over flaky networks where /offline triggers
  // before the bundle is parsed) the per-route component might still be
  // undefined. Without this guard we crash with React error #130 instead
  // of just showing a placeholder for a few hundred ms.
  function safe(Comp, props) {
    if (!Comp) {
      return <div className="container" style={{padding:'80px 24px',textAlign:'center',color:'var(--fg-muted)'}}>Loading…</div>;
    }
    return <Comp {...props} />;
  }

  const baseProps = { go, lang, c: content };
  let content_view;
  switch (view) {
    case 'home':         content_view = safe(window.Home, baseProps); break;
    case 'about':        content_view = safe(window.About, { lang, c: content }); break;
    case 'programs':     content_view = safe(window.Programs, baseProps); break;
    case 'program':      content_view = safe(window.ProgramDetail, { ...baseProps, programId }); break;
    case 'apply':        content_view = safe(window.Apply, { lang, c: content }); break;
    case 'partners':     content_view = safe(window.Partners, { lang, c: content }); break;
    case 'stories':      content_view = safe(window.Stories, { go, lang, c: content }); break;
    case 'storydetail':  content_view = safe(window.StoryDetail, { go, lang, c: content, storyId }); break;
    case 'news':         content_view = safe(window.News, { go, lang, c: content }); break;
    case 'newsdetail':   content_view = safe(window.NewsDetail, { go, lang, c: content, newsId }); break;
    case 'contact':      content_view = safe(window.Contact, { lang, c: content }); break;
    case 'team':         content_view = safe(window.Team, baseProps); break;
    case 'scholarships': content_view = safe(window.Scholarships, baseProps); break;
    case 'member':       content_view = safe(window.Member, baseProps); break;
    case 'receipt':      content_view = safe(window.Receipt, { lang, c: content }); break;
    case 'err401':       content_view = safe(window.Error401, baseProps); break;
    case 'err403':       content_view = safe(window.Error403, baseProps); break;
    case 'err404':       content_view = safe(window.Error404, baseProps); break;
    case 'err500':       content_view = safe(window.Error500, baseProps); break;
    case 'err503':       content_view = safe(window.Error503, baseProps); break;
    case 'offline':      content_view = safe(window.ErrorOffline, baseProps); break;
    default:             content_view = safe(window.Home, baseProps);
  }

  // Top notice banner (dev / launch / maintenance) — stripe across the top
  const notice = content && content.notice;
  const noticeText = notice && notice[lang];
  const showNotice = notice && notice.enabled !== false && noticeText;

  return (
    <div className="page">
      <a href="#main" className="skip-link">{lang === 'ko' ? '본문 바로가기' : 'Skip to main content'}</a>
      {showNotice && (
        <div className={'topnotice ' + (notice.style || 'dev')} role="status" aria-live="polite">
          <span>{noticeText}</span>
        </div>
      )}
      <window.Nav view={view} go={go} lang={lang} setLang={setLang} c={content} />
      <main id="main" style={{flex: 1}} tabIndex="-1">{content_view}</main>
      <window.Footer go={go} lang={lang} c={content} />
      <window.AuthModal open={authOpen} onClose={() => setAuthOpen(false)} lang={lang} defaultMode={authMode} />
      {window.CookieBanner && <window.CookieBanner lang={lang} c={content} />}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
