// Errors.jsx — full-page error states (401, 403, 404, 500, 503, offline).
// Visual design follows the provided mockup exactly: big code on left,
// title + description, two CTAs, decorative illustration on right with
// 4 accent dots, then a "Helpful links" card below.

const { useState: useStateErr, useEffect: useEffectErr } = React;

function ErrorPage({ code, title, body, icon, primary, secondary, helpful, lang }) {
  const isKo = lang === 'ko';
  return (
    <div data-screen-label={'Error ' + (code || 'offline')}>
      <section className="errpage">
        <div className="errpage-grid">
          <div className="errpage-text">
            {code && <div className="errpage-code">{code}</div>}
            <h1 className="errpage-title">{title}</h1>
            <p className="errpage-body">{body}</p>
            <div className="errpage-ctas">
              {primary  && <button type="button" className="btn btn-primary"   onClick={primary.onClick}>{primary.label}</button>}
              {secondary && <button type="button" className="btn btn-secondary" onClick={secondary.onClick}>{secondary.label}</button>}
            </div>
            {helpful && helpful.note && <p className="errpage-note">{helpful.note}</p>}
          </div>
          <ErrorIllust icon={icon} />
        </div>
      </section>

      <section className="errpage-helpful-wrap">
        <div className="errpage-helpful">
          <div className="errpage-helpful-h">{isKo ? '도움이 될 수 있는 링크' : 'Helpful links'}</div>
          <div className="errpage-helpful-grid">
            {(helpful && helpful.links ? helpful.links : defaultHelpful(isKo)).map((l, i) => (
              <a key={i} href={l.href} className="errpage-helpful-link" onClick={l.onClick}>
                <span>{l.label}</span>
                <i data-lucide="arrow-up-right" width="14" height="14" strokeWidth="2"></i>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ErrorIllust({ icon }) {
  return (
    <div className="errpage-illust" aria-hidden="true">
      <div className="errpage-circle">
        <i data-lucide={icon} width="120" height="120" strokeWidth="1.5"></i>
      </div>
      <span className="errpage-dot d1" />
      <span className="errpage-dot d2" />
      <span className="errpage-dot d3" />
      <span className="errpage-dot d4" />
    </div>
  );
}

function defaultHelpful(isKo) {
  return [
    { label: isKo ? 'Programs' : 'Programs', href: '/programs' },
    { label: isKo ? 'About'    : 'About',    href: '/about' },
    { label: 'FAQ',  href: '/contact' },
    { label: isKo ? 'Contact us' : 'Contact us', href: '/contact' },
  ];
}

// ─── Specific error pages ───────────────────────────────────────────────────
function Error401({ go, lang }) {
  const isKo = lang === 'ko';
  return (
    <ErrorPage lang={lang} code="401" icon="lock"
      title={isKo ? '로그인이 필요합니다.' : 'Please log in\nto continue.'}
      body={isKo ? '이 페이지에 접근하려면 로그인이 필요합니다.' : 'You need to be signed in to access this page.'}
      primary={{ label: isKo ? '로그인' : 'Log in',
        onClick: () => window.dispatchEvent(new CustomEvent('dp-open-auth', { detail: { mode: 'login' } })) }}
      secondary={{ label: isKo ? '홈으로' : 'Go to home', onClick: () => go('home') }}
      helpful={{
        note: isKo
          ? <>도움이 필요하신가요? <a href="mailto:hello@koreadreampath.com">hello@koreadreampath.com</a> 으로 연락주세요.</>
          : <>Need help? Contact us at <a href="mailto:hello@koreadreampath.com">hello@koreadreampath.com</a></>,
        links: defaultHelpful(isKo),
      }}
    />
  );
}

function Error403({ go, lang }) {
  const isKo = lang === 'ko';
  return (
    <ErrorPage lang={lang} code="403" icon="shield-x"
      title={isKo ? '접근 권한이 없습니다.' : "You don't have\npermission."}
      body={isKo ? '죄송합니다. 이 페이지에 접근할 권한이 없습니다.' : 'Sorry, you are not authorized to access this page.'}
      primary={{ label: isKo ? '홈으로' : 'Go to home', onClick: () => go('home') }}
      secondary={{ label: isKo ? '뒤로 가기' : 'Go back', onClick: () => window.history.back() }}
    />
  );
}

function Error404({ go, lang }) {
  const isKo = lang === 'ko';
  return (
    <ErrorPage lang={lang} code="404" icon="file-search"
      title={isKo ? '페이지를 찾을 수 없습니다.' : 'Page not found.'}
      body={isKo ? '찾으시는 페이지가 존재하지 않거나 이동되었습니다.' : "The page you're looking for doesn't exist or has been moved."}
      primary={{ label: isKo ? '홈으로' : 'Go to home', onClick: () => go('home') }}
      secondary={{ label: isKo ? '프로그램 보기' : 'Browse programs', onClick: () => go('programs') }}
    />
  );
}

function Error500({ go, lang }) {
  const isKo = lang === 'ko';
  return (
    <ErrorPage lang={lang} code="500" icon="server-crash"
      title={isKo ? '문제가 발생했습니다.' : 'Something went\nwrong on our end.'}
      body={isKo ? '문제를 해결하는 중입니다. 잠시 후 다시 시도해주세요.' : "We're working to fix the issue. Please try again later."}
      primary={{ label: isKo ? '다시 시도' : 'Try again', onClick: () => window.location.reload() }}
      secondary={{ label: isKo ? '홈으로' : 'Go to home', onClick: () => go('home') }}
    />
  );
}

function Error503({ go, lang }) {
  const isKo = lang === 'ko';
  return (
    <ErrorPage lang={lang} code="503" icon="wrench"
      title={isKo ? '일시적으로 이용할 수 없습니다.' : 'Temporarily\nunavailable.'}
      body={isKo ? '점검 중이거나 트래픽이 많습니다. 잠시 후 다시 시도해주세요.' : "We're performing maintenance or experiencing high traffic. Please try again soon."}
      primary={{ label: isKo ? '잠시 후 다시 시도' : 'Try again later', onClick: () => window.location.reload() }}
      secondary={{ label: isKo ? '홈으로' : 'Go to home', onClick: () => go('home') }}
    />
  );
}

function ErrorOffline({ go, lang }) {
  const isKo = lang === 'ko';
  // Auto-recover when network comes back
  useEffectErr(() => {
    const onOnline = () => window.location.reload();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);
  return (
    <ErrorPage lang={lang} icon="wifi-off"
      title={isKo ? '네트워크 연결 안 됨' : "You're offline."}
      body={isKo ? '인터넷 연결을 확인하고 다시 시도해주세요.' : 'Please check your internet connection and try again.'}
      primary={{ label: isKo ? '다시 시도' : 'Try again', onClick: () => window.location.reload() }}
      secondary={{ label: isKo ? '홈으로' : 'Go to home', onClick: () => go('home') }}
      helpful={{
        links: [
          { label: isKo ? 'Wi-Fi / 모바일 데이터 확인' : 'Check your Wi-Fi or mobile data', href: '#' },
          { label: isKo ? '라우터 재시작' : 'Restart your router', href: '#' },
          { label: isKo ? '네트워크 관리자에게 문의' : 'Contact your network administrator', href: '#' },
        ],
      }}
    />
  );
}

window.Error401 = Error401;
window.Error403 = Error403;
window.Error404 = Error404;
window.Error500 = Error500;
window.Error503 = Error503;
window.ErrorOffline = ErrorOffline;
