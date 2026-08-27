// admin-1-core-content.js — 관리자 콘솔 1/4
//
// 공통 헬퍼 · 입력 필드 · I18N · 탭 구성 · 콘텐츠 편집 탭
//
//
// 왜 확장자가 `.js` 인가(다른 관리자/공개 파일은 `.jsx` 인데): Cloudflare 는
// 응답 content-type 을 보고 압축할지 정하는데, `.jsx` 는 `text/jsx` 로 나가고
// 이 MIME 은 압축 대상 목록에 없다. 나누기 전 admin.html 은 brotli 로 124KB 였는데
// `.jsx` 넷으로 나누자 **649KB** 가 됐다 — 나눈 이득보다 큰 손해였다. `.js` 로
//두면 `text/javascript` 로 나가 압축된다.
// Babel 은 확장자를 보지 않는다 — 판단 기준은 script 태그의 `type="text/babel"` 이다.
// worker 에서 content-type 만 고쳐 보려 했으나 **닿지 않았다**: Workers Assets 는
// 자산이 존재하면 Worker 를 아예 거치지 않는다(보안 헤더가 안 붙는 것으로 확인).
//
// 주의: 공개 사이트의 `.jsx` 21개는 **아직 이 문제를 그대로 안고 있다**(홈 501KB).
//    이번 라운드에서 건드리지 않았다 — 참조가 여러 파일에 흩어져 있어 범위가 커진다.
// **이 네 파일은 순서대로 실행돼야 한다.** admin.html 의 <script> 순서가 곧
// 실행 순서이고, 뒤 파일이 앞 파일의 선언을 쓴다. 순서를 바꾸거나 하나를 빼면
// 관리자 화면이 통째로 뜨지 않는다.
//
// 왜 나뉘어 있나(v01.101.12): 원래 admin.html 안에 인라인 한 덩어리(51만 자)로
// 있었다. Babel-in-browser 가 500KB 를 넘으면 코드 생성 최적화를 포기해서
// ("exceeds the max of 500KB") 첫 로딩 파싱이 느려졌고, 인라인이라 admin.html
// 전체가 매번 다시 내려왔다. 파일로 나누면 바뀌지 않은 파일은 브라우저 캐시가 받는다.
//
// 나눌 때 **내용은 한 글자도 바꾸지 않았다** — 잘라내기만 했다(들여쓰기 포함).
// 그래서 이 파일들을 순서대로 이어 붙이면 원래 인라인 블록과 정확히 같다.
// 경계는 기계적 4등분에서 출발해 논리적으로 조정했다: 이 파일은
// `` 에서 시작해 `isTestAccount` 에서 끝난다.
  const { useState, useEffect, useMemo, useRef } = React;

  // ---- 에러 경계 (v01.101.11) ------------------------------------------------
  // v01.101.10: 렌더 중 예외 하나로 관리자 콘솔 전체가 백지가 됐다. React 18 은
  // 렌더 예외가 에러 경계에 잡히지 않으면 **트리 전체를 언마운트**한다 — 그것이
  // 기본 동작이고, 경계를 두지 않으면 언제든 다시 일어난다.
  //
  // 훅으로는 만들 수 없다(getDerivedStateFromError 는 클래스 전용). Babel 이
  // 클래스를 그대로 파싱하므로 이 환경에서 문제되지 않는다.
  //
  // 두 단으로 둔다:
  //   탭 단위  — 탭 하나가 죽어도 사이드바와 나머지 탭은 산다. v01.101.10 에서
  //              실제로 DashboardTab 이 먼저 죽었다.
  //   최상위   — 무엇이 죽든 백지 대신 안내와 재시도.
  class AdminErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { err: null };
    }
    static getDerivedStateFromError(err) {
      return { err: err };
    }
    componentDidCatch(err, info) {
      // 보고는 워치독이 심어 둔 창구를 쓴다 — 토큰 마스킹과 1회 제한이 거기 있다.
      try {
        if (window.__dpReport) {
          window.__dpReport('admin-error-boundary',
            (err && err.message) || String(err),
            {
              scope: this.props.scope || 'unknown',
              stack: (window.__dpScrub || String)((err && err.stack) || '').slice(0, 600),
              component_stack: (window.__dpScrub || String)((info && info.componentStack) || '').slice(0, 600),
            });
        }
      } catch (e) {}
    }
    render() {
      if (!this.state.err) return this.props.children;
      const isTab = this.props.scope !== 'root';
      const msg = (this.state.err && this.state.err.message) || String(this.state.err);
      return (
        <div style={{padding:'32px 24px',maxWidth:560,margin:'0 auto',textAlign:'center',
                     wordBreak:'keep-all',overflowWrap:'break-word'}}>
          <h2 style={{fontSize:17,fontWeight:600,margin:'0 0 10px',color:'var(--fg-primary)'}}>
            {isTab ? '이 탭을 표시하지 못했습니다' : '관리자 화면에 문제가 생겼습니다'}
          </h2>
          <p style={{fontSize:14,lineHeight:1.65,margin:'0 0 6px',color:'var(--fg-secondary)'}}>
            {isTab
              ? '다른 탭은 정상입니다. 사이드바에서 다른 항목을 선택하거나 아래에서 다시 시도하세요.'
              : '새로고침하면 대개 해결됩니다.'}
          </p>
          <p style={{fontSize:13,lineHeight:1.6,margin:'0 0 20px',color:'var(--fg-muted)'}}>
            이 오류는 자동으로 기록됐습니다. 오류 로그 탭에서 확인할 수 있습니다.
          </p>
          <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
            <button type="button" className="btn btn-primary btn-sm"
              onClick={() => { if (isTab) this.setState({ err: null }); else window.location.reload(); }}>
              {isTab ? '다시 시도' : '새로고침'}
            </button>
          </div>
          <details style={{marginTop:22,textAlign:'left'}}>
            <summary style={{fontSize:12,color:'var(--fg-muted)',cursor:'pointer'}}>기술 정보</summary>
            <pre style={{fontSize:11,lineHeight:1.5,marginTop:8,padding:12,overflowX:'auto',
                         background:'var(--bg-muted)',border:'1px solid var(--border-subtle)',
                         borderRadius:8,color:'var(--fg-secondary)',whiteSpace:'pre-wrap'}}>
              {(window.__dpScrub || String)(msg)}
            </pre>
          </details>
        </div>
      );
    }
  }

  // ---- 관리자 API 호출 (v01.101.07)
  // 이 함수가 생기기 전에는 `authHeaders()` 가 컴포넌트 안에 **네 번** 똑같이
  // 정의돼 있었고, 토큰을 직접 읽는 곳이 40군데, Bearer 를 손으로 조립하는
  // 곳이 41군데였다. 같은 코드가 흩어져 있으면 세션 만료 처리 같은 공통 규칙을
  // 한 곳에서 바꿀 수 없다 — 고치면 39곳이 옛날 방식으로 남는다.
  function adminToken() {
    return localStorage.getItem('dp_admin_token') || '';
  }
  // 주의: 여기서 authHeaders() 를 다시 부르면 무한 재귀다 (v01.101.07 사고).
  // 기본 헤더는 반드시 adminToken() 으로 직접 만든다.
  function authHeaders(extra) {
    return Object.assign({ authorization: 'Bearer ' + adminToken() }, extra || {});
  }
  // JSON 을 주고받는 호출은 이걸 쓴다. 반환은 { ok, status, data, error }.
  // 던지지 않는 이유: 호출부 대부분이 화면에 메시지를 띄우고 끝내야 하는데,
  // throw 를 쓰면 try/catch 를 다시 40곳에 흩뿌리게 된다.
  async function adminApi(url, opts) {
    const o = opts || {};
    const headers = authHeaders(o.body != null ? { 'content-type': 'application/json' } : null);
    if (o.headers) Object.assign(headers, o.headers);
    let r;
    try {
      r = await fetch(url, {
        method: o.method || 'GET',
        headers,
        body: o.body != null ? (typeof o.body === 'string' ? o.body : JSON.stringify(o.body)) : undefined,
        signal: o.signal,
      });
    } catch (e) {
      // 네트워크 실패를 조용히 빈 값으로 바꾸지 않는다 — 화면이 "데이터 없음"
      // 이라고 거짓말하게 된다.
      return { ok: false, status: 0, data: null, error: '네트워크 오류' };
    }
    let data = null;
    try { data = await r.json(); } catch { /* 본문이 없거나 JSON 이 아님 */ }
    if (!r.ok) {
      const msg = (data && (data.error || data.message))
        || (r.status === 401 ? '세션이 만료됐습니다. 다시 로그인해 주세요.' : 'HTTP ' + r.status);
      return { ok: false, status: r.status, data, error: msg };
    }
    return { ok: true, status: r.status, data, error: null };
  }

  // ---- A curated Lucide icon whitelist (popular icons that work as slots)
  const LUCIDE_ICONS = [
    'arrow-right','arrow-up-right','arrow-left','arrow-down-right','send','mail','phone',
    'user','user-check','users','graduation-cap','book-open','book','briefcase','building-2',
    'globe','map-pin','map','compass','flag','award','trophy','star','heart','sparkles',
    'video','camera','image','mic','headphones','play-circle','monitor','laptop','smartphone',
    'file-text','file-check','clipboard-check','circle-check-big','check','x','plus','minus',
    'calendar','clock','calendar-check','timer','hourglass',
    'languages','message-circle','message-square','bell','info','circle-help','circle-alert',
    'search','filter','settings','log-in','log-out','share-2','link','download','upload',
    'lightbulb','target','puzzle','tent','backpack','footprints','mountain','tree-pine',
    'handshake','hand-heart','gift','zap','rocket','wand-2','palette','layers','grid-3x3',
    'rss','newspaper','presentation','megaphone','quote','scroll-text',
  ];

  // ---- Icon picker (button + popover)
  function IconPicker({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const ref = useRef(null);
    useEffect(() => {
      if (open) setTimeout(() => window.lucide && window.lucide.createIcons(), 0);
    }, [open, q]);
    useEffect(() => {
      function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, []);
    useEffect(() => { window.lucide && window.lucide.createIcons(); });
    const filtered = useMemo(() => {
      const n = q.trim().toLowerCase();
      if (!n) return LUCIDE_ICONS;
      return LUCIDE_ICONS.filter(i => i.includes(n));
    }, [q]);
    return (
      <div className="icon-picker-wrap" ref={ref}>
        <button type="button" className="current" onClick={() => setOpen(o => !o)} aria-haspopup="listbox" aria-expanded={open}>
          <span className="glyph"><i data-lucide={value || 'circle-help'} width="18" height="18" strokeWidth="2"></i></span>
          <span className="name">{value || '(none)'}</span>
          <i data-lucide={open ? 'chevron-up' : 'chevron-down'} width="16" height="16" aria-hidden="true"></i>
        </button>
        {open && (
          <div className="icon-popover" role="listbox">
            <input
              type="text"
              placeholder="Search icons…"
              value={q}
              onChange={e => setQ(e.target.value)}
              autoFocus
              aria-label="Search icons"
            />
            <div className="icon-grid">
              {filtered.map(name => (
                <button key={name} type="button"
                  className={'icon-cell' + (name === value ? ' selected' : '')}
                  onClick={() => { onChange(name); setOpen(false); }}
                  title={name}
                  aria-label={name}>
                  <i data-lucide={name} width="20" height="20" strokeWidth="1.75"></i>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- Field primitives ----------------------------------------------------
  function Text({ label, value, onChange, type='text', hint, lang }) {
    return (
      <div className="field">
        <label>{label}</label>
        <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} lang={lang} />
        {hint && <span className="hint">{hint}</span>}
      </div>
    );
  }
  function Area({ label, value, onChange, rows=3, hint, lang }) {
    return (
      <div className="field">
        <label>{label}</label>
        <textarea rows={rows} value={value ?? ''} onChange={e => onChange(e.target.value)} lang={lang} />
        {hint && <span className="hint">{hint}</span>}
      </div>
    );
  }
  function Color({ label, value, onChange }) {
    return (
      <div className="field">
        <label>{label}</label>
        <div className="color-row">
          <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)} aria-label={label + ' color picker'} />
          <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} aria-label={label + ' hex value'} />
        </div>
      </div>
    );
  }
  function IconField({ label, value, onChange, hint }) {
    return (
      <div className="field">
        <label>{label}</label>
        <IconPicker value={value} onChange={onChange} />
        {hint && <span className="hint">{hint}</span>}
      </div>
    );
  }

  // ImageUploadField — file picker + URL paste fallback. Stores either a
  // data URL (file upload) or a string URL/path (manual paste). Both render
  // identically on the public site since the browser accepts both as <img src>.
  //
  //   accept   — comma-separated MIME types (e.g. 'image/png,image/svg+xml')
  //   maxBytes — raw upload cap (data URL grows ~33% from base64; we count
  //              raw bytes against this so the limit feels intuitive)
  //   preview  — 'square' | 'banner' (controls preview aspect)
  //   requireSquare — when true, any uploaded raster image that isn't 1:1
  //                   is auto-cropped to a centered square (the overflow on
  //                   the long edge is trimmed away) before it's stored.
  //                   Used for team member photos (v01.072).
  function ImageUploadField({
    label, value, onChange, hint,
    accept = 'image/png,image/svg+xml,image/jpeg,image/webp',
    maxBytes = 1024 * 1024,
    preview = 'square',
    requireSquare = false,
  }) {
    const inputId = 'imgup-' + Math.random().toString(36).slice(2, 8);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');
    // v01.080 — upload to R2 and store only the URL (not base64 in the content
    // blob). Keeps dp_content_v1 small so every page load stays fast.
    async function store(dataUrl) {
      try {
        const tok = adminToken();
        const r = await fetch('/api/admin/upload-image', {
          method: 'POST',
          headers: authHeaders({ 'content-type': 'application/json' }),
          credentials: 'same-origin',
          body: JSON.stringify({ dataUrl }),
        });
        const d = await r.json().catch(() => null);
        if (r.ok && d && d.url) { onChange(d.url); setErr(''); }
        else { setErr('업로드 실패 — ' + ((d && d.error) || ('HTTP ' + r.status))); }
      } catch { setErr('업로드 중 네트워크 오류가 발생했습니다.'); }
      finally { setBusy(false); }
    }
    function readFile(file) {
      setErr('');
      if (!file) return;
      // Validate MIME against the accept list.
      const allowed = accept.split(',').map(s => s.trim()).filter(Boolean);
      if (allowed.length && !allowed.includes(file.type)) {
        setErr('지원하지 않는 형식입니다. 허용: ' + allowed.map(m => m.replace('image/', '.')).join(', '));
        return;
      }
      if (file.size > maxBytes) {
        setErr(`파일이 너무 큽니다. 최대 ${(maxBytes / 1024 / 1024).toFixed(1)} MB까지 업로드할 수 있습니다.`);
        return;
      }
      setBusy(true);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        // 1:1 enforcement — load into an Image, and if it isn't already
        // square, center-crop the long edge away on a canvas so the stored
        // image is exactly 1:1. Raster only (PNG/JPG/WEBP); SVG is exempt
        // because it has no reliable intrinsic pixel size.
        if (requireSquare && file.type !== 'image/svg+xml') {
          const img = new Image();
          img.onload = () => {
            const w = img.naturalWidth, h = img.naturalHeight;
            if (Math.abs(w - h) <= 1) { store(dataUrl); return; }
            try {
              const side = Math.min(w, h);
              const sx = Math.round((w - side) / 2);
              const sy = Math.round((h - side) / 2);
              const canvas = document.createElement('canvas');
              canvas.width = side; canvas.height = side;
              const cx = canvas.getContext('2d');
              cx.drawImage(img, sx, sy, side, side, 0, 0, side, side);
              // Keep the original raster format; JPEG gets quality 0.92.
              const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
              const cropped = canvas.toDataURL(outType, 0.92);
              setErr('');
              store(cropped);
            } catch (e) {
              setErr('이미지를 1:1로 자르지 못했습니다. 다른 파일을 시도해주세요.');
              setBusy(false);
            }
          };
          img.onerror = () => { setErr('이미지 크기를 확인할 수 없습니다.'); setBusy(false); };
          img.src = dataUrl;
          return;
        }
        store(dataUrl);
      };
      reader.onerror = () => { setErr('파일 읽기 실패'); setBusy(false); };
      reader.readAsDataURL(file);
    }
    const isData = value && value.startsWith('data:');
    const isSvg  = value && (value.startsWith('data:image/svg+xml') || /\.svg(\?|$)/i.test(value));
    const previewBox = preview === 'banner'
      ? { width: '100%', maxWidth: 480, aspectRatio: '1.91 / 1' }
      : { width: 96, height: 96 };
    return (
      <div className="field">
        <label>{label}</label>
        {value && (
          <div style={{margin:'4px 0 10px',padding:10,background:'var(--bg-muted)',borderRadius:10,display:'flex',gap:12,alignItems:'center'}}>
            <div style={{...previewBox, flex:'0 0 auto', borderRadius:8, background:'#fff', border:'1px solid var(--border-default)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden'}}>
              <img src={value} alt="preview"
                style={{maxWidth:'100%',maxHeight:'100%',objectFit:preview === 'banner' ? 'cover' : 'contain'}}
                onError={e => { e.target.style.opacity = '0.3'; }} />
            </div>
            <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:4}}>
              <span style={{fontSize:11,fontFamily:'var(--font-mono)',color:'var(--fg-muted)'}}>
                {isData ? `${isSvg ? 'SVG' : 'IMAGE'} · 업로드됨` : value}
              </span>
              <button type="button" className="icon-btn danger" onClick={() => onChange('')} style={{alignSelf:'flex-start',padding:'2px 10px',fontSize:12}}>제거</button>
            </div>
          </div>
        )}
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <label htmlFor={inputId} className="icon-btn" style={{cursor:'pointer'}}>
            {busy ? '업로드 중…' : (value ? '다른 파일 선택' : '파일 업로드')}
            <input id={inputId} type="file" accept={accept} style={{display:'none'}}
              onChange={e => { readFile(e.target.files && e.target.files[0]); e.target.value = ''; }} />
          </label>
          <span style={{fontSize:11,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>
            허용 {accept.split(',').map(m => m.replace('image/', '.')).join(' / ')} · 최대 {(maxBytes / 1024 / 1024).toFixed(1)} MB
          </span>
        </div>
        <div style={{marginTop:8,display:'flex',gap:8,alignItems:'center'}}>
          <input type="text" placeholder="또는 URL 직접 붙여넣기 (https://… 또는 /assets/…)"
            value={isData ? '' : (value || '')}
            onChange={e => onChange(e.target.value)}
            style={{flex:1}} />
        </div>
        {err && <div role="alert" style={{marginTop:6,padding:'6px 10px',background:'var(--state-danger-bg)',color:'var(--state-danger)',borderRadius:6,fontSize:12}}>{err}</div>}
        {hint && <span className="hint">{hint}</span>}
      </div>
    );
  }

  // ---- Immutable setter helper
  function setDeep(obj, pathArr, val) {
    if (pathArr.length === 0) return val;
    const [head, ...rest] = pathArr;
    const next = Array.isArray(obj) ? obj.slice() : { ...obj };
    next[head] = setDeep(obj ? obj[head] : undefined, rest, val);
    return next;
  }

  // ---- EditorWithPreview ---------------------------------------------------
  // Wraps a page-editing tab so the user gets a side-by-side editor + live
  // preview. Edits are kept in a local draft; only the Save button commits
  // them to the parent `content` state (which then triggers the existing
  // autosave to KV). Discard reverts the draft.
  //
  // Preview rendering: an iframe loads `${previewPath}?preview=1`. The public
  // site's content-store recognizes that flag, skips its own server fetch,
  // and applies whatever content the parent posts via window.postMessage.
  // The iframe pings `dp-preview-ready` once it's loaded so we know when to
  // send the initial draft (otherwise our first message could land before
  // the listener is attached).
  // Available preview viewports. Each entry is the *real* CSS-pixel viewport
  // we want the public site to think it has — the iframe renders at exactly
  // these dimensions so its own responsive breakpoints fire correctly. The
  // device frame is then scaled down with transform: scale to fit whatever
  // space the preview pane has. Without the scale-down, PC mode rendered at
  // ~600px wide because that's the actual pane width, which made the public
  // site fall through to tablet/mobile CSS — exactly the bug the operator
  // reported.
  const PREVIEW_DEVICES = {
    desktop: { label: 'PC',     icon: 'monitor',     width: 1440, height: 900 },  // 16:10 common laptop
    tablet:  { label: 'Tablet', icon: 'tablet',      width: 820,  height: 1180 }, // iPad Air
    mobile:  { label: 'Mobile', icon: 'smartphone',  width: 390,  height: 844 },  // iPhone 14
  };

  // Reusable hero background editor (v01.079): image upload + color + focal
  // position. `path` is the content path of the hero NODE (bg_* keys live at
  // that node level, language-independent). Used by every hero editor.
  function HeroBgFields({ path, node, set, title, hideColor }) {
    node = node || {};
    // Parse bg_position into X/Y percentages for the sliders. Supports both the
    // new "X% Y%" format and the legacy keyword presets.
    const parsePos = (s) => {
      const m = String(s || '').match(/(-?\d+)%\s+(-?\d+)%/);
      if (m) return [Math.max(0, Math.min(100, +m[1])), Math.max(0, Math.min(100, +m[2]))];
      const KW = { center:[50,50], top:[50,0], bottom:[50,100], left:[0,50], right:[100,50],
        'left top':[0,0], 'right top':[100,0], 'left bottom':[0,100], 'right bottom':[100,100] };
      return KW[String(s || '').trim()] || [50, 50];
    };
    const [px, py] = parsePos(node.bg_position);
    const setPos = (x, y) => set([...path, 'bg_position'], x + '% ' + y + '%');
    const sliderStyle = { width: '100%' };
    const enabled = !!(node.bg_image || node.bg_color);
    return (
      <details className="card hero-bg-card" open>
        <summary>
          <span className="hero-bg-chevron" aria-hidden="true">▶</span>
          <h3 style={{margin:0,display:'inline',fontSize:'inherit'}}>{title || '히어로 배경'}</h3>
          <span className="hero-bg-state">{enabled ? '● 설정됨' : '○ 기본'}</span>
        </summary>
        <div style={{marginTop:12}}>
        <p className="desc" style={{marginTop:-4}}>이미지를 올리면 배경이 이미지로 바뀝니다(어두운 오버레이 + 흰 글씨). 둘 다 비우면 기본 색이 유지됩니다.</p>
        <ImageUploadField label="배경 이미지" value={node.bg_image || ''} onChange={v => set([...path,'bg_image'], v)}
          preview="banner" accept="image/png,image/jpeg,image/webp" maxBytes={4 * 1024 * 1024}
          hint="이미지를 올리면 색 대신 이미지가 배경이 됩니다(어두운 오버레이 + 흰 글씨, 모바일·PC 자동 cover). 비우면 아래 색 또는 기본 색." />
        {!hideColor && <Color label="배경색 (이미지 없을 때)" value={node.bg_color || ''} onChange={v => set([...path,'bg_color'], v)} />}
        <div className="field">
          <label>이미지 위치 조정 (가로 {px}% · 세로 {py}%)</label>
          {/* Live preview — reflects the sliders so the operator sees the crop. */}
          {node.bg_image ? (
            <div style={{height:96,borderRadius:8,border:'1px solid var(--border-subtle)',marginBottom:10,
              backgroundImage:`linear-gradient(rgba(17,9,38,0.45),rgba(17,9,38,0.45)), url("${node.bg_image}")`,
              backgroundSize:'cover', backgroundRepeat:'no-repeat', backgroundPosition: px + '% ' + py + '%',
              display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:700}}>
              미리보기
            </div>
          ) : (
            <div style={{fontSize:12,color:'var(--fg-muted)',marginBottom:8}}>이미지를 올리면 슬라이더로 위치를 맞출 수 있습니다.</div>
          )}
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
            <span style={{fontSize:12,color:'var(--fg-secondary)',width:64,flex:'0 0 auto'}}>가로 ↔</span>
            <input type="range" min={0} max={100} value={px} style={sliderStyle}
              onChange={e => setPos(+e.target.value, py)} aria-label="가로 위치" />
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:12,color:'var(--fg-secondary)',width:64,flex:'0 0 auto'}}>세로 ↕</span>
            <input type="range" min={0} max={100} value={py} style={sliderStyle}
              onChange={e => setPos(px, +e.target.value)} aria-label="세로 위치" />
          </div>
          <div style={{marginTop:8}}>
            <button type="button" className="icon-btn" onClick={() => setPos(50, 50)}>가운데로 초기화</button>
          </div>
        </div>
        </div>
      </details>
    );
  }

  // Profile photo focal-position nudge (X/Y). Photos display in a square
  // frame with background-size:cover; this picks which part shows. (v01.088.04)
  function PhotoPos({ img, value, onChange }) {
    if (!img) return null;
    const m = String(value || '').match(/(-?\d+)%\s+(-?\d+)%/);
    const x = m ? Math.max(0, Math.min(100, +m[1])) : 50;
    const y = m ? Math.max(0, Math.min(100, +m[2])) : 50;
    const setP = (nx, ny) => onChange(nx + '% ' + ny + '%');
    return (
      <div className="field">
        <label>사진 위치 조정 (가로 {x}% · 세로 {y}%)</label>
        <div style={{width:96,height:96,borderRadius:10,border:'1px solid var(--border-subtle)',marginBottom:8,backgroundImage:'url("'+img+'")',backgroundSize:'cover',backgroundPosition:x+'% '+y+'%'}} />
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}><span style={{fontSize:12,color:'var(--fg-secondary)',width:48,flex:'0 0 auto'}}>가로 ↔</span><input type="range" min={0} max={100} value={x} style={{width:'100%'}} onChange={e => setP(+e.target.value, y)} /></div>
        <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontSize:12,color:'var(--fg-secondary)',width:48,flex:'0 0 auto'}}>세로 ↕</span><input type="range" min={0} max={100} value={y} style={{width:'100%'}} onChange={e => setP(x, +e.target.value)} /></div>
        <div style={{marginTop:6}}><button type="button" className="icon-btn" onClick={() => setP(50,50)}>가운데로</button></div>
      </div>
    );
  }

  // Per-page hero editor (header text + background) — EN only, because the
  // public site renders English. Drop into each page's own content tab so the
  // whole page is managed in one place. (v01.083)
  function PageHeroText({ c, set, pageKey, label }) {
    const ph = (c.page_heros || {});
    const g = (k) => (ph[pageKey] && ph[pageKey].en && ph[pageKey].en[k]) || '';
    const setF = (k, v) => set(['page_heros', pageKey, 'en', k], v);
    return (
      <>
        <details className="card admin-fold" open>
          <summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{margin:0,display:'inline',fontSize:'inherit'}}>{label || '히어로 (헤더)'}</h3></summary>
          <div style={{marginTop:12}}>
            <Text label="Kicker" value={g('kicker')} onChange={v => setF('kicker', v)} lang="en" />
            <div className="grid-2 tight">
              <Text label="Title line 1" value={g('title_l1')} onChange={v => setF('title_l1', v)} lang="en" />
              <Text label="Title line 2 (선택)" value={g('title_l2')} onChange={v => setF('title_l2', v)} lang="en" />
            </div>
            <Area label="Subtitle" value={g('sub')} onChange={v => setF('sub', v)} lang="en" rows={2} />
          </div>
        </details>
        <HeroBgFields title="히어로 배경" path={['page_heros', pageKey]} node={ph[pageKey]} set={set} />
      </>
    );
  }

  function EditorWithPreview({ tabId, previewPath, content, onSave, onDirtyChange, addItem, removeItem, children }) {
    const [draft, setDraft] = useState(() => window.dpClone(content));
    const [dirty, setDirty] = useState(false);
    const [iframeReady, setIframeReady] = useState(false);
    const [previewKey, setPreviewKey] = useState(0);
    const [device, setDevice] = useState(() => localStorage.getItem('dp_admin_preview_device') || 'desktop');
    const [deviceScale, setDeviceScale] = useState(1);
    const iframeRef = useRef(null);
    const stageRef = useRef(null);
    const previewRetryRef = useRef(null);

    useEffect(() => { localStorage.setItem('dp_admin_preview_device', device); }, [device]);

    function clearPreviewRetry() {
      if (previewRetryRef.current) {
        clearTimeout(previewRetryRef.current);
        previewRetryRef.current = null;
      }
    }

    function pushPreviewDraft(nextDraft, attempts = 4) {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      clearPreviewRetry();
      try { win.postMessage({ type: 'dp-preview-content', content: nextDraft }, '*'); } catch {}
      if (attempts <= 1) return;
      previewRetryRef.current = setTimeout(() => pushPreviewDraft(nextDraft, attempts - 1), 180);
    }

    // Recompute scale whenever the stage resizes or the device changes.
    // Always scale-to-fit width; don't upscale beyond 1× even if the pane is
    // huge (operator wants to see the device at its native size or smaller).
    useEffect(() => {
      const el = stageRef.current;
      if (!el) return;
      const d = PREVIEW_DEVICES[device];
      function update() {
        const padding = 40;  // matches .split-preview-stage padding * 2
        const w = el.clientWidth - padding;
        const h = el.clientHeight - padding;
        const scale = Math.min(1, w / d.width, h / d.height);
        setDeviceScale(Math.max(0.1, scale));
      }
      update();
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }, [device]);

    // Reset draft when parent content changes externally (after Save) — but
    // only if we're not currently editing. Otherwise we'd nuke the user's work.
    useEffect(() => {
      if (!dirty) setDraft(window.dpClone(content));
    }, [content]);

    // Reset draft completely when switching to a different page tab.
    useEffect(() => {
      setDraft(window.dpClone(content));
      setDirty(false);
      setIframeReady(false);
      clearPreviewRetry();
      setPreviewKey(k => k + 1);  // force iframe reload at the new previewPath
    }, [tabId, previewPath]);

    useEffect(() => { onDirtyChange && onDirtyChange(dirty); }, [dirty]);

    // Listen for the iframe's ready ping so we know when to push initial draft.
    useEffect(() => {
      function onMsg(e) {
        if (e.source !== iframeRef.current?.contentWindow) return;
        if (e.data && e.data.type === 'dp-preview-ready') {
          setIframeReady(true);
          pushPreviewDraft(draft);
        }
      }
      window.addEventListener('message', onMsg);
      return () => {
        window.removeEventListener('message', onMsg);
        clearPreviewRetry();
      };
    }, []);

    // Push the latest draft to the iframe whenever it changes (and after ready).
    useEffect(() => {
      if (!iframeReady) return;
      pushPreviewDraft(draft);
    }, [draft, iframeReady]);

    function draftSet(pathArr, val) {
      setDraft(prev => setDeep(prev, pathArr, val));
      setDirty(true);
    }
    function draftAddItem(pathArr, item) {
      setDraft(prev => {
        const arr = pathArr.reduce((a, k) => a[k], prev) || [];
        return setDeep(prev, pathArr, arr.concat([item]));
      });
      setDirty(true);
    }
    function draftRemoveItem(pathArr, i) {
      setDraft(prev => {
        const arr = pathArr.reduce((a, k) => a[k], prev) || [];
        return setDeep(prev, pathArr, arr.filter((_, idx) => idx !== i));
      });
      setDirty(true);
    }

    function save() {
      if (!dirty) return;
      onSave(draft);
      setDirty(false);
    }
    function discard() {
      if (!dirty) return;
      if (!confirm('Discard unsaved changes? This cannot be undone.')) return;
      setDraft(window.dpClone(content));
      setDirty(false);
      setPreviewKey(k => k + 1);  // reload iframe to flush stale draft
    }
    function reloadPreview() {
      setIframeReady(false);
      setPreviewKey(k => k + 1);
    }

    const iframeUrl = previewPath + (previewPath.includes('?') ? '&' : '?') + 'preview=1';

    return (
      <div className="splitpane">
        <div className="split-toolbar">
          <div className="split-status">
            <span className={'split-dot ' + (dirty ? 'dirty' : 'clean')} aria-hidden="true" />
            <span style={{fontSize:13,fontWeight:600,color:dirty?'#92400E':'var(--forest-green)'}}>
              {dirty ? 'Unsaved changes' : 'No changes'}
            </span>
            <span style={{fontSize:11,color:'var(--fg-muted)',marginLeft:8}}>
              Edits stay local until you press Save.
            </span>
          </div>
          <div className="split-actions">
            <button type="button" className="icon-btn" onClick={reloadPreview} title="Reload preview iframe">↻ Reload preview</button>
            <button type="button" className="icon-btn danger" onClick={discard} disabled={!dirty}>Discard</button>
            <button type="button" className="btn-add" onClick={save} disabled={!dirty} style={{padding:'10px 22px'}}>Save changes</button>
          </div>
        </div>
        <div className="split-body">
          <div className="split-editor">
            {children({ c: draft, set: draftSet, addItem: draftAddItem, removeItem: draftRemoveItem })}
          </div>
          <div className="split-preview">
            <div className="split-preview-bar">
              <span style={{fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--fg-muted)'}}>Live preview</span>
              <code style={{fontSize:11,fontFamily:'var(--font-mono)',color:'var(--scouting-purple)'}}>{previewPath}</code>
              <div className="device-toggle" role="group" aria-label="Preview viewport">
                {Object.entries(PREVIEW_DEVICES).map(([key, d]) => (
                  <button key={key} type="button"
                    className={'device-btn' + (device === key ? ' active' : '')}
                    onClick={() => setDevice(key)}
                    aria-pressed={device === key}
                    title={d.width ? `${d.label} · ${d.width}×${d.height}` : d.label}>
                    <i data-lucide={d.icon} width="14" height="14" />
                    <span>{d.label}</span>
                  </button>
                ))}
              </div>
              <a className="icon-btn" href={previewPath} target="_blank" rel="noopener" title="Open in a new tab (without preview)">Open ↗</a>
            </div>
            <div className={'split-preview-stage device-' + device} ref={stageRef}>
              <div className="device-slot" style={{ width: PREVIEW_DEVICES[device].width * deviceScale, height: PREVIEW_DEVICES[device].height * deviceScale }}>
                <div className="device-frame" style={{
                  width: PREVIEW_DEVICES[device].width,
                  height: PREVIEW_DEVICES[device].height,
                  transform: `scale(${deviceScale})`,
                }}>
                  <iframe
                    key={previewKey}
                    ref={iframeRef}
                    src={iframeUrl}
                    className="split-iframe"
                    title={'Preview · ' + previewPath}
                    onLoad={() => {
                      setIframeReady(true);
                      pushPreviewDraft(draft);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- i18n ----------------------------------------------------------------
  // All admin chrome (sidebar groups, tab labels, topbar, headings) is
  // bilingual. Toggle with the KO/EN switch in the topbar.
  const I18N = {
    en: {
      console: 'Admin Console',
      group: { Overview:'Overview', Setup:'Setup', Homepage:'Homepage',
               Content:'Content', Errors:'Errors',
               StudentSupport:'Student support', Members:'Members',
               Mail:'Mailbox', InternalMsg:'Internal messages',
               System:'System', Wiki:'Wiki' },
      tab: {
        dashboard:'Dashboard',
        members:'Member directory', member_groups:'Member groups', member_roles:'Roles & permissions',
        send_notification:'Send notification', notification_history:'Send history',
        inquiry_categories:'Inquiry categories',
        brand:'Brand & Nav', footer:'Footer', icons:'Icons',
        notice:'Top notice banner', og_images:'OG / SEO images', two_factor:'2FA (Authenticator)', email_templates:'Email templates', receipt_template:'Receipt template', integrations:'API & integrations',
        mailbox:'Mailbox',
        hero:'Hero', how:'How it works', cta:'CTA banner', banners:'Banner ads (popup)',
        about:'About page', menu_names:'Menu names', partner_cta:'Partner CTA', team:'Project team', apply:'Apply', apply_done:'Apply complete', mypage:'My page', scholarships:'Scholarships',
        errors_copy:'Error pages copy',
        programs:'Programs', program_detail:'Program detail',
        partners:'Partners', stories:'Stories', news:'News', faq:'FAQ',
        essays:'Apply essays',
        translations:'KO ↔ EN translations',
        design_system:'Design System (live)', error_preview:'Error pages preview',
        wiki_kms:'KMS (coding)', wiki_color:'Color guide', wiki_logo:'Logo guide', wiki_design:'Design guide', wiki_versions:'Version history',
        analytics:'Analytics', apps:'Applications', inquiries:'Inquiries',
        error_logs:'Error logs', consent_log:'Consent log',
        legal:'Legal documents',
        api_dir:'API directory',
      },
      action: { open_site:'Open site ↗', export:'Export JSON', reset:'Reset all', logout:'Log out' },
      save: { saving:'Saving…', saved:'✓ Saved', error:'Save failed', idle:'All changes saved' },
      lede: 'Changes save automatically to Cloudflare and reflect on the live site.',
      login: { title:'KoreaDreamPath Admin', sub:'Enter the admin token to continue.', placeholder:'Admin token', verify:'Verifying…', signin:'Sign in', invalid:'Invalid token.' },
    },
    ko: {
      console: '관리자 콘솔',
      group: { Overview:'대시보드', Setup:'사이트 설정', Homepage:'홈페이지',
               Content:'페이지·콘텐츠', Errors:'에러 페이지',
               StudentSupport:'학생 지원', Members:'회원 정보',
               Mail:'메일함', InternalMsg:'내부 알림',
               System:'시스템', Wiki:'위키' },
      tab: {
        dashboard:'대시보드',
        members:'회원 목록', member_groups:'회원 그룹', member_roles:'등급 / 권한',
        send_notification:'알림 보내기', notification_history:'발송 기록',
        inquiry_categories:'문의 유형',
        brand:'브랜드 / 네비게이션', footer:'푸터', icons:'아이콘',
        notice:'상단 공지 배너', og_images:'OG / SEO 이미지', two_factor:'2단계 인증', email_templates:'이메일 템플릿', receipt_template:'영수증 템플릿', integrations:'API · 통합',
        mailbox:'메일함',
        hero:'히어로', how:'How it works', cta:'CTA 배너', banners:'배너 광고(팝업)',
        about:'About 페이지', menu_names:'메뉴 이름', partner_cta:'파트너 CTA', team:'프로젝트 팀', apply:'지원', apply_done:'지원 완료', mypage:'마이페이지', scholarships:'장학',
        errors_copy:'에러 페이지 텍스트',
        programs:'프로그램', program_detail:'프로그램 상세',
        partners:'파트너', stories:'스토리', news:'소식', faq:'FAQ',
        essays:'지원 에세이 문항',
        translations:'KO ↔ EN 번역',
        design_system:'디자인 시스템 (실시간)', error_preview:'에러 페이지 미리보기',
        wiki_kms:'KMS (코딩)', wiki_color:'컬러 가이드', wiki_logo:'로고 가이드', wiki_design:'디자인 가이드', wiki_versions:'버전 기록',
        analytics:'방문자 분석', apps:'지원서', inquiries:'문의',
        error_logs:'오류 로그', consent_log:'동의 기록',
        legal:'법률 문서',
        api_dir:'API 목록',
      },
      action: { open_site:'사이트 열기 ↗', export:'JSON 내보내기', reset:'전체 초기화', logout:'로그아웃' },
      save: { saving:'저장 중…', saved:'✓ 저장됨', error:'저장 실패', idle:'모든 변경 저장됨' },
      lede: '변경사항은 자동으로 Cloudflare에 저장되어 실시간으로 사이트에 반영됩니다.',
      login: { title:'KoreaDreamPath 관리자', sub:'관리자 토큰을 입력하세요.', placeholder:'관리자 토큰', verify:'확인 중…', signin:'로그인', invalid:'잘못된 토큰입니다.' },
    },
  };

  // ---- Tabs ----------------------------------------------------------------
  // Re-grouped for clarity (2026-05-04):
  //   Setup     — site identity (brand/footer/icons/notice)
  //   Homepage  — sections that only appear on /
  //   Pages     — every other public page (incl. error copy)
  //   Programs  — programs board + per-program detail
  //   Content   — lists used across pages (partners/stories/faq)
  //   Wiki      — internal docs (KMS / color / design)
  //   Tools     — admin-only utilities (translations / design system / error preview)
  //   Data      — backend records (applications / inquiries / analytics)
  // (WIDE_TABS removed in v01.019 — admin is PC-only and every tab now uses
  // the full content width via .main-inner without a per-tab whitelist.)

  // Tabs that edit content visible on a public page get a side-by-side
  // editor + live-preview iframe. The value is the public route to load
  // for the preview. Edits don't autosave — the user must click Save.
  // Tabs not in this map render as plain editors with the existing autosave.
  // Mirror of worker.js's ALWAYS_ADMIN_EMAIL — used to lock the role toggle
  // on the member detail panel.
  const ALWAYS_ADMIN_EMAIL = 'scoutkorea@kakao.com';

  const PREVIEW_PATHS = {
    // Homepage sections
    hero:           '/',
    how:            '/',
    cta:            '/',
    banners:        '/',
    // Pages
    about:          '/about',
    apply:          '/apply',
    apply_done:     '/apply',
    mypage:         '/member',
    scholarships:   '/scholarships',
    partner_cta:    '/partners',
    team:           '/team',
    // Programs
    programs:       '/programs',
    program_detail: '/program/ai-language',
    // Content lists
    partners:       '/partners',
    stories:        '/stories',
    news:           '/news',
    faq:            '/contact',      // FAQ section lives on /contact
  };

  // Lucide icon for each top-level sidebar group. Pick names that are
  // present in the LUCIDE_ICONS allowlist above; falls back to 'circle'.
  const GROUP_ICONS = {
    Overview:       'layout-dashboard',
    Setup:          'settings',
    Homepage:       'home',
    Content:        'layers',
    Errors:         'triangle-alert',
    StudentSupport: 'graduation-cap',
    Members:        'users',
    Mail:           'mail',
    InternalMsg:    'bell',
    System:         'wrench',
    Wiki:           'book-open',
  };

  // The mailbox group is dynamic — one sub-tab per managed inbox account
  // (read from c.inboxes). buildTabs(c) returns the full TABS array merged
  // with the dynamic Mail entries. Group order = sidebar order. Tab order
  // within a group = sub-tab strip order. The first tab in the returned
  // array is the landing tab when you sign in.
  function buildTabs(c) {
    const inboxes = (c && Array.isArray(c.inboxes))
      ? c.inboxes.filter(b => b && b.address && b.enabled !== false)
      : [];
    // Each managed account becomes its own sub-tab id "mailbox:<address>".
    // Inside the tab, top-level filters distinguish 받은 메일 / 보낸 메일.
    const mailboxTabs = inboxes.map(b => ({
      id: 'mailbox:' + b.address,
      group: 'Mail',
      label: b.label_ko || b.label_en || b.address,
      account: b.address,
    }));
    // v01.028 — sidebar consolidated from 14 → 11 groups for legibility.
    // Reasoning logged in HANDOFF.md + KMS Change log.
    //   • Marketing (analytics-only) merged into Overview.
    //   • Pages + Programs + Content merged into "Content" (콘텐츠).
    //   • Setup slimmed to identity-only; templates/integrations/legal
    //     moved into a new "System" group together with Tools.
    //   • Mail / InternalMsg / Members / StudentSupport stay separate
    //     per operator preference (different mental categories).
    return [
      { id: 'dashboard',     group: 'Overview' },
      { id: 'analytics',     group: 'Overview' },

      { id: 'brand',         group: 'Setup' },
      { id: 'footer',        group: 'Setup' },
      { id: 'icons',         group: 'Setup' },
      { id: 'notice',        group: 'Setup' },
      { id: 'og_images',     group: 'Setup' },
      { id: 'two_factor',    group: 'Setup' },

      { id: 'hero',          group: 'Homepage' },
      { id: 'how',           group: 'Homepage' },
      { id: 'cta',           group: 'Homepage' },
      { id: 'banners',       group: 'Homepage' },

      // 페이지·콘텐츠 — every public-facing content tab in one place.
      { id: 'about',         group: 'Content' },
      { id: 'menu_names',    group: 'Content' },
      { id: 'apply',         group: 'Content' },
      { id: 'apply_done',    group: 'Content' },
      { id: 'mypage',        group: 'Content' },
      { id: 'scholarships',  group: 'Content' },
      { id: 'team',          group: 'Content' },
      { id: 'programs',      group: 'Content' },
      { id: 'program_detail',group: 'Content' },
      { id: 'partners',      group: 'Content' },
      { id: 'stories',       group: 'Content' },
      { id: 'news',          group: 'Content' },
      { id: 'faq',           group: 'Content' },
      { id: 'essays',        group: 'Content' },

      // Mail — one tab per managed inbox. Stays its own group.
      ...mailboxTabs,

      // Internal messages — admin → student. Different from external mail.
      { id: 'send_notification',     group: 'InternalMsg' },
      { id: 'notification_history',  group: 'InternalMsg' },

      { id: 'members',         group: 'Members' },
      { id: 'member_groups',   group: 'Members' },
      { id: 'member_roles',    group: 'Members' },
      { id: 'consent_log',     group: 'Members' },

      { id: 'apps',                group: 'StudentSupport' },
      { id: 'inquiries',           group: 'StudentSupport' },
      { id: 'inquiry_categories',  group: 'StudentSupport' },

      { id: 'errors_copy',   group: 'Errors' },
      { id: 'error_preview', group: 'Errors' },
      { id: 'error_logs',    group: 'Errors' },

      // System — backend-leaning ops + dev tools previously scattered
      // across Setup + Tools.
      { id: 'email_templates',  group: 'System' },
      { id: 'receipt_template', group: 'System' },
      { id: 'integrations',     group: 'System' },
      { id: 'legal',            group: 'System' },
      { id: 'translations',     group: 'System' },
      { id: 'design_system',    group: 'System' },
      { id: 'api_dir',          group: 'System' },

      { id: 'wiki_kms',       group: 'Wiki' },
      { id: 'wiki_color',     group: 'Wiki' },
      { id: 'wiki_logo',      group: 'Wiki' },
      { id: 'wiki_design',    group: 'Wiki' },
      { id: 'wiki_versions',  group: 'Wiki' },
    ];
  }

  // ===== Section editors ====================================================
  function BrandTab({ c, set }) {
    const b = c.brand, n = c.nav;
    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Brand</h3></summary>
          <div className="grid-2">
            <Text label="Brand name (EN)" value={b.name_en} onChange={v => set(['brand','name_en'], v)} lang="en" />
          </div>
          <ImageUploadField
            label="Logo mark"
            value={b.logo_mark}
            onChange={v => set(['brand','logo_mark'], v)}
            accept="image/svg+xml,image/png,image/jpeg,image/webp"
            maxBytes={500 * 1024}
            preview="square"
            hint="SVG 권장 (해상도 무관). PNG/JPG/WebP도 가능. URL 또는 /assets/… 경로 직접 입력도 지원."
          />
          <Area label="Footer tagline (EN)" value={b.footer_tagline_en} onChange={v => set(['brand','footer_tagline_en'], v)} lang="en" />
          <div className="grid-2">
            <Text label="Contact email" value={b.email} onChange={v => set(['brand','email'], v)} />
            <Text label="Partners email" value={b.partners_email} onChange={v => set(['brand','partners_email'], v)} />
          </div>
        </details>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Navigation labels</h3></summary>
          <p className="desc">Labels for the top navigation. Most are shared across languages; the Apply CTA differs.</p>
          <div className="grid-2">
            {['programs','about','partners','stories','news','apply'].map(k => (
              <React.Fragment key={k}>
                <Text label={`${k} (EN)`} value={n.en[k]} onChange={v => set(['nav','en',k], v)} lang="en" />
              </React.Fragment>
            ))}
          </div>
        </details>
      </>
    );
  }

  function HeroTab({ c, set }) {
    const en = c.hero.en;
    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Hero copy</h3></summary>
          <Text label="Kicker" value={en.kicker} onChange={v => set(['hero','en','kicker'], v)} lang="en" />
          <div className="grid-2 tight">
            <Text label="Title line 1" value={en.title_l1} onChange={v => set(['hero','en','title_l1'], v)} lang="en" />
            <Text label="Title line 2" value={en.title_l2} onChange={v => set(['hero','en','title_l2'], v)} lang="en" />
          </div>
          <Area label="Subtitle" value={en.sub} onChange={v => set(['hero','en','sub'], v)} rows={3} lang="en" />
          <div className="grid-2 tight">
            <Text label="Primary CTA" value={en.cta1} onChange={v => set(['hero','en','cta1'], v)} lang="en" />
            <Text label="Secondary CTA" value={en.cta2} onChange={v => set(['hero','en','cta2'], v)} lang="en" />
          </div>
        </details>
        <HeroBgFields title="홈 히어로 배경" path={['hero']} node={c.hero} set={set} />
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Hero accent dots</h3></summary>
          <p className="desc">The four color dots floating in the hero. Edit color and accessibility label.</p>
          {c.hero.dots.map((d, i) => (
            <div className="rep-item" key={i}>
              <div className="rep-head"><strong>Dot {i+1}</strong></div>
              <div className="grid-2 tight">
                <Color label="Color" value={d.color} onChange={v => set(['hero','dots',i,'color'], v)} />
                <Text label="Label" value={d.label} onChange={v => set(['hero','dots',i,'label'], v)} />
              </div>
            </div>
          ))}
        </details>
      </>
    );
  }

  function StatsTab({ c, set, addItem, removeItem }) {
    return (
      <div className="card">
        <h3>Key stats</h3>
        <p className="desc">Four large numbers shown under the hero.</p>
        {c.stats.map((s, i) => (
          <div className="rep-item" key={i}>
            <div className="rep-head">
              <strong>Stat {i+1}</strong>
              <div className="ctrls">
                <button className="icon-btn danger" onClick={() => removeItem(['stats'], i)}>Delete</button>
              </div>
            </div>
            <div className="grid-2 tight">
              <Text label="Number" value={s.n} onChange={v => set(['stats',i,'n'], v)} />
              <div/>
              <Text label="Label" value={s.en} onChange={v => set(['stats',i,'en'], v)} lang="en" />
            </div>
          </div>
        ))}
        <button className="btn-add" onClick={() => addItem(['stats'], { n: '0', ko: '새 지표', en: 'New stat' })}>+ Add stat</button>
      </div>
    );
  }

  function HowTab({ c, set, addItem, removeItem }) {
    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Section heading</h3></summary>
          <div className="grid-2 tight">
            <Text label="Kicker" value={c.how.en.kicker} onChange={v => set(['how','en','kicker'], v)} lang="en" />
            <Text label="Title" value={c.how.en.title} onChange={v => set(['how','en','title'], v)} lang="en" />
          </div>
        </details>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Steps</h3></summary>
          {c.how.steps.map((s, i) => (
            <div className="rep-item" key={i}>
              <div className="rep-head">
                <strong>Step {i+1}</strong>
                <div className="ctrls">
                  <button className="icon-btn danger" onClick={() => removeItem(['how','steps'], i)}>Delete</button>
                </div>
              </div>
              <div className="grid-2 tight">
                <Text label="Number" value={s.n} onChange={v => set(['how','steps',i,'n'], v)} />
                <IconField label="Icon" value={s.icon} onChange={v => set(['how','steps',i,'icon'], v)} />
                <Text label="Title" value={s.t_en} onChange={v => set(['how','steps',i,'t_en'], v)} lang="en" />
                <Area label="Description" value={s.d_en} onChange={v => set(['how','steps',i,'d_en'], v)} lang="en" />
              </div>
            </div>
          ))}
          <button className="btn-add" onClick={() => addItem(['how','steps'], { n: String(c.how.steps.length+1).padStart(2,'0'), icon: 'check', t_ko: '', t_en: 'Title', d_ko: '', d_en: '' })}>+ Add step</button>
        </details>
      </>
    );
  }

  function ProgramsTab({ c, set, addItem, removeItem }) {
    const [editingId, setEditingId] = useState(null);
    const [query, setQuery]  = useState('');
    const [fStatus, setFStatus] = useState('all');
    const [fCategory, setFCategory] = useState('all');
    const [selected, setSelected] = useState(new Set());
    const [sort, setSort] = useState({ key: 'index', dir: 'asc' });

    const editing = editingId != null ? c.programs.find(p => p.id === editingId) : null;
    const editingIndex = editingId != null ? c.programs.findIndex(p => p.id === editingId) : -1;

    if (editing) {
      return (
        <ProgramEditor
          c={c}
          program={editing}
          index={editingIndex}
          set={set}
          onClose={() => setEditingId(null)}
          onDelete={() => {
            if (!confirm('Delete this program? Long-form details in D1 are kept; you can purge them via Reset.')) return;
            removeItem(['programs'], editingIndex);
            setEditingId(null);
          }}
        />
      );
    }

    // Derive filter options from data
    const statuses = Array.from(new Set(c.programs.map(p => p.status).filter(Boolean)));
    const categories = Array.from(new Set(c.programs.map(p => p.category || (p.kicker ? p.kicker.split('·')[0].trim() : '')).filter(Boolean)));

    // Filter + search
    const q = query.trim().toLowerCase();
    let rows = c.programs.map((p, idx) => ({ p, idx }));
    rows = rows.filter(({ p }) => {
      if (fStatus !== 'all' && p.status !== fStatus) return false;
      if (fCategory !== 'all') {
        const cat = p.category || (p.kicker ? p.kicker.split('·')[0].trim() : '');
        if (cat !== fCategory) return false;
      }
      if (q) {
        const hay = [p.id, p.title_ko, p.title_en, p.kicker, p.sub_ko, p.sub_en].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    // Sort
    if (sort.key !== 'index') {
      rows.sort((a, b) => {
        const va = String(a.p[sort.key] || '').toLowerCase();
        const vb = String(b.p[sort.key] || '').toLowerCase();
        if (va < vb) return sort.dir === 'asc' ? -1 : 1;
        if (va > vb) return sort.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    function toggleSort(key) {
      setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
    }
    function toggleSel(id) {
      setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    }
    function selectAll() {
      const ids = rows.map(r => r.p.id);
      setSelected(prev => prev.size === ids.length ? new Set() : new Set(ids));
    }
    function bulkDelete() {
      if (!confirm('Delete ' + selected.size + ' program(s)? This cannot be undone.')) return;
      // Remove by id from highest index to lowest to avoid shift bugs
      const indices = c.programs
        .map((p, i) => selected.has(p.id) ? i : -1)
        .filter(i => i >= 0)
        .sort((a, b) => b - a);
      indices.forEach(i => removeItem(['programs'], i));
      setSelected(new Set());
    }
    function duplicate(p) {
      const id = p.id + '-copy-' + Date.now().toString(36).slice(-3);
      const copy = { ...p, id, title_ko: p.title_ko + ' (복사)', title_en: p.title_en + ' (copy)' };
      addItem(['programs'], copy);
      setTimeout(() => setEditingId(id), 50);
    }
    function newProgram() {
      const id = 'new-program-' + Date.now().toString(36).slice(-4);
      addItem(['programs'], {
        id, kicker: 'MICRO-DEGREE', category: 'MICRO-DEGREE',
        title_ko: '새 프로그램', title_en: 'New program',
        sub_ko: '', sub_en: '',
        meta: ['12 weeks','100% remote','EN'], level: 'Beginner', status: 'open',
        color: '#6B2DBE', accent: '#82E6DE', icon: 'book-open',
      });
      setTimeout(() => setEditingId(id), 50);
    }

    const headerCell = (label, key) => (
      <th onClick={() => toggleSort(key)} style={{cursor:'pointer',userSelect:'none'}}>
        <span style={{display:'inline-flex',alignItems:'center',gap:4}}>
          {label}
          {sort.key === key && <span style={{fontSize:10}}>{sort.dir === 'asc' ? '▲' : '▼'}</span>}
        </span>
      </th>
    );

    const STATUS_STYLE = (status) => {
      const s = (status || '').toLowerCase();
      if (s === 'open' || s.includes('open')) return { bg:'#DCFCE7', fg:'#166534' };
      if (s === 'closed') return { bg:'#FEE2E2', fg:'#B91C1C' };
      if (s.includes('opens') || s.includes('soon')) return { bg:'#FEF3C7', fg:'#92400E' };
      return { bg:'#E5E7EB', fg:'#374151' };
    };

    const pg = (c && c.programs_gate) || {};
    const pHidden = pg.hidden !== false;   // 기본값은 '비공개' (content-store 기본과 일치)
    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>프로그램 공개 상태 <span style={{fontSize:12,fontWeight:700,marginLeft:8,padding:'2px 10px',borderRadius:999,background: pHidden ? 'var(--state-danger-bg)' : 'var(--state-success-bg)',color: pHidden ? 'var(--state-danger)' : 'var(--state-success)'}}>{pHidden ? '비공개' : '공개 중'}</span></h3></summary>
          <p style={{fontSize:13,color:'var(--fg-muted)',margin:'4px 0 14px',lineHeight:1.7}}>
            체크하면 공개 사이트에서 <strong>프로그램이 통째로 내려갑니다</strong> — 홈 티저, 프로그램 목록·상세, 상단 메뉴,
            푸터 열, 사이트맵, 검색·AI 노출용 구조화 데이터까지. <strong>아래 프로그램 데이터는 그대로 보존</strong>되며,
            체크를 풀면 그날의 목록이 그대로 돌아옵니다. 목록·상세 주소는 살아 있고 안내 화면이 대신 뜹니다
            (이미 퍼진 링크가 404 가 되지 않도록).
          </p>
          <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,fontSize:14,fontWeight:600}}>
            <input type="checkbox" checked={pHidden} onChange={e => set(['programs_gate','hidden'], e.target.checked)} />
            프로그램 비공개 (체크 해제 = 다시 공개)
          </label>
          <div className="grid-2 tight">
            <Text label="안내 제목 (KO)" value={pg.title_ko} onChange={v => set(['programs_gate','title_ko'], v)} lang="ko" />
            <Text label="안내 제목 (EN)" value={pg.title_en} onChange={v => set(['programs_gate','title_en'], v)} lang="en" />
            <Area label="안내 본문 (KO)" value={pg.body_ko} onChange={v => set(['programs_gate','body_ko'], v)} rows={3} lang="ko" />
            <Area label="안내 본문 (EN)" value={pg.body_en} onChange={v => set(['programs_gate','body_en'], v)} rows={3} lang="en" />
          </div>
        </details>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Programs section heading <span style={{fontSize:12,color:'var(--fg-muted)',marginLeft:8,fontWeight:400}}>(home page teaser)</span></h3></summary>
          <div className="grid-2 tight">
            <Text label="Kicker" value={c.programs_section.en.kicker} onChange={v => set(['programs_section','en','kicker'], v)} lang="en" />
            <Text label="Title" value={c.programs_section.en.title} onChange={v => set(['programs_section','en','title'], v)} lang="en" />
            <Area label="Subtitle" value={c.programs_section.en.sub} onChange={v => set(['programs_section','en','sub'], v)} lang="en" />
          </div>
        </details>
        <PageHeroText c={c} set={set} pageKey="programs" label="프로그램 페이지 히어로 (헤더)" />

        {/* Toolbar */}
        <div className="card" style={{padding:'14px 18px'}}>
          <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
            <input type="search" placeholder="Search title, ID, kicker, subtitle…"
              value={query} onChange={e => setQuery(e.target.value)}
              style={{flex:'1 1 220px',minWidth:220,padding:'9px 12px',border:'1px solid var(--border-default)',borderRadius:8,fontSize:14}} />
            <select value={fCategory} onChange={e => setFCategory(e.target.value)}
              style={{padding:'9px 12px',border:'1px solid var(--border-default)',borderRadius:8,fontSize:13,background:'var(--bg-elevated)'}}>
              <option value="all">All categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={fStatus} onChange={e => setFStatus(e.target.value)}
              style={{padding:'9px 12px',border:'1px solid var(--border-default)',borderRadius:8,fontSize:13,background:'var(--bg-elevated)'}}>
              <option value="all">All status</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="btn-add" onClick={newProgram}>+ New program</button>
          </div>
          {selected.size > 0 && (
            <div style={{marginTop:14,padding:'10px 14px',background:'rgba(98,37,153,0.06)',borderRadius:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13,fontWeight:600,color:'var(--brand-text)'}}>{selected.size} selected</span>
              <div style={{display:'flex',gap:6}}>
                <button className="icon-btn" onClick={() => setSelected(new Set())}>Clear</button>
                <button className="icon-btn danger" onClick={bulkDelete}>Delete selected</button>
              </div>
            </div>
          )}
        </div>

        {/* Board */}
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {rows.length === 0 ? (
            <div style={{padding:'60px 20px',textAlign:'center',color:'var(--fg-muted)',fontSize:14}}>
              No programs match. Try clearing filters.
            </div>
          ) : (
            <table className="programs-board">
              <thead>
                <tr>
                  <th style={{width:36}}>
                    <input type="checkbox"
                      checked={rows.length > 0 && selected.size === rows.length}
                      onChange={selectAll}
                      aria-label="Select all" />
                  </th>
                  <th style={{width:48}}></th>
                  {headerCell('Title',    'title_ko')}
                  {headerCell('Category', 'category')}
                  {headerCell('Status',   'status')}
                  {headerCell('ID',       'id')}
                  <th style={{width:160,textAlign:'right'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p }) => {
                  const cat = p.category || (p.kicker ? p.kicker.split('·')[0].trim() : '—');
                  const sst = STATUS_STYLE(p.status);
                  return (
                    <tr key={p.id} className={selected.has(p.id) ? 'sel' : ''} onClick={() => setEditingId(p.id)}>
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSel(p.id)} aria-label={'Select ' + p.id} />
                      </td>
                      <td>
                        <div style={{
                          width:36,height:36,borderRadius:8,
                          background:`linear-gradient(135deg, ${p.color || '#6B2DBE'}, ${p.accent || p.color || '#6B2DBE'})`,
                          display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'
                        }}>
                          <i data-lucide={p.icon} width="18" height="18" strokeWidth="1.75"></i>
                        </div>
                      </td>
                      <td>
                        <div style={{fontWeight:700,fontSize:14}}>{p.title_ko}</div>
                        <div style={{fontSize:12,color:'var(--fg-secondary)'}}>{p.title_en}</div>
                      </td>
                      <td><span style={{fontSize:12,fontFamily:'var(--font-mono)',color:'var(--fg-secondary)'}}>{cat}</span></td>
                      <td><span className="pill" style={{background:sst.bg,color:sst.fg}}>{p.status || '—'}</span></td>
                      <td><code style={{fontSize:11,color:'var(--fg-muted)'}}>{p.id}</code></td>
                      <td style={{textAlign:'right'}} onClick={e => e.stopPropagation()}>
                        <a className="icon-btn" href={'/program/' + encodeURIComponent(p.id)} target="_blank" rel="noopener" title="Preview on site">View</a>
                        <button className="icon-btn" onClick={() => setEditingId(p.id)} style={{marginLeft:4}}>Edit</button>
                        <button className="icon-btn" onClick={() => duplicate(p)} style={{marginLeft:4}} title="Duplicate">Dup</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="desc" style={{marginTop:14,textAlign:'right'}}>{rows.length} of {c.programs.length} program(s) shown</p>
      </>
    );
  }

  function ProgramEditor({ c, program, index, set, onClose, onDelete }) {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingDetails, setSavingDetails] = useState(false);
    const [savedAt, setSavedAt] = useState(null);
    const dirty = useRef(false);

    useEffect(() => {
      (async () => {
        try {
          const res = await fetch('/api/programs/' + encodeURIComponent(program.id) + '/details');
          const data = await res.json();
          setDetails(data || { program_id: program.id });
        } catch (e) {
          setDetails({ program_id: program.id });
        }
        setLoading(false);
      })();
    }, [program.id]);

    const updDetail = (k, v) => { dirty.current = true; setDetails(d => ({ ...(d || {}), [k]: v })); };
    const courses = Array.isArray(details?.courses_json) ? details.courses_json : [];
    const updCourse = (ci, key, value) => {
      dirty.current = true;
      setDetails(d => {
        const arr = Array.isArray(d?.courses_json) ? d.courses_json.slice() : [];
        arr[ci] = { ...(arr[ci] || {}), [key]: value };
        return { ...(d || {}), courses_json: arr };
      });
    };
    const addCourse = () => {
      dirty.current = true;
      setDetails(d => ({
        ...(d || {}),
        courses_json: (Array.isArray(d?.courses_json) ? d.courses_json : []).concat([{
          semester: 'Course',
          title_ko: '',
          title_en: '',
          desc_ko: '',
          desc_en: '',
          faculty_name: '',
          faculty_title: '',
          faculty_bio_ko: '',
          faculty_bio_en: '',
          faculty_image: '',
          preview_url: '',
        }]),
      }));
    };
    const removeCourse = (ci) => {
      dirty.current = true;
      setDetails(d => ({
        ...(d || {}),
        courses_json: (Array.isArray(d?.courses_json) ? d.courses_json : []).filter((_, idx) => idx !== ci),
      }));
    };

    async function saveDetails() {
      if (!details) return;
      setSavingDetails(true);
      try {
        const token = adminToken();
        const res = await fetch('/api/programs/' + encodeURIComponent(program.id) + '/details', {
          method: 'PUT',
          headers: authHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify(details),
        });
        if (!res.ok) throw new Error('http_' + res.status);
        setSavedAt(new Date());
        dirty.current = false;
      } catch (e) {
        alert('Save failed: ' + e.message);
      }
      setSavingDetails(false);
    }

    return (
      <>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
          <button type="button" className="icon-btn" onClick={onClose}>← Back to list</button>
          <div style={{flex:1}} />
          {savedAt && <span style={{fontSize:12,color:'var(--state-success)'}}>✓ Details saved {savedAt.toLocaleTimeString()}</span>}
          <button type="button" className="btn btn-secondary btn-sm" onClick={saveDetails} disabled={savingDetails || !details}>
            {savingDetails ? 'Saving…' : 'Save details'}
          </button>
          <button type="button" className="icon-btn danger" onClick={onDelete}>Delete program</button>
        </div>

        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Card / list info <span style={{fontSize:12,color:'var(--fg-muted)',marginLeft:8,fontWeight:400}}>(auto-saved to KV)</span></h3></summary>
          <div className="grid-2 tight">
            <Text label="ID" value={program.id} onChange={v => set(['programs',index,'id'], v)} hint="URL-friendly. Used in /program/:id" />
            <Text label="Kicker" value={program.kicker} onChange={v => set(['programs',index,'kicker'], v)} />
            <Text label="Category (slug)" value={program.category || ''} onChange={v => set(['programs',index,'category'], v)} hint="Used in /programs?cat=...; e.g. micro-degree" />
            <Text label="Category label (EN)" value={program.category_en || ''} onChange={v => set(['programs',index,'category_en'], v)} lang="en" hint="Display name in EN. Falls back to kicker first segment." />
            <Text label="Title (EN)" value={program.title_en} onChange={v => set(['programs',index,'title_en'], v)} lang="en" />
            <Area label="Short subtitle (EN)" value={program.sub_en} onChange={v => set(['programs',index,'sub_en'], v)} lang="en" rows={2} />
            <Text label="Meta chips (comma-separated)" value={(program.meta || []).join(', ')} onChange={v => set(['programs',index,'meta'], v.split(',').map(s => s.trim()).filter(Boolean))} hint="e.g. 12 weeks, 100% remote, EN / KO" />
            <Text label="Status" value={program.status} onChange={v => set(['programs',index,'status'], v)} hint="open · closed · opens Fall …" />
            <Text label="Tuition (USD, 등록금)" hint="비워 두거나 0이면 공개 화면에 '미공개 · 예약 단계'로 표시되고 결제가 차단됩니다." value={program.tuition == null ? '' : String(program.tuition)}
              onChange={v => set(['programs',index,'tuition'], parseInt(String(v).replace(/[^0-9]/g,''),10) || 0)}
              hint="결제 단계에서 자동 표기·청구. 숫자만(달러). 0이면 결제 차단." />
            <IconField label="Icon" value={program.icon} onChange={v => set(['programs',index,'icon'], v)} />
            <Color label="Primary color" value={program.color} onChange={v => set(['programs',index,'color'], v)} />
            <Color label="Accent color" value={program.accent} onChange={v => set(['programs',index,'accent'], v)} />
          </div>
        </details>
        <HeroBgFields title="상세 히어로 배경" hideColor path={['programs',index]} node={program} set={set} />

        {loading ? (
          <div className="card" style={{padding:40,textAlign:'center',color:'var(--fg-muted)'}}>Loading details…</div>
        ) : (
          <>
            <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Logistics</h3></summary>
              <div className="grid-2 tight">
                <Text label="Duration" value={details?.duration || ''} onChange={v => updDetail('duration', v)} hint="예: 12 weeks · 1 year" />
                <Text label="Format" value={details?.format || ''} onChange={v => updDetail('format', v)} hint="online · hybrid · onsite" />
                <Text label="Language requirement" value={details?.language_required || ''} onChange={v => updDetail('language_required', v)} hint="EN B2 · TOPIK 3 …" />
                <Text label="Start date" value={details?.start_date || ''} onChange={v => updDetail('start_date', v)} hint="2025 Fall · 2026 Spring" />
                <Text label="Cohort size (number)" value={details?.cohort_size ?? ''} onChange={v => updDetail('cohort_size', v ? parseInt(v, 10) : null)} />
                <Text label="Certification" value={details?.certification || ''} onChange={v => updDetail('certification', v)} hint="e.g. Certificate of Completion · Bachelor degree" />
                <Text label="Cost (USD)" value={details?.cost_full ?? ''} onChange={v => updDetail('cost_full', v ? parseInt(v, 10) : null)} type="number" />
                <Text label="Currency" value={details?.cost_currency || 'USD'} onChange={v => updDetail('cost_currency', v)} />
              </div>
            </details>

            <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Instructor</h3></summary>
              <div className="grid-2 tight">
                <Text label="Name" value={details?.instructor_name || ''} onChange={v => updDetail('instructor_name', v)} />
                <Text label="Title" value={details?.instructor_title || ''} onChange={v => updDetail('instructor_title', v)} hint="e.g. Professor of Korean Studies" />
                <div className="field span-2">
                  <label>Bio</label>
                  <window.RichEditor value={details?.instructor_bio_en || ''} onChange={v => updDetail('instructor_bio_en', v)} lang="en" minHeight={140} />
                </div>
              </div>
            </details>

            <div className="card">
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                <h3 style={{margin:0}}>Course cards & professor profiles</h3>
                <div style={{flex:1}} />
                <button type="button" className="btn-add" onClick={addCourse}>+ Add course</button>
              </div>
              <p className="desc" style={{marginBottom:14}}>
                These cards power the public curriculum section. The professor name becomes clickable on the public site and opens a profile modal using the information below.
              </p>
              {courses.length === 0 && (
                <div style={{padding:18,borderRadius:12,background:'var(--bg-muted)',color:'var(--fg-muted)',fontSize:13}}>
                  No structured courses yet. Add a course to manage course labels, lecture preview links, professor photos, and bios from the admin.
                </div>
              )}
              {courses.map((course, ci) => (
                <div className="rep-item" key={ci}>
                  <div className="rep-head">
                    <strong>{course.title_en || course.title_ko || `Course ${ci + 1}`}</strong>
                    <div className="ctrls">
                      <button type="button" className="icon-btn danger" onClick={() => removeCourse(ci)}>Delete</button>
                    </div>
                  </div>
                  <div className="grid-2 tight">
                    <Text label="과목 라벨" value={course.semester || ''} onChange={v => updCourse(ci, 'semester', v)} hint="칩에 표시할 짧은 라벨 (예: 과목 · Course)" />
                    <Text label="Lecture preview URL" value={course.preview_url || ''} onChange={v => updCourse(ci, 'preview_url', v)} hint="https://youtu.be/..." />
                    <Text label="Course title (EN)" value={course.title_en || ''} onChange={v => updCourse(ci, 'title_en', v)} lang="en" />
                    <Area label="Course description (EN)" value={course.desc_en || ''} onChange={v => updCourse(ci, 'desc_en', v)} lang="en" rows={3} />
                    <Text label="Professor name" value={course.faculty_name || ''} onChange={v => updCourse(ci, 'faculty_name', v)} hint="Shown as the clickable professor button" />
                    <Text label="Professor title" value={course.faculty_title || ''} onChange={v => updCourse(ci, 'faculty_title', v)} hint="Department · specialty · short one-line intro" />
                    <Area label="Professor bio (EN)" value={course.faculty_bio_en || ''} onChange={v => updCourse(ci, 'faculty_bio_en', v)} lang="en" rows={4} />
                    <ImageUploadField
                      label="Professor photo"
                      value={course.faculty_image || ''}
                      onChange={v => updCourse(ci, 'faculty_image', v)}
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      maxBytes={1024 * 1024}
                      preview="square"
                      hint="Used inside the professor modal. You can upload a file or paste an image URL."
                    />
                  </div>
                </div>
              ))}
            </div>

            <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Long-form content</h3></summary>
              <p className="desc" style={{marginBottom:14}}>
                Each section is a rich-text body. Use it to write the full program description. These are stored in D1, separate from the lightweight card data above.
              </p>
              {[
                { k: 'overview',     label: 'Overview',     hint: 'What this program is about' },
                { k: 'curriculum',   label: 'Curriculum',   hint: 'Modules, weekly breakdown, syllabus' },
                { k: 'prerequisites',label: 'Prerequisites', hint: 'Background, language, and prior coursework expected' },
              ].map(s => (
                <div key={s.k} style={{marginBottom:18}}>
                  <h4 style={{margin:'0 0 4px',fontSize:14}}>{s.label}</h4>
                  <p className="desc" style={{margin:'0 0 10px'}}>{s.hint}</p>
                  <window.RichEditor value={details?.[s.k + '_en'] || ''} onChange={v => updDetail(s.k + '_en', v)} lang="en" minHeight={200} />
                </div>
              ))}
            </details>
          </>
        )}

        <div style={{position:'sticky',bottom:0,padding:'12px 0',background:'rgba(244,244,248,0.95)',backdropFilter:'blur(8px)',borderTop:'1px solid var(--border-hair)',display:'flex',justifyContent:'flex-end',gap:8,marginTop:24}}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Done</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={saveDetails} disabled={savingDetails || !details}>
            {savingDetails ? 'Saving details…' : 'Save details'}
          </button>
        </div>
      </>
    );
  }

  function PartnersTab({ c, set, addItem, removeItem }) {
    const partners = c.partners || [];
    const pcta = c.partner_cta || {};
    const movePartner = (from, to) => {
      if (to < 0 || to >= partners.length) return;
      const arr = [...partners]; const [x] = arr.splice(from, 1); arr.splice(to, 0, x);
      set(['partners'], arr);
    };
    return (
      <>
        <PageHeroText c={c} set={set} pageKey="partners" label="파트너 페이지 히어로 (헤더)" />
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Partners <span style={{fontSize:12,color:'var(--fg-muted)',fontWeight:400,marginLeft:8}}>{partners.length}개 · 이름을 눌러 펼치기/접기</span></h3></summary>
          {partners.map((p, i) => (
            <details key={i} className="team-admin-member" style={{background:'var(--bg-elevated)',borderRadius:10,marginBottom:10,border:'1px solid var(--border-subtle)'}} open>
              <summary style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',cursor:'pointer',listStyle:'none',userSelect:'none'}}>
                <span className="tm-chevron" aria-hidden="true">▶</span>
                <strong style={{fontSize:14,color:'var(--fg-primary)',flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name || `Partner ${i+1}`}</strong>
                <button type="button" className="icon-btn" disabled={i === 0} title="위로" onClick={(e) => { e.stopPropagation(); e.preventDefault(); movePartner(i, i-1); }}>↑</button>
                <button type="button" className="icon-btn" disabled={i === partners.length-1} title="아래로" onClick={(e) => { e.stopPropagation(); e.preventDefault(); movePartner(i, i+1); }}>↓</button>
                <button type="button" className="icon-btn danger" onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (!confirm(`Remove ${p.name||'partner'}?`)) return; removeItem(['partners'], i); }}>Delete</button>
              </summary>
              <div style={{padding:'0 14px 14px'}}>
                <div className="grid-2 tight">
                  <Text label="Short name" value={p.name} onChange={v => set(['partners',i,'name'], v)} />
                  <Text label="Full name" value={p.full} onChange={v => set(['partners',i,'full'], v)} />
                  <Text label="Website URL (새 탭으로 열림)" value={p.url || ''} onChange={v => set(['partners',i,'url'], v)} hint="예: https://www.cufs.ac.kr · 로고 클릭 시 새 탭. 비우면 /partners 이동." />
                  <Text label="Role / title" value={p.role_en || p.role_ko || ''} onChange={v => set(['partners',i,'role_en'], v)} lang="en" />
                  <Color label="Color" value={p.color} onChange={v => set(['partners',i,'color'], v)} />
                </div>
                <ImageUploadField
                  label="Logo (가로형 권장)"
                  value={p.logo || ''}
                  onChange={v => set(['partners',i,'logo'], v)}
                  accept="image/svg+xml,image/png,image/jpeg,image/webp"
                  maxBytes={500 * 1024}
                  preview="banner"
                  hint="홈 파트너 띠와 /partners 페이지에 로고 + 기업명으로 표시. 가로형 로고·SVG/PNG·투명배경 권장. 비우면 이름 텍스트."
                />
              </div>
            </details>
          ))}
          <button className="btn-add" onClick={() => addItem(['partners'], { name: 'NEW', full: 'New partner', url: '', role_en: 'Role', color: '#6B2DBE', logo: '' })}>+ Add partner</button>
        </details>
        <details className="card admin-fold" open>
          <summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{margin:0,display:'inline',fontSize:'inherit'}}>파트너 CTA (Contact 페이지 하단 배너)</h3></summary>
          <div style={{marginTop:12}}>
            <div className="grid-2 tight">
              <Text label="Kicker" value={pcta.en?.kicker || ''} onChange={v => set(['partner_cta','en','kicker'], v)} lang="en" />
              <Text label="Title" value={pcta.en?.title || ''} onChange={v => set(['partner_cta','en','title'], v)} lang="en" />
              <Text label="Button label" value={pcta.en?.cta || ''} onChange={v => set(['partner_cta','en','cta'], v)} lang="en" />
            </div>
            <Area label="Subtitle" value={pcta.en?.sub || ''} onChange={v => set(['partner_cta','en','sub'], v)} lang="en" rows={2} />
            <p className="desc">버튼은 Brand &amp; Nav의 파트너 이메일로 연결됩니다.</p>
          </div>
        </details>
      </>
    );
  }

  function StoriesTab({ c, set, addItem, removeItem }) {
    const stories = c.stories || [];
    // Reorder helper (array splice → set). Used by the ↑/↓ buttons.
    const moveStory = (from, to) => {
      if (to < 0 || to >= stories.length) return;
      const arr = [...stories];
      const [x] = arr.splice(from, 1); arr.splice(to, 0, x);
      set(['stories'], arr);
    };
    return (
      <>
        <PageHeroText c={c} set={set} pageKey="stories" label="스토리 페이지 히어로 (헤더)" />
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>스토리 <span style={{fontSize:12,color:'var(--fg-muted)',fontWeight:400,marginLeft:8}}>추천자(리더) + 학습자 후기 · {stories.length}개 · 이름을 눌러 펼치기/접기</span></h3></summary>
        {stories.map((s, i) => {
          const sName = s.name || `Story ${i + 1}`;
          const isLeader = s.kind === 'leader';
          return (
          <details key={i} className="team-admin-member" style={{background:'var(--bg-elevated)',borderRadius:10,marginBottom:10,border:'1px solid var(--border-subtle)'}} open>
            <summary style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',cursor:'pointer',listStyle:'none',userSelect:'none'}}>
              <span className="tm-chevron" aria-hidden="true">▶</span>
              <span className="pill" style={{flex:'0 0 auto',background:isLeader?'var(--sunshine-yellow)':'var(--bg-muted)',color:isLeader?'var(--midnight-purple)':'var(--fg-secondary)',fontSize:11}}>{isLeader?'추천자':'학습자'}</span>
              <strong style={{fontSize:14,color:'var(--fg-primary)',flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sName}{s.program ? <span style={{fontWeight:400,color:'var(--fg-muted)'}}> · {s.program}</span> : null}</strong>
              <button type="button" className="icon-btn" disabled={i === 0} title="위로"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); moveStory(i, i - 1); }}>↑</button>
              <button type="button" className="icon-btn" disabled={i === stories.length - 1} title="아래로"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); moveStory(i, i + 1); }}>↓</button>
              <button type="button" className="icon-btn danger"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (!confirm(`Remove ${sName}?`)) return; removeItem(['stories'], i); }}>Delete</button>
            </summary>
            <div style={{padding:'0 14px 14px'}}>
              <div className="field">
                <label>유형 (Type)</label>
                <select value={s.kind || 'learner'} onChange={e => set(['stories',i,'kind'], e.target.value)}>
                  <option value="learner">학습자 후기 (Learner)</option>
                  <option value="leader">추천자 · 리더 목소리 (Leader)</option>
                </select>
              </div>
              <div className="grid-2 tight">
                <Text label="Name" value={s.name} onChange={v => set(['stories',i,'name'], v)} />
                <Text label="Program" value={s.program} onChange={v => set(['stories',i,'program'], v)} />
                <Text label="Tag" value={s.tag} onChange={v => set(['stories',i,'tag'], v)} />
                <Color label="Tag color" value={s.tag_color} onChange={v => set(['stories',i,'tag_color'], v)} />
                <Area label="Quote" value={s.quote_en} onChange={v => set(['stories',i,'quote_en'], v)} lang="en" rows={3} />
              </div>
            </div>
          </details>
          );
        })}
        <button className="btn-add" onClick={() => addItem(['stories'], { kind: 'learner', tag: 'Country', tag_color: '#6B2DBE', name: 'Name', program: 'Program', quote_en: '' })}>+ Add story</button>
        </details>
      </>
    );
  }

  // NOTE: This tab previously edited c.news in KV. That data is orphaned —
  // the public /news page fetches from /api/news (D1 table news_posts) and
  // never reads c.news. Edits here had zero effect on the live page. Replaced
  // with a deep-link to the actual news editor that lives on /news in admin
  // edit mode. (verified 2026-05-20, v01.059)
  function NewsTab({ c, set }) {
    return (
      <>
        <PageHeroText c={c} set={set} pageKey="news" label="소식 페이지 히어로 (헤더)" />
        <details className="card admin-fold" open>
          <summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{margin:0,display:'inline',fontSize:'inherit'}}>뉴스 글 관리</h3></summary>
          <div style={{marginTop:12}}>
            <p style={{margin:'0 0 14px',fontSize:14,color:'var(--fg-secondary)',lineHeight:1.6}}>
              뉴스 글은 D1 데이터베이스에 저장됩니다. 작성·수정·삭제는 공개 /news 페이지에서{' '}
              관리자로 로그인한 상태로 직접 진행합니다. (헤더는 위에서 편집)
            </p>
            <a className="btn btn-primary btn-sm" href="/news" target="_blank" rel="noopener">
              /news 페이지 열기 ↗
            </a>
          </div>
        </details>
      </>
    );
  }

  function CtaTab({ c, set }) {
    return (
      <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>CTA banner (homepage)</h3></summary>
        <div className="grid-2 tight">
          <Text label="Title" value={c.cta_banner.en.title} onChange={v => set(['cta_banner','en','title'], v)} lang="en" />
          <Text label="Subtitle" value={c.cta_banner.en.sub} onChange={v => set(['cta_banner','en','sub'], v)} lang="en" />
          <Text label="CTA label" value={c.cta_banner.en.cta} onChange={v => set(['cta_banner','en','cta'], v)} lang="en" />
        </div>
      </details>
    );
  }

  // Homepage popup banner ads — up to 3 image banners. Image-only upload
  // (→ R2 URL). Shown to visitors as a modal on first homepage load; they can
  // Close (session) or "Don't show again today" (per-day). Public is EN-only,
  // so banners carry no text — just an image + optional click-through link.
  function BannersTab({ c, set }) {
    const b = (c.banners) || { enabled: true, items: [] };
    const items = Array.isArray(b.items) ? b.items : [];
    const setItems = (arr) => set(['banners', 'items'], arr);
    const updItem = (i, key, val) => setItems(items.map((it, idx) => idx === i ? { ...it, [key]: val } : it));
    const addBanner = () => { if (items.length >= 3) return; setItems([...items, { image: '', link: '', alt: '', active: true }]); };
    const removeBanner = (i) => setItems(items.filter((_, idx) => idx !== i));
    const move = (from, to) => { if (to < 0 || to >= items.length) return; const arr = [...items]; const [x] = arr.splice(from, 1); arr.splice(to, 0, x); setItems(arr); };
    return (
      <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>배너 광고 (팝업) <span style={{fontSize:12,color:'var(--fg-muted)',fontWeight:400,marginLeft:8}}>{items.length}/3 · 홈 첫 진입 시 모달</span></h3></summary>
        <p style={{fontSize:13,color:'var(--fg-muted)',margin:'4px 0 14px'}}>
          홈페이지 첫 진입 시 모달 팝업으로 노출됩니다. 최대 3개(2개 이상이면 좌우 슬라이드).
          <strong>이미지 전용</strong>이며, 방문자는 "닫기"(이번 세션) 또는 "오늘 하루 안 보기"(당일)로 끌 수 있습니다.
          공개 사이트는 영어 전용이라 배너에 텍스트는 넣지 않습니다(이미지로 제작해 업로드).
        </p>
        <label style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,fontSize:14,fontWeight:600}}>
          <input type="checkbox" checked={b.enabled !== false} onChange={e => set(['banners','enabled'], e.target.checked)} />
          배너 팝업 사용 (끄면 어떤 배너도 노출되지 않음)
        </label>

        {items.length === 0 && (
          <div style={{padding:'18px',border:'1px dashed var(--border-default)',borderRadius:10,color:'var(--fg-muted)',fontSize:13,textAlign:'center'}}>
            등록된 배너가 없습니다. 아래 "배너 추가"로 이미지를 올리세요.
          </div>
        )}

        {items.map((it, i) => (
          <div key={i} style={{border:'1px solid var(--border-subtle)',borderRadius:12,padding:14,marginBottom:12,background:'var(--bg-elevated)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <strong style={{flex:1}}>배너 {i + 1}</strong>
              <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13}}>
                <input type="checkbox" checked={it.active !== false} onChange={e => updItem(i, 'active', e.target.checked)} /> 활성
              </label>
              <button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} title="위로" onClick={() => move(i, i - 1)}>↑</button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={i === items.length - 1} title="아래로" onClick={() => move(i, i + 1)}>↓</button>
              <button type="button" className="btn btn-ghost btn-sm" style={{color:'var(--state-danger)'}} onClick={() => removeBanner(i)}>삭제</button>
            </div>
            <ImageUploadField
              label="배너 이미지 (이미지 전용)"
              value={it.image || ''}
              onChange={v => updItem(i, 'image', v)}
              preview="banner"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              maxBytes={4 * 1024 * 1024}
              hint="PNG / JPG / WebP / SVG · 최대 4MB. 가로형 배너 권장."
            />
            <div className="grid-2 tight" style={{marginTop:10}}>
              <Text label="클릭 시 이동 링크 (선택)" value={it.link || ''} onChange={v => updItem(i, 'link', v)} hint="https://… 비우면 클릭 비활성. 새 탭으로 열림." />
              <Text label="대체 텍스트 (접근성)" value={it.alt || ''} onChange={v => updItem(i, 'alt', v)} hint="화면낭독기용 배너 설명." />
            </div>
          </div>
        ))}

        {items.length < 3 && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={addBanner}>＋ 배너 추가</button>
        )}
      </details>
    );
  }

  function FaqTab({ c, set, addItem, removeItem }) {
    const faq = c.faq || [];
    const groups = [];
    const idxByCat = new Map();
    faq.forEach((f, i) => {
      const key = f.category_en || f.category_ko || 'Uncategorized';
      if (!idxByCat.has(key)) { idxByCat.set(key, groups.length); groups.push({ title: key, items: [] }); }
      groups[idxByCat.get(key)].items.push({ f, i });
    });
    const moveFaq = (from, to) => {
      if (to < 0 || to >= faq.length) return;
      const arr = [...faq]; const [x] = arr.splice(from, 1); arr.splice(to, 0, x);
      set(['faq'], arr);
    };
    return (
      <>
        <PageHeroText c={c} set={set} pageKey="contact" label="문의·FAQ 페이지 히어로 (헤더)" />
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{margin:'0 0 8px'}}>FAQ <span style={{fontSize:12,color:'var(--fg-muted)',fontWeight:400,marginLeft:8}}>{faq.length}문항 · 질문을 눌러 펼치기/접기</span></h3></summary>
          {groups.map((g, gi) => (
            <div key={gi} style={{marginTop:14}}>
              <div style={{fontSize:12,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--brand-text)',fontWeight:700,margin:'8px 0 6px'}}>{g.title} · {g.items.length}</div>
              {g.items.map(({ f, i }) => (
                <details key={i} className="team-admin-member" style={{background:'var(--bg-elevated)',borderRadius:10,marginBottom:8,border:'1px solid var(--border-subtle)'}} open>
                  <summary style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer',listStyle:'none',userSelect:'none'}}>
                    <span className="tm-chevron" aria-hidden="true">▶</span>
                    <strong style={{fontSize:13,color:'var(--fg-primary)',flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:500}}>{f.q_en || f.q_ko || ('Q' + (i+1))}</strong>
                    <button type="button" className="icon-btn" disabled={i === 0} title="위로" onClick={(e) => { e.stopPropagation(); e.preventDefault(); moveFaq(i, i-1); }}>↑</button>
                    <button type="button" className="icon-btn" disabled={i === faq.length-1} title="아래로" onClick={(e) => { e.stopPropagation(); e.preventDefault(); moveFaq(i, i+1); }}>↓</button>
                    <button type="button" className="icon-btn danger" onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (!confirm('Delete this FAQ?')) return; removeItem(['faq'], i); }}>Delete</button>
                  </summary>
                  <div style={{padding:'0 14px 14px'}}>
                    <div className="grid-2 tight">
                      <Text label="Category" value={f.category_en || ''} onChange={v => set(['faq',i,'category_en'], v)} lang="en" />
                      <Text label="Category icon (Lucide, e.g. book-open)" value={f.category_icon || ''} onChange={v => set(['faq',i,'category_icon'], v)} />
                    </div>
                    <Text label="Question" value={f.q_en} onChange={v => set(['faq',i,'q_en'], v)} lang="en" />
                    <Area label="Answer (줄바꿈 반영)" value={f.a_en} onChange={v => set(['faq',i,'a_en'], v)} lang="en" rows={5} />
                  </div>
                </details>
              ))}
            </div>
          ))}
          <button className="btn-add" style={{marginTop:12}} onClick={() => addItem(['faq'], { category_en: '', category_icon: '', q_en: '', a_en: '' })}>+ Add FAQ</button>
        </details>
      </>
    );
  }

  // ---- Apply essays ------------------------------------------------------
  // Essay prompts shown in the public Apply form (Step 4). Each entry has a
  // KO / EN prompt + placeholder, and per-question min/max char limits that
  // the public textarea enforces (refuses input past max, shows live count).
  function EssaysTab({ c, set, addItem, removeItem }) {
    const list = Array.isArray(c.essay_questions) ? c.essay_questions : [];
    function setMin(i, v) {
      const n = Math.max(0, Math.min(10000, parseInt(v, 10) || 0));
      set(['essay_questions', i, 'min_chars'], n);
    }
    function setMax(i, v) {
      const n = Math.max(1, Math.min(20000, parseInt(v, 10) || 0));
      set(['essay_questions', i, 'max_chars'], n);
    }
    return (
      <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Apply essays · 지원 에세이 문항</h3></summary>
        <p className="desc" style={{marginTop:0}}>
          Each entry adds one essay slot to the public Apply form (Step 4 — Essays). Reorder, edit, or remove freely. Length limits are enforced by the textarea (input is blocked past Max).
        </p>
        {list.length === 0 && (
          <div style={{padding:'14px 16px',background:'rgba(180,83,9,0.10)',border:'1px solid rgba(180,83,9,0.20)',borderRadius:8,marginBottom:12,color:'var(--state-warning, #b45309)'}}>
            현재 등록된 에세이 문항이 없습니다. 기본값(1개)이 임시로 적용됩니다. + Add essay question 으로 운영자 정의 문항을 추가하세요.
          </div>
        )}
        {list.map((q, i) => (
          <div className="rep-item" key={i}>
            <div className="rep-head">
              <strong>Essay {i + 1}</strong>
              <div className="ctrls">
                {i > 0 && (
                  <button className="icon-btn" onClick={() => {
                    const next = list.slice();
                    [next[i-1], next[i]] = [next[i], next[i-1]];
                    set(['essay_questions'], next);
                  }}>↑</button>
                )}
                {i < list.length - 1 && (
                  <button className="icon-btn" onClick={() => {
                    const next = list.slice();
                    [next[i+1], next[i]] = [next[i], next[i+1]];
                    set(['essay_questions'], next);
                  }}>↓</button>
                )}
                <button className="icon-btn danger" onClick={() => removeItem(['essay_questions'], i)}>Delete</button>
              </div>
            </div>
            <div className="grid-2 tight">
              <Area label="문항 (KO)" value={q.prompt_ko || ''} onChange={v => set(['essay_questions',i,'prompt_ko'], v)} rows={3} />
              <Text label="입력 예시 (KO)" value={q.placeholder_ko || ''} onChange={v => set(['essay_questions',i,'placeholder_ko'], v)} />
            </div>
            <div className="grid-2 tight" style={{marginTop:8}}>
              <Area label="Prompt (EN)" value={q.prompt_en || ''} onChange={v => set(['essay_questions',i,'prompt_en'], v)} lang="en" rows={3} />
              <Text label="Placeholder (EN)" value={q.placeholder_en || ''} onChange={v => set(['essay_questions',i,'placeholder_en'], v)} lang="en" />
            </div>
            <div className="grid-2 tight" style={{marginTop:8}}>
              <div className="field">
                <label>Min characters</label>
                <input type="number" min="0" max="10000" value={q.min_chars ?? 500}
                  onChange={e => setMin(i, e.target.value)} />
                <span className="hint">아래 길이로 작성하면 제출 시 검증에서 막힙니다.</span>
              </div>
              <div className="field">
                <label>Max characters</label>
                <input type="number" min="1" max="20000" value={q.max_chars ?? 1500}
                  onChange={e => setMax(i, e.target.value)} />
                <span className="hint">초과하면 textarea에서 입력이 차단됩니다.</span>
              </div>
            </div>
          </div>
        ))}
        <button className="btn-add" onClick={() => addItem(['essay_questions'], {
          prompt_ko: '', prompt_en: '',
          placeholder_ko: '', placeholder_en: '',
          min_chars: 500, max_chars: 1500,
        })}>+ Add essay question</button>
      </details>
    );
  }

  // ---- Error pages copy ---------------------------------------------------
  function ErrorsCopyTab({ c, set }) {
    const errors = c.errors || {};
    const codes = ['401','403','404','500','503','offline'];
    const titles = { '401':'401 Unauthorized', '403':'403 Forbidden', '404':'404 Not Found',
                     '500':'500 Server Error', '503':'503 Unavailable', 'offline':'Offline' };
    return (
      <>
        <div className="card" style={{background:'rgba(255,228,0,0.10)',border:'1px solid rgba(180,83,9,0.20)'}}>
          <p className="desc" style={{margin:0}}>
            Each error page reads its title, body, button labels, and helpful note from the values below. Use Pages → Error pages preview to see them rendered.
          </p>
        </div>
        {codes.map(code => (
          <details className="card admin-fold" key={code} open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{display:'flex',alignItems:'center',gap:10}}>
              <span>{titles[code]}</span>
              <a className="icon-btn" href={code === 'offline' ? '/offline' : '/' + code} target="_blank" rel="noopener" style={{marginLeft:'auto'}}>Preview ↗</a>
            </h3></summary>
            <div className="grid-2 tight">
              {['ko','en'].map(L => (
                <React.Fragment key={L}>
                  <Text label={`Title (${L.toUpperCase()})`} value={errors[code]?.[L]?.title || ''} onChange={v => set(['errors',code,L,'title'], v)} lang={L} hint="Use Enter for line break" />
                  <Area label={`Body (${L.toUpperCase()})`} value={errors[code]?.[L]?.body || ''} onChange={v => set(['errors',code,L,'body'], v)} lang={L} />
                  <Text label={`Primary button (${L.toUpperCase()})`} value={errors[code]?.[L]?.primary_label || ''} onChange={v => set(['errors',code,L,'primary_label'], v)} lang={L} />
                  <Text label={`Secondary button (${L.toUpperCase()})`} value={errors[code]?.[L]?.secondary_label || ''} onChange={v => set(['errors',code,L,'secondary_label'], v)} lang={L} />
                  <Area label={`Helpful note (${L.toUpperCase()})`} value={errors[code]?.[L]?.helpful_note || ''} onChange={v => set(['errors',code,L,'helpful_note'], v)} lang={L} hint="Optional, shown above the helpful links card" />
                </React.Fragment>
              ))}
            </div>
          </details>
        ))}
      </>
    );
  }

  // ---- Analytics ---------------------------------------------------------
  function AnalyticsTab() {
    const [data, setData] = useState(null);
    const [journeys, setJourneys] = useState([]);
    // Default cohorts requested by the operator: short tail (1/3/5/7d) for
    // launch-day debugging, mid (14/21/30d) for week-over-week marketing,
    // and 180d for half-year retention. 30d is the landing default.
    const COHORT_DAYS = [1, 3, 5, 7, 14, 21, 30, 180];
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');

    async function load() {
      setLoading(true); setErr('');
      try {
        const token = adminToken();
        const [s, j] = await Promise.all([
          fetch('/api/analytics/summary?days=' + days, { headers: authHeaders() }),
          fetch('/api/analytics/journeys?limit=20', { headers: authHeaders() }),
        ]);
        if (!s.ok) throw new Error('summary http_' + s.status);
        if (!j.ok) throw new Error('journeys http_' + j.status);
        setData(await s.json());
        setJourneys((await j.json()).items || []);
      } catch (e) { setErr(e.message); }
      setLoading(false);
    }
    useEffect(() => { load(); }, [days]);

    if (loading) return <div className="card" style={{textAlign:'center',padding:40,color:'var(--fg-muted)'}}>Loading…</div>;
    if (err) return <div className="card" style={{color:'var(--state-danger)'}}>{err}</div>;
    if (!data) return null;

    const maxDaily = Math.max(1, ...((data.daily || []).map(d => d.pageviews || 0)));

    function Stat({ label, value, hint }) {
      return (
        <div style={{padding:'18px 20px',background:'var(--bg-elevated)',border:'1px solid var(--border-subtle)',borderRadius:14}}>
          <div style={{fontSize:11,letterSpacing:'0.06em',textTransform:'uppercase',color:'var(--fg-muted)',fontWeight:700}}>{label}</div>
          <div style={{fontFamily:'var(--font-en)',fontSize:32,fontWeight:800,color:'var(--brand-text)',margin:'4px 0 0'}}>{value}</div>
          {hint && <div style={{fontSize:12,color:'var(--fg-muted)',marginTop:2}}>{hint}</div>}
        </div>
      );
    }
    function Card({ title, children, action }) {
      return (
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <h3 style={{margin:0}}>{title}</h3>
            {action}
          </div>
          {children}
        </div>
      );
    }

    return (
      <>
        <div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <div>
            <h3 style={{margin:0}}>방문자 분석 · Visitor analytics</h3>
            <p className="desc" style={{margin:'4px 0 0'}}>Last {data.range.days} days · since {data.range.since}</p>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {COHORT_DAYS.map(d => (
              <button key={d} type="button"
                onClick={() => setDays(d)}
                className="icon-btn"
                style={days === d ? {background:'var(--midnight-purple)',color:'#fff',borderColor:'var(--midnight-purple)'} : {}}>
                {d}d
              </button>
            ))}
            <button className="icon-btn" onClick={load}>Refresh</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:14,marginBottom:18}}>
          <Stat label="Pageviews" value={(data.totals?.pageviews || 0).toLocaleString()} />
          <Stat label="Sessions"  value={(data.totals?.sessions  || 0).toLocaleString()} />
          <Stat label="Logged-in users" value={(data.totals?.users || 0).toLocaleString()} />
        </div>

        <Card title={'Daily traffic (' + data.range.days + ' days)'}>
          <div style={{display:'flex',gap:3,height:120,alignItems:'flex-end',padding:'4px 0'}}>
            {(data.daily || []).map(d => (
              <div key={d.day} title={`${d.day}\n${d.pageviews} pageviews · ${d.sessions} sessions`}
                style={{
                  flex:1, minWidth:6,
                  height: ((d.pageviews / maxDaily) * 100) + '%',
                  background: 'var(--scouting-purple)', borderRadius:'4px 4px 0 0',
                  position:'relative'
                }}>
                <div style={{
                  position:'absolute',bottom:'100%',left:'50%',transform:'translateX(-50%)',
                  fontSize:10,color:'var(--fg-muted)',whiteSpace:'nowrap',marginBottom:2
                }}>{d.pageviews || ''}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:11,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>
            {(data.daily || [])[0] && <span>{(data.daily[0]).day}</span>}
            {(data.daily || []).length > 0 && <span>{(data.daily[data.daily.length-1]).day}</span>}
          </div>
        </Card>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <Card title="Top pages">
            <table style={{width:'100%',fontSize:13}}>
              <tbody>
                {(data.top_paths || []).map(p => (
                  <tr key={p.path} style={{borderBottom:'1px solid var(--border-hair)'}}>
                    <td style={{padding:'8px 0',fontFamily:'var(--font-mono)',fontSize:12}}>{p.path}</td>
                    <td style={{padding:'8px 0',textAlign:'right',fontWeight:700}}>{p.hits}</td>
                    <td style={{padding:'8px 0',textAlign:'right',color:'var(--fg-muted)',fontSize:11}}>{p.sessions} sess</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Traffic source">
            <table style={{width:'100%',fontSize:13}}>
              <tbody>
                {(data.sources || []).map(s => (
                  <tr key={s.source} style={{borderBottom:'1px solid var(--border-hair)'}}>
                    <td style={{padding:'8px 0',fontWeight:600,textTransform:'capitalize'}}>{s.source}</td>
                    <td style={{padding:'8px 0',textAlign:'right',fontWeight:700}}>{s.hits}</td>
                    <td style={{padding:'8px 0',textAlign:'right',color:'var(--fg-muted)',fontSize:11}}>{s.sessions} sess</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Devices">
            <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
              {(data.devices || []).map(d => (
                <div key={d.device} style={{padding:'10px 14px',background:'var(--bg-muted)',borderRadius:10}}>
                  <div style={{fontSize:11,color:'var(--fg-muted)',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:700}}>{d.device}</div>
                  <div style={{fontSize:18,fontWeight:700,fontFamily:'var(--font-en)'}}>{d.hits}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Top referrers (external)">
            {(data.referrers || []).length === 0 ? <p className="desc" style={{margin:0}}>None yet.</p> : (
              <table style={{width:'100%',fontSize:12}}>
                <tbody>
                  {(data.referrers || []).map(r => (
                    <tr key={r.referrer} style={{borderBottom:'1px solid var(--border-hair)'}}>
                      <td style={{padding:'6px 0',maxWidth:280,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.referrer}</td>
                      <td style={{padding:'6px 0',textAlign:'right',fontWeight:700}}>{r.hits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <Card title="Click events (data-track)">
          {(data.clicks || []).length === 0 ? <p className="desc" style={{margin:0}}>Add <code>data-track</code> attributes to elements you want to measure.</p> : (
            <table style={{width:'100%',fontSize:13}}>
              <tbody>
                {(data.clicks || []).map(c => (
                  <tr key={c.target} style={{borderBottom:'1px solid var(--border-hair)'}}>
                    <td style={{padding:'8px 0'}}>{c.target}</td>
                    <td style={{padding:'8px 0',textAlign:'right',fontWeight:700}}>{c.hits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Recent journeys">
          <p className="desc" style={{marginTop:0}}>Latest 20 sessions, in order. Each row is one visit; expand to see the page sequence.</p>
          {journeys.map(j => (
            <details key={j.session_id} style={{borderBottom:'1px solid var(--border-hair)',padding:'10px 0'}}>
              <summary style={{cursor:'pointer',display:'flex',gap:14,alignItems:'center',fontSize:13}}>
                <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--fg-muted)'}}>{j.session_id.slice(0, 8)}</span>
                <span>{new Date(j.started).toLocaleString()}</span>
                <span style={{color:'var(--fg-muted)'}}>· {j.pages} pages · {j.events} events</span>
              </summary>
              <div style={{paddingLeft:20,marginTop:8,fontSize:12,fontFamily:'var(--font-mono)',color:'var(--fg-secondary)'}}>
                {(j.trail || []).map((t, i) => (
                  <div key={i} style={{padding:'4px 0',display:'flex',gap:14,borderBottom:'1px dashed var(--border-hair)'}}>
                    <span style={{color:'var(--fg-muted)',width:140}}>{new Date(t.ts).toLocaleTimeString()}</span>
                    <span style={{width:80,fontWeight:700,color:t.type === 'click' ? 'var(--scouting-purple)' : 'var(--brand-text)'}}>{t.type}</span>
                    <span style={{flex:1}}>{t.path}{t.target ? ' · ' + t.target : ''}</span>
                    {t.source && <span style={{color:'var(--fg-muted)'}}>{t.source}</span>}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </Card>
      </>
    );
  }

  // ---- Error logs (Data) -------------------------------------------------
  function ErrorLogsTab() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [filter, setFilter] = useState({ level: '', source: '', resolved: '0' });  // default to unresolved-only
    const [selected, setSelected] = useState(null);

    async function load() {
      setLoading(true); setErr('');
      try {
        const token = adminToken();
        const usp = new URLSearchParams();
        usp.set('limit', '200');
        if (filter.level)    usp.set('level',    filter.level);
        if (filter.source)   usp.set('source',   filter.source);
        if (filter.resolved !== '') usp.set('resolved', filter.resolved);
        const res = await fetch('/api/errors?' + usp.toString(), { headers: authHeaders() });
        if (!res.ok) throw new Error('http_' + res.status);
        setItems((await res.json()).items || []);
      } catch (e) { setErr(e.message); }
      setLoading(false);
    }
    useEffect(() => { load(); }, [filter]);

    // Mark a row resolved / unresolved without leaving the dashboard. Updates
    // local state optimistically + reloads to pick up the resolved_at stamp.
    async function setResolved(id, resolved, note) {
      const token = adminToken();
      try {
        const r = await fetch('/api/errors/' + id, {
          method: 'PATCH',
          headers: authHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify({ resolved, ...(note ? { note } : {}) }),
        });
        if (!r.ok) throw new Error('http_' + r.status);
        load();
        if (selected && selected.id === id) setSelected({ ...selected, resolved: resolved ? 1 : 0, resolved_note: note ?? selected.resolved_note });
      } catch (e) { alert('Update failed: ' + e.message); }
    }

    async function clearAll() {
      if (!confirm('Delete ALL error logs? Cannot be undone.')) return;
      const token = adminToken();
      await fetch('/api/errors/clear', { method: 'POST', headers: authHeaders() });
      load();
    }

    const LS = { error:{bg:'#FEE2E2',fg:'#B91C1C'}, warn:{bg:'#FEF3C7',fg:'#92400E'}, info:{bg:'#DBEAFE',fg:'#1D4ED8'} };
    const SS = { server:{bg:'#E0E7FF',fg:'#3730A3'}, client:{bg:'#DCFCE7',fg:'#166534'},
                 unhandled:{bg:'#FEE2E2',fg:'#B91C1C'}, rejection:{bg:'#FEE2E2',fg:'#B91C1C'},
                 manual:{bg:'#E5E7EB',fg:'#374151'} };

    return (
      <>
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:14,flexWrap:'wrap'}}>
            <div>
              <h3 style={{margin:0}}>오류 로그 · Error logs</h3>
              <p className="desc" style={{margin:'4px 0 0'}}>{loading ? 'Loading…' : items.length + ' rows'}</p>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <select value={filter.level} onChange={e => setFilter({ ...filter, level: e.target.value })}
                style={{padding:'8px 10px',border:'1px solid var(--border-default)',borderRadius:8,fontSize:13,background:'var(--bg-elevated)'}}>
                <option value="">All levels</option><option value="error">error</option><option value="warn">warn</option><option value="info">info</option>
              </select>
              <select value={filter.source} onChange={e => setFilter({ ...filter, source: e.target.value })}
                style={{padding:'8px 10px',border:'1px solid var(--border-default)',borderRadius:8,fontSize:13,background:'var(--bg-elevated)'}}>
                <option value="">All sources</option><option>server</option><option>client</option><option>unhandled</option><option>rejection</option><option>manual</option>
              </select>
              <select value={filter.resolved} onChange={e => setFilter({ ...filter, resolved: e.target.value })}
                style={{padding:'8px 10px',border:'1px solid var(--border-default)',borderRadius:8,fontSize:13,background:'var(--bg-elevated)'}}>
                <option value="0">Unresolved only</option>
                <option value="1">Resolved only</option>
                <option value="">All</option>
              </select>
              <button className="icon-btn" onClick={load}>Refresh</button>
              <button className="icon-btn danger" onClick={clearAll}>Clear all</button>
            </div>
          </div>
          {err && <p style={{color:'var(--state-danger)',fontSize:13,marginTop:10}}>{err}</p>}
        </div>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {items.length === 0 ? (
            <div style={{padding:'60px 20px',textAlign:'center',color:'var(--fg-muted)'}}>미해결 오류가 없습니다.</div>
          ) : (
            <table className="apps-table">
              <thead><tr><th>Time</th><th>Level</th><th>Source</th><th>Message</th><th>Path</th><th>Status</th><th style={{width:140,textAlign:'right'}}>State</th></tr></thead>
              <tbody>
                {items.map(e => {
                  const ls = LS[e.level] || LS.error; const ss = SS[e.source] || SS.manual;
                  const isResolved = !!e.resolved;
                  return (
                    <tr key={e.id} style={{cursor:'pointer',opacity:isResolved?0.62:1}}>
                      <td onClick={() => setSelected(e)}><span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--fg-muted)'}}>{new Date(e.ts).toLocaleString()}</span></td>
                      <td onClick={() => setSelected(e)}><span className="pill" style={{background:ls.bg,color:ls.fg}}>{e.level}</span></td>
                      <td onClick={() => setSelected(e)}><span className="pill" style={{background:ss.bg,color:ss.fg}}>{e.source}</span></td>
                      <td onClick={() => setSelected(e)} style={{maxWidth:380,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textDecoration:isResolved?'line-through':'none'}}>{e.message}</td>
                      <td onClick={() => setSelected(e)}><code style={{fontSize:11,color:'var(--fg-secondary)'}}>{e.method || ''} {e.path || ''}</code></td>
                      <td onClick={() => setSelected(e)}>{e.status || '—'}</td>
                      <td style={{textAlign:'right'}}>
                        {isResolved ? (
                          <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
                            <span className="pill" style={{background:'var(--state-success-bg)',color:'var(--state-success)'}}>✓ 해결됨</span>
                            <button type="button" className="icon-btn" onClick={(ev) => { ev.stopPropagation(); setResolved(e.id, false); }}>Reopen</button>
                          </span>
                        ) : (
                          <button type="button" className="icon-btn" onClick={(ev) => { ev.stopPropagation(); const note = prompt('해결 메모 (선택):', '') || ''; setResolved(e.id, true, note); }}>해결 완료</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {selected && (
          <div className="app-modal" onClick={() => setSelected(null)}>
            <div className="app-modal-inner" onClick={e => e.stopPropagation()}>
              <div className="app-modal-head">
                <div>
                  <div className="sec-kicker" style={{margin:0}}>{selected.level} · {selected.source}</div>
                  <h2 style={{margin:'4px 0 0',fontSize:18}}>{selected.message}</h2>
                  <div style={{fontSize:12,color:'var(--fg-muted)',marginTop:4}}>{new Date(selected.ts).toLocaleString()} · {selected.method} {selected.path}</div>
                </div>
                <button className="icon-btn" onClick={() => setSelected(null)}>Close</button>
              </div>
              <div className="app-modal-body">
                <div style={{padding:'10px 14px',borderRadius:10,marginBottom:14,background:selected.resolved?'var(--state-success-bg)':'var(--state-warning-bg)',color:selected.resolved?'var(--state-success)':'var(--state-warning)',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                  <div>
                    <strong>{selected.resolved ? '해결 완료' : '미해결'}</strong>
                    {selected.resolved && selected.resolved_at && (
                      <span style={{marginLeft:10,fontSize:12,opacity:0.8}}>{new Date(selected.resolved_at).toLocaleString()}</span>
                    )}
                    {selected.resolved && selected.resolved_note && (
                      <div style={{fontSize:13,marginTop:4}}>{selected.resolved_note}</div>
                    )}
                  </div>
                  {selected.resolved
                    ? <button type="button" className="icon-btn" onClick={() => setResolved(selected.id, false)}>다시 열기</button>
                    : <button type="button" className="icon-btn" onClick={() => { const note = prompt('해결 메모 (선택):', '') || ''; setResolved(selected.id, true, note); }}>해결 완료</button>
                  }
                </div>
                {selected.stack && <><h4 className="app-sec">Stack</h4><pre style={{background:'var(--bg-muted)',padding:12,borderRadius:8,fontSize:11,fontFamily:'var(--font-mono)',overflowX:'auto',whiteSpace:'pre-wrap'}}>{selected.stack}</pre></>}
                {selected.meta && <><h4 className="app-sec">Meta</h4><pre style={{background:'var(--bg-muted)',padding:12,borderRadius:8,fontSize:11,fontFamily:'var(--font-mono)',overflowX:'auto'}}>{selected.meta}</pre></>}
                <h4 className="app-sec">Context</h4>
                <div className="app-row"><div className="app-k">User</div><div className="app-v">{selected.user_id || '—'}</div></div>
                <div className="app-row"><div className="app-k">Session</div><div className="app-v">{selected.session_id || '—'}</div></div>
                <div className="app-row"><div className="app-k">IP</div><div className="app-v">{selected.ip || '—'}</div></div>
                <div className="app-row"><div className="app-k">User agent</div><div className="app-v" style={{fontSize:11,wordBreak:'break-all'}}>{selected.user_agent || '—'}</div></div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ---- Consent log -------------------------------------------------------
  // ---- Members directory (회원 목록) ---------------------------------------
  // Lists every registered user with last-login + app count. Click a row for
  // a detail panel showing the consent trail tied to that account.
  // ---- Member directory (CRUD + audit) ------------------------------------
  // Lists members with 20-per-page pagination + free-text search + role filter.
  // Operator can add a member directly (provisioning), edit name/email/role,
  // reset password, or delete an account. Every change is logged into
  // member_audits and surfaced in the detail panel.
  // QA / test-account convention (set 2026-05-19): email starts with `qa+`
  // AND name starts with `[TEST]`. Soft cap of 5 — the admin UI counts and
  // warns above the cap. Real members must NEVER use the qa+ prefix.
  const TEST_ACCOUNT_LIMIT = 5;
  function isTestAccount(m) {
    if (!m) return false;
    const e = String(m.email || '').toLowerCase();
    const n = String(m.name  || '');
    return e.startsWith('qa+') || n.startsWith('[TEST]');
  }
