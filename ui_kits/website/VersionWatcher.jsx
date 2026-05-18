// VersionWatcher.jsx — polls /api/version every POLL_INTERVAL_MS and
// shows a top-right banner when the deployed site version differs from
// the version that was loaded in this browser tab. The banner offers a
// "hard refresh" button (cache-busting query string + reload) and an
// optional dismiss for the session. Mounted globally from App.jsx and
// from admin.html.
//
// Polling cadence is tight (20 s) and reinforced by focus +
// visibilitychange + online listeners so a new deploy surfaces within
// a few seconds of the operator returning to the tab. The banner is
// big, slides in, and stays put until acknowledged.
const { useState: useStateV, useEffect: useEffectV } = React;
const POLL_INTERVAL_MS = 20_000;

function VersionWatcher({ lang }) {
  const isKo = (lang || 'ko') === 'ko';
  const loaded = window.DREAMPATH_VERSION || '00.000.00';
  const [latest, setLatest] = useStateV(loaded);
  const [lastChecked, setLastChecked] = useStateV(0);
  // Session-level dismiss so the banner does not nag after the user closes
  // it; a real refresh clears the flag because sessionStorage survives.
  // We key the dismiss by the version we saw, so a *new* deploy after the
  // dismiss will surface the banner again.
  const [dismissed, setDismissed] = useStateV(() => {
    try { return sessionStorage.getItem('dp_version_dismissed') || ''; } catch { return ''; }
  });

  useEffectV(() => {
    let alive = true;
    async function tick() {
      try {
        const r = await fetch('/api/version', { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        if (alive && d && d.version) {
          setLatest(d.version);
          setLastChecked(Date.now());
        }
      } catch {}
    }
    tick();
    const t = setInterval(tick, POLL_INTERVAL_MS);
    // Re-check whenever the operator returns to the tab — covers the
    // "left it open over lunch" case + new-deploy-while-on-other-tab.
    const onFocus = () => tick();
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    const onOnline = () => tick();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  function hardRefresh() {
    try { sessionStorage.removeItem('dp_version_dismissed'); } catch {}
    // Cache-busting query string — forces the HTML + the babel-compiled
    // .jsx files to be re-fetched on most CDN configurations. Keeps the
    // current path so the user lands on the same view post-refresh.
    const u = new URL(window.location.href);
    u.searchParams.set('v', latest);
    window.location.replace(u.toString());
  }

  function dismiss() {
    setDismissed(latest);
    try { sessionStorage.setItem('dp_version_dismissed', latest); } catch {}
  }

  const isStale = latest && latest !== loaded;
  const isDismissed = dismissed === latest;
  if (!isStale || isDismissed) return null;

  return (
    <>
      <style>{`
        @keyframes dp-version-slide-in {
          0%   { transform: translateX(120%); opacity: 0; }
          100% { transform: translateX(0);    opacity: 1; }
        }
        @keyframes dp-version-pulse {
          0%, 100% { box-shadow: 0 14px 40px rgba(124,58,237,0.35); }
          50%      { box-shadow: 0 18px 60px rgba(124,58,237,0.55); }
        }
      `}</style>
      <div role="alert" aria-live="assertive" style={{
        position: 'fixed', top: 16, right: 16, zIndex: 100000,
        maxWidth: 420, minWidth: 320, padding: '18px 20px',
        background: 'var(--bg-elevated, #fff)',
        color: 'var(--fg-primary, #111)',
        border: '2px solid var(--scouting-purple, #7c3aed)',
        borderRadius: 14,
        animation: 'dp-version-slide-in 380ms cubic-bezier(0.22, 0.61, 0.36, 1), dp-version-pulse 2.4s ease-in-out infinite 380ms',
        fontFamily: 'var(--font-kr), system-ui, sans-serif',
        fontSize: 14, lineHeight: 1.55,
      }}>
        <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
          <div style={{
            flexShrink:0, width:36, height:36, borderRadius:'50%',
            background:'var(--scouting-purple, #7c3aed)', color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:18, fontWeight:700,
          }}>↑</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,marginBottom:4,fontSize:15,color:'var(--brand-text, #5b21b6)'}}>
              {isKo ? '새 버전이 배포되었습니다' : 'A new version has been deployed'}
            </div>
            <div style={{fontSize:12,color:'var(--fg-secondary, #555)',marginBottom:4}}>
              {isKo ? '새로고침하면 최신 화면으로 전환됩니다.' : 'Refresh to load the latest version.'}
            </div>
            <div style={{fontSize:12,color:'var(--fg-muted, #777)',fontFamily:'var(--font-mono, monospace)',marginBottom:12}}>
              v {loaded} <span style={{margin:'0 6px'}}>→</span> <strong style={{color:'var(--brand-text)'}}>v {latest}</strong>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button type="button" onClick={hardRefresh} className="btn btn-primary btn-sm"
                style={{padding:'8px 16px',fontSize:13,fontWeight:700}}>
                {isKo ? '지금 새로고침' : 'Refresh now'}
              </button>
              <button type="button" onClick={dismiss} className="btn btn-ghost btn-sm" style={{padding:'8px 12px',fontSize:13}}>
                {isKo ? '나중에' : 'Later'}
              </button>
            </div>
          </div>
          <button type="button" onClick={dismiss} aria-label={isKo ? '닫기' : 'Close'} style={{
            background:'none',border:'none',cursor:'pointer',color:'var(--fg-muted, #888)',
            fontSize:20,lineHeight:1,padding:'2px 6px',marginTop:-4,
          }}>×</button>
        </div>
      </div>
    </>
  );
}

window.VersionWatcher = VersionWatcher;
