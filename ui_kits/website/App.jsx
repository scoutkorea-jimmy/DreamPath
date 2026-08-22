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

// Error boundary (v01.097) — until now the SPA had none. React 18 unmounts
// the ENTIRE tree when any component throws during render, so a single bad
// value (a null array out of KV, an undefined field on a half-merged content
// blob) turned every page into a blank white screen with no way back.
//
// Two of these are mounted: one around the routed view only — so a broken
// page keeps the nav and footer alive and the visitor can click elsewhere —
// and one around the whole app as a last resort.
class DPErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) { return { err: err }; }
  componentDidCatch(err, info) {
    try {
      window.DreamPathErrors && window.DreamPathErrors.report(
        'React render crash: ' + (err && err.message ? err.message : String(err)),
        { scope: this.props.scope || 'app', componentStack: String(info && info.componentStack || '').slice(0, 2000) }
      );
    } catch (e) {}
  }
  componentDidUpdate(prev) {
    // Reset when the caller signals a new context (e.g. the route changed),
    // otherwise a one-off bad page would stay stuck on the error card forever.
    if (this.state.err && prev.resetKey !== this.props.resetKey) this.setState({ err: null });
  }
  render() {
    if (!this.state.err) return this.props.children;
    const isKo = this.props.lang === 'ko';
    return (
      <div className="container" style={{padding:'96px 24px',textAlign:'center',wordBreak:'keep-all',overflowWrap:'break-word'}}>
        <h1 style={{fontSize:22,lineHeight:1.5,margin:'0 0 12px',color:'var(--fg-primary)'}}>
          {isKo ? '이 페이지를 표시하지 못했습니다' : "We couldn't display this page"}
        </h1>
        <p style={{fontSize:15,lineHeight:1.7,margin:'0 0 28px',color:'var(--fg-muted)',maxWidth:440,marginLeft:'auto',marginRight:'auto'}}>
          {isKo
            ? '문제가 자동으로 보고되었습니다. 다른 메뉴는 정상적으로 이용하실 수 있습니다.'
            : 'The problem has been reported automatically. The rest of the site still works.'}
        </p>
        <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
          <button type="button" className="btn btn-primary"
            onClick={() => { this.setState({ err: null }); }}>
            {isKo ? '다시 시도' : 'Try again'}
          </button>
          <button type="button" className="btn btn-secondary"
            onClick={() => { window.location.href = '/'; }}>
            {isKo ? '홈으로' : 'Go home'}
          </button>
        </div>
      </div>
    );
  }
}
window.DPErrorBoundary = DPErrorBoundary;

// Friendly URL <-> view-state mapping. Update both when navigating.
const VIEW_TO_PATH = {
  home: '/', about: '/about', programs: '/programs', apply: '/apply',
  partners: '/partners', stories: '/stories', news: '/news', contact: '/contact',
  team: '/team', scholarships: '/scholarships', member: '/member', receipt: '/receipt',
  verify: '/verify', resetpw: '/reset-password', activate: '/activate',
  err401: '/401', err403: '/403', err404: '/404', err500: '/500', err503: '/503', offline: '/offline',
};
const PATH_TO_VIEW = Object.fromEntries(Object.entries(VIEW_TO_PATH).map(([v, p]) => [p, v]));

function viewFromLocation() {
  const path = window.location.pathname;
  if (path.startsWith('/program/'))     return 'program';
  if (path.startsWith('/scholarship/')) return 'scholarshipdetail';
  if (path.startsWith('/news/'))        return 'newsdetail';
  if (path.startsWith('/stories/'))     return 'storydetail';
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
    return localStorage.getItem('dp_prog') || 'ai-language';
  });
  // Detail-page ids for /news/:id and /stories/:id. Restored from URL on
  // direct page load + on browser back/forward.
  const [newsId, setNewsId]   = useStateR(() => detailIdFromPath('/news/'));
  const [storyId, setStoryId] = useStateR(() => detailIdFromPath('/stories/'));
  const [scholarshipId, setScholarshipId] = useStateR(() => detailIdFromPath('/scholarship/'));
  const [lang, setLang] = useStateR('en');
  const [authOpen, setAuthOpen] = useStateR(false);
  const [authMode, setAuthMode] = useStateR('login');
  const content = useContent();

  useEffectR(() => {
    localStorage.setItem('dp_view', view);
    localStorage.setItem('dp_lang', 'en');
    localStorage.setItem('dp_prog', programId);
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => window.lucide && window.lucide.createIcons(), 50);
  }, [view, lang, programId, content]);

  // Render Lucide icons after EVERY render — not just on route change. Child
  // components (FAQ tabs, accordions, floaters) re-render on their own internal
  // state, which re-inserts fresh <i data-lucide> nodes that the route-scoped
  // call above never reprocesses → blank icons (empty squares/circles).
  // createIcons() is idempotent and DOM-only (no React state), so running it
  // each render is safe. This mirrors the admin shell, where icons always show.
  useEffectR(() => { window.lucide && window.lucide.createIcons(); });

  useEffectR(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Site-verification meta tags (Google / Naver / Bing / Facebook / Yandex /
  // Pinterest). These are public proofs the search consoles look for once,
  // so they only need to be in <head> — no need to update on route change.
  // Inserted once when content first loads; the helper is idempotent so
  // re-runs don't duplicate tags. Empty values are skipped.
  useEffectR(() => {
    if (!content || !content.site_verifications) return;
    const v = content.site_verifications;
    const TAGS = [
      { name: 'google-site-verification',     value: v.google },
      { name: 'naver-site-verification',      value: v.naver },
      { name: 'msvalidate.01',                value: v.bing },
      { name: 'facebook-domain-verification', value: v.facebook },
      { name: 'p:domain_verify',              value: v.pinterest },
      { name: 'yandex-verification',          value: v.yandex },
    ];
    for (const t of TAGS) {
      if (!t.value) continue;
      let el = document.head.querySelector(`meta[name="${t.name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', t.name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', t.value);
    }
  }, [content && content.site_verifications]);

  // Per-route SEO meta. Reads c.og.{default, pages[view]} and updates
  // <title>, <meta name=description>, og:title, og:description, og:image,
  // og:url. Empty fields cascade: page → default → static <head> values.
  useEffectR(() => {
    if (!content || !content.og) return;
    const og = content.og;
    const pageKey = view === 'program' ? 'programs'           // /program/:id reuses Programs OG
                  : view === 'scholarshipdetail' ? 'scholarships'  // /scholarship/:id reuses Scholarships OG
                  : view;
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
    if (v === 'scholarshipdetail' && arg) setScholarshipId(arg);
    setView(v);
    // Push a real URL so back-button + sharing work
    const newPath =
      v === 'program'     && arg ? '/program/'   + encodeURIComponent(arg) :
      v === 'scholarshipdetail' && arg ? '/scholarship/' + encodeURIComponent(arg) :
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
      } else if (v === 'scholarshipdetail') {
        const id = detailIdFromPath('/scholarship/');
        if (id) setScholarshipId(id);
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

  // 프로그램 공개 중단 스위치 + 그 자리에 보여줄 안내 화면. 훅이 아니라
  // 순수 계산이라 아래 switch 위 어디에 있어도 렌더 순서에 영향이 없다.
  const pGate = (content && content.programs_gate) || {};
  const programsHidden = !!pGate.hidden;
  const isKoView = lang === 'ko';
  const gateNotice = (
    <div data-screen-label="Programs · Hidden" className="container"
      style={{padding:'96px 24px',textAlign:'center',maxWidth:640,wordBreak:'keep-all',overflowWrap:'break-word'}}>
      <div style={{width:64,height:64,borderRadius:'50%',background:'var(--bg-muted)',display:'inline-flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
        <i data-lucide="hammer" width="28" height="28" strokeWidth="1.75" style={{color:'var(--fg-muted)'}}></i>
      </div>
      <h1 style={{fontSize:24,lineHeight:1.45,margin:'0 0 12px',color:'var(--fg-primary)'}}>
        {(isKoView ? pGate.title_ko : pGate.title_en) || (isKoView ? '프로그램 정보를 정비하고 있습니다' : 'Program information is being updated')}
      </h1>
      <p style={{fontSize:15,lineHeight:1.75,margin:'0 0 28px',color:'var(--fg-muted)',whiteSpace:'pre-line'}}>
        {(isKoView ? pGate.body_ko : pGate.body_en) || ''}
      </p>
      <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
        <button type="button" className="btn btn-primary" onClick={() => go('scholarships')}>
          {isKoView ? '장학 정보 보기' : 'See scholarships'} →
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => go('contact')}>
          {isKoView ? '문의하기' : 'Contact us'}
        </button>
      </div>
    </div>
  );

  let content_view;
  switch (view) {
    case 'home':         content_view = safe(window.Home, baseProps); break;
    case 'about':        content_view = safe(window.About, { lang, c: content }); break;
    // 프로그램 공개 중단(c.programs_gate.hidden) — 목록·상세를 안내 화면으로
    // 대체한다. 라우트는 살려 둔다: 외부에 이미 퍼진 링크가 404 가 되는 것보다
    // "정비 중" 안내를 만나는 편이 낫다.
    case 'programs':     content_view = programsHidden ? gateNotice : safe(window.Programs, baseProps); break;
    case 'program':      content_view = programsHidden ? gateNotice : safe(window.ProgramDetail, { ...baseProps, programId }); break;
    case 'apply':        content_view = safe(window.Apply, { go, lang, c: content }); break;
    case 'partners':     content_view = safe(window.Partners, { lang, c: content }); break;
    case 'stories':      content_view = safe(window.Stories, { go, lang, c: content }); break;
    case 'storydetail':  content_view = safe(window.StoryDetail, { go, lang, c: content, storyId }); break;
    case 'news':         content_view = safe(window.News, { go, lang, c: content }); break;
    case 'newsdetail':   content_view = safe(window.NewsDetail, { go, lang, c: content, newsId }); break;
    case 'contact':      content_view = safe(window.Contact, { lang, c: content }); break;
    case 'team':         content_view = safe(window.Team, baseProps); break;
    case 'scholarships': content_view = safe(window.Scholarships, baseProps); break;
    case 'scholarshipdetail': content_view = safe(window.ScholarshipDetail, { go, lang, c: content, scholarshipId }); break;
    case 'member':       content_view = safe(window.Member, baseProps); break;
    case 'receipt':      content_view = safe(window.Receipt, { lang, c: content }); break;
    case 'verify':       content_view = safe(window.VerifyEmailView, baseProps); break;
    case 'resetpw':      content_view = safe(window.ResetPasswordView, baseProps); break;
    case 'activate':     content_view = safe(window.ActivateAccountView, baseProps); break;
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
      <main id="main" style={{flex: 1}} tabIndex="-1">
        <DPErrorBoundary scope={'view:' + view} resetKey={view} lang={lang}>{content_view}</DPErrorBoundary>
      </main>
      <window.Footer go={go} lang={lang} c={content} />
      <window.AuthModal open={authOpen} onClose={() => setAuthOpen(false)} lang={lang} defaultMode={authMode} />
      {window.CookieBanner && <window.CookieBanner lang={lang} c={content} />}
      {window.BannerAdModal && <window.BannerAdModal view={view} c={content} />}
      {window.VersionWatcher && <window.VersionWatcher lang={lang} />}
      {window.ChatBot && <window.ChatBot lang={lang} c={content} go={go} />}
      {window.EntryGate && <window.EntryGate lang={lang} c={content} />}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
// Outer boundary catches crashes in Nav/Footer/modals — the parts that sit
// outside the routed view and would otherwise still blank the whole page.
root.render(<DPErrorBoundary scope="root"><App /></DPErrorBoundary>);
