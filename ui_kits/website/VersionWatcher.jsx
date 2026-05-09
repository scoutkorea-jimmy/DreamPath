// VersionWatcher.jsx — polls /api/version every 60s and shows a top-right
// banner when the deployed site version differs from the version that was
// loaded in this browser tab. The banner offers a "hard refresh" button
// (cache-busting query string + reload) and an optional dismiss for the
// session. Mounted once globally from App.jsx.
const { useState: useStateV, useEffect: useEffectV } = React;

function VersionWatcher({ lang }) {
  const isKo = (lang || 'ko') === 'ko';
  const loaded = window.DREAMPATH_VERSION || '00.000.00';
  const [latest, setLatest] = useStateV(loaded);
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
        if (alive && d && d.version) setLatest(d.version);
      } catch {}
    }
    tick();
    const t = setInterval(tick, 60_000);
    // Also re-check when the tab regains focus — common case is the user
    // came back after a long pause and a new deploy landed in the meantime.
    const onFocus = () => tick();
    window.addEventListener('focus', onFocus);
    return () => { alive = false; clearInterval(t); window.removeEventListener('focus', onFocus); };
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
    <div role="status" aria-live="polite" style={{
      position: 'fixed', top: 16, right: 16, zIndex: 10000,
      maxWidth: 360, padding: '14px 16px',
      background: 'var(--bg-elevated, #fff)',
      color: 'var(--fg-primary, #111)',
      border: '1px solid var(--border-default, #e5e7eb)',
      borderLeft: '4px solid var(--scouting-purple, #7c3aed)',
      borderRadius: 12,
      boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
      fontFamily: 'var(--font-kr), system-ui, sans-serif',
      fontSize: 14, lineHeight: 1.5,
    }}>
      <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,marginBottom:4,color:'var(--brand-text, #5b21b6)'}}>
            {isKo ? '새 버전이 배포되었습니다' : 'A new version is available'}
          </div>
          <div style={{fontSize:12,color:'var(--fg-secondary, #555)',fontFamily:'var(--font-mono, monospace)'}}>
            v {loaded} → v {latest}
          </div>
          <div style={{display:'flex',gap:8,marginTop:10}}>
            <button type="button" onClick={hardRefresh} className="btn btn-primary btn-sm" style={{padding:'6px 12px',fontSize:13}}>
              {isKo ? '새로고침' : 'Refresh now'}
            </button>
            <button type="button" onClick={dismiss} className="btn btn-ghost btn-sm" style={{padding:'6px 10px',fontSize:13}}>
              {isKo ? '나중에' : 'Later'}
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label={isKo ? '닫기' : 'Close'} style={{
          background:'none',border:'none',cursor:'pointer',color:'var(--fg-muted, #888)',
          fontSize:18,lineHeight:1,padding:'2px 4px',marginTop:-2,
        }}>×</button>
      </div>
    </div>
  );
}

window.VersionWatcher = VersionWatcher;
