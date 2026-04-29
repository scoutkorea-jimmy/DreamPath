// Nav.jsx
function Nav({ view, go, lang, setLang, c }) {
  const n = c.nav[lang];
  const link = (id, label) => (
    <button
      className={'nlink' + (view === id ? ' active' : '')}
      onClick={() => go(id)}
      aria-current={view === id ? 'page' : undefined}
      type="button"
    >{label}</button>
  );
  return (
    <nav className="nav" aria-label={lang === 'ko' ? '주요 메뉴' : 'Primary navigation'}>
      <div className="nav-inner">
        <button className="nav-logo" onClick={() => go('home')} aria-label={lang === 'ko' ? '홈으로' : 'Home'} type="button">
          <img src={c.brand.logo_mark} alt="" width="32" height="32" />
          <span className="wm" aria-hidden="true">Dream<span className="pt">Path</span></span>
        </button>
        <div className="nav-links" role="menubar">
          {link('programs', n.programs)}
          {link('about', n.about)}
          {link('partners', n.partners)}
          {link('stories', n.stories)}
          {link('news', n.news)}
        </div>
        <div className="nav-right">
          <div
            className="lang-toggle"
            role="group"
            aria-label={lang === 'ko' ? '언어 선택' : 'Language'}
          >
            <button
              type="button"
              className={lang === 'ko' ? 'on' : ''}
              onClick={() => setLang('ko')}
              aria-pressed={lang === 'ko'}
              lang="ko"
            >KO</button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              className={lang === 'en' ? 'on' : ''}
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              lang="en"
            >EN</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => go('apply')} type="button">
            {n.apply} <i data-lucide={c.icons.nav_apply} width="16" height="16" strokeWidth="2" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </nav>
  );
}
window.Nav = Nav;
