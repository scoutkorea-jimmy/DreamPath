// Nav.jsx
function Nav({ view, go, lang, setLang, c }) {
  const n = c.nav[lang];
  const isKo = lang === 'ko';
  const auth = window.useAuth ? window.useAuth() : { user: null, ready: true };
  const [menuOpen, setMenuOpen] = React.useState(false);

  const link = (id, label) => (
    <button
      className={'nlink' + (view === id ? ' active' : '')}
      onClick={() => go(id)}
      aria-current={view === id ? 'page' : undefined}
      type="button"
    >{label}</button>
  );

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
          {link('about', n.about)}
          {link('programs', n.programs)}
          {link('news', n.news)}
          {link('stories', n.stories)}
          {link('partners', n.partners)}
          {link('contact',  n.contact || (lang === 'ko' ? '문의하기' : 'Contact'))}
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
window.Nav = Nav;
