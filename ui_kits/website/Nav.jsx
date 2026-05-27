// Nav.jsx — top nav with hover dropdowns + user menu
function Nav({ view, go, lang, setLang, c }) {
  const n = c.nav[lang];
  const isKo = lang === 'ko';
  const auth = window.useAuth ? window.useAuth() : { user: null, ready: true };
  const [menuOpen, setMenuOpen] = React.useState(false);
  // Bell dropdown: list of recent notifications visible when the user clicks
  // the bell icon. Powered by the same /api/me/notifications endpoint that
  // Member.jsx uses, so the lists stay consistent.
  const [bellOpen, setBellOpen] = React.useState(false);
  const [notifs, setNotifs] = React.useState([]);
  const [unread, setUnread] = React.useState(0);
  async function refreshNotifs() {
    if (!auth.user) { setUnread(0); setNotifs([]); return; }
    try {
      const r = await window.DreamPathAuth.authFetch('/api/me/notifications');
      if (!r.ok) return;
      const d = await r.json();
      setUnread(d.unread || 0);
      setNotifs((d.items || []).slice(0, 6));
    } catch {}
  }
  React.useEffect(() => {
    if (!auth.user) { setUnread(0); setNotifs([]); return; }
    let alive = true;
    refreshNotifs();
    const t = setInterval(() => { if (alive) refreshNotifs(); }, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [auth.user]);
  // Close bell dropdown on outside click + esc.
  React.useEffect(() => {
    if (!bellOpen) return;
    const onDoc = (e) => { if (!e.target.closest('.bell-wrap')) setBellOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setBellOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [bellOpen]);
  function openNotification(n) {
    // Mark read locally + on the server, then jump to My Page with an
    // intent flag so Member.jsx auto-switches to the notifications section.
    if (!n.read_at) {
      window.DreamPathAuth.authFetch('/api/me/notifications/' + encodeURIComponent(n.id)).catch(() => {});
    }
    sessionStorage.setItem('dp_open_notification', n.id);
    setBellOpen(false);
    go('member');
  }
  function viewAllNotifications() {
    sessionStorage.setItem('dp_open_notifications_section', '1');
    setBellOpen(false);
    go('member');
  }
  // Theme toggle state — re-render when the theme store fires.
  const [themeChoice, setThemeChoice] = React.useState(() => (window.DreamPathTheme && window.DreamPathTheme.choice) || 'system');
  React.useEffect(() => {
    if (!window.DreamPathTheme) return;
    const unsub = window.DreamPathTheme.subscribe(() => setThemeChoice(window.DreamPathTheme.choice));
    return () => unsub();
  }, []);
  function setTheme(next) {
    if (window.DreamPathTheme) window.DreamPathTheme.set(next);
    else setThemeChoice(next);
  }

  // Build the "프로그램" submenu by category from current c.programs.
  // Per-program editable labels (category_ko / category_en) take precedence;
  // legacy programs without those fields fall back to the slug or the
  // first segment of the kicker. Slug is the URL key for /programs?cat=.
  const programs = (c && Array.isArray(c.programs)) ? c.programs : [];
  const categories = (() => {
    const seen = new Set();
    const out = [];
    programs.forEach(p => {
      const fallback = p.kicker ? p.kicker.split('·')[0].trim() : '';
      const slug = (p.category || fallback).toLowerCase();
      if (!slug) return;
      if (seen.has(slug)) return;
      seen.add(slug);
      const label = (isKo ? (p.category_ko || fallback) : (p.category_en || fallback)) || fallback;
      out.push({ key: slug, label });
    });
    return out;
  })();

  // Role-based view permissions: when a user is logged in AND their role's
  // member_roles entry exists, hide nav links the role can't view. Anonymous
  // visitors and roles without an entry see everything (fail-open for guests).
  const roles = (c && c.member_roles && Array.isArray(c.member_roles.roles)) ? c.member_roles.roles : [];
  const myRole = auth.user ? roles.find(r => r && r.id === auth.user.role) : null;
  function canView(viewId) {
    if (!myRole || !myRole.pages) return true;             // no policy → allowed
    const p = myRole.pages[viewId];
    if (!p) return true;                                    // page not listed → allowed (don't surprise legacy roles)
    return p.view !== false && p.view !== 0;                // explicit false hides it
  }

  // Menu structure — top-level items have either `view` (direct link) or
  // `children` (dropdown). Active state highlights the parent if any of
  // the children's views are active. Items the role can't view are filtered
  // out below; a parent with zero remaining children is dropped entirely.
  const RAW_MENU = [
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
  const MENU = RAW_MENU.flatMap(item => {
    if (item.children) {
      const kids = item.children.filter(k => k.divider || canView(k.view));
      if (kids.filter(k => !k.divider).length === 0) return [];
      return [{ ...item, children: kids }];
    }
    return canView(item.view) ? [item] : [];
  });

  function openAuth(mode) {
    window.dispatchEvent(new CustomEvent('dp-open-auth', { detail: { mode } }));
    setMenuOpen(false);
    setMobileOpen(false);
  }

  // Mobile slide-in panel state. Opens on hamburger tap; closes on link
  // navigation, on overlay click, or on Esc.
  const [mobileOpen, setMobileOpen] = React.useState(false);
  React.useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    // Lock body scroll while the panel is up.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [mobileOpen]);
  function mobileGo(viewId, opts) { setMobileOpen(false); go(viewId, null, opts); }

  return (
    <nav className="nav" aria-label={isKo ? '주요 메뉴' : 'Primary navigation'}>
      <div className="nav-inner">
        <button className="nav-logo" onClick={() => go('home')} aria-label={isKo ? '홈으로' : 'Home'} type="button">
          {/* Two marks, CSS swaps which one is visible by theme. The colored
              SVG reads better on the light nav (light mode); the mono-light
              (#EDE7F6) SVG reads better on the dark nav (dark mode). */}
          <img src={c.brand.logo_mark} alt="" width="32" height="32" className="mark-color" />
          <img src="/assets/logo-dreampath-mark-mono-light.svg" alt="" width="32" height="32" className="mark-mono" />
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
          <div className="theme-toggle" role="group" aria-label={isKo ? '테마' : 'Theme'}>
            <button type="button" className={themeChoice === 'light' ? 'on' : ''} onClick={() => setTheme('light')} aria-pressed={themeChoice === 'light'} title={isKo ? '라이트 모드' : 'Light mode'}>
              <i data-lucide="sun" width="14" height="14" strokeWidth="2" aria-hidden="true"></i>
            </button>
            <button type="button" className={themeChoice === 'system' ? 'on' : ''} onClick={() => setTheme('system')} aria-pressed={themeChoice === 'system'} title={isKo ? '시스템 설정 따라감' : 'Match system'}>
              <i data-lucide="monitor" width="14" height="14" strokeWidth="2" aria-hidden="true"></i>
            </button>
            <button type="button" className={themeChoice === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')} aria-pressed={themeChoice === 'dark'} title={isKo ? '다크 모드' : 'Dark mode'}>
              <i data-lucide="moon" width="14" height="14" strokeWidth="2" aria-hidden="true"></i>
            </button>
          </div>
          {auth.ready && !auth.user && (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => openAuth('login')}>{isKo ? '로그인' : 'Log in'}</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => openAuth('signup')}>{isKo ? '회원가입' : 'Sign up'}</button>
            </>
          )}
          {auth.ready && auth.user && (
            <>
              {/* Bell — opens a dropdown panel showing recent notifications
                  the admin sent to this user (internal "email-like" alarms). */}
              <div className="bell-wrap" style={{position:'relative'}}>
                <button type="button" className="bell-trigger"
                  onClick={() => { setBellOpen(o => !o); if (!bellOpen) refreshNotifs(); }}
                  aria-haspopup="true" aria-expanded={bellOpen}
                  aria-label={isKo ? '알림' : 'Notifications'} title={isKo ? '알림' : 'Notifications'}
                  style={{position:'relative',width:36,height:36,display:'inline-flex',alignItems:'center',justifyContent:'center',background:'transparent',border:'1px solid var(--border-default)',borderRadius:10,cursor:'pointer',color:'var(--fg-primary)'}}>
                  {/* Inline SVG instead of <i data-lucide=...> so the icon
                      renders even before lucide.createIcons() has scanned this
                      branch. Uses currentColor so dark mode picks up fg-primary. */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                  {unread > 0 && (
                    <span aria-hidden="true"
                      style={{position:'absolute',top:-4,right:-4,minWidth:16,height:16,padding:'0 4px',borderRadius:999,background:'var(--badge-danger-fill)',color:'#fff',fontSize:10,fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-mono)'}}>
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>
                {bellOpen && (
                  <div role="menu"
                    style={{position:'absolute',top:'calc(100% + 8px)',right:0,width:340,maxHeight:480,overflowY:'auto',background:'var(--bg-elevated)',border:'1px solid var(--border-default)',borderRadius:12,boxShadow:'var(--shadow-lg, 0 12px 32px rgba(0,0,0,0.18))',zIndex:200}}>
                    <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border-hair)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <strong style={{fontSize:13,color:'var(--fg-primary)'}}>{isKo ? '알림' : 'Notifications'}</strong>
                      <span style={{fontSize:11,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>
                        {unread > 0 ? (isKo ? `${unread}건 읽지 않음` : `${unread} unread`) : (isKo ? '모두 읽음' : 'all read')}
                      </span>
                    </div>
                    {notifs.length === 0 ? (
                      <div style={{padding:'28px 14px',textAlign:'center',color:'var(--fg-muted)',fontSize:13}}>
                        {isKo ? '받은 알림이 없습니다.' : 'No notifications yet.'}
                      </div>
                    ) : (
                      <div>
                        {notifs.map(n => {
                          const subj = isKo ? (n.subject_ko || n.subject_en) : (n.subject_en || n.subject_ko);
                          const body = isKo ? (n.body_ko || n.body_en) : (n.body_en || n.body_ko);
                          const isUnread = !n.read_at;
                          return (
                            <button key={n.id} type="button" onClick={() => openNotification(n)}
                              style={{display:'block',width:'100%',padding:'12px 14px',background: isUnread ? 'var(--bg-muted)' : 'transparent',border:'none',borderBottom:'1px solid var(--border-hair)',cursor:'pointer',textAlign:'left',font:'inherit',color:'inherit'}}>
                              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                                {isUnread && <span style={{flex:'0 0 auto',width:7,height:7,borderRadius:'50%',background:'var(--state-info)'}} />}
                                <strong style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13,fontWeight: isUnread ? 700 : 500,color:'var(--fg-primary)'}}>{subj || '(no subject)'}</strong>
                                <span style={{fontSize:10,color:'var(--fg-muted)',whiteSpace:'nowrap',fontFamily:'var(--font-mono)'}}>{new Date(n.ts).toLocaleDateString()}</span>
                              </div>
                              <div style={{fontSize:12,color:'var(--fg-secondary)',overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{(body || '').slice(0, 140)}</div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div style={{padding:'10px 14px',borderTop:'1px solid var(--border-hair)',textAlign:'center'}}>
                      <button type="button" onClick={viewAllNotifications}
                        style={{background:'none',border:'none',color:'var(--scouting-purple)',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                        {isKo ? '전체 보기 →' : 'View all →'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="user-menu">
                <button type="button" className="user-trigger" onClick={() => setMenuOpen(o => !o)} aria-haspopup="true" aria-expanded={menuOpen}>
                  <span className="user-avatar" aria-hidden="true">
                    {(auth.user.name || auth.user.email || '?').charAt(0).toUpperCase()}
                  </span>
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
            </>
          )}

          {/* Hamburger — only visible below 900px (CSS-driven). */}
          <button
            type="button"
            className="nav-burger"
            aria-label={isKo ? '메뉴 열기' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}>
            <i data-lucide="menu" width="22" height="22" strokeWidth="2" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      {/* Mobile slide-in panel — mirrors the desktop MENU structure. */}
      {mobileOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileOpen(false)} role="presentation">
          <div className="mobile-nav-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={isKo ? '주요 메뉴' : 'Primary navigation'}>
            <div className="mobile-nav-head">
              <strong style={{fontFamily:'var(--font-en)',fontSize:18,letterSpacing:'-0.01em'}}>{c.brand.wordmark_mark || 'KoreaDream'}<span style={{color:'var(--scouting-purple)'}}>{c.brand.wordmark_accent || 'Path'}</span></strong>
              <button type="button" className="mobile-nav-close" onClick={() => setMobileOpen(false)} aria-label={isKo ? '메뉴 닫기' : 'Close menu'}>
                <i data-lucide="x" width="22" height="22" strokeWidth="2" aria-hidden="true"></i>
              </button>
            </div>
            <div className="mobile-nav-body">
              {MENU.map((item, i) => {
                if (item.children) {
                  return (
                    <React.Fragment key={i}>
                      <div className="mobile-nav-section">{item.label}</div>
                      {item.children.filter(k => !k.divider).map((kid, j) => (
                        <button key={j} type="button"
                          className={'mobile-nav-link' + (kid.view === view ? ' active' : '')}
                          onClick={() => mobileGo(kid.view, kid.opts)}>
                          {kid.label}
                          <i data-lucide="chevron-right" width="16" height="16" style={{color:'var(--fg-muted)'}} aria-hidden="true"></i>
                        </button>
                      ))}
                    </React.Fragment>
                  );
                }
                return (
                  <button key={i} type="button"
                    className={'mobile-nav-link' + (item.parentViews.includes(view) ? ' active' : '')}
                    onClick={() => mobileGo(item.view)}>
                    {item.label}
                    <i data-lucide="chevron-right" width="16" height="16" style={{color:'var(--fg-muted)'}} aria-hidden="true"></i>
                  </button>
                );
              })}
            </div>
            <div className="mobile-nav-foot">
              {auth.ready && !auth.user && (
                <>
                  <button type="button" className="btn btn-secondary btn-block" onClick={() => openAuth('login')}>{isKo ? '로그인' : 'Log in'}</button>
                  <button type="button" className="btn btn-primary btn-block" onClick={() => openAuth('signup')}>{isKo ? '회원가입' : 'Sign up'}</button>
                </>
              )}
              {auth.ready && auth.user && (
                <>
                  <button type="button" className="btn btn-secondary btn-block" onClick={() => mobileGo('member')}>{isKo ? '내 페이지' : 'My page'}</button>
                  <button type="button" className="btn btn-ghost btn-block" onClick={async () => { setMobileOpen(false); await auth.logout(); }}>{isKo ? '로그아웃' : 'Log out'}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
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
