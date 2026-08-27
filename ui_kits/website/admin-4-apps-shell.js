// admin-4-apps-shell.js — 관리자 콘솔 4/4
//
// 문의 · 지원서 · 2FA · Admin 셸 · Gate · 루트 렌더
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
// `InquiriesTab` 에서 시작해 `ExpressionStatement` 에서 끝난다.

  // ---- Inquiries (submitted contact-form messages) ----------------------
  function InquiriesTab() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [selected, setSelected] = useState(null);
    const [filter, setFilter] = useState('all');
    const [picked, setPicked] = useState(() => new Set());

    async function load() {
      setLoading(true); setErr('');
      try {
        const token = adminToken();
        const res = await fetch('/api/inquiries', { headers: authHeaders() });
        if (!res.ok) { setErr(res.status === 401 ? 'Unauthorized — re-login required.' : 'HTTP ' + res.status); setItems([]); return; }
        const data = await res.json();
        setItems(data.items || []);
      } catch (e) { setErr(e.message); }
      setLoading(false);
    }
    useEffect(() => { load(); }, []);

    async function setStatus(id, status) {
      const token = adminToken();
      await fetch('/api/inquiries/' + id, {
        method: 'PATCH',
        headers: authHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
      if (selected && selected.id === id) setSelected({ ...selected, status });
    }
    async function deleteOne(id) {
      if (!confirm('Delete this inquiry?')) return;
      const token = adminToken();
      const res = await fetch('/api/inquiries/' + id, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) { alert('Delete failed'); return; }
      setItems(prev => prev.filter(i => i.id !== id));
      if (selected && selected.id === id) setSelected(null);
    }
    function togglePick(id) { setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
    function pickAllVisible() { setPicked(new Set(filtered.map(i => i.id))); }
    function clearPicks() { setPicked(new Set()); }
    async function bulkAction(op, status) {
      if (!picked.size) return;
      if (op === 'delete' && !confirm(`Delete ${picked.size} inquiries? This cannot be undone.`)) return;
      const token = adminToken();
      const res = await fetch('/api/inquiries/bulk', {
        method: 'POST',
        headers: authHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({ ids: [...picked], op, ...(status ? { status } : {}) }),
      });
      if (!res.ok) { alert('Bulk failed: HTTP ' + res.status); return; }
      clearPicks();
      load();
    }
    function exportCSV() {
      const cols = ['id','created_at','status','category','subject','name','email','phone','body'];
      const esc = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
      const rows = [cols.join(',')].concat(items.map(i => cols.map(k => esc(i[k])).join(',')));
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'dreampath-inquiries.csv'; a.click();
      URL.revokeObjectURL(url);
    }

    const STATUS = {
      new:     { label: 'New',     bg: '#DBEAFE', fg: '#1D4ED8' },
      seen:    { label: 'Seen',    bg: '#FEF3C7', fg: '#92400E' },
      replied: { label: 'Replied', bg: '#DCFCE7', fg: '#166534' },
      closed:  { label: 'Closed',  bg: '#E5E7EB', fg: '#374151' },
    };
    const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

    return (
      <>
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,marginBottom:14}}>
            <div>
              <h3 style={{margin:0}}>문의 (Inquiries)</h3>
              <p className="desc" style={{margin:'4px 0 0'}}>
                {loading ? 'Loading…' : items.length + ' total · stored in Cloudflare D1'}
              </p>
              {err && <p style={{color:'var(--state-danger)',fontSize:13,margin:'8px 0 0'}}>{err}</p>}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="icon-btn" onClick={load}>Refresh</button>
              <button className="icon-btn" onClick={exportCSV}>Export CSV</button>
            </div>
          </div>

          {picked.size > 0 && (
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--state-info-bg)',color:'var(--state-info)',borderRadius:10,marginBottom:14,flexWrap:'wrap'}}>
              <strong>{picked.size} selected</strong>
              <span style={{flex:1}} />
              <select onChange={e => { if (e.target.value) bulkAction('status', e.target.value); e.target.value = ''; }} defaultValue=""
                style={{padding:'6px 10px',border:'1px solid currentColor',background:'transparent',color:'inherit',borderRadius:6,fontSize:13}}>
                <option value="">Set status…</option>
                {['new','seen','replied','closed'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="button" className="icon-btn" onClick={clearPicks}>Clear</button>
              <button type="button" className="icon-btn danger" onClick={() => bulkAction('delete')}>Delete selected</button>
            </div>
          )}
          <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
            {['all','new','seen','replied','closed'].map(s => (
              <button key={s} type="button"
                onClick={() => setFilter(s)}
                className="icon-btn"
                style={filter === s ? {background:'var(--midnight-purple)',color:'#fff',borderColor:'var(--midnight-purple)'} : {}}>
                {s} {s !== 'all' && `(${items.filter(i => i.status === s).length})`}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div style={{padding:'40px 20px',textAlign:'center',color:'var(--fg-muted)',background:'var(--bg-muted)',borderRadius:12,fontSize:14}}>
              No inquiries yet.
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table className="apps-table">
                <thead>
                  <tr>
                    <th style={{width:32}}>
                      <input type="checkbox"
                        checked={filtered.length > 0 && filtered.every(i => picked.has(i.id))}
                        onChange={e => e.target.checked ? pickAllVisible() : clearPicks()}
                        aria-label="Select all visible" />
                    </th>
                    <th>ID</th><th>Received</th><th>Name</th><th>Email</th>
                    <th>Category</th><th>Subject</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(i => {
                    const s = STATUS[i.status] || STATUS.new;
                    return (
                      <tr key={i.id} style={picked.has(i.id) ? {background:'var(--state-info-bg)',cursor:'pointer'} : {cursor:'pointer'}}>
                        <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={picked.has(i.id)} onChange={() => togglePick(i.id)} aria-label={`Select ${i.id}`} /></td>
                        <td onClick={() => setSelected(i)}><span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--fg-muted)'}}>{i.id.slice(0, 16)}…</span></td>
                        <td onClick={() => setSelected(i)}>{new Date(i.created_at).toLocaleString()}</td>
                        <td onClick={() => setSelected(i)}>{i.name}</td>
                        <td onClick={() => setSelected(i)}>{i.email}</td>
                        <td onClick={() => setSelected(i)}>{i.category}</td>
                        <td onClick={() => setSelected(i)} style={{maxWidth:280,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{i.subject}</td>
                        <td onClick={() => setSelected(i)}><span className="pill" style={{background:s.bg,color:s.fg}}>{s.label}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="icon-btn danger" onClick={() => deleteOne(i.id)}>Del</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <div className="app-modal" onClick={() => setSelected(null)}>
            <div className="app-modal-inner" onClick={e => e.stopPropagation()}>
              <div className="app-modal-head">
                <div>
                  <div className="sec-kicker" style={{margin:0}}>{selected.id}</div>
                  <h2 style={{margin:'4px 0 0',fontSize:22}}>{selected.subject}</h2>
                  <div style={{fontSize:13,color:'var(--fg-muted)',marginTop:4}}>
                    {new Date(selected.created_at).toLocaleString()} · {selected.category}
                  </div>
                </div>
                <button className="icon-btn" onClick={() => setSelected(null)}>Close</button>
              </div>
              <div className="app-modal-body">
                <div className="app-row"><div className="app-k">From</div><div className="app-v">{selected.name} &lt;{selected.email}&gt;</div></div>
                {selected.phone && <div className="app-row"><div className="app-k">Phone</div><div className="app-v">{selected.phone}</div></div>}
                {selected.user_id && <div className="app-row"><div className="app-k">User ID</div><div className="app-v"><code>{selected.user_id}</code></div></div>}
                <h4 className="app-sec">Message</h4>
                <div className="essay-box">{selected.body}</div>
                <h4 className="app-sec">Status</h4>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {['new','seen','replied','closed'].map(s => (
                    <button key={s} type="button" className="icon-btn"
                      style={selected.status === s ? {background:'var(--midnight-purple)',color:'#fff',borderColor:'var(--midnight-purple)'} : {}}
                      onClick={() => setStatus(selected.id, s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="app-modal-foot">
                <a className="icon-btn" href={'mailto:' + selected.email + '?subject=Re: ' + encodeURIComponent(selected.subject)}>
                  Reply via email
                </a>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ---- Error pages preview (iframes of live routes) ----------------------
  function ErrorPreviewTab() {
    const errors = [
      { code: '401', label: 'Unauthorized', desc: '로그인이 필요한 화면' },
      { code: '403', label: 'Forbidden',    desc: '권한 없는 접근' },
      { code: '404', label: 'Not Found',    desc: '존재하지 않는 페이지' },
      { code: '500', label: 'Server Error', desc: '서버 오류' },
      { code: '503', label: 'Unavailable',  desc: '점검/혼잡' },
      { code: 'offline', label: 'Offline',  desc: '네트워크 연결 안됨' },
    ];
    const [active, setActive] = useState('401');
    const path = active === 'offline' ? '/offline' : '/' + active;

    return (
      <>
        <div className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, marginBottom:14}}>
            <div>
              <h3 style={{margin:0}}>Error pages</h3>
              <p className="desc" style={{margin:'4px 0 0'}}>Live preview of every error route. The iframe loads the real page from the deployed site.</p>
            </div>
            <a className="icon-btn" href={path} target="_blank" rel="noopener">Open in new tab ↗</a>
          </div>
          <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:16}}>
            {errors.map(e => (
              <button key={e.code} type="button"
                className="icon-btn"
                onClick={() => setActive(e.code)}
                style={active === e.code ? {background:'var(--midnight-purple)', color:'#fff', borderColor:'var(--midnight-purple)'} : {}}>
                {e.code} · {e.label}
              </button>
            ))}
          </div>
          <div style={{
            border:'1px solid var(--border-default)', borderRadius:14, overflow:'hidden',
            background:'var(--bg-elevated)', boxShadow:'var(--shadow-sm)'
          }}>
            <div style={{
              padding:'8px 14px', background:'var(--bg-muted)',
              borderBottom:'1px solid var(--border-hair)',
              display:'flex', alignItems:'center', gap:10,
              fontFamily:'var(--font-mono)', fontSize:12, color:'var(--fg-secondary)'
            }}>
              <span style={{display:'inline-flex', gap:4}}>
                <span style={{width:10, height:10, borderRadius:'50%', background:'#FF5F57'}} />
                <span style={{width:10, height:10, borderRadius:'50%', background:'#FEBC2E'}} />
                <span style={{width:10, height:10, borderRadius:'50%', background:'#28C840'}} />
              </span>
              <span style={{marginLeft:8}}>koreadreampath.com{path}</span>
            </div>
            <iframe key={active} src={path} title={'Error ' + active}
              style={{width:'100%', height:780, border:0, display:'block'}} />
          </div>
        </div>
      </>
    );
  }

  function MotionPreview() {
    const [pulse, setPulse] = useState(0);
    return (
      <div>
        <div style={{display:'flex', gap:12, marginBottom:18, flexWrap:'wrap'}}>
          {['fast','normal','slow'].map(d => (
            <button key={d} type="button" className="btn btn-secondary btn-sm" onClick={() => setPulse(p => p + 1)}>
              Trigger animation
            </button>
          ))}
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16}}>
          {[['--duration-fast','fast'],['--duration-normal','normal'],['--duration-slow','slow']].map(([v, label]) => (
            <div key={v} style={{padding:18, background:'var(--bg-muted)', borderRadius:12, textAlign:'center'}}>
              <div style={{fontSize:11, fontFamily:'var(--font-mono)', color:'var(--fg-muted)', marginBottom:4}}>{v}</div>
              <div style={{fontSize:12, fontWeight:700, marginBottom:14}}>{label} · {useCssVar(v)}</div>
              <div key={pulse} style={{
                width:48, height:48, margin:'0 auto', borderRadius:'50%',
                background:'var(--scouting-purple)',
                animation: `dp-pulse var(${v}) var(--ease-standard) forwards`,
              }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes dp-pulse { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
      </div>
    );
  }

  // ---- Translations (1:1 KO/EN side-by-side) -----------------------------
  // Walks the content tree and emits one row per matching KO/EN pair.
  // Detects three patterns:
  //  (a) sibling keys foo_ko / foo_en  (or name_kr / name_en)
  //  (b) parent object with parallel children under .ko and .en
  //  (c) array items where each element has those patterns
  function collectTranslationPairs(node, path, sectionTitle, out) {
    if (node == null) return;
    if (Array.isArray(node)) {
      node.forEach((item, i) => collectTranslationPairs(item, [...path, i], sectionTitle + ' [' + (i+1) + ']', out));
      return;
    }
    if (typeof node !== 'object') return;

    // Pattern (b): parallel ko/en branches with same keys
    if (node.ko && node.en && typeof node.ko === 'object' && typeof node.en === 'object'
        && !Array.isArray(node.ko) && !Array.isArray(node.en)) {
      const koKeys = Object.keys(node.ko);
      koKeys.forEach(k => {
        const koVal = node.ko[k];
        const enVal = node.en?.[k];
        // Only render leaf strings — recurse into nested objects/arrays
        if (typeof koVal === 'string' || typeof enVal === 'string') {
          out.push({
            section: sectionTitle,
            label: k,
            koPath: [...path, 'ko', k],
            enPath: [...path, 'en', k],
            koValue: koVal ?? '',
            enValue: enVal ?? '',
            multiline: (koVal && koVal.length > 60) || (enVal && enVal.length > 60),
          });
        } else if (Array.isArray(koVal)) {
          koVal.forEach((_, i) => {
            const koItem = koVal[i];
            const enItem = enVal?.[i];
            if (typeof koItem === 'string') {
              out.push({
                section: sectionTitle + ' · ' + k,
                label: '#' + (i+1),
                koPath: [...path, 'ko', k, i],
                enPath: [...path, 'en', k, i],
                koValue: koItem ?? '',
                enValue: enItem ?? '',
                multiline: (koItem && koItem.length > 60) || (enItem && enItem.length > 60),
              });
            }
          });
        } else if (typeof koVal === 'object' && koVal !== null) {
          // Recurse into nested objects (e.g., team cards inside team)
          collectTranslationPairs(koVal, [...path, 'ko', k], sectionTitle + ' · ' + k, out);
          // Note: walks ko side; en parallel is captured by path mirroring in setEnFromKoPath
        }
      });
      // Skip top-level ko/en keys but still recurse into siblings
      Object.keys(node).forEach(k => {
        if (k !== 'ko' && k !== 'en') {
          collectTranslationPairs(node[k], [...path, k], sectionTitle + ' · ' + k, out);
        }
      });
      return;
    }

    // Pattern (a) and recurse into children
    const keys = Object.keys(node);
    const handled = new Set();
    keys.forEach(k => {
      if (handled.has(k)) return;
      const m1 = k.match(/^(.+)_ko$/);
      const m2 = k.match(/^(.+)_kr$/); // brand uses name_kr
      if (m1 && Object.prototype.hasOwnProperty.call(node, m1[1] + '_en')) {
        const enKey = m1[1] + '_en';
        const koVal = node[k]; const enVal = node[enKey];
        out.push({
          section: sectionTitle,
          label: m1[1],
          koPath: [...path, k],
          enPath: [...path, enKey],
          koValue: typeof koVal === 'string' ? koVal : '',
          enValue: typeof enVal === 'string' ? enVal : '',
          multiline: (typeof koVal === 'string' && koVal.length > 60) || (typeof enVal === 'string' && enVal.length > 60),
        });
        handled.add(k); handled.add(enKey);
      } else if (m2 && Object.prototype.hasOwnProperty.call(node, m2[1] + '_en')) {
        const enKey = m2[1] + '_en';
        const koVal = node[k]; const enVal = node[enKey];
        out.push({
          section: sectionTitle,
          label: m2[1],
          koPath: [...path, k],
          enPath: [...path, enKey],
          koValue: typeof koVal === 'string' ? koVal : '',
          enValue: typeof enVal === 'string' ? enVal : '',
          multiline: false,
        });
        handled.add(k); handled.add(enKey);
      }
    });
    keys.forEach(k => {
      if (handled.has(k)) return;
      const child = node[k];
      if (child && typeof child === 'object') {
        collectTranslationPairs(child, [...path, k], sectionTitle + ' · ' + k, out);
      }
    });
  }

  function TranslationsTab({ c, set }) {
    // Sections we actually want translations for, in display order.
    // Excluded (no public render — verified 2026-05-20 v01.059):
    //   - stats             : StatsTab unregistered, KV key never present.
    //   - partners_section  : Form removed from PartnersTab, no public reader.
    //   - stories_section   : No public reader (page_heros.stories carries the hero).
    //   - news              : Moved to D1; c.news orphaned.
    //   - hero / how / programs_section / cta_banner : public homepage is EN-only.
    const sections = [
      { key: 'brand',          title: 'Brand' },
      { key: 'nav',            title: 'Navigation' },
      { key: 'programs',       title: 'Programs' },
      { key: 'partners',       title: 'Partners' },
      { key: 'stories',        title: 'Stories' },
      { key: 'faq',            title: 'FAQ' },
      { key: 'about',          title: 'About page' },
      { key: 'page_heros',     title: 'Page headers' },
      { key: 'partner_cta',    title: 'Partner CTA' },
      { key: 'program_detail', title: 'Program detail copy' },
      { key: 'footer',         title: 'Footer' },
    ];

    const [filter, setFilter] = useState('');
    const all = [];
    sections.forEach(s => {
      if (c[s.key] != null) collectTranslationPairs(c[s.key], [s.key], s.title, all);
    });

    const q = filter.trim().toLowerCase();
    const shown = q ? all.filter(r =>
      r.section.toLowerCase().includes(q) ||
      r.label.toLowerCase().includes(q) ||
      r.koValue.toLowerCase().includes(q) ||
      r.enValue.toLowerCase().includes(q)
    ) : all;

    // Group rows by section for visual grouping
    const grouped = [];
    let last = null;
    shown.forEach(r => {
      if (last == null || last.title !== r.section) {
        last = { title: r.section, rows: [] };
        grouped.push(last);
      }
      last.rows.push(r);
    });

    return (
      <>
        <div className="card" style={{position:'sticky',top:0,zIndex:5,padding:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}>
            <div>
              <strong>{shown.length}</strong> of {all.length} translation pairs
            </div>
            <input
              type="search"
              placeholder="Filter (label, section, or text)…"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{padding:'8px 12px',border:'1px solid #ddd',borderRadius:8,fontSize:14,width:320}}
            />
          </div>
        </div>
        {grouped.map((g, gi) => (
          <details className="card admin-fold" key={gi} open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{margin:'0 0 12px'}}>{g.title}</h3></summary>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={{width:140,textAlign:'left',padding:'8px 6px',borderBottom:'1px solid #eee',fontSize:12,color:'#666',textTransform:'uppercase',letterSpacing:'0.08em'}}>Field</th>
                  <th style={{textAlign:'left',padding:'8px 6px',borderBottom:'1px solid #eee',fontSize:12,color:'#666',textTransform:'uppercase',letterSpacing:'0.08em'}}>한국어</th>
                  <th style={{textAlign:'left',padding:'8px 6px',borderBottom:'1px solid #eee',fontSize:12,color:'#666',textTransform:'uppercase',letterSpacing:'0.08em'}}>English</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r, ri) => (
                  <tr key={ri} style={{verticalAlign:'top'}}>
                    <td style={{padding:'10px 6px',borderBottom:'1px solid #f3f3f3',fontSize:13,color:'#444',fontFamily:'var(--font-mono, monospace)'}}>{r.label}</td>
                    <td style={{padding:'8px 6px',borderBottom:'1px solid #f3f3f3'}}>
                      {r.multiline ? (
                        <textarea lang="ko" value={r.koValue}
                          onChange={e => set(r.koPath, e.target.value)}
                          rows={3}
                          style={{width:'100%',padding:'8px 10px',border:'1px solid #e0e0e0',borderRadius:6,fontSize:14,fontFamily:'var(--font-kr)',resize:'vertical'}} />
                      ) : (
                        <input type="text" lang="ko" value={r.koValue}
                          onChange={e => set(r.koPath, e.target.value)}
                          style={{width:'100%',padding:'8px 10px',border:'1px solid #e0e0e0',borderRadius:6,fontSize:14,fontFamily:'var(--font-kr)'}} />
                      )}
                    </td>
                    <td style={{padding:'8px 6px',borderBottom:'1px solid #f3f3f3'}}>
                      {r.multiline ? (
                        <textarea lang="en" value={r.enValue}
                          onChange={e => set(r.enPath, e.target.value)}
                          rows={3}
                          style={{width:'100%',padding:'8px 10px',border:'1px solid #e0e0e0',borderRadius:6,fontSize:14,fontFamily:'var(--font-en)',resize:'vertical'}} />
                      ) : (
                        <input type="text" lang="en" value={r.enValue}
                          onChange={e => set(r.enPath, e.target.value)}
                          style={{width:'100%',padding:'8px 10px',border:'1px solid #e0e0e0',borderRadius:6,fontSize:14,fontFamily:'var(--font-en)'}} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </>
    );
  }

  function IconsTab({ c, set }) {
    const keys = Object.keys(c.icons);
    return (
      <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Icon slots</h3></summary>
        <p className="desc">Each slot is a named role used somewhere on the site. Pick any Lucide icon.</p>
        <div className="grid-3">
          {keys.map(k => (
            <IconField key={k} label={k} value={c.icons[k]} onChange={v => set(['icons',k], v)} />
          ))}
        </div>
      </details>
    );
  }

  // ---- Applications (submitted forms) — server-backed via D1 -------------
  // v01.092 — 신청 파이프라인 단계 메타(라벨/색). 칸반 필터 + 배지 공용.
  const APP_STAGE_META = {
    submitted:         { label: '심사 대기',  color: '#1F5FBD' },
    screen_passed:     { label: '1차 통과',   color: '#1F5FBD' },
    screen_rejected:   { label: '미선정',     color: '#B91C1C' },
    cufs_no_submitted: { label: '합격증 검증 대기', color: '#B45309' },
    cufs_admitted:     { label: '서류 단계',  color: '#6B2DBE' },
    docs_submitted:    { label: '서류 검증 대기', color: '#B45309' },
    docs_verified:     { label: '결제 대기',  color: '#6B2DBE' },
    paid:              { label: '등록 확정 대기', color: '#B45309' },
    enrolled:          { label: '등록 완료',  color: '#248737' },
    cancelled:         { label: '취소됨',     color: '#6B7280' },
  };
  const APP_STAGE_ORDER = ['submitted','screen_passed','cufs_no_submitted','cufs_admitted','docs_submitted','docs_verified','paid','enrolled','screen_rejected','cancelled'];

  function ApplicationsTab() {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [selected, setSelected] = useState(null);
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    const [picked, setPicked] = useState(() => new Set());     // ids checked for bulk
    const [acting, setActing] = useState(false);

    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        const token = adminToken();
        const res = await fetch('/api/applications?limit=500', {
          headers: authHeaders(),
        });
        if (!res.ok) {
          setLoadError(res.status === 401 ? 'Unauthorized — re-login required.' : 'Failed to load (HTTP ' + res.status + ')');
          setApps([]);
          return;
        }
        const data = await res.json();
        const items = (data.items || []).map(a => ({ ...a, submittedAt: a.submitted_at }));
        setApps(items);
      } catch (e) {
        setLoadError('Network error: ' + e.message);
      } finally {
        setLoading(false);
      }
    }
    useEffect(() => { load(); }, []);

    const stageMeta = s => APP_STAGE_META[s] || { label: s || '—', color: '#6B7280' };

    // 검색(고유번호 / 이메일 / 이름) + 단계 필터.
    const q = query.trim().toLowerCase();
    const searched = !q ? apps : apps.filter(a =>
      String(a.candidate_no || '').toLowerCase().includes(q) ||
      String(a.email || '').toLowerCase().includes(q) ||
      String(a.name || '').toLowerCase().includes(q) ||
      String(a.id || '').toLowerCase().includes(q));
    const filtered = filter === 'all' ? searched : searched.filter(a => (a.status || 'submitted') === filter);

    // 관리자가 처리해야 할 "대기" 단계 — 칸반 상단 강조용.
    const ACTION_NEEDED = ['submitted','cufs_no_submitted','docs_submitted','paid'];

    function refresh() { load(); setSelected(null); setPicked(new Set()); }
    function togglePick(id) { setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
    function pickAllVisible() { setPicked(new Set(filtered.map(a => a.id))); }
    function clearPicks() { setPicked(new Set()); }

    async function bulkAction(op, status) {
      if (!picked.size) return;
      if (op === 'delete' && !confirm(`Delete ${picked.size} applications? This cannot be undone.`)) return;
      const token = adminToken();
      try {
        const res = await fetch('/api/applications/bulk', {
          method: 'POST',
          headers: authHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify({ ids: [...picked], op, ...(status ? { status } : {}) }),
        });
        if (!res.ok) { alert('Bulk failed: HTTP ' + res.status); return; }
        clearPicks();
        load();
      } catch (e) { alert('Bulk failed: ' + e.message); }
    }
    async function deleteApp(id) {
      if (!confirm('Delete this application?')) return;
      try {
        const token = adminToken();
        const res = await fetch('/api/applications/' + encodeURIComponent(id), {
          method: 'DELETE', headers: authHeaders(),
        });
        if (!res.ok) { alert('Delete failed: HTTP ' + res.status); return; }
        setApps(prev => prev.filter(a => a.id !== id));
        setSelected(null);
      } catch (e) { alert('Delete failed: ' + e.message); }
    }

    // 파이프라인 단계 전이 호출. action = screen|verify-admission|verify-documents|enroll|cancel.
    async function transition(id, action, body) {
      setActing(true);
      const token = adminToken();
      try {
        const res = await fetch('/api/admin/applications/' + encodeURIComponent(id) + '/' + action, {
          method: 'POST', headers: authHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify(body || {}),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(d.error === 'conflict' ? ('단계가 맞지 않습니다: ' + (d.detail || '')) : ('실패: ' + (d.error || res.status)));
          return;
        }
        // 모달 + 목록 갱신.
        setSelected(s => s ? { ...s, status: d.status } : s);
        await load();
      } catch (e) { alert('실패: ' + e.message); }
      finally { setActing(false); }
    }

    function exportCSV() {
      const cols = ['candidate_no','id','submittedAt','status','amount','program','name','email','country','phone','cufs_reg_no'];
      const esc = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
      const rows = [cols.join(',')].concat(apps.map(a => cols.map(k => esc(a[k])).join(',')));
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'dreampath-applications.csv'; a.click();
      URL.revokeObjectURL(url);
    }

    // 단계별 카운트(필터 칩).
    const countFor = s => apps.filter(a => (a.status || 'submitted') === s).length;

    return (
      <>
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,marginBottom:16}}>
            <div>
              <h3 style={{margin:0}}>신청 파이프라인 · Applications</h3>
              <p className="desc" style={{margin:'4px 0 0'}}>
                {loading ? 'Loading…' : (apps.length + ' total · stored in Cloudflare D1')}
              </p>
              {loadError && <p style={{color:'var(--state-danger)',fontSize:13,margin:'8px 0 0'}}>{loadError}</p>}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="icon-btn" onClick={refresh}>Refresh</button>
              <button className="icon-btn" onClick={exportCSV}>Export CSV</button>
            </div>
          </div>

          {/* 검색 — 고유번호 / 이메일 / 이름 */}
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="검색: 고유번호 · 이메일 · 이름 (search by candidate_no / email / name)"
            style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border-default)',borderRadius:8,marginBottom:14,fontSize:13}} />

          {/* Bulk action bar */}
          {picked.size > 0 && (
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--state-info-bg)',color:'var(--state-info)',borderRadius:10,marginBottom:14,flexWrap:'wrap'}}>
              <strong>{picked.size} selected</strong>
              <span style={{flex:1}} />
              <button type="button" className="icon-btn" onClick={clearPicks}>Clear</button>
              <button type="button" className="icon-btn danger" onClick={() => bulkAction('delete')}>Delete selected</button>
            </div>
          )}

          {/* 단계 필터 칩 (칸반 요약) */}
          <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
            <button type="button" onClick={() => setFilter('all')} className="icon-btn"
              style={filter === 'all' ? {background:'var(--midnight-purple)',color:'#fff',borderColor:'var(--midnight-purple)'} : {}}>
              전체 ({apps.length})
            </button>
            {APP_STAGE_ORDER.map(s => {
              const n = countFor(s);
              if (n === 0 && filter !== s) return null;
              const m = stageMeta(s);
              const need = ACTION_NEEDED.includes(s);
              return (
                <button key={s} type="button" onClick={() => setFilter(s)} className="icon-btn"
                  style={filter === s ? {background:m.color,color:'#fff',borderColor:m.color} : (need ? {borderColor:m.color,color:m.color} : {})}>
                  {need ? '● ' : ''}{m.label} ({n})
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div style={{padding:'40px 20px',textAlign:'center',color:'var(--fg-muted)',background:'var(--bg-muted)',borderRadius:12,fontSize:14}}>
              해당 조건의 신청이 없습니다.
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table className="apps-table">
                <thead>
                  <tr>
                    <th style={{width:32}}>
                      <input type="checkbox"
                        checked={filtered.length > 0 && filtered.every(a => picked.has(a.id))}
                        onChange={e => e.target.checked ? pickAllVisible() : clearPicks()}
                        aria-label="Select all visible" />
                    </th>
                    <th>고유번호</th><th>Submitted</th><th>Name</th><th>Country</th>
                    <th>Program</th><th>단계 / Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => {
                    const m = stageMeta(a.status || 'submitted');
                    return (
                      <tr key={a.id} style={picked.has(a.id) ? {background:'var(--state-info-bg)'} : {}}>
                        <td><input type="checkbox" checked={picked.has(a.id)} onChange={() => togglePick(a.id)} aria-label={`Select ${a.id}`} /></td>
                        <td style={{fontFamily:'var(--font-mono)',fontSize:13,fontWeight:700}}>{a.candidate_no || '—'}</td>
                        <td>{new Date(a.submittedAt).toLocaleString()}</td>
                        <td><strong>{a.name}</strong><div style={{fontSize:12,color:'var(--fg-muted)'}}>{a.email}</div></td>
                        <td>{a.country}</td>
                        <td style={{fontSize:13}}>{a.program}</td>
                        <td><span className="pill" style={{background:m.color+'22',color:m.color}}>{m.label}</span></td>
                        <td><button className="icon-btn" onClick={() => setSelected(a)}>View</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && (
          <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby="app-modal-title"
               onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
            <div className="app-modal-inner">
              <div className="app-modal-head">
                <div>
                  <div style={{fontSize:12,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--fg-muted)',marginBottom:4,fontFamily:'var(--font-mono)'}}>
                    {selected.candidate_no || selected.id}
                  </div>
                  <h3 id="app-modal-title" style={{margin:0,fontSize:22}}>{selected.name}</h3>
                  <div style={{color:'var(--fg-secondary)',fontSize:13,marginTop:2}}>{selected.email} · {selected.country}{selected.phone ? ' · ' + selected.phone : ''}</div>
                </div>
                <button className="icon-btn" onClick={() => setSelected(null)}>Close</button>
              </div>

              <div className="app-modal-body">
                {/* 단계 전이 액션 패널 */}
                <AppStageActions app={selected} stageMeta={stageMeta} acting={acting} transition={transition} />

                <h4 className="app-sec">진행 정보</h4>
                <Row k="현재 단계"><span className="pill" style={{background:stageMeta(selected.status).color+'22',color:stageMeta(selected.status).color}}>{stageMeta(selected.status).label}</span></Row>
                <Row k="Submitted">{new Date(selected.submittedAt).toLocaleString()}</Row>
                <Row k="Program">{selected.program}</Row>
                {selected.cufs_reg_no && <Row k="입학 접수번호">{selected.cufs_reg_no}</Row>}
                {selected.screen_note && <Row k="스크리닝 메모">{selected.screen_note}</Row>}
                {selected.amount > 0 && <Row k="결제">${selected.amount}.00 {selected.card_last4 ? '· •••• ' + selected.card_last4 : ''}</Row>}

                <h4 className="app-sec">Basic info</h4>
                <Row k="Date of birth">{selected.birthdate || '—'}</Row>
                <Row k="Phone">{selected.phone || '—'}</Row>
                <h4 className="app-sec">Academic</h4>
                <Row k="School">{selected.prior_school || '—'}</Row>
                <Row k="Major">{selected.prior_major || '—'}</Row>
                <Row k="GPA">{selected.prior_gpa || '—'}</Row>
                <Row k="Note">{selected.transcript_note || '—'}</Row>

                <h4 className="app-sec">Essay</h4>
                <Row k="Title">{selected.essay_title || '—'}</Row>
                <div className="essay-box">{selected.essay_body || '—'}</div>
                {selected.essay_title_2 && (<><Row k="Title 2">{selected.essay_title_2}</Row><div className="essay-box">{selected.essay_body_2 || '—'}</div></>)}

                <h4 className="app-sec">Recommenders</h4>
                <RecommendersView json={selected.recommenders_json} />

                <h4 className="app-sec">Attached files</h4>
                <AppFilesPanel applicationId={selected.id} />
              </div>

              <div className="app-modal-foot">
                <button className="icon-btn danger" onClick={() => deleteApp(selected.id)}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 모달 상단의 단계 전이 버튼 묶음. 현재 status에 맞는 액션만 보여준다.
  function AppStageActions({ app, stageMeta, acting, transition }) {
    const s = app.status;
    const TERMINAL = ['enrolled','screen_rejected','cancelled'];
    if (TERMINAL.includes(s)) {
      return <div style={{padding:'10px 14px',background:'var(--bg-muted)',borderRadius:10,marginBottom:12,fontSize:13,color:'var(--fg-secondary)'}}>완료/종료된 신청입니다 — 추가 단계 없음.</div>;
    }
    const btn = (label, color, fn) => (
      <button type="button" className="btn btn-primary btn-sm" disabled={acting}
        style={color ? {background:color,borderColor:color} : {}} onClick={fn}>{label}</button>
    );
    return (
      <div style={{padding:'14px 16px',background:'var(--state-info-bg)',borderRadius:10,marginBottom:14,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        <strong style={{fontSize:13,color:'var(--state-info)',marginRight:6}}>다음 처리:</strong>
        {s === 'submitted' && (<>
          {btn('1차 통과 →', '#248737', () => transition(app.id, 'screen', { decision: 'pass' }))}
          {btn('탈락', '#B91C1C', () => { const note = prompt('탈락 사유(선택, 학생에게 메일로 전달):') || ''; transition(app.id, 'screen', { decision: 'reject', note }); })}
        </>)}
        {s === 'screen_passed' && <span style={{fontSize:13,color:'var(--fg-secondary)'}}>학생의 입학 접수번호 입력 대기 중.</span>}
        {s === 'cufs_no_submitted' && btn('합격증 검증 → 합격 확인', '#6B2DBE', () => { if (confirm('합격증을 접수번호와 대조하셨나요? 확인 시 다음 단계로 진행됩니다.')) transition(app.id, 'verify-admission'); })}
        {s === 'cufs_admitted' && <span style={{fontSize:13,color:'var(--fg-secondary)'}}>학생의 서류 3종 제출 대기 중.</span>}
        {s === 'docs_submitted' && btn('서류 검증 → 결제 오픈', '#6B2DBE', () => { if (confirm('첨부 서류를 모두 검토하셨나요? 확인 시 학생에게 결제 단계가 열립니다.')) transition(app.id, 'verify-documents'); })}
        {s === 'docs_verified' && <span style={{fontSize:13,color:'var(--fg-secondary)'}}>학생의 등록금 결제 대기 중.</span>}
        {s === 'paid' && btn('등록 확정', '#248737', () => { if (confirm('최종 등록을 확정합니다.')) transition(app.id, 'enroll'); })}
        <span style={{flex:1}} />
        <button type="button" className="icon-btn danger" disabled={acting}
          onClick={() => { if (confirm('이 신청을 취소 처리할까요?')) transition(app.id, 'cancel'); }}>취소 처리</button>
      </div>
    );
  }

  // 추천인 JSON을 읽어 목록으로 렌더(복호화된 recommenders_json).
  function RecommendersView({ json }) {
    let list = [];
    try { list = json ? JSON.parse(json) : []; } catch {}
    if (!Array.isArray(list) || !list.length) return <div style={{color:'var(--fg-muted)',fontSize:13}}>없음 (선택 항목)</div>;
    return (
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {list.map((r, i) => (
          <div key={i} style={{padding:'8px 12px',background:'var(--bg-muted)',borderRadius:8,fontSize:13}}>
            <strong>{r.name || '—'}</strong>{(r.affiliation || r.member_country) ? ' · ' + (r.affiliation || r.member_country) : ''}
            <div style={{color:'var(--fg-muted)'}}>{r.email || ''}{r.phone ? ' · ' + r.phone : ''}</div>
          </div>
        ))}
      </div>
    );
  }

  // AppFilesPanel — fetches attached PDFs/images for an application and
  // renders one row per file with a download button. Self-contained (own
  // fetch + state) so the parent ApplicationsTab doesn't need to grow.
  function AppFilesPanel({ applicationId }) {
    const [items, setItems] = useState(null);   // null = loading
    useEffect(() => {
      if (!applicationId) { setItems([]); return; }
      const tok = adminToken();
      fetch('/api/admin/applications/' + encodeURIComponent(applicationId) + '/files', {
        headers: authHeaders(),
      }).then(r => r.ok ? r.json() : { items: [] })
        .then(d => setItems(d.items || []))
        .catch(() => setItems([]));
    }, [applicationId]);
    function download(file) {
      const tok = adminToken();
      fetch('/api/admin/application-files/' + file.id + '/download', { headers: authHeaders() })
        .then(r => r.ok ? r.blob() : null)
        .then(blob => {
          if (!blob) return alert('Download failed');
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = file.filename || 'file';
          a.click(); URL.revokeObjectURL(url);
        });
    }
    if (items === null) return <div style={{padding:'8px 0',color:'var(--fg-muted)',fontSize:13}}>불러오는 중…</div>;
    if (!items.length) return <div style={{padding:'8px 0',color:'var(--fg-muted)',fontSize:13,fontStyle:'italic'}}>첨부 파일이 없습니다.</div>;
    return (
      <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
        {items.map(f => {
          const kindLabel = {
            transcript: '학력증명서',
            transcript_graduation: '졸업(예정)증명서',
            transcript_recognition: '학력인정/아포스티유/영사확인',
            transcript_translation: '한글번역공증본',
            admission_certificate: '합격증',
            recommendation: `추천서 #${(f.recommender_idx ?? 0) + 1}`,
            portfolio: '포트폴리오', id_doc: '신분증',
          }[f.kind] || f.kind;
          return (
            <button key={f.id} type="button" onClick={() => download(f)}
              style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'var(--bg-elevated)',border:'1px solid var(--border-default)',borderRadius:8,cursor:'pointer',font:'inherit',color:'inherit',textAlign:'left'}}>
              <i data-lucide="paperclip" width="14" height="14" style={{color:'var(--fg-muted)'}} />
              <span className="pill" style={{background:'var(--bg-muted)',color:'var(--fg-secondary)',fontSize:11}}>{kindLabel}</span>
              <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13}}>{f.filename}</span>
              <span style={{fontSize:11,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>{f.mime}</span>
              <span style={{fontSize:11,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>{Math.round((f.size || 0)/1024)} KB</span>
              <span style={{color:'var(--brand-text)'}}>↓</span>
            </button>
          );
        })}
      </div>
    );
  }

  function Row({ k, children }) {
    return (
      <div className="app-row">
        <div className="app-k">{k}</div>
        <div className="app-v">{children}</div>
      </div>
    );
  }

  // ---- 2FA (TOTP) — Authenticator helpers ---------------------------------
  // v01.077 — Google Authenticator step-up for Members / StudentSupport.
  const adminLangNow = () => localStorage.getItem('dp_admin_lang') || 'ko';
  function qrDataUrl(text) {
    try {
      if (typeof qrcode !== 'function') return null;
      const qr = qrcode(0, 'M');   // 0 = auto type, 'M' = ~15% error correction
      qr.addData(text);
      qr.make();
      return qr.createDataURL(5, 8); // cellSize, margin
    } catch { return null; }
  }

  // Step-up challenge shown IN PLACE of a gated tab until a valid code unlocks
  // it (or the server reports an active step-up cookie). The server is the real
  // gate; this is the UX in front of it.
  function AdminStepUpGate({ lang, onUnlocked, goTab }) {
    const isKo = lang === 'ko';
    const [phase, setPhase] = useState('loading'); // loading | prompt | enroll_needed | error
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState('');

    useEffect(() => {
      let cancelled = false;
      fetch('/api/admin/totp/state', { headers: authHeaders(), credentials: 'same-origin' })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (cancelled) return;
          if (!d) { setPhase('error'); return; }
          if (d.stepup_active) { onUnlocked(); return; }
          setPhase(d.enrolled ? 'prompt' : 'enroll_needed');
        })
        .catch(() => { if (!cancelled) setPhase('error'); });
      return () => { cancelled = true; };
    }, []);

    async function submit(e) {
      if (e) e.preventDefault();
      const c = code.replace(/\D/g, '');
      if (c.length !== 6) { setErr(isKo ? '6자리 코드를 입력하세요.' : 'Enter the 6-digit code.'); return; }
      setBusy(true); setErr('');
      try {
        const r = await fetch('/api/admin/totp/verify', {
          method: 'POST',
          headers: authHeaders({ 'content-type': 'application/json' }),
          credentials: 'same-origin',
          body: JSON.stringify({ code: c }),
        });
        if (r.ok) { onUnlocked(); return; }
        if (r.status === 429) setErr(isKo ? '시도가 너무 많습니다. 잠시 후 다시 시도하세요.' : 'Too many attempts. Try again shortly.');
        else setErr(isKo ? '코드가 올바르지 않습니다.' : 'Invalid code.');
      } catch { setErr(isKo ? '네트워크 오류가 발생했습니다.' : 'Network error.'); }
      finally { setBusy(false); setCode(''); }
    }

    const wrap = { maxWidth: 440, margin: '40px auto', textAlign: 'center' };
    if (phase === 'loading') {
      return <div className="card" style={wrap}><p style={{ color: 'var(--fg-muted)' }}>{isKo ? '확인 중…' : 'Checking…'}</p></div>;
    }
    if (phase === 'error') {
      return <div className="card" style={wrap}><p style={{ color: 'var(--state-danger)' }}>{isKo ? '인증 상태를 불러오지 못했습니다.' : 'Could not load 2FA status.'}</p></div>;
    }
    if (phase === 'enroll_needed') {
      return (
        <div className="card" style={wrap}>
          <div style={{ marginBottom: 8 }}><i data-lucide="lock" width="30" height="30" /></div>
          <h3 style={{ margin: '0 0 8px' }}>{isKo ? '2단계 인증이 필요합니다' : 'Two-factor required'}</h3>
          <p style={{ color: 'var(--fg-secondary)', fontSize: 14 }}>
            {isKo
              ? '회원 정보·학생 지원 탭은 가장 민감한 개인정보를 다룹니다. 먼저 Google Authenticator를 등록해야 접근할 수 있습니다.'
              : 'The Member and Student-support tabs hold the most sensitive PII. Enroll Google Authenticator first to access them.'}
          </p>
          <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => goTab('two_factor')}>
            {isKo ? '2단계 인증 설정으로 이동' : 'Go to 2FA setup'}
          </button>
        </div>
      );
    }
    // phase === 'prompt'
    return (
      <div className="card" style={wrap}>
        <div style={{ marginBottom: 8 }}><i data-lucide="shield-check" width="30" height="30" /></div>
        <h3 style={{ margin: '0 0 4px' }}>{isKo ? '인증 코드 입력' : 'Enter your code'}</h3>
        <p style={{ color: 'var(--fg-secondary)', fontSize: 14, margin: '0 0 16px' }}>
          {isKo ? 'Google Authenticator 앱의 6자리 코드를 입력하세요.' : 'Enter the 6-digit code from Google Authenticator.'}
        </p>
        <form onSubmit={submit}>
          <input
            autoFocus inputMode="numeric" pattern="[0-9]*" maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            style={{ width: 180, textAlign: 'center', fontSize: 28, letterSpacing: '0.3em', padding: '10px 8px',
                     border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--fg-primary)' }}
          />
          {err && <div style={{ color: 'var(--state-danger)', fontSize: 13, marginTop: 10 }}>{err}</div>}
          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? (isKo ? '확인 중…' : 'Verifying…') : (isKo ? '확인' : 'Verify')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Setup / management tab (Setup → 2단계 인증). Enrollment is pending→confirmed:
  // a fresh secret is only activated once the operator proves they can generate
  // a valid code, so a mis-scanned key never locks them out.
  function TwoFactorTab() {
    const isKo = adminLangNow() === 'ko';
    const [st, setSt] = useState(null);            // /state response
    const [setup, setSetup] = useState(null);      // { secret_base32, otpauth_uri }
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');

    async function loadState() {
      try {
        const r = await fetch('/api/admin/totp/state', { headers: authHeaders(), credentials: 'same-origin' });
        setSt(r.ok ? await r.json() : { error: true });
      } catch { setSt({ error: true }); }
    }
    useEffect(() => { loadState(); }, []);

    async function startSetup() {
      setBusy(true); setErr(''); setMsg('');
      try {
        const r = await fetch('/api/admin/totp/setup', {
          method: 'POST', headers: authHeaders({ 'content-type': 'application/json' }), credentials: 'same-origin',
          body: '{}',
        });
        const d = await r.json().catch(() => null);
        if (r.ok && d) setSetup(d);
        else if (d && d.error === 'encryption_unavailable') setErr(isKo ? '서버에 암호화 키(PII_ENCRYPTION_KEY)가 설정되어 있지 않아 등록할 수 없습니다.' : 'Server encryption key (PII_ENCRYPTION_KEY) is not configured.');
        else setErr(isKo ? '설정을 시작하지 못했습니다.' : 'Could not start setup.');
      } catch { setErr(isKo ? '네트워크 오류' : 'Network error'); }
      finally { setBusy(false); }
    }

    async function confirm() {
      const c = code.replace(/\D/g, '');
      if (c.length !== 6) { setErr(isKo ? '6자리 코드를 입력하세요.' : 'Enter the 6-digit code.'); return; }
      setBusy(true); setErr(''); setMsg('');
      try {
        const r = await fetch('/api/admin/totp/confirm', {
          method: 'POST', headers: authHeaders({ 'content-type': 'application/json' }), credentials: 'same-origin',
          body: JSON.stringify({ code: c }),
        });
        if (r.ok) { setSetup(null); setCode(''); setMsg(isKo ? '등록이 완료되었습니다.' : 'Enrollment complete.'); await loadState(); }
        else if (r.status === 429) setErr(isKo ? '시도가 너무 많습니다.' : 'Too many attempts.');
        else setErr(isKo ? '코드가 올바르지 않습니다. 앱의 코드와 기기 시간을 확인하세요.' : 'Invalid code. Check the app code and device time.');
      } catch { setErr(isKo ? '네트워크 오류' : 'Network error'); }
      finally { setBusy(false); }
    }

    async function disable() {
      const c = code.replace(/\D/g, '');
      if (c.length !== 6) { setErr(isKo ? '해제하려면 현재 6자리 코드를 입력하세요.' : 'Enter the current 6-digit code to disable.'); return; }
      if (!confirmDialog(isKo ? '2단계 인증을 해제하시겠습니까? 회원/학생지원 탭이 코드 없이 열립니다.' : 'Disable 2FA? Member/Student tabs will open without a code.')) return;
      setBusy(true); setErr(''); setMsg('');
      try {
        const r = await fetch('/api/admin/totp/disable', {
          method: 'POST', headers: authHeaders({ 'content-type': 'application/json' }), credentials: 'same-origin',
          body: JSON.stringify({ code: c }),
        });
        if (r.ok) { setCode(''); setMsg(isKo ? '2단계 인증이 해제되었습니다.' : '2FA disabled.'); await loadState(); }
        else setErr(isKo ? '코드가 올바르지 않습니다.' : 'Invalid code.');
      } catch { setErr(isKo ? '네트워크 오류' : 'Network error'); }
      finally { setBusy(false); }
    }
    function confirmDialog(m) { return window.confirm(m); }

    const enrolled = st && st.enrolled;
    const dataUrl = setup ? qrDataUrl(setup.otpauth_uri) : null;

    return (
      <div>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{ marginTop: 0 }}>{isKo ? '2단계 인증 (Google Authenticator)' : 'Two-factor (Google Authenticator)'}</h3></summary>
          <p style={{ color: 'var(--fg-secondary)', fontSize: 14 }}>
            {isKo
              ? '여기서 등록하는 2단계 인증은 지금 로그인한 본인 계정에만 적용됩니다. 회원 정보·학생 지원 탭 접근 시 본인 Authenticator의 6자리 코드를 추가로 요구하며, 한 번 인증하면 15분간 유지됩니다.'
              : 'The 2FA you set up here applies only to your own logged-in account. The Member and Student-support tabs require a 6-digit code from your Authenticator; one verification lasts 15 minutes.'}
          </p>
          {st && !st.error && st.account && (
            <p style={{ color: 'var(--fg-muted)', fontSize: 13, margin: '0 0 10px' }}>
              {isKo ? '계정: ' : 'Account: '}<strong style={{ color: 'var(--fg-secondary)' }}>{st.account}</strong>
            </p>
          )}
          {st == null && <p style={{ color: 'var(--fg-muted)' }}>{isKo ? '불러오는 중…' : 'Loading…'}</p>}
          {st && !st.error && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999,
                          background: enrolled ? 'var(--state-success-bg, var(--bg-muted))' : 'var(--bg-muted)',
                          color: enrolled ? 'var(--state-success)' : 'var(--fg-secondary)', fontSize: 13, fontWeight: 600 }}>
              {enrolled ? (isKo ? '● 등록됨 (활성)' : '● Enrolled (active)') : (isKo ? '○ 미등록' : '○ Not enrolled')}
            </div>
          )}
          {msg && <div style={{ color: 'var(--state-success)', fontSize: 13, marginTop: 12 }}>{msg}</div>}
          {err && <div style={{ color: 'var(--state-danger)', fontSize: 13, marginTop: 12 }}>{err}</div>}
        </details>

        {/* Enroll flow */}
        {!enrolled && !setup && (
          <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{ marginTop: 0 }}>{isKo ? '등록' : 'Enroll'}</h3></summary>
            <p style={{ color: 'var(--fg-secondary)', fontSize: 14 }}>
              {isKo ? '아래 버튼을 누르면 비밀키와 QR이 생성됩니다. Google Authenticator로 스캔한 뒤 첫 코드를 입력해 등록을 완료하세요.'
                    : 'Generate a secret + QR, scan it with Google Authenticator, then enter the first code to finish.'}
            </p>
            <button type="button" className="btn btn-primary" onClick={startSetup} disabled={busy}>
              {busy ? '…' : (isKo ? '설정 시작' : 'Start setup')}
            </button>
          </details>
        )}

        {setup && (
          <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{ marginTop: 0 }}>{isKo ? 'Authenticator에 추가' : 'Add to Authenticator'}</h3></summary>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
              <div style={{ textAlign: 'center' }}>
                {dataUrl
                  ? <img src={dataUrl} alt="TOTP QR" width={180} height={180} style={{ borderRadius: 8, background: '#fff', padding: 8 }} />
                  : <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  border: '1px dashed var(--border-subtle)', borderRadius: 8, color: 'var(--fg-muted)', fontSize: 12 }}>
                      {isKo ? 'QR 생성 실패 — 아래 키를 수동 입력' : 'QR failed — use manual key'}
                    </div>}
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                  {isKo ? '수동 입력 키' : 'Manual key'}
                </div>
                <code style={{ display: 'block', wordBreak: 'break-all', background: 'var(--bg-muted)', padding: '8px 10px',
                               borderRadius: 6, margin: '6px 0 16px', fontSize: 14, color: 'var(--fg-primary)' }}>{setup.secret_base32}</code>
                <label style={{ fontSize: 13, color: 'var(--fg-secondary)' }}>{isKo ? '첫 코드 입력' : 'Enter first code'}</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input inputMode="numeric" maxLength={6} value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    style={{ width: 140, textAlign: 'center', fontSize: 20, letterSpacing: '0.2em', padding: '8px',
                             border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--fg-primary)' }} />
                  <button type="button" className="btn btn-primary" onClick={confirm} disabled={busy}>
                    {isKo ? '등록 완료' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          </details>
        )}

        {/* Manage when enrolled */}
        {enrolled && (
          <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{ marginTop: 0 }}>{isKo ? '관리' : 'Manage'}</h3></summary>
            <p style={{ color: 'var(--fg-secondary)', fontSize: 14 }}>
              {isKo ? '기기를 바꾸려면 재설정하거나, 현재 코드로 2단계 인증을 해제할 수 있습니다.'
                    : 'Re-enroll on a new device, or disable 2FA with your current code.'}
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input inputMode="numeric" maxLength={6} value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                style={{ width: 120, textAlign: 'center', fontSize: 18, letterSpacing: '0.2em', padding: '8px',
                         border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--fg-primary)' }} />
              <button type="button" className="btn btn-secondary" onClick={startSetup} disabled={busy}>
                {isKo ? '재설정' : 'Re-enroll'}
              </button>
              <button type="button" className="btn btn-outline" onClick={disable} disabled={busy} style={{ color: 'var(--state-danger)', borderColor: 'var(--state-danger)' }}>
                {isKo ? '해제' : 'Disable'}
              </button>
            </div>
          </details>
        )}
      </div>
    );
  }

  // ---- Main admin shell ----------------------------------------------------
  // Idle session timeout — 30 min of inactivity logs the operator out.
  // "Activity" now means actual user actions (mousedown/keydown/touchstart),
  // not bare mouse-move; passing the cursor over the screen no longer keeps
  // the session alive. To extend on demand, the "+30분 연장" button next to
  // the sidebar IDLE clock becomes enabled when ≤ 10 min remain — pressing
  // it adds a fresh 30 min back. (Always-on auto-extend felt unsafe.)
  const ADMIN_IDLE_MS = 30 * 60 * 1000;
  const ADMIN_IDLE_WARN_MS = 60 * 1000;
  const ADMIN_IDLE_EXTEND_AT_MS = 10 * 60 * 1000;   // extend button enables at ≤ 10:00
  function Admin({ onLogout }) {
    const [content, setContent] = useState(() => window.DreamPathContent.load());
    const lastActivityRef = useRef(Date.now());
    const [idleRemaining, setIdleRemaining] = useState(ADMIN_IDLE_MS / 1000);
    const idleSecondsLeft = idleRemaining <= ADMIN_IDLE_WARN_MS / 1000 ? idleRemaining : null;
    const canExtend = idleRemaining <= ADMIN_IDLE_EXTEND_AT_MS / 1000;
    useEffect(() => {
      // Action events only — mousemove deliberately excluded so an unattended
      // laptop with the cursor jiggling (touchpad noise, screen savers, etc.)
      // doesn't keep the session alive forever.
      const bump = () => { lastActivityRef.current = Date.now(); };
      const evts = ['mousedown', 'keydown', 'touchstart'];
      evts.forEach(e => window.addEventListener(e, bump, { passive: true }));
      const id = setInterval(() => {
        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= ADMIN_IDLE_MS) {
          localStorage.removeItem('dp_admin_token');
          // v01.079.03 — idle timeout also clears the 2FA step-up so Members /
          // Student access requires the Authenticator code again on return.
          try { fetch('/api/admin/totp/lock', { method: 'POST', credentials: 'same-origin', keepalive: true }); } catch {}
          try { sessionStorage.setItem('dp_admin_idle_logout', '1'); } catch {}
          window.location.reload();
          return;
        }
        setIdleRemaining(Math.max(0, Math.ceil((ADMIN_IDLE_MS - elapsed) / 1000)));
      }, 1000);
      return () => { clearInterval(id); evts.forEach(e => window.removeEventListener(e, bump)); };
    }, []);
    function extendIdle() {
      // +30 min from now. Equivalent to a fresh load. Operator-initiated only.
      lastActivityRef.current = Date.now();
      setIdleRemaining(ADMIN_IDLE_MS / 1000);
    }
    function formatIdleClock(s) {
      const m = Math.floor(s / 60);
      const r = s % 60;
      return m + ':' + (r < 10 ? '0' + r : r);
    }
    // TABS is rebuilt whenever the inbox roster changes (admin can add/remove
    // managed inboxes via the API · 통합 tab). Each managed inbox renders as
    // its own sub-tab in the Mail group.
    const TABS = useMemo(() => buildTabs(content), [JSON.stringify((content?.inboxes || []).map(b => b && b.address + ':' + (b.enabled !== false)))]);
    // Legacy tab ids ("mailbox", or removed tabs) get reset to dashboard
    // so the operator never lands on a blank screen after an upgrade.
    const [tab, setTab] = useState(() => {
      const stored = localStorage.getItem('dp_admin_tab') || 'dashboard';
      return stored === 'mailbox' ? 'dashboard' : stored;
    });
    useEffect(() => {
      if (!TABS.find(tt => tt.id === tab)) setTab('dashboard');
    }, [TABS, tab]);
    // Anomaly counters (for sidebar badges). Only populated by signals worth
    // a badge — currently per-account inbox unread + total. Polled every 60s
    // so the badge is reasonably fresh without spamming the API.
    const [anomalies, setAnomalies] = useState({ mailUnread: {}, mailUnreadTotal: 0 });
    useEffect(() => {
      const tok = adminToken();
      if (!tok) return;
      let cancelled = false;
      function refresh() {
        fetch('/api/admin/mail/unread-by-account', { headers: authHeaders() })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d && !cancelled) setAnomalies({ mailUnread: d.by_account || {}, mailUnreadTotal: d.total || 0 }); })
          .catch(() => {});
      }
      refresh();
      const id = setInterval(refresh, 60000);
      // MailboxTab fires this whenever it reads / trashes / un-spams a mail,
      // so the badge follows the operator's action instead of the poll clock.
      window.addEventListener('dp-mail-counters-changed', refresh);
      return () => {
        cancelled = true;
        clearInterval(id);
        window.removeEventListener('dp-mail-counters-changed', refresh);
      };
    }, [tab]);  // refresh when tab changes (cheap signal that user just acted on a mail)
    const [adminLang, setAdminLang] = useState(() => localStorage.getItem('dp_admin_lang') || 'ko');
    const t = I18N[adminLang] || I18N.en;

    // v01.077 — TOTP step-up: Members / StudentSupport groups require a fresh
    // Authenticator code. `stepupOk` is the in-session unlock flag; the server
    // is the real gate (403 stepup_required). We auto-expire the flag after the
    // cookie's 15-min TTL so the gate re-challenges exactly when the cookie dies.
    const [stepupOk, setStepupOk] = useState(false);
    const stepupTimer = useRef(null);
    const unlockStepup = () => {
      setStepupOk(true);
      if (stepupTimer.current) clearTimeout(stepupTimer.current);
      // Re-lock when the step-up cookie's window elapses (matches server TTL /
      // the idle window). Idle logout + IP change also invalidate it server-side.
      stepupTimer.current = setTimeout(() => setStepupOk(false), ADMIN_IDLE_MS);
    };
    useEffect(() => { localStorage.setItem('dp_admin_lang', adminLang); }, [adminLang]);
    // Theme toggle (light / dark / system) — synced with the global store
    // so changing it here flips the public site too on the same device.
    const [themeChoice, setThemeChoice] = useState(() => (window.DreamPathTheme && window.DreamPathTheme.choice) || 'system');
    useEffect(() => {
      if (!window.DreamPathTheme) return;
      const unsub = window.DreamPathTheme.subscribe(() => setThemeChoice(window.DreamPathTheme.choice));
      return () => unsub();
    }, []);
    const [savedState, setSavedState] = useState('idle'); // idle | saving | saved | error
    const [saveError, setSaveError] = useState('');
    const savedTimer = useRef(null);
    const dirtyRef = useRef(false);
    const debounceTimer = useRef(null);
    // Tracks whether the active EditorWithPreview wrapper has unsaved draft
    // edits. Used by setTabSafe / selectGroupSafe to confirm before navigating.
    const editorDirtyRef = useRef(false);

    useEffect(() => { localStorage.setItem('dp_admin_tab', tab); }, [tab]);

    // Guard against losing unsaved draft edits when the user closes the tab
    // or refreshes mid-edit. Modern browsers ignore the message but show a
    // generic "Leave site?" prompt as long as preventDefault() is called.
    useEffect(() => {
      function onBeforeUnload(e) {
        if (editorDirtyRef.current) { e.preventDefault(); e.returnValue = ''; }
      }
      window.addEventListener('beforeunload', onBeforeUnload);
      return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, []);

    // Wrap setTab so we confirm before navigating away from a dirty draft.
    const setTabSafe = (next) => {
      if (next === tab) return;
      if (editorDirtyRef.current) {
        if (!confirm('You have unsaved changes on this tab. Discard them and switch?')) return;
        editorDirtyRef.current = false;
      }
      setTab(next);
    };

    // Pull latest content from server on mount (overwrites local cache)
    useEffect(() => {
      (async () => {
        const remote = await window.DreamPathContent.fetchRemote();
        if (remote && Object.keys(remote).length) {
          setContent(window.DreamPathContent.load());
        }
      })();
    }, []);

    // Auto-save (debounced) — only after user has actually edited
    useEffect(() => {
      if (!dirtyRef.current) return;
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        setSavedState('saving');
        setSaveError('');
        try {
          await window.DreamPathContent.save(content);
          setSavedState('saved');
          clearTimeout(savedTimer.current);
          savedTimer.current = setTimeout(() => setSavedState('idle'), 1500);
        } catch (e) {
          setSavedState('error');
          setSaveError(e.message === 'unauthorized' ? 'Session expired — please re-login.' : ('Save failed: ' + e.message));
          if (e.message === 'unauthorized') onLogout && onLogout();
        }
      }, 600);
      return () => clearTimeout(debounceTimer.current);
    }, [content]);

    useEffect(() => { window.lucide && window.lucide.createIcons(); });

    const markDirty = () => { dirtyRef.current = true; };
    const set = (pathArr, val) => { markDirty(); setContent(prev => setDeep(prev, pathArr, val)); };
    const addItem = (pathArr, item) => { markDirty(); setContent(prev => {
      const arr = pathArr.reduce((a,k) => a[k], prev) || [];
      return setDeep(prev, pathArr, [...arr, item]);
    }); };
    const removeItem = (pathArr, i) => { markDirty(); setContent(prev => {
      const arr = pathArr.reduce((a,k) => a[k], prev) || [];
      return setDeep(prev, pathArr, arr.filter((_,idx) => idx !== i));
    }); };

    async function onReset() {
      if (!confirm('Reset all content to defaults? This will clear server-side overrides.')) return;
      try {
        await window.DreamPathContent.reset();
        setContent(window.DreamPathContent.load());
        dirtyRef.current = false;
      } catch (e) {
        alert('Reset failed: ' + e.message);
      }
    }
    function onExport() {
      const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'dreampath-content.json'; a.click();
      URL.revokeObjectURL(url);
    }

    // Static dispatch table for fixed tab ids. Dynamic ids (mailbox:<addr>)
    // are routed below to MailboxTab with an account prop.
    const STATIC_TAB_COMP = {
      dashboard: DashboardTab,
      brand: BrandTab, footer: FooterTab, icons: IconsTab, notice: NoticeTab,
      og_images: OgImagesTab,
      email_templates: EmailTemplatesTab,
      receipt_template: ReceiptTemplateTab,
      integrations: IntegrationsTab,
      hero: HeroTab, how: HowTab, cta: CtaTab, banners: BannersTab,
      about: AboutTab, team: TeamAdminTab, menu_names: MenuNamesTab,
      apply: ApplyHeroTab, apply_done: ApplyDoneTab, mypage: MyPageHeroTab, scholarships: ScholarshipsTab,
      errors_copy: ErrorsCopyTab,
      programs: ProgramsTab, program_detail: ProgramDetailTab,
      partners: PartnersTab, stories: StoriesTab, news: NewsTab, faq: FaqTab,
      essays: EssaysTab,
      translations: TranslationsTab,
      design_system: DesignSystemTab, error_preview: ErrorPreviewTab,
      wiki_kms: KmsTab, wiki_color: ColorGuideTab, wiki_logo: LogoGuideTab, wiki_design: DesignGuideTab, wiki_versions: VersionsTab,
      analytics: AnalyticsTab, inquiries: InquiriesTab,
      error_logs: ErrorLogsTab, consent_log: ConsentLogTab,
      legal: LegalTab, api_dir: ApiDirectoryTab,
      apps: ApplicationsTab,
      members: MembersTab, member_roles: MemberRolesTab,
      send_notification: SendNotificationTab,
      notification_history: NotificationCampaignsTab,
      member_groups: MemberGroupsTab,
      inquiry_categories: InquiryCategoriesTab,
      two_factor: TwoFactorTab,
    };
    const tabAccount = tab.startsWith('mailbox:') ? tab.slice('mailbox:'.length) : null;
    const TabComp = tabAccount ? MailboxTab : STATIC_TAB_COMP[tab];

    const activeTab = TABS.find(tt => tt.id === tab);
    // Dynamic mailbox tabs use the account address (or label_ko/en) as label.
    const activeLabel = activeTab
      ? (activeTab.label || t.tab[activeTab.id] || activeTab.id)
      : '';
    const activeGroup = activeTab ? (t.group[activeTab.group] || activeTab.group) : '';
    const saveLabel = savedState === 'saving' ? t.save.saving
                    : savedState === 'saved' ? t.save.saved
                    : savedState === 'error' ? t.save.error
                    : t.save.idle;

    // Build group list in TABS-defined order; current group is derived from
    // the active tab so navigating sub-tabs keeps the sidebar in sync.
    const groups = [];
    const seenGroup = new Set();
    TABS.forEach(tt => { if (!seenGroup.has(tt.group)) { groups.push(tt.group); seenGroup.add(tt.group); } });
    const activeGroupId = activeTab?.group || groups[0];
    const groupTabs = TABS.filter(tt => tt.group === activeGroupId);

    // Manually-expanded groups (operator clicked the group header to peek
    // without navigating). Stored as a Set in localStorage. The active group
    // is ALWAYS rendered expanded regardless of this set so the current tab
    // stays in context. Default state is empty → only the active group is
    // open, every other group is collapsed → much shorter sidebar.
    const [expandedGroups, setExpandedGroups] = useState(() => {
      try { return new Set(JSON.parse(localStorage.getItem('dp_admin_expanded_groups') || '[]')); }
      catch { return new Set(); }
    });
    useEffect(() => {
      try { localStorage.setItem('dp_admin_expanded_groups', JSON.stringify([...expandedGroups])); } catch {}
    }, [expandedGroups]);

    function toggleGroup(g) {
      setExpandedGroups(prev => {
        const next = new Set(prev);
        if (next.has(g)) next.delete(g); else next.add(g);
        return next;
      });
    }
    function selectGroup(g) {
      // Sticky sub-tab memory per group: returning to a group restores the
      // last sub-tab the user was on. Otherwise jump to the group's first tab.
      const memKey = 'dp_admin_subtab__' + g;
      const remembered = localStorage.getItem(memKey);
      const groupTabIds = TABS.filter(tt => tt.group === g).map(tt => tt.id);
      const next = remembered && groupTabIds.includes(remembered) ? remembered : groupTabIds[0];
      if (next) setTabSafe(next);
    }
    useEffect(() => {
      // Remember the active sub-tab for the active group.
      if (activeTab) localStorage.setItem('dp_admin_subtab__' + activeTab.group, activeTab.id);
    }, [tab]);

    const version = window.DREAMPATH_VERSION || '00.000.00';

    return (
      <div className="admin">
        {/* Idle-timeout warning toast — appears in the last 60 s before the
            session expires. Any activity dismisses it (handled by the bump
            handler above clearing idleSecondsLeft). The "지금 연장" button
            is just a focusable target that triggers a click event. */}
        {idleSecondsLeft != null && (
          <div role="alert" aria-live="assertive"
            style={{position:'fixed',top:16,right:16,zIndex:9999,minWidth:280,padding:'14px 18px',background:'var(--state-warning-bg)',color:'var(--state-warning)',border:'1px solid var(--state-warning)',borderRadius:12,boxShadow:'0 12px 32px rgba(0,0,0,0.18)',display:'flex',alignItems:'center',gap:14}}>
            <i data-lucide="clock" width="20" height="20" />
            <div style={{flex:1,fontSize:13,lineHeight:1.45}}>
              <strong>{idleSecondsLeft}초 후 자동 로그아웃</strong>
              <div style={{opacity:0.85,fontSize:12,marginTop:2}}>30분 동안 활동이 없습니다.</div>
            </div>
            <button type="button" onClick={extendIdle}
              style={{padding:'6px 12px',background:'var(--state-warning)',color:'#fff',border:'none',borderRadius:6,fontWeight:700,cursor:'pointer',fontSize:12}}>
              +30분 연장
            </button>
          </div>
        )}
        <aside className="side" aria-label="Admin navigation">
          <div className="brand">
            <img src="/assets/logo-dreampath-mark-mono-light.svg" alt="" />
            <div>
              <div className="wm">KoreaDream<span className="pt">Path</span></div>
              <div className="sub">{t.console}</div>
            </div>
          </div>
          <div className="ver-pill" title="Site version (AA.bbb.cc)">
            <span className="ver-label">VERSION</span>
            <span className="ver-num">{version}</span>
          </div>
          {/* Idle timer — counts down to the 30 min auto-logout. Goes red in
              the last 60 s (same threshold that triggers the warning toast).
              "+30 연장" button is disabled until ≤10:00 remain — keeps the
              extend gesture meaningful (you wouldn't extend a session that
              still has 25 min). */}
          <div title="활동이 없을 때 남은 시간 (마우스 움직임은 카운트되지 않음)"
            style={{
              margin: '6px 12px 6px',
              padding: '6px 10px',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 8,
              background: idleSecondsLeft != null ? 'rgba(255, 117, 112, 0.18)' : 'rgba(255,255,255,0.05)',
              border: idleSecondsLeft != null ? '1px solid var(--state-danger)' : '1px solid rgba(255,255,255,0.10)',
              color: idleSecondsLeft != null ? 'var(--state-danger)' : 'rgba(255,255,255,0.55)',
            }}>
            <i data-lucide="clock" width="12" height="12" style={{flexShrink:0}} />
            <span style={{fontSize:9,fontWeight:700,letterSpacing:'0.10em',textTransform:'uppercase',opacity:0.80}}>IDLE</span>
            <span style={{flex:1,textAlign:'right',fontSize:12,fontFamily:'var(--font-mono, monospace)',fontWeight:700,letterSpacing:'0.04em'}}>
              {formatIdleClock(idleRemaining)}
            </span>
          </div>
          <button type="button" onClick={extendIdle} disabled={!canExtend}
            title={canExtend ? '세션을 30분 연장' : '10분 이하 남았을 때 활성화'}
            style={{
              margin: '0 12px 14px',
              padding: '6px 10px',
              border: 'none',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              cursor: canExtend ? 'pointer' : 'not-allowed',
              background: canExtend ? '#FFC93E' : 'rgba(255,255,255,0.06)',
              color: canExtend ? '#1E1654' : 'rgba(255,255,255,0.32)',
              transition: 'background 140ms',
            }}>
            +30분 연장
          </button>
          {/* Real-time global search — debounces by 300ms and hits
              /api/admin/search across users / applications / inquiries /
              emails / wiki / content. Result panel floats over the
              sidebar so it doesn't push the nav. */}
          <GlobalSearch />
          <nav className="groups" aria-label="Admin groups">
            {groups.map(g => {
              const active = g === activeGroupId;
              const childTabs = TABS.filter(tt => tt.group === g);
              const icon = GROUP_ICONS[g] || 'circle';
              const open = active || expandedGroups.has(g);
              // Anomaly badge — only shown when the group has a real signal
              // worth surfacing in the sidebar (default: nothing, keeps the
              // sidebar quiet). Currently wired: Mail (unread).
              //
              // v01.094.01: count only the accounts that actually have a
              // sub-tab, and look them up case-insensitively (the API keys are
              // lowercased; c.inboxes addresses are typed by hand). The raw
              // API total also includes catch-all mail addressed to accounts
              // with no tab — folding that in made the group badge disagree
              // with the sub-badges underneath it and pointed at mail the
              // operator has no way to open.
              const unreadFor = (addr) => anomalies.mailUnread[String(addr || '').toLowerCase()] || 0;
              const managedUnread = g === 'Mail'
                ? childTabs.reduce((n, tt) => n + unreadFor(tt.account), 0)
                : 0;
              const strayUnread = g === 'Mail'
                ? Math.max(0, (anomalies.mailUnreadTotal || 0) - managedUnread)
                : 0;
              const groupBadge = managedUnread > 0 ? managedUnread : null;
              return (
                <div className="grp" key={g}>
                  <div className={'group-row' + (active ? ' active' : '')}>
                    <button type="button"
                      className={'group' + (active ? ' active' : '')}
                      onClick={() => selectGroup(g)}
                      aria-current={active ? 'page' : undefined}>
                      <i data-lucide={icon} className="gicon" />
                      <span className="glabel">{t.group[g] || g}</span>
                      {groupBadge != null && <span className="gcount alert">{groupBadge}</span>}
                      {strayUnread > 0 && (
                        <span className="gcount"
                          title={'관리 대상이 아닌 주소로 온 안 읽은 메일 ' + strayUnread + '건 (열 수 있는 탭 없음). 사이트 설정 → 메일 주소에 추가하면 탭이 생깁니다.'}>
                          +{strayUnread}
                        </span>
                      )}
                    </button>
                    {!active && childTabs.length > 1 && (
                      <button type="button"
                        className={'group-caret' + (open ? ' open' : '')}
                        onClick={(e) => { e.stopPropagation(); toggleGroup(g); }}
                        aria-expanded={open ? 'true' : 'false'}
                        aria-label={(t.group[g] || g) + (open ? ' collapse' : ' expand')}
                        title={open ? 'Collapse' : 'Expand'}>
                        <i data-lucide="chevron-down" />
                      </button>
                    )}
                  </div>
                  {open && childTabs.length > 1 && (
                    <div className="subnav" role="group" aria-label={`${t.group[g] || g} sub-tabs`}>
                      {childTabs.map(tt => {
                        const subBadge = tt.account && unreadFor(tt.account) > 0
                          ? unreadFor(tt.account)
                          : null;
                        const label = tt.label || t.tab[tt.id] || tt.id;
                        return (
                          <button key={tt.id} type="button"
                            className={'subtab-side' + (tab === tt.id ? ' active' : '')}
                            onClick={() => setTabSafe(tt.id)}
                            aria-current={tab === tt.id ? 'page' : undefined}>
                            <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</span>
                            {subBadge != null && (
                              <span style={{marginLeft:'auto',padding:'1px 7px',borderRadius:10,background:'var(--state-danger)',color:'#fff',fontSize:10,fontWeight:700,fontFamily:'var(--font-mono)'}}>{subBadge}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="actions">
            <button type="button" className="danger" onClick={onReset}>{t.action.reset}</button>
            <button type="button" onClick={onLogout}>{t.action.logout}</button>
          </div>
        </aside>
        <div id="main" className="main" tabIndex="-1">
          <div className="topbar">
            <div className="crumbs">
              <span>{activeGroup}</span>
              <span className="sep">/</span>
              <strong>{activeLabel}</strong>
            </div>
            <div className="meta">
              <a className="topact primary" href="/" target="_blank" rel="noopener">{t.action.open_site}</a>
              <button type="button" className="topact" onClick={onExport}>{t.action.export}</button>
              <div className="theme-toggle" role="group" aria-label="Theme">
                <button type="button" className={themeChoice === 'light' ? 'on' : ''} onClick={() => window.DreamPathTheme && window.DreamPathTheme.set('light')} aria-pressed={themeChoice === 'light'} title="Light mode">
                  <i data-lucide="sun" width="13" height="13" strokeWidth="2" aria-hidden="true"></i>
                </button>
                <button type="button" className={themeChoice === 'system' ? 'on' : ''} onClick={() => window.DreamPathTheme && window.DreamPathTheme.set('system')} aria-pressed={themeChoice === 'system'} title="Match system">
                  <i data-lucide="monitor" width="13" height="13" strokeWidth="2" aria-hidden="true"></i>
                </button>
                <button type="button" className={themeChoice === 'dark' ? 'on' : ''} onClick={() => window.DreamPathTheme && window.DreamPathTheme.set('dark')} aria-pressed={themeChoice === 'dark'} title="Dark mode">
                  <i data-lucide="moon" width="13" height="13" strokeWidth="2" aria-hidden="true"></i>
                </button>
              </div>
              <div className="adminlang" role="group" aria-label="Admin language">
                <button type="button" className={adminLang === 'ko' ? 'on' : ''} onClick={() => setAdminLang('ko')} aria-pressed={adminLang === 'ko'}>KO</button>
                <span aria-hidden="true">·</span>
                <button type="button" className={adminLang === 'en' ? 'on' : ''} onClick={() => setAdminLang('en')} aria-pressed={adminLang === 'en'}>EN</button>
              </div>
              <div className={'savebadge ' + savedState}>
                <span className="dot" />
                {saveLabel}
              </div>
            </div>
          </div>
          {groupTabs.length > 1 && (
            <nav className="subtabs" aria-label="Section tabs">
              {groupTabs.map(tt => (
                <button key={tt.id} type="button"
                  className={'subtab' + (tab === tt.id ? ' active' : '')}
                  onClick={() => setTabSafe(tt.id)}
                  aria-current={tab === tt.id ? 'page' : undefined}>
                  {t.tab[tt.id] || tt.id}
                </button>
              ))}
            </nav>
          )}
          <div className="main-inner">
            <div className="page-head">
              <div>
                <h1>{activeLabel}</h1>
                <p className="lede">{t.lede}</p>
              </div>
            </div>
            {(() => {
              if (!TabComp) return null;
              // v01.077 — gate the PII-heavy groups behind a TOTP step-up.
              const GATED_GROUPS = ['Members', 'StudentSupport'];
              if (GATED_GROUPS.includes(activeGroupId) && !stepupOk) {
                return <AdminStepUpGate lang={adminLang} onUnlocked={unlockStepup} goTab={setTabSafe} />;
              }
              const previewPath = PREVIEW_PATHS[tab];
              // key={tab} forces React to unmount/remount when switching
              // between dynamic mailbox sub-tabs (mailbox:info → mailbox:hello)
              // since both dispatch to the same MailboxTab component.
              if (!previewPath) {
                // key={tab} 이 경계에도 붙는다 — 탭을 옮기면 경계가 새로 만들어져
                // 앞 탭의 오류 상태가 따라오지 않는다.
                return (
                  <AdminErrorBoundary key={'eb-' + tab} scope={'tab:' + tab}>
                    <TabComp key={tab} c={content} account={tabAccount} set={set} addItem={addItem} removeItem={removeItem} setTab={setTabSafe} />
                  </AdminErrorBoundary>
                );
              }
              return (
                <EditorWithPreview
                  tabId={tab}
                  previewPath={previewPath}
                  content={content}
                  onSave={(draft) => { dirtyRef.current = true; setContent(draft); }}
                  onDirtyChange={(isDirty) => { editorDirtyRef.current = isDirty; }}
                >
                  {(api) => (
                    <AdminErrorBoundary key={'eb-' + tab} scope={'tab:' + tab}>
                      <TabComp key={tab} c={api.c} account={tabAccount} set={api.set} addItem={api.addItem} removeItem={api.removeItem} setTab={setTabSafe} />
                    </AdminErrorBoundary>
                  )}
                </EditorWithPreview>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  // ---- Auth gate -----------------------------------------------------------
  // Email + password only. The session token is stored under the existing
  // dp_admin_token localStorage key so every fetch() in the admin keeps
  // working unchanged. ADMIN_TOKEN env on the server is still honoured for
  // automation, but the UI doesn't expose it.
  function Gate() {
    const [token, setToken] = useState(() => adminToken());
    const [authed, setAuthed] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    // Surface the "you were logged out for inactivity" reason once after the
    // forced reload the idle timer triggers. The flag is one-shot.
    const [idleNotice, setIdleNotice] = useState(() => {
      try {
        if (sessionStorage.getItem('dp_admin_idle_logout')) {
          sessionStorage.removeItem('dp_admin_idle_logout');
          return true;
        }
      } catch {}
      return false;
    });

    async function verify(t) {
      try {
        const r = await fetch('/api/admin/integrations/status', { headers: { authorization: 'Bearer ' + t } });
        return r.ok;
      } catch { return false; }
    }

    useEffect(() => {
      if (!token) { setAuthed(false); return; }
      verify(token).then(ok => {
        if (ok) setAuthed(true);
        else {
          localStorage.removeItem('dp_admin_token');
          setToken(''); setAuthed(false);
        }
      });
    }, []);

    async function loginAccount(e) {
      e.preventDefault();
      if (busy) return;
      const e_ = email.trim().toLowerCase();
      if (!e_ || !password) { setError('이메일과 비밀번호를 입력하세요.'); return; }
      setBusy(true); setError('');
      try {
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: e_, password }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.token) { setError('이메일 또는 비밀번호가 올바르지 않습니다.'); return; }
        const ok = await verify(d.token);
        if (!ok) { setError('관리자 권한이 없는 계정입니다.'); return; }
        localStorage.setItem('dp_admin_token', d.token);
        setToken(d.token); setAuthed(true);
      } catch (err) {
        setError('로그인 실패: ' + (err.message || err));
      } finally { setBusy(false); }
    }

    function logout() {
      // Also clear the 2FA step-up cookie so the next session must re-enter the code.
      try { fetch('/api/admin/totp/lock', { method: 'POST', credentials: 'same-origin', keepalive: true }); } catch {}
      localStorage.removeItem('dp_admin_token');
      setToken(''); setAuthed(false);
      setEmail(''); setPassword('');
    }

    if (authed === null) {
      return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--fg-muted)'}}>Checking session…</div>;
    }
    if (!authed) {
      return (
        <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--canvas-white)',padding:24}}>
          <form onSubmit={loginAccount} style={{width:'100%',maxWidth:420,background:'var(--bg-elevated)',padding:32,borderRadius:16,boxShadow:'0 8px 32px rgba(0,0,0,0.08)',border:'1px solid var(--border-subtle)'}}>
            <h1 style={{fontFamily:'var(--font-en)',fontSize:24,margin:'0 0 6px',color:'var(--brand-text)'}}>KoreaDreamPath Admin</h1>
            <p style={{margin:'0 0 20px',color:'var(--fg-muted)',fontSize:14}}>관리자 계정으로 로그인하세요.</p>
            {idleNotice && (
              <div role="alert" style={{padding:'10px 12px',background:'var(--state-warning-bg)',color:'var(--state-warning)',border:'1px solid var(--state-warning)',borderRadius:8,fontSize:13,marginBottom:14}}>
                30분 동안 활동이 없어 자동 로그아웃되었습니다. 다시 로그인하세요.
              </div>
            )}
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--fg-secondary)',marginBottom:6}}>이메일</label>
            {/* No placeholder, no autofill — operator types the address each
                time. Browser autofill is disabled to avoid leaking which
                accounts have been used on this device. Hint sits below as
                static text instead of inside the field. */}
            <input type="email" name="dp-admin-email"
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
              value={email} onChange={e => setEmail(e.target.value)}
              autoFocus
              style={{width:'100%',padding:'12px 14px',fontSize:14,border:'1px solid var(--border-default)',borderRadius:8,marginBottom:6,background:'var(--bg-elevated)',color:'var(--fg-primary)'}} />
            <p style={{fontSize:11,color:'var(--fg-muted)',margin:'0 0 12px'}}>이메일 형식으로 입력해 주세요.</p>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--fg-secondary)',marginBottom:6}}>비밀번호</label>
            <input type="password" name="dp-admin-password" autoComplete="off" value={password} onChange={e => setPassword(e.target.value)}
              style={{width:'100%',padding:'12px 14px',fontSize:14,border:'1px solid var(--border-default)',borderRadius:8,marginBottom:12,background:'var(--bg-elevated)',color:'var(--fg-primary)'}} />
            {error && <div role="alert" style={{color:'var(--state-danger)',fontSize:13,marginBottom:12}}>{error}</div>}
            <button type="submit" disabled={busy} style={{width:'100%',padding:'12px 14px',background:'var(--midnight-purple)',color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer',opacity:busy?0.6:1}}>
              {busy ? '로그인 중…' : '로그인'}
            </button>
            <p style={{margin:'14px 0 0',fontSize:12,color:'var(--fg-muted)',textAlign:'center'}}>
              비밀번호를 잊었다면 <a href="/reset-password" style={{color:'var(--brand-text)',textDecoration:'underline'}}>여기서 재설정</a>.
            </p>
          </form>
        </div>
      );
    }
    return <Admin onLogout={logout} />;
  }


  // ── 인사이트 콘솔 (v01.101.05) ─────────────────────────────────────────
  // 우측 하단에 상주하는 질의 패널. 운영자 지시(2026-08-27).
  //
  // 왜 대시보드로 안 되는가: 대시보드는 고정된 카드라 "이번 달 지원 몇 건"
  // 처럼 기간을 바꿔 묻는 질문에 답하지 못하고, 전체 검색은 레코드를 찾을 뿐
  // 집계를 내지 못한다. 이 패널은 어느 탭에 있든 따라다니며 숫자를 답한다.
  //
  // 답은 서버(/api/admin/insight)가 D1 집계로 만든다 — 화면에서 목록을 받아
  // 세지 않는다. 데이터가 늘어도 답이 흔들리지 않아야 한다.
  function InsightConsole() {
    const [open, setOpen]   = useState(false);
    const [q, setQ]         = useState('');
    const [log, setLog]     = useState([]);     // [{ role:'you'|'console', ... }]
    const [busy, setBusy]   = useState(false);
    const bodyRef = useRef(null);
    const inputRef = useRef(null);

    // 패널을 처음 열면 요약을 먼저 보여준다 — "실시간으로 정리"의 몫이다.
    useEffect(() => {
      if (!open || log.length) return;
      ask('', { silent: true, preset: ['지원', '문의', '오류'] });
    }, [open]);

    useEffect(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }, [log, busy]);

    useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

    // Esc 로 닫는다. 모달이 아니므로 포커스를 가두지는 않는다.
    useEffect(() => {
      if (!open) return;
      const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    async function askOne(text) {
      const token = adminToken();
      const r = await fetch('/api/admin/insight', {
        method: 'POST',
        headers: authHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({ q: text }),
      });
      // 실패를 삼키지 않는다 — 조회가 깨졌는데 0 을 답하면 거짓말이 된다.
      if (!r.ok && r.status === 401) {
        return { headline: '세션이 만료됐습니다.', detail: '다시 로그인한 뒤 물어보세요.', source: null };
      }
      const j = await r.json().catch(() => null);
      if (!j) return { headline: '응답을 읽지 못했습니다.', detail: '네트워크 상태를 확인해 주세요.', source: null };
      return j;
    }

    async function ask(text, opts) {
      const o = opts || {};
      setBusy(true);
      try {
        if (o.preset) {
          const rows = [];
          for (const p of o.preset) rows.push(await askOne(p));
          setLog(l => [...l, { role: 'console', summary: rows }]);
        } else {
          setLog(l => [...l, { role: 'you', text }]);
          const j = await askOne(text);
          setLog(l => [...l, { role: 'console', ...j }]);
        }
      } finally { setBusy(false); }
    }

    function submit(e) {
      e.preventDefault();
      const text = q.trim();
      if (!text || busy) return;
      setQ('');
      ask(text);
    }

    const CHIPS = ['이번 달 지원', '미답변 문의', '안 읽은 메일', '미해결 오류', '최근 7일 방문', '유입 경로'];

    // 로그인 화면에는 띄우지 않는다. 훅은 이 검사 앞에 전부 선언해 두었다 —
    // 뒤에 두면 로그인 전후로 훅 개수가 달라져 React 가 죽는다(v01.101.01).
    if (!adminToken()) return null;

    if (!open) {
      return (
        <button type="button" onClick={() => setOpen(true)}
          title="인사이트 콘솔 열기"
          style={{position:'fixed',right:22,bottom:22,zIndex:2200,display:'inline-flex',alignItems:'center',gap:8,
                  padding:'12px 18px',borderRadius:999,border:'none',cursor:'pointer',
                  background:'var(--midnight-purple)',color:'#fff',fontWeight:700,fontSize:13,fontFamily:'inherit',
                  boxShadow:'0 8px 26px rgba(0,0,0,0.24)'}}>
          <i data-lucide="sparkles" width="15" height="15" />
          인사이트
        </button>
      );
    }

    return (
      <div role="dialog" aria-label="인사이트 콘솔"
        style={{position:'fixed',right:22,bottom:22,zIndex:2200,width:390,maxWidth:'calc(100vw - 44px)',
                maxHeight:'min(620px, calc(100vh - 60px))',display:'flex',flexDirection:'column',
                background:'var(--bg-elevated)',border:'1px solid var(--border-default)',borderRadius:16,
                boxShadow:'0 18px 50px rgba(0,0,0,0.26)',overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px',borderBottom:'1px solid var(--border-hair)'}}>
          <i data-lucide="sparkles" width="15" height="15" style={{color:'var(--brand-text)'}} />
          <strong style={{fontSize:14,flex:1,minWidth:0}}>인사이트 콘솔</strong>
          <button type="button" className="icon-btn" onClick={() => setLog([])} title="대화 지우기">지우기</button>
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} title="닫기 (Esc)">닫기</button>
        </div>

        <div ref={bodyRef} style={{flex:1,minHeight:0,overflowY:'auto',padding:'14px 16px',fontSize:13,lineHeight:1.65}}>
          {log.map((m, i) => {
            if (m.role === 'you') {
              return (
                <div key={i} style={{margin:'0 0 12px',textAlign:'right'}}>
                  <span style={{display:'inline-block',padding:'7px 12px',borderRadius:12,
                                background:'var(--midnight-purple)',color:'#fff',maxWidth:'86%',textAlign:'left',
                                wordBreak:'keep-all',overflowWrap:'break-word'}}>{m.text}</span>
                </div>
              );
            }
            const rows = m.summary || [m];
            return (
              <div key={i} style={{margin:'0 0 14px'}}>
                {rows.map((r, j) => (
                  <div key={j} style={{padding:'10px 12px',borderRadius:12,background:'var(--bg-muted)',
                                       marginBottom: j < rows.length - 1 ? 8 : 0,
                                       wordBreak:'keep-all',overflowWrap:'break-word'}}>
                    <div style={{fontWeight:700,color:'var(--fg-primary)'}}>{r.headline}</div>
                    {r.detail && (
                      <div style={{marginTop:4,color:'var(--fg-secondary)',whiteSpace:'pre-line'}}>{r.detail}</div>
                    )}
                    {r.source && (
                      <div style={{marginTop:6,fontSize:11,color:'var(--fg-muted)'}}>출처 — {r.source}</div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
          {busy && <div style={{color:'var(--fg-muted)'}}>세는 중…</div>}
        </div>

        <div style={{padding:'10px 12px 12px',borderTop:'1px solid var(--border-hair)'}}>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
            {CHIPS.map(c => (
              <button key={c} type="button" className="icon-btn" disabled={busy}
                onClick={() => ask(c)} style={{fontSize:11,padding:'5px 9px'}}>{c}</button>
            ))}
          </div>
          <form onSubmit={submit} style={{display:'flex',gap:8}}>
            <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
              placeholder="예: 이번 달 지원 몇 건?"
              style={{flex:1,minWidth:0,padding:'10px 12px',fontSize:13,borderRadius:9,
                      border:'1px solid var(--border-default)',background:'var(--bg-elevated)',
                      color:'var(--fg-primary)',fontFamily:'inherit'}} />
            <button type="submit" className="btn-add" disabled={busy || !q.trim()}
              style={{padding:'8px 14px',opacity: (busy || !q.trim()) ? 0.5 : 1}}>묻기</button>
          </form>
        </div>
      </div>
    );
  }

  const root = ReactDOM.createRoot(document.getElementById('root'));
  // Mount both the admin app and the VersionWatcher so the operator gets
  // the same "new version available" banner the public site shows.
  root.render(
    <>
      <AdminErrorBoundary scope="root">
        <Gate />
      </AdminErrorBoundary>
      {window.VersionWatcher ? <window.VersionWatcher lang={(localStorage.getItem('dp_admin_lang') || 'ko')} /> : null}
      {/* 인사이트 콘솔은 Gate 밖에 둔다 — 어느 탭에 있든 따라다녀야 하고,
          토큰이 없으면 첫 질의가 401 을 받아 스스로 안내한다. */}
      <InsightConsole />
    </>
  );
