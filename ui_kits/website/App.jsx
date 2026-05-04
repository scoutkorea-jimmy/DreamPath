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
  member: '/member', receipt: '/receipt',
};
const PATH_TO_VIEW = Object.fromEntries(Object.entries(VIEW_TO_PATH).map(([v, p]) => [p, v]));

function viewFromLocation() {
  const path = window.location.pathname;
  if (path.startsWith('/program/')) return 'program';
  return PATH_TO_VIEW[path] || PATH_TO_VIEW[path.replace(/\/$/, '')] || 'home';
}

function App() {
  const [view, setView] = useStateR(viewFromLocation);
  const [programId, setProgramId] = useStateR(() => {
    const p = window.location.pathname;
    if (p.startsWith('/program/')) return decodeURIComponent(p.slice('/program/'.length).replace(/\/$/, ''));
    return localStorage.getItem('dp_prog') || 'korean-studies';
  });
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

  // Listen for "open auth" events from anywhere in the tree
  useEffectR(() => {
    const onOpen = (e) => {
      setAuthMode((e.detail && e.detail.mode) || 'login');
      setAuthOpen(true);
    };
    window.addEventListener('dp-open-auth', onOpen);
    return () => window.removeEventListener('dp-open-auth', onOpen);
  }, []);

  const go = (v, arg) => {
    if (v === 'program' && arg) setProgramId(arg);
    setView(v);
    // Push a real URL so back-button + sharing work
    const newPath = v === 'program' && arg
      ? '/program/' + encodeURIComponent(arg)
      : (VIEW_TO_PATH[v] || '/');
    if (window.location.pathname !== newPath) {
      window.history.pushState({ v, arg }, '', newPath + window.location.search);
    }
  };

  // Handle browser back/forward
  useEffectR(() => {
    const onPop = () => {
      const v = viewFromLocation();
      setView(v);
      if (v === 'program') {
        const id = decodeURIComponent(window.location.pathname.slice('/program/'.length).replace(/\/$/, ''));
        if (id) setProgramId(id);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  let content_view;
  switch (view) {
    case 'home':     content_view = <window.Home go={go} lang={lang} c={content} />; break;
    case 'about':    content_view = <window.About lang={lang} c={content} />; break;
    case 'programs': content_view = <window.Programs go={go} lang={lang} c={content} />; break;
    case 'program':  content_view = <window.ProgramDetail go={go} lang={lang} programId={programId} c={content} />; break;
    case 'apply':    content_view = <window.Apply lang={lang} c={content} />; break;
    case 'partners': content_view = <window.Partners lang={lang} c={content} />; break;
    case 'stories':  content_view = <window.Stories lang={lang} c={content} />; break;
    case 'news':     content_view = <window.News lang={lang} c={content} />; break;
    case 'contact':  content_view = <window.Contact lang={lang} c={content} />; break;
    case 'member':   content_view = <window.Member go={go} lang={lang} c={content} />; break;
    case 'receipt':  content_view = <window.Receipt lang={lang} c={content} />; break;
    default:         content_view = <window.Home go={go} lang={lang} c={content} />;
  }

  return (
    <div className="page">
      <a href="#main" className="skip-link">{lang === 'ko' ? '본문 바로가기' : 'Skip to main content'}</a>
      <window.Nav view={view} go={go} lang={lang} setLang={setLang} c={content} />
      <main id="main" style={{flex: 1}} tabIndex="-1">{content_view}</main>
      <window.Footer go={go} lang={lang} c={content} />
      <window.AuthModal open={authOpen} onClose={() => setAuthOpen(false)} lang={lang} defaultMode={authMode} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
