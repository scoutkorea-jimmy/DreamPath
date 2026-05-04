// Nav.jsx — top nav with hover dropdowns + user menu
function Nav({ view, go, lang, setLang, c }) {
  const n = c.nav[lang];
  const isKo = lang === 'ko';
  const auth = window.useAuth ? window.useAuth() : { user: null, ready: true };
  const [menuOpen, setMenuOpen] = React.useState(false);

  // Build the "프로그램" submenu by category from current c.programs
  const programs = (c && Array.isArray(c.programs)) ? c.programs : [];
  const categories = (() => {
    const seen = new Set();
    const out = [];
    programs.forEach(p => {
      const raw = p.category || (p.kicker ? p.kicker.split('·')[0].trim() : '');
      if (!raw) return;
      const key = raw.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ key, label: raw });
    });
    return out;
  })();

  // Menu structure — top-level items have either `view` (direct link) or
  // `children` (dropdown). Active state highlights the parent if any of
  // the children's views are active.
  const MENU = [
    {
      label: n.about, parentViews: ['about','team','partners'],
      children: [
        { view: 'about',    label: isKo ? '프로젝트 소개' : 'The project' },
        { view: 'team',     label: isKo ? '프로젝트 팀'   : 'Project team' },
        { view: 'partners', label: isKo ? '협력기관'      : 'Partnerships' },
      ],
    },
    {
      label: n.programs, parentViews: ['programs','program','news','stories'],
      children: [
        { view: 'programs', label: isKo ? '전체 프로그램' : 'All programs' },
        ...categories.map(cat => ({
          view: 'programs', opts: { cat: cat.key },
          label: cat.label,
        })),
        { divider: true },
        { view: 'news',    label: isKo ? '프로그램 소식' : 'Program news' },
        { view: 'stories', label: isKo ? '프로그램 후기' : 'Program reviews' },
      ],
    },
    { label: n.scholarships || (isKo ? '장학 프로그램' : 'Scholarships'), view: 'scholarships', parentViews: ['scholarships'] },
    { label: n.contact || (isKo ? '문의하기' : 'Contact'), view: 'contact', parentViews: ['contact'] },
  ];

  function openAuth(mode) {
    window.dispatchEvent(new CustomEvent('dp-open-auth', { detail: { mode } }));
    setMenuOpen(false);
  }

  return (
    <nav className="nav" aria-label={isKo ? '주요 메뉴' : 'Primary navigation'}>
      <div className="nav-inner">
        <button className="nav-logo" onClick={() => go('home')} aria-label={isKo ? '홈으로' : 'Home'} type="button">
          <img src={c.brand.logo_mark} alt="" width="32" height="32" />
          <span className="wm" aria-hidden="true">{c.brand.wordmark_mark || 'KoreaDream'}<span className="pt">{c.brand.wordmark_accent || 'Path'}</span></span>
        </button>

        <div className="nav-links" role="menubar">
          {MENU.map((item, i) => (
            item.children
              ? <NavGroup key={i} item={item} view={view} go={go} />
              : (
                <button key={i} className={'nlink' + (item.parentViews.includes(view) ? ' active' : '')}
                  onClick={() => go(item.view)} role="menuitem"
                  aria-current={item.parentViews.includes(view) ? 'page' : undefined}
                  type="button">{item.label}</button>
              )
          ))}
        </div>

        <div className="nav-right">
          <div className="lang-toggle" role="group" aria-label={isKo ? '언어 선택' : 'Language'}>
            <button type="button" className={lang === 'ko' ? 'on' : ''} onClick={() => setLang('ko')} aria-pressed={lang === 'ko'} lang="ko">KO</button>
            <span aria-hidden="true">·</span>
            <button type="button" className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')} aria-pressed={lang === 'en'} lang="en">EN</button>
          </div>

          {auth.ready && !auth.user && (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => openAuth('login')}>{isKo ? '로그인' : 'Log in'}</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => openAuth('signup')}>{isKo ? '회원가입' : 'Sign up'}</button>
            </>
          )}
          {auth.ready && auth.user && (
            <div className="user-menu">
              <button type="button" className="user-trigger" onClick={() => setMenuOpen(o => !o)} aria-haspopup="true" aria-expanded={menuOpen}>
                <span className="user-avatar" aria-hidden="true">{(auth.user.name || auth.user.email || '?').charAt(0).toUpperCase()}</span>
                <span className="user-label">{auth.user.name || auth.user.email}</span>
              </button>
              {menuOpen && (
                <div className="user-dropdown" role="menu" onClick={() => setMenuOpen(false)}>
                  <button type="button" onClick={() => go('member')}>{isKo ? '내 페이지' : 'My page'}</button>
                  <button type="button" onClick={() => go('apply')}>{isKo ? '지원하기' : 'Apply'}</button>
                  <button type="button" onClick={async () => { await auth.logout(); }}>{isKo ? '로그아웃' : 'Log out'}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavGroup({ item, view, go }) {
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef(null);
  const active = item.parentViews && item.parentViews.includes(view);

  function show() {
    clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function delayedHide() {
    // small delay so cursor can travel from trigger to panel
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }
  function pickChild(child) {
    if (child.view) go(child.view, null, child.opts);
    setOpen(false);
  }

  return (
    <div className="nav-group" onMouseEnter={show} onMouseLeave={delayedHide}
      onFocus={show} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) delayedHide(); }}>
      <button type="button"
        className={'nlink' + (active ? ' active' : '') + (open ? ' open' : '')}
        aria-haspopup="true" aria-expanded={open}
        onClick={() => setOpen(o => !o)}>
        {item.label}
        <i data-lucide="chevron-down" width="14" height="14" strokeWidth="2" aria-hidden="true" style={{marginLeft:4,opacity:0.6}}></i>
      </button>
      {open && (
        <div className="nav-dropdown" role="menu">
          {(item.children || []).map((c, i) =>
            c.divider
              ? <div key={i} className="nav-dropdown-sep" aria-hidden="true" />
              : <button key={i} role="menuitem" type="button"
                  className={'nav-dropdown-item' + (view === c.view && !c.opts ? ' active' : '')}
                  onClick={() => pickChild(c)}>
                  {c.label}
                </button>
          )}
        </div>
      )}
    </div>
  );
}

window.Nav = Nav;
window.NavGroup = NavGroup;
