// admin-2-members-mail.js — 관리자 콘솔 2/4
//
// 회원 · 메일함 · 알림 · 법무 · 메일 템플릿
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
// `MembersTab` 에서 시작해 `ReceiptTemplateTab` 에서 끝난다.

  function MembersTab() {
    const PAGE_SIZE = 20;
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [filter, setFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [selected, setSelected] = useState(null);
    const [detail, setDetail] = useState(null);
    const [editing, setEditing] = useState(null);     // { mode: 'create' } | { mode: 'edit', user, profile }
    const [tick, setTick] = useState(0);              // bump to refetch
    const [testCount, setTestCount] = useState(0);    // total qa+/[TEST] members across all pages

    useEffect(() => {
      const ctrl = new AbortController();
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(page * PAGE_SIZE));
      if (filter) params.set('q', filter);
      if (roleFilter) params.set('role', roleFilter);
      setLoading(true);
      fetch('/api/admin/users?' + params, { headers: authHeaders(), signal: ctrl.signal })
        .then(r => r.ok ? r.json() : { items: [], total: 0 })
        .then(d => { setItems(d.items || []); setTotal(d.total || 0); setLoading(false); })
        .catch(() => {});
      return () => ctrl.abort();
    }, [page, filter, roleFilter, tick]);

    // Count test accounts across all pages — cheap side request (typically <=5
    // rows). Keeps the cap warning accurate even when the current page is
    // filtered or paginated past the test-account block.
    useEffect(() => {
      const ctrl = new AbortController();
      fetch('/api/admin/users?q=qa%2B&limit=50', { headers: authHeaders(), signal: ctrl.signal })
        .then(r => r.ok ? r.json() : { items: [] })
        .then(d => {
          const items = d.items || [];
          // Server-side `q` LIKE-matches on multiple columns so include a final
          // client-side check for the qa+ prefix / [TEST] name marker.
          setTestCount(items.filter(isTestAccount).length);
        })
        .catch(() => {});
      return () => ctrl.abort();
    }, [tick]);

    useEffect(() => {
      if (!selected) { setDetail(null); return; }
      setDetail(null);
      fetch('/api/admin/users/' + encodeURIComponent(selected), { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(setDetail)
        .catch(() => setDetail(null));
    }, [selected, tick]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    async function deleteMember(id, email) {
      if (!confirm(`Delete member ${email}?\n\nThis is permanent — sessions, consents, and applications stay but the account record is removed.`)) return;
      const r = await fetch('/api/admin/users/' + encodeURIComponent(id), { method: 'DELETE', headers: authHeaders() });
      if (!r.ok) { alert('Delete failed: HTTP ' + r.status); return; }
      setSelected(null); setEditing(null);
      setTick(t => t + 1);
    }

    const overLimit = testCount > TEST_ACCOUNT_LIMIT;
    return (
      <>
        <div className="card" style={{
          padding:'10px 14px', marginBottom:10, fontSize:12,
          background: overLimit ? 'var(--state-danger-bg, #fde8e8)' : 'var(--bg-muted)',
          color: overLimit ? 'var(--state-danger, #b91c1c)' : 'var(--fg-secondary)',
          borderLeft: '3px solid ' + (overLimit ? 'var(--state-danger, #b91c1c)' : 'var(--sunshine-yellow)'),
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:14,
        }}>
          <div>
            <strong>테스트 계정 {testCount} / {TEST_ACCOUNT_LIMIT}</strong>
            <span style={{marginLeft:10, color: overLimit ? 'inherit' : 'var(--fg-muted)'}}>
              컨벤션: <code>qa+xxx@example.invalid</code> + 이름 앞에 <code>[TEST]</code>. 최대 {TEST_ACCOUNT_LIMIT}개 유지.
            </span>
          </div>
          {overLimit && <span><strong>한도 초과</strong> — 오래된 테스트 계정 정리 필요</span>}
        </div>
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:14,flexWrap:'wrap'}}>
            <div>
              <h3 style={{margin:0}}>Member directory</h3>
              <p className="desc" style={{margin:'4px 0 0'}}>All registered users · {total.toLocaleString()} total · {PAGE_SIZE}/page</p>
            </div>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <input type="search" placeholder="Search name / email" value={filter}
                onChange={e => { setFilter(e.target.value); setPage(0); }}
                style={{padding:'9px 12px',border:'1px solid var(--border-default)',borderRadius:8,fontSize:13,width:240,background:'var(--bg-elevated)',color:'var(--fg-primary)'}} />
              <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(0); }}
                style={{padding:'9px 12px',border:'1px solid var(--border-default)',borderRadius:8,fontSize:13,background:'var(--bg-elevated)',color:'var(--fg-primary)'}}>
                <option value="">All roles</option>
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
              <button type="button" className="btn-add" onClick={() => setEditing({ mode: 'create' })}>+ Add member</button>
            </div>
          </div>
        </div>

        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table className="apps-table">
            <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Joined</th><th>Last login</th><th>Apps</th><th style={{textAlign:'right',width:120}}></th></tr></thead>
            <tbody>
              {items.map(m => (
                <tr key={m.id} style={isTestAccount(m) ? { background: 'var(--bg-muted)' } : null}>
                  <td onClick={() => setSelected(m.id)} style={{cursor:'pointer'}}>
                    {isTestAccount(m) && (
                      <span className="pill" style={{
                        background:'var(--sunshine-yellow)',
                        color:'var(--midnight-purple)',
                        marginRight:8, fontSize:10, fontWeight:700, letterSpacing:'0.04em'
                      }}>TEST</span>
                    )}
                    {m.email}
                  </td>
                  <td onClick={() => setSelected(m.id)} style={{cursor:'pointer'}}>{m.name || <span style={{color:'var(--fg-muted)'}}>—</span>}</td>
                  <td><span className="pill" style={{background:m.role==='admin'?'var(--sunshine-yellow)':'var(--bg-muted)',color:m.role==='admin'?'var(--midnight-purple)':'var(--fg-secondary)'}}>{m.role}</span></td>
                  <td><span style={{fontSize:11,fontFamily:'var(--font-mono)',color:'var(--fg-muted)'}}>{m.created_at ? new Date(m.created_at).toLocaleDateString() : ''}</span></td>
                  <td><span style={{fontSize:11,fontFamily:'var(--font-mono)',color:m.last_login?'var(--fg-secondary)':'var(--fg-muted)'}}>{m.last_login ? new Date(m.last_login).toLocaleString() : 'never'}</span></td>
                  <td>{m.app_count || 0}</td>
                  <td style={{textAlign:'right'}}>
                    <button type="button" className="icon-btn" onClick={() => setEditing({ mode: 'edit', user: m })}>Edit</button>
                    <button type="button" className="icon-btn danger" style={{marginLeft:4}} onClick={() => deleteMember(m.id, m.email)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} style={{textAlign:'center',color:'var(--fg-muted)',padding:32}}>{filter || roleFilter ? 'No matches.' : 'No members yet.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14,fontSize:13,color:'var(--fg-secondary)'}}>
          <div>Page {page + 1} / {totalPages} · showing {items.length} of {total.toLocaleString()}</div>
          <div style={{display:'flex',gap:6}}>
            <button type="button" className="icon-btn" onClick={() => setPage(0)} disabled={page === 0}>« First</button>
            <button type="button" className="icon-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹ Prev</button>
            <button type="button" className="icon-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>Next ›</button>
            <button type="button" className="icon-btn" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>Last »</button>
          </div>
        </div>

        {selected && (
          <div className="app-modal" onClick={() => setSelected(null)}>
            <div className="app-modal-inner" onClick={e => e.stopPropagation()}>
              <div className="app-modal-head">
                <div>
                  <div style={{fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--fg-muted)',fontWeight:700}}>Member detail</div>
                  <h2 style={{margin:'4px 0 0',fontSize:20}}>{detail?.user?.email || selected}</h2>
                </div>
                <div style={{display:'flex',gap:6}}>
                  {detail && <button type="button" className="icon-btn" onClick={() => { setEditing({ mode: 'edit', user: detail.user }); }}>Edit</button>}
                  <button type="button" className="icon-btn" onClick={() => setSelected(null)}>Close</button>
                </div>
              </div>
              <div className="app-modal-body">
                {!detail ? <p style={{color:'var(--fg-muted)'}}>Loading…</p> : (() => {
                  // Render every column we know about, with "empty" placeholder
                  // when the field is null/undefined/blank. This matches the
                  // operator's "see all signup data" requirement instead of
                  // hiding empty fields.
                  const Empty = () => <span style={{color:'var(--fg-muted)',fontStyle:'italic'}}>empty</span>;
                  const v = (val, fmt) => (val === null || val === undefined || val === '') ? <Empty /> : (fmt ? fmt(val) : String(val));
                  const u = detail.user || {};
                  const p = detail.profile || {};
                  // Every member_profiles column we want to surface, in stable order.
                  const PROFILE_KEYS = ['country','birthdate','current_school','current_major','goal','interests','korean_level','english_level','career_summary'];
                  return (
                  <>
                    {p.photo && (
                      <div style={{display:'flex',gap:18,alignItems:'center',marginBottom:18,padding:'14px 16px',background:'var(--bg-muted)',borderRadius:10}}>
                        <img src={p.photo} alt="" style={{width:96,height:96,borderRadius:'50%',objectFit:'cover',border:'2px solid var(--border-default)'}} />
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:'var(--fg-primary)'}}>{u.name || '(no name)'}</div>
                          <div style={{fontSize:12,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>{u.email}</div>
                          {p.photo_size && <div style={{fontSize:11,color:'var(--fg-muted)',marginTop:4}}>Photo {(p.photo_size / 1024).toFixed(0)} KB</div>}
                        </div>
                      </div>
                    )}
                    <div className="app-sec">Account</div>
                    <div className="app-row"><div className="app-k">ID</div><div className="app-v" style={{fontFamily:'var(--font-mono)'}}>{v(u.id)}</div></div>
                    <div className="app-row"><div className="app-k">Email</div><div className="app-v">{v(u.email)}</div></div>
                    <div className="app-row"><div className="app-k">Name</div><div className="app-v">{v(u.name)}</div></div>
                    <div className="app-row">
                      <div className="app-k">Role</div>
                      <div className="app-v">
                        <span className="pill" style={{background:u.role==='admin'?'var(--sunshine-yellow)':'var(--bg-muted)',color:u.role==='admin'?'var(--midnight-purple)':'var(--fg-secondary)'}}>{u.role || 'member'}</span>
                        {u.email !== ALWAYS_ADMIN_EMAIL && (
                          <button type="button" className="icon-btn" style={{marginLeft:8}}
                            onClick={async () => {
                              const newRole = u.role === 'admin' ? 'member' : 'admin';
                              if (!confirm(`Change role to ${newRole}?`)) return;
                              const tok = adminToken();
                              const r = await fetch('/api/admin/users/' + encodeURIComponent(u.id), {
                                method: 'PATCH',
                                headers: authHeaders({ 'content-type': 'application/json' }),
                                body: JSON.stringify({ role: newRole, note: 'role toggle from member detail' }),
                              });
                              if (r.ok) { setTick(t => t + 1); }
                              else alert('Failed: HTTP ' + r.status);
                            }}>
                            {u.role === 'admin' ? '관리자 해제' : '관리자로 지정'}
                          </button>
                        )}
                        {u.email === ALWAYS_ADMIN_EMAIL && <span style={{marginLeft:8,fontSize:11,color:'var(--fg-muted)'}}>· 시스템 항상-관리자 (변경 불가)</span>}
                      </div>
                    </div>
                    {u.role === 'admin' && (
                      <div className="app-row">
                        <div className="app-k">2단계 인증</div>
                        <div className="app-v">
                          <span className="pill" style={{background:u.totp_enrolled?'var(--state-success-bg, var(--bg-muted))':'var(--bg-muted)',color:u.totp_enrolled?'var(--state-success)':'var(--fg-secondary)'}}>
                            {u.totp_enrolled ? '● 등록됨' : '○ 미등록'}
                          </span>
                          {u.totp_enrolled && (
                            <button type="button" className="icon-btn danger" style={{marginLeft:8}}
                              onClick={async () => {
                                if (!confirm(`${u.email}의 2단계 인증을 초기화하시겠습니까?\n\n이 관리자는 다음 접속 때 본인 기기로 다시 등록해야 합니다. (분실·기기교체 시 사용)`)) return;
                                const tok = adminToken();
                                const r = await fetch('/api/admin/users/' + encodeURIComponent(u.id) + '/totp-reset', {
                                  method: 'POST', headers: authHeaders(), credentials: 'same-origin',
                                });
                                if (r.ok) { setTick(t => t + 1); }
                                else alert(r.status === 403 ? '2단계 인증(step-up)이 필요합니다. 회원 정보 탭에 다시 인증 후 시도하세요.' : 'Failed: HTTP ' + r.status);
                              }}>
                              2FA 초기화
                            </button>
                          )}
                          {u.totp_confirmed_at && <span style={{marginLeft:8,fontSize:11,color:'var(--fg-muted)'}}>· {new Date(u.totp_confirmed_at).toLocaleDateString()} 등록</span>}
                        </div>
                      </div>
                    )}
                    <div className="app-row"><div className="app-k">Email verified</div><div className="app-v">{u.email_verified ? '✓ verified' : <Empty />}</div></div>
                    <div className="app-row"><div className="app-k">Joined</div><div className="app-v">{v(u.created_at, x => new Date(x).toLocaleString())}</div></div>
                    <div className="app-row"><div className="app-k">Updated</div><div className="app-v">{v(u.updated_at, x => new Date(x).toLocaleString())}</div></div>
                    <div className="app-row"><div className="app-k">Last login</div><div className="app-v">{v(u.last_login, x => new Date(x).toLocaleString())}</div></div>

                    <div className="app-sec">Career profile</div>
                    {PROFILE_KEYS.map(k => (
                      <div className="app-row" key={k}><div className="app-k">{k}</div><div className="app-v">{v(p[k])}</div></div>
                    ))}
                    <div className="app-row"><div className="app-k">photo</div><div className="app-v">{p.photo ? <span>✓ uploaded ({((p.photo_size || 0) / 1024).toFixed(0)} KB)</span> : <Empty />}</div></div>
                    <div className="app-row"><div className="app-k">profile updated</div><div className="app-v">{v(p.updated_at, x => new Date(x).toLocaleString())}</div></div>
                  </>
                  );
                })()}
                {detail && (
                  <>
                    {/* Audit, consents — already rendered below; preserve original structure. */}
                    <div className="app-sec">Audit log ({(detail.audits || []).length})</div>
                    {(!detail.audits || detail.audits.length === 0) ? <p style={{color:'var(--fg-muted)',fontSize:13}}>No recorded changes.</p> : (
                      <table className="apps-table" style={{fontSize:12}}>
                        <thead><tr><th>Time</th><th>Action</th><th>Field</th><th>Old → New</th></tr></thead>
                        <tbody>
                          {detail.audits.map(a => (
                            <tr key={a.id}>
                              <td><span style={{fontFamily:'var(--font-mono)',fontSize:11}}>{new Date(a.ts).toLocaleString()}</span></td>
                              <td><span className="pill" style={{background:'var(--bg-muted)',color:'var(--fg-secondary)'}}>{a.action}</span></td>
                              <td>{a.field || '—'}</td>
                              <td style={{fontSize:11,fontFamily:'var(--font-mono)'}}>
                                {a.old_value || a.new_value
                                  ? <><span style={{color:'var(--fg-muted)'}}>{a.old_value ?? '∅'}</span> → <span>{a.new_value ?? '∅'}</span></>
                                  : <span style={{color:'var(--fg-muted)'}}>—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <div className="app-sec">Consent records ({detail.consents.length})</div>
                    {detail.consents.length === 0 ? <p style={{color:'var(--fg-muted)',fontSize:13}}>No consent records.</p> : (
                      <table className="apps-table" style={{fontSize:12}}>
                        <thead><tr><th>Time</th><th>Type</th><th>Version</th><th>Granted</th></tr></thead>
                        <tbody>
                          {detail.consents.map(c => (
                            <tr key={c.id}>
                              <td><span style={{fontFamily:'var(--font-mono)',fontSize:11}}>{new Date(c.ts).toLocaleString()}</span></td>
                              <td>{c.consent_type}</td>
                              <td>{c.version}</td>
                              <td><span className="pill" style={{background:c.granted?'var(--state-success-bg)':'var(--state-danger-bg)',color:c.granted?'var(--state-success)':'var(--state-danger)'}}>{c.granted ? '✓' : '✗'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {editing && <MemberEditModal mode={editing.mode} user={editing.user} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setTick(t => t + 1); }} />}
      </>
    );
  }

  // Member create / edit modal — used by MembersTab.
  function MemberEditModal({ mode, user, onClose, onSaved }) {
    const isEdit = mode === 'edit';
    const [email, setEmail] = useState(user?.email || '');
    const [name, setName]   = useState(user?.name || '');
    const [role, setRole]   = useState(user?.role || 'member');
    const [password, setPassword] = useState('');
    const [note, setNote]   = useState('');
    const [busy, setBusy]   = useState(false);
    const [err, setErr]     = useState('');

    async function submit(e) {
      e.preventDefault();
      if (busy) return;
      setBusy(true); setErr('');
      const tok = adminToken();
      const url = isEdit ? '/api/admin/users/' + encodeURIComponent(user.id) : '/api/admin/users';
      const method = isEdit ? 'PATCH' : 'POST';
      const body = isEdit
        ? { email, name, role, ...(password ? { password } : {}), ...(note ? { note } : {}) }
        : { email, name, role, password, ...(note ? { note } : {}) };
      try {
        const r = await fetch(url, { method, headers: authHeaders({ 'content-type': 'application/json' }), body: JSON.stringify(body) });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          const msg = ({ invalid_email: 'Invalid email format.', email_taken: 'Email already in use.', password_too_short: 'Password must be at least 8 characters.' })[data.error] || ('Save failed: ' + (data.error || r.status));
          setErr(msg); setBusy(false); return;
        }
        onSaved && onSaved();
      } catch (e) {
        setErr('Network error: ' + e.message); setBusy(false);
      }
    }

    return (
      <div className="app-modal" onClick={onClose}>
        <div className="app-modal-inner" onClick={e => e.stopPropagation()} style={{maxWidth:560}}>
          <div className="app-modal-head">
            <div>
              <div style={{fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--fg-muted)',fontWeight:700}}>{isEdit ? 'Edit member' : 'Add member'}</div>
              <h2 style={{margin:'4px 0 0',fontSize:20}}>{isEdit ? user.email : 'New account'}</h2>
            </div>
            <button type="button" className="icon-btn" onClick={onClose}>Close</button>
          </div>
          <form onSubmit={submit} className="app-modal-body">
            <div className="grid-2 tight">
              <Text label="Email *" value={email} onChange={setEmail} type="email" />
              <Text label="Name" value={name} onChange={setName} />
              <div className="field">
                <label>Role</label>
                <select value={role} onChange={e => setRole(e.target.value)}>
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <Text label={isEdit ? 'New password (leave blank to keep)' : 'Password *'} value={password} onChange={setPassword} type="password" hint="Min 8 characters" />
            </div>
            <div className="field" style={{marginTop:14}}>
              <label>Audit note (optional)</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Why are you making this change?" />
            </div>
            {err && <div role="alert" style={{padding:10,marginTop:14,background:'var(--state-danger-bg)',color:'var(--state-danger)',borderRadius:8,fontSize:13}}>{err}</div>}
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:20}}>
              <button type="button" className="icon-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-add" disabled={busy} style={{padding:'10px 22px'}}>
                {busy ? 'Saving…' : (isEdit ? 'Save changes' : 'Create account')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ---- Member roles & permissions (등급 / 권한) ----------------------------
  // Editor for role definitions stored in c.member_roles. Each role lists which
  // pages it can access plus per-page action toggles. Backend enforcement of
  // these rules is a follow-up — for now this tab persists the matrix into
  // KV so the operator can author the policy that we'll wire to the worker.
  function MemberRolesTab({ c, set, addItem, removeItem }) {
    const roles = c.member_roles?.roles || [];
    const PAGES = [
      { id: 'home',         label: 'Home' },
      { id: 'about',        label: 'About' },
      { id: 'programs',     label: 'Programs' },
      { id: 'scholarships', label: 'Scholarships' },
      { id: 'apply',        label: 'Apply' },
      { id: 'partners',     label: 'Partners' },
      { id: 'stories',      label: 'Stories' },
      { id: 'news',         label: 'News' },
      { id: 'contact',      label: 'Contact' },
      { id: 'team',         label: 'Project team' },
      { id: 'member',       label: 'Member dashboard' },
      { id: 'receipt',      label: 'Receipts' },
    ];
    const ACTIONS = ['view', 'apply', 'comment', 'edit_own', 'edit_others'];

    function newRole() {
      addItem(['member_roles','roles'], {
        id: 'role_' + Date.now().toString(36),
        label_ko: '새 등급',
        label_en: 'New role',
        pages: {},
      });
    }

    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Roles & permissions</h3></summary>
          <p className="desc">
            Define which pages each member role can access and what they can do on each page.
            <strong> Note:</strong> the public site does not yet enforce these rules — this tab persists the policy
            you intend to apply. Backend enforcement is a follow-up task.
          </p>
          <button type="button" className="btn-add" onClick={newRole}>+ Add role</button>
        </details>

        {roles.length === 0 && (
          <div className="card" style={{textAlign:'center',color:'var(--fg-muted)',padding:32}}>
            No roles defined yet. Add one to start mapping permissions.
          </div>
        )}

        {roles.map((r, i) => (
          <div className="card" key={r.id || i}>
            <div className="rep-head" style={{marginBottom:14}}>
              <strong>{r.label_ko || r.label_en || r.id}</strong>
              <div className="ctrls">
                <button type="button" className="icon-btn danger" onClick={() => removeItem(['member_roles','roles'], i)}>Delete</button>
              </div>
            </div>
            <div className="grid-3 tight">
              <Text label="ID (slug)" value={r.id || ''} onChange={v => set(['member_roles','roles',i,'id'], v)} hint="machine-readable, e.g. member, alumni, partner" />
              <Text label="Label (KO)" value={r.label_ko || ''} onChange={v => set(['member_roles','roles',i,'label_ko'], v)} lang="ko" />
              <Text label="Label (EN)" value={r.label_en || ''} onChange={v => set(['member_roles','roles',i,'label_en'], v)} lang="en" />
            </div>
            <div className="app-sec" style={{marginTop:18}}>Page access matrix</div>
            <table className="apps-table" style={{fontSize:12}}>
              <thead>
                <tr>
                  <th>Page</th>
                  {ACTIONS.map(a => <th key={a} style={{textAlign:'center',textTransform:'lowercase'}}>{a.replace('_',' ')}</th>)}
                </tr>
              </thead>
              <tbody>
                {PAGES.map(p => {
                  const perm = (r.pages && r.pages[p.id]) || {};
                  return (
                    <tr key={p.id}>
                      <td style={{fontWeight:600}}>{p.label} <span style={{color:'var(--fg-muted)',fontWeight:400,fontFamily:'var(--font-mono)',fontSize:11}}>/{p.id}</span></td>
                      {ACTIONS.map(a => (
                        <td key={a} style={{textAlign:'center'}}>
                          <input type="checkbox" checked={!!perm[a]} onChange={e => set(['member_roles','roles',i,'pages',p.id,a], e.target.checked)} aria-label={`${r.id} can ${a} on ${p.id}`} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </>
    );
  }

  // ---- Inquiry categories CRUD --------------------------------------------
  // Drives the 문의 유형 dropdown on the public Contact form. Operator can
  // add / rename / reorder / delete categories. Stored as c.inquiry_categories.
  // ---- Send notification --------------------------------------------------
  // Composes an internal "email-like" notification and ships one row per
  // recipient via POST /api/admin/notifications. Recipients see the result
  // on their own My Page; nobody else can read another user's notifications.
  // ---- Mailbox: inbox + sent + compose -----------------------------------
  // Three-mode view inside one tab:
  //   • inbox   — Cloudflare-routed inbound email (per managed address)
  //   • sent    — outbound copies (Resend-sent + queued-during-no-key)
  //   • compose — new mail or reply (uses Resend; falls back to "queued"
  //               when RESEND_API_KEY is not set so drafts survive setup)
  // ---- Mailbox v2: folders + attachments + export -------------------------
  // Folders driven by ?mode= (inbox / starred / spam / trash). Attachments
  // capped at 10 files, 50 MB total per email; outbound additionally must
  // fit Resend's 40 MB total payload limit.
  // MailboxTab — when `account` prop is supplied, the tab is locked to that
  // single managed inbox (one tab per account in the sidebar). When omitted,
  // it falls back to the legacy "all inboxes" mode (left in for safety; the
  // sidebar no longer renders this case).
  // ── Mail body sanitizer (v01.094) ───────────────────────────────────────
  // Inbound HTML is allowlisted server-side at ingest and again when a single
  // mail is read (worker.js sanitizeHtml). This is the third pass, in the
  // browser, because the body is now rendered inline in the admin document
  // instead of inside a sandboxed iframe: two independent parsers with the
  // same allowlist means a serialization quirk in one can't hand live markup
  // to the other. Keep these lists in sync with SANITIZE_* in worker.js.
  const MAIL_ALLOWED_TAGS = new Set([
    'p', 'br', 'hr', 'div', 'span',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'em', 'u', 's', 'b', 'i',
    'ul', 'ol', 'li',
    'a', 'blockquote', 'code', 'pre', 'img',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'details', 'summary',
  ]);
  // Removed with their content (executable / framing / form surface).
  // Everything else off the allowlist is unwrapped, keeping its text.
  const MAIL_DROP_TAGS = new Set([
    'script', 'style', 'iframe', 'object', 'embed', 'form',
    'input', 'button', 'select', 'option', 'textarea', 'link', 'meta',
    'svg', 'math', 'base', 'frame', 'frameset', 'applet', 'template',
  ]);
  const MAIL_ATTRS_BY_TAG = {
    a:   ['href', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    td:  ['colspan', 'rowspan'],
    th:  ['colspan', 'rowspan'],
  };
  function mailUrlOk(value) {
    const v = String(value || '').trim().toLowerCase();
    if (!v) return false;
    if (v.startsWith('#') || v.startsWith('/') || v.startsWith('./') || v.startsWith('../')) return true;
    if (v.startsWith('http://') || v.startsWith('https://')) return true;
    if (v.startsWith('mailto:') || v.startsWith('tel:')) return true;
    // data: images only — data:text/html would be a script vector.
    if (v.startsWith('data:image/')) return true;
    return false;
  }
  // A preheader is markup the sender deliberately hid: display:none, a zeroed
  // box, or transparent text. Only these five declarations count — anything
  // looser (opacity, colour matching) would start eating real content.
  const MAIL_HIDDEN_RE = /(^|;)\s*(display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(\.0+)?\s*(;|$)|(max-height|max-width|font-size|line-height)\s*:\s*0(px|em|rem|%)?\s*(;|$))/i;
  function mailHidden(el) {
    if (el.hasAttribute('hidden')) return true;
    const style = el.getAttribute('style');
    return !!style && MAIL_HIDDEN_RE.test(style);
  }
  function sanitizeMailHtml(html) {
    try {
      // DOMParser builds an inert document: no script runs, no image or font
      // is fetched while we walk it.
      const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
      const walk = (node) => {
        for (const el of Array.from(node.childNodes)) {
          if (el.nodeType === 8) { el.remove(); continue; }   // comment
          if (el.nodeType !== 1) continue;                    // text stays
          const tag = el.tagName.toLowerCase();
          if (MAIL_DROP_TAGS.has(tag)) { el.remove(); continue; }
          // v01.101.02: the style attribute is stripped a few lines below, which
          // used to un-hide the preheader every marketing mail carries — the
          // operator saw a raw SES message-id as the first line of the body.
          // Decide on visibility while the declaration is still readable.
          if (mailHidden(el)) { el.remove(); continue; }
          walk(el);   // clean the subtree before deciding this element's fate
          if (!MAIL_ALLOWED_TAGS.has(tag)) { el.replaceWith(...Array.from(el.childNodes)); continue; }
          const allowed = MAIL_ATTRS_BY_TAG[tag] || [];
          for (const a of Array.from(el.attributes)) {
            const name = a.name.toLowerCase();
            if (!allowed.includes(name)) { el.removeAttribute(a.name); continue; }
            if ((name === 'href' || name === 'src') && !mailUrlOk(a.value)) el.removeAttribute(a.name);
          }
          // Links leave the admin in a new tab and carry no referrer or
          // ranking signal; images never phone home with the admin URL.
          if (tag === 'a' && el.getAttribute('href')) {
            el.setAttribute('target', '_blank');
            el.setAttribute('rel', 'noopener noreferrer nofollow');
          }
          if (tag === 'img') {
            // An <img> whose src was just stripped (data:text/html, javascript:)
            // would render as a broken-image glyph in the middle of the mail —
            // drop the element instead of leaving the artefact.
            if (!el.getAttribute('src')) { el.remove(); continue; }
            el.setAttribute('loading', 'lazy');
            el.setAttribute('referrerpolicy', 'no-referrer');
          }
        }
      };
      walk(doc.body);
      return doc.body.innerHTML;
    } catch {
      // Fail closed — an unparseable body shows the plain-text fallback
      // rather than raw markup.
      return '';
    }
  }

  function MailboxTab({ c, account }) {
    const inboxes = (c && Array.isArray(c.inboxes)) ? c.inboxes.filter(b => b && b.address && b.enabled !== false) : [];
    const lockedAccount = account || null;             // when set, hide free-form filter + lock From
    const [view, setView] = useState('inbox');         // 'inbox' | 'starred' | 'spam' | 'trash' | 'sent' | 'sent_trash' | 'compose'
    const [filter, setFilter] = useState(lockedAccount || '');
    const [items, setItems] = useState([]);
    const [counts, setCounts] = useState({ inbox: 0, unread: 0, starred: 0, spam: 0, trash: 0 });
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [selected, setSelected] = useState(null);
    const [tick, setTick] = useState(0);
    // Fullscreen reading mode. The two-pane grid gives the body column ~700px
    // on a 4K panel, which is a lot of wasted glass for a long mail.
    const [full, setFull] = useState(false);
    // Bulk-select state — Set of message ids checked in the current list.
    // Cleared whenever the visible list changes (view / filter / search /
    // unreadOnly / refresh) so stale selections don't survive a context flip.
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    useEffect(() => { setSelectedIds(new Set()); }, [view, filter, search, unreadOnly, tick]);

    // Compose state. composeFrom defaults to the locked account when present
    // (per-account tabs); otherwise the first available inbox.
    const [composeFrom, setComposeFrom]       = useState(lockedAccount || inboxes[0]?.address || 'info@koreadreampath.com');
    const [composeTo, setComposeTo]           = useState('');
    const [composeCc, setComposeCc]           = useState('');
    const [composeBcc, setComposeBcc]         = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody]       = useState('');   // HTML from RichEditor
    const [composeReplyTo, setComposeReplyTo] = useState(null);
    const [composeFiles, setComposeFiles]     = useState([]);   // [{ filename, mime, size, b64 }]
    const [composeFileErr, setComposeFileErr] = useState('');
    const [sending, setSending]               = useState(false);
    const [sendResult, setSendResult]         = useState(null);

    // ---- Auto-draft (v01.100.00) ---------------------------------------
    // 메일을 쓰다가 탭을 닫거나 다른 화면으로 가면 그대로 날아갔다. 60초마다
    // localStorage 에 임시저장하고, 새 메일을 열 때 되살린다. 서버(D1)를 쓰지
    // 않는 이유: 초안은 이 브라우저의 작업 상태이고, 마이그레이션 없이 바로
    // 효과가 있다. 첨부파일(base64)은 localStorage 한도(≈5MB)를 넘기므로 제외.
    const DRAFT_KEY = 'dp_mail_draft_v1:' + (lockedAccount || 'all');
    const [draftSavedAt, setDraftSavedAt] = useState(null);
    const [draftRestored, setDraftRestored] = useState(false);
    const [draftErr, setDraftErr] = useState('');

    // 인터벌이 매 타이핑마다 리셋되지 않도록 최신 값은 ref 로만 읽는다.
    const composeRef = useRef(null);
    composeRef.current = {
      from: composeFrom, to: composeTo, cc: composeCc, bcc: composeBcc,
      subject: composeSubject, body: composeBody, replyTo: composeReplyTo,
    };
    const composeViewRef = useRef(view);
    composeViewRef.current = view;

    function draftIsEmpty(d) {
      const text = String(d.body || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      return !d.to && !d.cc && !d.bcc && !String(d.subject || '').trim() && !text;
    }
    function clearDraft() {
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      setDraftSavedAt(null); setDraftRestored(false); setDraftErr('');
    }

    function saveDraftNow() {
      // 작성 화면에 있을 때만 쓴다 — 다른 화면에서 빈 값으로 덮어쓰지 않도록.
      if (composeViewRef.current !== 'compose') return;
      const d = composeRef.current || {};
      try {
        if (draftIsEmpty(d)) { localStorage.removeItem(DRAFT_KEY); setDraftSavedAt(null); setDraftErr(''); return; }
        const at = Date.now();
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, saved_at: at }));
        setDraftSavedAt(at); setDraftErr('');
      } catch (e) {
        // 실패를 삼키면 화면은 옛 시각으로 "임시저장됨" 이라고 거짓말한다.
        // 저장 공간 초과(본문에 붙여넣은 이미지) · 사생활 보호 모드에서 발생.
        setDraftSavedAt(null);
        setDraftErr(String(e && e.name) === 'QuotaExceededError'
          ? '임시저장 공간이 가득 찼습니다 (본문의 붙여넣은 이미지가 원인일 수 있습니다). 보내기 전에 내용을 따로 복사해 두세요.'
          : '이 브라우저에서 임시저장을 쓸 수 없습니다. 보내기 전에 내용을 따로 복사해 두세요.');
      }
    }
    const saveDraftRef = useRef(saveDraftNow);
    saveDraftRef.current = saveDraftNow;

    useEffect(() => {
      const fire = () => saveDraftRef.current();
      const id = setInterval(fire, 60000);
      window.addEventListener('beforeunload', fire);
      return () => {
        clearInterval(id);
        window.removeEventListener('beforeunload', fire);
        fire();   // 탭을 떠날 때 마지막 1회
      };
    }, [DRAFT_KEY]);

    const ATT_MAX_FILES = 10;
    const ATT_MAX_TOTAL = 50 * 1024 * 1024;
    const RESEND_MAX_TOTAL = 40 * 1024 * 1024;

    // Map view → API mode + side
    function viewToApi(v) {
      if (v === 'inbox')      return { side: 'inbox',  mode: 'inbox' };
      if (v === 'starred')    return { side: 'inbox',  mode: 'starred' };
      if (v === 'spam')       return { side: 'inbox',  mode: 'spam' };
      if (v === 'trash')      return { side: 'inbox',  mode: 'trash' };
      if (v === 'sent')       return { side: 'sent',   mode: 'sent' };
      if (v === 'sent_trash') return { side: 'sent',   mode: 'trash' };
      return null;
    }

    useEffect(() => {
      if (view === 'compose') return;
      const cfg = viewToApi(view);
      if (!cfg) return;
      const ctrl = new AbortController();
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '100');
      params.set('mode', cfg.mode);
      if (filter) params.set(cfg.side === 'inbox' ? 'to' : 'from', filter);
      if (cfg.side === 'inbox' && search) params.set('q', search);
      if (cfg.side === 'inbox' && unreadOnly) params.set('unread', '1');
      const url = '/api/admin/' + (cfg.side === 'inbox' ? 'inbox' : 'sent') + '?' + params;
      fetch(url, { headers: authHeaders(), signal: ctrl.signal })
        .then(r => r.ok ? r.json() : { items: [], total: 0 })
        .then(d => {
          setItems(d.items || []); setTotal(d.total || 0);
          if (d.counts) setCounts(d.counts);
          setLoading(false);
        })
        .catch(() => setLoading(false));
      return () => ctrl.abort();
    }, [view, filter, search, unreadOnly, tick]);

    useEffect(() => {
      if (!selected || selected._loaded) return;
      const cfg = viewToApi(view);
      if (!cfg) return;
      // Reading an inbound mail stamps read_at server-side, so remember
      // whether this row was unread BEFORE the fetch answers.
      const wasUnread = cfg.side === 'inbox' && !selected.read_at;
      const url = '/api/admin/' + (cfg.side === 'inbox' ? 'inbox' : 'sent') + '/' + selected.id;
      fetch(url, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) return;
          setSelected({ ...d, _loaded: true });
          if (wasUnread && d.read_at) markReadLocally(d.id);
        })
        .catch(() => {});
    }, [selected]);

    // The server just stamped read_at, but the list rows and the folder
    // counters came from an earlier fetch — without this the mail you are
    // reading keeps its unread dot and stays in the unread count.
    function markReadLocally(id) {
      setItems(list => list.map(m => (m.id === id && !m.read_at)
        ? { ...m, read_at: new Date().toISOString() }
        : m));
      setCounts(c => (c && c.unread > 0) ? { ...c, unread: c.unread - 1 } : c);
    }

    // The sidebar unread badges live in the shell, which polls every 60s and
    // otherwise only refreshes on tab change — so acting on mail inside this
    // tab left the badge stale. Any list refresh here is a read/trash/spam
    // signal; tell the shell to re-count. (Skipped on mount: the shell
    // already fetches when the tab opens.)
    const mountedRef = useRef(false);
    useEffect(() => {
      if (!mountedRef.current) { mountedRef.current = true; return; }
      window.dispatchEvent(new CustomEvent('dp-mail-counters-changed'));
    }, [tick, items]);

    // Sanitize the body once per message instead of on every re-render — the
    // DOMParser walk is cheap but marketing mail runs to hundreds of nodes.
    const safeBody = useMemo(
      () => (selected && selected.body_html ? sanitizeMailHtml(selected.body_html) : ''),
      [selected && selected.id, selected && selected.body_html]
    );

    // Esc closes the fullscreen reader, and page scroll is locked while it's
    // open so the admin canvas doesn't scroll away underneath the overlay.
    useEffect(() => {
      if (!full) return;
      const onKey = e => { if (e.key === 'Escape') setFull(false); };
      window.addEventListener('keydown', onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, [full]);
    // Trashing a mail or switching folders clears `selected` — don't leave an
    // empty overlay standing.
    useEffect(() => { if (!selected) setFull(false); }, [selected]);

    async function patch(id, body) {
      const r = await fetch('/api/admin/inbox/' + id, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (r.ok) { setTick(t => t + 1); if (selected && selected.id === id) setSelected(s => ({ ...s, ...body, read_at: body.read === false ? null : (body.read === true ? new Date().toISOString() : s.read_at) })); }
    }
    async function trash(id, side) {
      const url = '/api/admin/' + (side === 'inbox' ? 'inbox' : 'sent') + '/' + id;
      const r = await fetch(url, { method: 'DELETE', headers: authHeaders() });
      if (r.ok) { setSelected(null); setTick(t => t + 1); }
    }
    async function restore(id, side) {
      const url = '/api/admin/' + (side === 'inbox' ? 'inbox' : 'sent') + '/' + id + '/restore';
      const r = await fetch(url, { method: 'POST', headers: authHeaders() });
      if (r.ok) { setSelected(null); setTick(t => t + 1); }
    }
    async function purge(id, side) {
      if (!confirm('영구 삭제하시겠습니까? 복구할 수 없습니다.')) return;
      const url = '/api/admin/' + (side === 'inbox' ? 'inbox' : 'sent') + '/' + id + '?permanent=1';
      const r = await fetch(url, { method: 'DELETE', headers: authHeaders() });
      if (r.ok) { setSelected(null); setTick(t => t + 1); }
    }
    async function emptyTrash() {
      if (!confirm('휴지통의 모든 메일을 영구 삭제합니다. 계속할까요?')) return;
      const r = await fetch('/api/admin/inbox/empty-trash', { method: 'POST', headers: authHeaders() });
      if (r.ok) setTick(t => t + 1);
    }
    // ── Bulk operations ────────────────────────────────────────────────────
    // All bulk endpoints work on inbound only (즐겨찾기/스팸/읽음 상태는 받은
    // 메일에만 의미가 있고, 휴지통은 양쪽 다 처리). Loops the existing
    // single-id endpoints — small N (≤100) so client-side fan-out is fine.
    function toggleSelect(id) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    }
    function selectAllVisible() {
      setSelectedIds(prev => {
        const allVisible = items.map(m => m.id);
        const allChecked = allVisible.every(id => prev.has(id));
        if (allChecked) return new Set();          // toggle off when everything was already selected
        return new Set(allVisible);
      });
    }
    async function bulkPatch(body) {
      const ids = [...selectedIds];
      if (!ids.length) return;
      await Promise.all(ids.map(id => fetch('/api/admin/inbox/' + id, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      }).catch(() => null)));
      setSelectedIds(new Set()); setTick(t => t + 1);
      if (selected && ids.includes(selected.id)) setSelected(null);
    }
    async function bulkTrash() {
      const ids = [...selectedIds];
      if (!ids.length) return;
      if (!confirm(`${ids.length}개 메일을 휴지통으로 이동합니다.`)) return;
      const path = sideOfView === 'inbox' ? '/api/admin/inbox/' : '/api/admin/sent/';
      await Promise.all(ids.map(id => fetch(path + id, { method: 'DELETE', headers: authHeaders() }).catch(() => null)));
      setSelectedIds(new Set()); setTick(t => t + 1); setSelected(null);
    }
    async function bulkPurge() {
      const ids = [...selectedIds];
      if (!ids.length) return;
      if (!confirm(`${ids.length}개 메일을 영구 삭제합니다. 복구할 수 없습니다.`)) return;
      const path = sideOfView === 'inbox' ? '/api/admin/inbox/' : '/api/admin/sent/';
      await Promise.all(ids.map(id => fetch(path + id + '?permanent=1', { method: 'DELETE', headers: authHeaders() }).catch(() => null)));
      setSelectedIds(new Set()); setTick(t => t + 1); setSelected(null);
    }

    function startReply(msg) {
      const replyFrom = msg.to_addr;
      const subject = (msg.subject || '').toLowerCase().startsWith('re:') ? msg.subject : 'Re: ' + (msg.subject || '');
      // Build the quoted body as HTML so the RichEditor renders it as an
      // actual blockquote rather than literal "> " prefixes.
      const escape = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const sourceHtml = msg.body_html || ('<p>' + escape(msg.body_text || '').replace(/\n+/g, '</p><p>') + '</p>');
      const lead =
        '<p></p><p></p>' +
        '<blockquote>' +
        '<p style="color:#777;font-size:12px"><em>On ' + escape(new Date(msg.ts).toLocaleString()) +
        ', ' + escape(msg.from_name || msg.from_addr) + ' &lt;' + escape(msg.from_addr) + '&gt; wrote:</em></p>' +
        sourceHtml +
        '</blockquote>';
      setComposeFrom(replyFrom);
      setComposeTo(msg.from_addr);
      setComposeCc(''); setComposeBcc('');
      setComposeSubject(subject);
      setComposeBody(lead);
      setComposeReplyTo({ id: msg.id, message_id: msg.message_id, subject: msg.subject });
      setDraftSavedAt(null); setDraftRestored(false);
      setComposeFiles([]); setComposeFileErr('');
      setSendResult(null);
      setView('compose');
    }
    function startCompose() {
      // 임시저장본이 있으면 되살린다 (없으면 빈 폼).
      let d = null;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) { const p = JSON.parse(raw); if (p && !draftIsEmpty(p)) d = p; }
      } catch {}
      setComposeFrom(d?.from || lockedAccount || inboxes[0]?.address || 'info@koreadreampath.com');
      setComposeTo(d?.to || ''); setComposeCc(d?.cc || ''); setComposeBcc(d?.bcc || '');
      setComposeSubject(d?.subject || ''); setComposeBody(d?.body || '');
      setComposeReplyTo(d?.replyTo || null);
      setDraftSavedAt(d?.saved_at || null);
      setDraftRestored(!!d);
      setComposeFiles([]); setComposeFileErr('');
      setSendResult(null);
      setView('compose');
    }

    function pickFiles(e) {
      setComposeFileErr('');
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      const room = ATT_MAX_FILES - composeFiles.length;
      if (files.length > room) { setComposeFileErr(`파일은 최대 ${ATT_MAX_FILES}개까지. 추가 가능: ${room}개.`); return; }
      let total = composeFiles.reduce((s, f) => s + f.size, 0);
      const next = composeFiles.slice();
      let pending = files.length;
      files.forEach(file => {
        if (file.size > ATT_MAX_TOTAL) { setComposeFileErr(`${file.name}: 단일 파일이 50MB를 초과합니다.`); pending--; return; }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          const b64 = dataUrl.split(',')[1] || '';
          total += file.size;
          if (total > ATT_MAX_TOTAL) {
            setComposeFileErr(`총 첨부 용량이 50MB를 초과합니다.`);
          } else {
            next.push({ filename: file.name, mime: file.type || 'application/octet-stream', size: file.size, b64 });
            setComposeFiles([...next]);
          }
          pending--;
          if (pending === 0 && total > RESEND_MAX_TOTAL) {
            setComposeFileErr(`Resend 발송 한도(40MB)를 초과합니다 — 일부 파일을 빼주세요.`);
          }
        };
        reader.onerror = () => { pending--; setComposeFileErr('읽기 실패: ' + file.name); };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    }
    function removeFile(i) {
      setComposeFiles(prev => prev.filter((_, idx) => idx !== i));
      setComposeFileErr('');
    }

    async function sendNow() {
      if (sending) return;
      setSending(true); setSendResult(null);
      try {
        const r = await fetch('/api/admin/mail/send', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            from: composeFrom, to: composeTo,
            cc:  composeCc.trim() || undefined,
            bcc: composeBcc.trim() || undefined,
            subject: composeSubject,
            body_html: composeBody,                      // RichEditor outputs HTML
            in_reply_to: composeReplyTo?.message_id || null,
            attachments: composeFiles.map(f => ({ filename: f.filename, mime: f.mime, content_base64: f.b64 })),
          }),
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.ok) {
          setSendResult({ ok: true });
          setComposeTo(''); setComposeCc(''); setComposeBcc('');
          setComposeSubject(''); setComposeBody(''); setComposeReplyTo(null); setComposeFiles([]);
          clearDraft();   // 보냈으면 임시저장본은 남길 이유가 없다
          setTimeout(() => { setView('sent'); setTick(t => t + 1); }, 600);
        } else {
          setSendResult({ ok: false, msg: d.error || ('http_' + r.status) });
        }
      } catch (e) { setSendResult({ ok: false, msg: String(e.message || e) }); }
      finally { setSending(false); }
    }

    function exportCsv() {
      const tok = adminToken();
      const cfg = viewToApi(view);
      const params = new URLSearchParams();
      params.set('format', 'csv');
      if (cfg && cfg.side === 'inbox') params.set('mode', cfg.mode);
      // Use a temporary <a> with the bearer in URL? No — use a fetch-then-blob.
      fetch('/api/admin/inbox/export?' + params, { headers: authHeaders() })
        .then(r => r.ok ? r.blob() : null)
        .then(blob => {
          if (!blob) return alert('Export failed');
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `dreampath-inbox-${new Date().toISOString().slice(0,10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        });
    }
    function exportJson() {
      const tok = adminToken();
      const cfg = viewToApi(view);
      const params = new URLSearchParams();
      params.set('format', 'json');
      if (cfg && cfg.side === 'inbox') params.set('mode', cfg.mode);
      fetch('/api/admin/inbox/export?' + params, { headers: authHeaders() })
        .then(r => r.ok ? r.blob() : null)
        .then(blob => {
          if (!blob) return alert('Export failed');
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `dreampath-inbox-${new Date().toISOString().slice(0,10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
        });
    }

    function downloadAttachment(att) {
      // R2 fetch is admin-gated; we have to send the bearer, then save the blob.
      const tok = adminToken();
      fetch('/api/admin/attachment/' + att.id + '/download', { headers: authHeaders() })
        .then(r => r.ok ? r.blob() : null)
        .then(blob => {
          if (!blob) return alert('Download failed');
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = att.filename || 'attachment';
          a.click();
          URL.revokeObjectURL(url);
        });
    }

    // Folder layout — split into "받은 메일" and "보낸 메일" sections so the
    // operator can see at a glance which side they're on. Visual grouping:
    //   [받은 ▸  inbox · starred · spam · trash]   |   [보낸 ▸  sent · sent_trash]
    const FOLDERS_INBOUND = [
      { v: 'inbox',   l: '받은편지함', icon: 'inbox',        count: counts.inbox },
      { v: 'starred', l: '즐겨찾기',   icon: 'star',         count: counts.starred },
      { v: 'spam',    l: '스팸',       icon: 'shield-alert', count: counts.spam },
      { v: 'trash',   l: '휴지통',     icon: 'trash-2',      count: counts.trash },
    ];
    const FOLDERS_OUTBOUND = [
      { v: 'sent',       l: '보낸편지함', icon: 'send',     count: null },
      { v: 'sent_trash', l: '휴지통',     icon: 'trash-2',  count: null },
    ];
    const renderFolderBtn = (b) => (
      <button key={b.v} type="button"
        onClick={() => { setView(b.v); setSelected(null); }}
        className="icon-btn"
        style={view === b.v ? {background:'var(--midnight-purple)',color:'#fff',borderColor:'var(--midnight-purple)'} : {}}>
        <i data-lucide={b.icon} width="14" height="14" style={{marginRight:6,verticalAlign:'-2px'}} />
        {b.l}
        {b.count != null && b.count > 0 && (
          <span style={{marginLeft:6,fontSize:11,fontFamily:'var(--font-mono)',opacity:0.85}}>{b.count}</span>
        )}
      </button>
    );

    const composeTotal = composeFiles.reduce((s, f) => s + f.size, 0);

    const STATUS_PILLS = {
      sent:   { bg: 'var(--state-success-bg)', fg: 'var(--state-success)' },
      queued: { bg: 'var(--state-warning-bg)', fg: 'var(--state-warning)' },
      failed: { bg: 'var(--state-danger-bg)',  fg: 'var(--state-danger)' },
    };

    const sideOfView = (viewToApi(view) || {}).side || 'inbox';

    // The reading pane, rendered in two places — inline in the two-pane grid
    // and (isFull) inside the fullscreen overlay — so the markup lives once.
    const renderReader = (isFull) => (
                <>
                  {/* v01.101.02: the toolbar and the subject used to sit side by
                      side, and the toolbar was flexShrink:0 — on a 1440px display
                      (reader pane ≈ 550px) its 467px of buttons squeezed the
                      subject column to 17px and the title rendered one glyph per
                      line over 18 rows. They are stacked now: the toolbar owns
                      the top row, the mail's own metadata the one below, so
                      neither can starve the other at any width. */}
                  <div style={{marginBottom:14,paddingBottom:14,borderBottom:'1px solid var(--border-hair)'}}>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end',marginBottom:12}}>
                      <button type="button" className="icon-btn" onClick={() => setFull(f => !f)}
                        title={isFull ? '전체화면 닫기 (Esc)' : '전체화면으로 보기'}>
                        {isFull ? '⤡ 창 모드' : '⛶ 전체화면'}
                      </button>
                      {sideOfView === 'inbox' && !selected.trashed_at && (
                        <>
                          <button type="button" className="icon-btn" onClick={() => patch(selected.id, { starred: !selected.starred })} title="별표">
                            {selected.starred ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기'}
                          </button>
                          <button type="button" className="icon-btn" onClick={() => patch(selected.id, { spam: !selected.spam })}>
                            {selected.spam ? '스팸 해제' : '스팸으로'}
                          </button>
                          <button type="button" className="icon-btn" onClick={() => patch(selected.id, { read: !selected.read_at })}>
                            {selected.read_at ? '안 읽음으로' : '읽음 처리'}
                          </button>
                          <button type="button" className="btn-add" onClick={() => startReply(selected)} style={{padding:'6px 14px'}}>↩ 답장</button>
                        </>
                      )}
                      {selected.trashed_at && (
                        <>
                          <button type="button" className="icon-btn" onClick={() => restore(selected.id, sideOfView)}>복구</button>
                          <button type="button" className="icon-btn danger" onClick={() => purge(selected.id, sideOfView)}>영구 삭제</button>
                        </>
                      )}
                      {!selected.trashed_at && (
                        <button type="button" className="icon-btn danger" onClick={() => trash(selected.id, sideOfView)}>휴지통으로</button>
                      )}
                    </div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:11,color:'var(--fg-muted)',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:4}}>
                        {sideOfView === 'inbox' ? `${selected.to_addr} 로 받음` : `${selected.from_addr} 에서 보냄`}
                      </div>
                      <h2 style={{margin:'0 0 8px',fontSize:20,color:'var(--brand-text)'}}>{selected.subject || '(no subject)'}</h2>
                      <div style={{fontSize:13,color:'var(--fg-secondary)'}}>
                        <strong>{sideOfView === 'inbox' ? (selected.from_name || selected.from_addr) : 'To'}</strong>
                        {' '}<code style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--fg-muted)'}}>&lt;{sideOfView === 'inbox' ? selected.from_addr : selected.to_addr}&gt;</code>
                        {' · '}
                        <span style={{fontFamily:'var(--font-mono)',fontSize:12}}>{new Date(selected.ts).toLocaleString()}</span>
                      </div>
                      {sideOfView !== 'inbox' && selected.cc && (
                        <div style={{fontSize:12,color:'var(--fg-muted)',marginTop:4}}>
                          <strong>CC</strong> <code style={{fontFamily:'var(--font-mono)'}}>{selected.cc}</code>
                        </div>
                      )}
                      {sideOfView !== 'inbox' && selected.bcc && (
                        <div style={{fontSize:12,color:'var(--fg-muted)',marginTop:2}}>
                          <strong>BCC</strong> <code style={{fontFamily:'var(--font-mono)'}}>{selected.bcc}</code>
                        </div>
                      )}
                    </div>
                  </div>
                  {selected.attachments && selected.attachments.length > 0 && (
                    <div style={{padding:'10px 14px',background:'var(--bg-muted)',borderRadius:10,marginBottom:14}}>
                      <div style={{fontSize:11,color:'var(--fg-muted)',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:8}}>
                        첨부파일 ({selected.attachments.length})
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        {selected.attachments.map(a => (
                          <button key={a.id} type="button" onClick={() => downloadAttachment(a)}
                            style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'var(--bg-elevated)',border:'1px solid var(--border-default)',borderRadius:8,cursor:'pointer',font:'inherit',color:'inherit',textAlign:'left'}}>
                            <i data-lucide="paperclip" width="14" height="14" style={{color:'var(--fg-muted)'}} />
                            <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13}}>{a.filename}</span>
                            <span style={{fontSize:11,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>{a.mime}</span>
                            <span style={{fontSize:11,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>{(a.size / 1024).toFixed(0)} KB</span>
                            <span style={{color:'var(--brand-text)'}}>↓</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Prefer rich HTML when present (always true for outbound
                      sent via the new compose flow); fall back to plain text
                      for inbound messages that only carried text/plain.

                      v01.094: this used to be <iframe sandbox="" srcdoc={...}>.
                      Chrome painted its "이 콘텐츠는 차단되어 있습니다" frame
                      placeholder over it, so the operator saw no mail at all —
                      and nothing inside a blocked frame is recoverable from
                      here. The markup is now rendered inline, after a third
                      sanitize pass (sanitizeMailHtml above; the worker already
                      allowlists at ingest and again on read). Inline can't be
                      frame-blocked, follows the admin theme, and grows to the
                      body's natural height. */}
                  {safeBody
                    ? <div className="mail-body" dangerouslySetInnerHTML={{ __html: safeBody }} />
                    : selected.body_text
                      ? <div className="mail-body mail-body-plain">{selected.body_text}</div>
                      : <div style={{color:'var(--fg-muted)',fontStyle:'italic'}}>(본문 없음)</div>}
                  {selected.error && (
                    <div role="alert" style={{marginTop:14,padding:12,background:'var(--state-danger-bg)',color:'var(--state-danger)',borderRadius:8,fontSize:13}}>
                      <strong>발송 실패:</strong> {selected.error}
                    </div>
                  )}
                </>
    );

    return (
      <>
        {/* Folder tabs + actions. The "받은 / 보낸" split is the primary
            distinction the operator cares about, so each section has its
            own kicker label and the two are separated by a vertical rule. */}
        <div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:14,flexWrap:'wrap'}}>
          <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:10,fontWeight:700,color:'var(--fg-muted)',letterSpacing:'0.08em',textTransform:'uppercase',marginRight:4}}>받은</span>
              {FOLDERS_INBOUND.map(renderFolderBtn)}
            </div>
            <span aria-hidden style={{width:1,height:24,background:'var(--border-default)'}} />
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:10,fontWeight:700,color:'var(--fg-muted)',letterSpacing:'0.08em',textTransform:'uppercase',marginRight:4}}>보낸</span>
              {FOLDERS_OUTBOUND.map(renderFolderBtn)}
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
            {view !== 'compose' && view !== 'trash' && view !== 'sent_trash' && sideOfView === 'inbox' && (
              <>
                {!lockedAccount && (
                  <select value={filter} onChange={e => setFilter(e.target.value)}
                    style={{padding:'9px 12px',border:'1px solid var(--border-default)',borderRadius:8,fontSize:13,background:'var(--bg-elevated)',color:'var(--fg-primary)'}}>
                    <option value="">모든 받은 주소</option>
                    {inboxes.map(b => <option key={b.address} value={b.address}>{b.address}</option>)}
                  </select>
                )}
                <input type="search" placeholder="제목·발신자·본문 검색" value={search} onChange={e => setSearch(e.target.value)}
                  style={{padding:'9px 12px',border:'1px solid var(--border-default)',borderRadius:8,fontSize:13,background:'var(--bg-elevated)',color:'var(--fg-primary)',width:220}} />
                <label style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:13,color:'var(--fg-secondary)'}}>
                  <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} /> 미읽음만
                </label>
              </>
            )}
            {view === 'sent' && !lockedAccount && (
              <select value={filter} onChange={e => setFilter(e.target.value)}
                style={{padding:'9px 12px',border:'1px solid var(--border-default)',borderRadius:8,fontSize:13,background:'var(--bg-elevated)',color:'var(--fg-primary)'}}>
                <option value="">모든 보낸 주소</option>
                {inboxes.map(b => <option key={b.address} value={b.address}>{b.address}</option>)}
              </select>
            )}
            {view !== 'compose' && (
              <button type="button" className="icon-btn" onClick={() => setTick(t => t + 1)}>↻ 새로고침</button>
            )}
            {(view === 'inbox' || view === 'starred' || view === 'spam' || view === 'trash') && (
              <>
                <button type="button" className="icon-btn" onClick={exportCsv}>⬇ CSV</button>
                <button type="button" className="icon-btn" onClick={exportJson}>⬇ JSON</button>
              </>
            )}
            {view === 'trash' && counts.trash > 0 && (
              <button type="button" className="icon-btn danger" onClick={emptyTrash}>휴지통 비우기</button>
            )}
            {view !== 'compose' && (
              <button type="button" className="btn-add" onClick={startCompose}>새 메일</button>
            )}
          </div>
        </div>

        {view === 'inbox' && total === 0 && !loading && !filter && !search && !unreadOnly && (
          <div className="card" style={{background:'var(--state-info-bg)',borderColor:'var(--state-info)',color:'var(--state-info)'}}>
            <strong>받은 메일이 없습니다.</strong> Cloudflare Email Routing이 활성화 안 됐거나 라우팅 규칙이 워커로 연결되지 않았을 수 있어요. 사이트 설정 → API · 통합의 "Cloudflare Email Routing · 받은 메일" 가이드를 참고하세요.
          </div>
        )}

        {view !== 'compose' && (
          <>
          {/* Bulk action bar — appears whenever ≥1 row is checked. Sticky above
              the list so scrolling doesn't lose access to the actions. */}
          {selectedIds.size > 0 && (
            <div style={{padding:'10px 14px',background:'var(--midnight-purple)',color:'#fff',borderRadius:10,marginBottom:8,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',position:'sticky',top:8,zIndex:5}}>
              <strong style={{fontSize:13}}>{selectedIds.size}개 선택됨</strong>
              <span aria-hidden style={{flex:'0 0 1px',height:18,background:'rgba(255,255,255,0.30)'}} />
              {sideOfView === 'inbox' && (
                <>
                  <button type="button" className="icon-btn" onClick={() => bulkPatch({ starred: true })}
                    style={{background:'rgba(255,255,255,0.10)',color:'#fff',borderColor:'rgba(255,255,255,0.20)'}}>★ 즐겨찾기</button>
                  <button type="button" className="icon-btn" onClick={() => bulkPatch({ starred: false })}
                    style={{background:'rgba(255,255,255,0.10)',color:'#fff',borderColor:'rgba(255,255,255,0.20)'}}>☆ 즐겨찾기 해제</button>
                  <button type="button" className="icon-btn" onClick={() => bulkPatch({ spam: true })}
                    style={{background:'rgba(255,255,255,0.10)',color:'#fff',borderColor:'rgba(255,255,255,0.20)'}}>스팸으로</button>
                  <button type="button" className="icon-btn" onClick={() => bulkPatch({ read: true })}
                    style={{background:'rgba(255,255,255,0.10)',color:'#fff',borderColor:'rgba(255,255,255,0.20)'}}>읽음 표시</button>
                  <button type="button" className="icon-btn" onClick={() => bulkPatch({ read: false })}
                    style={{background:'rgba(255,255,255,0.10)',color:'#fff',borderColor:'rgba(255,255,255,0.20)'}}>안 읽음 표시</button>
                </>
              )}
              {(view === 'trash' || view === 'sent_trash') ? (
                <button type="button" className="icon-btn" onClick={bulkPurge}
                  style={{background:'var(--badge-danger-fill)',color:'#fff',borderColor:'var(--badge-danger-fill)'}}>영구 삭제</button>
              ) : (
                <button type="button" className="icon-btn" onClick={bulkTrash}
                  style={{background:'var(--badge-danger-fill)',color:'#fff',borderColor:'var(--badge-danger-fill)'}}>휴지통으로</button>
              )}
              <span style={{flex:1}} />
              <button type="button" className="icon-btn" onClick={() => setSelectedIds(new Set())}
                style={{background:'transparent',color:'#fff',borderColor:'rgba(255,255,255,0.30)'}}>선택 해제</button>
            </div>
          )}

          <div className="mail-grid">
            <div className="card" style={{padding:0,maxHeight:'calc(100vh - 300px)',overflowY:'auto'}}>
              {/* Select-all header — only when there's at least one row */}
              {items.length > 0 && (
                <div style={{padding:'8px 16px',borderBottom:'1px solid var(--border-default)',background:'var(--bg-muted)',display:'flex',alignItems:'center',gap:8,position:'sticky',top:0,zIndex:2}}>
                  <input type="checkbox"
                    checked={items.length > 0 && items.every(m => selectedIds.has(m.id))}
                    ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && !items.every(m => selectedIds.has(m.id)); }}
                    onChange={selectAllVisible}
                    aria-label="모두 선택"
                    style={{width:14,height:14,cursor:'pointer'}} />
                  <span style={{fontSize:11,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>
                    {selectedIds.size > 0 ? `${selectedIds.size} / ${items.length}` : `${items.length}개`}
                  </span>
                </div>
              )}
              {loading
                ? <div style={{padding:32,color:'var(--fg-muted)',textAlign:'center'}}>Loading…</div>
                : items.length === 0
                  ? <div style={{padding:32,color:'var(--fg-muted)',textAlign:'center'}}>비어있습니다.</div>
                  : items.map(m => {
                    const isUnread = sideOfView === 'inbox' && !m.read_at;
                    const isSelected = selected && selected.id === m.id;
                    const isChecked = selectedIds.has(m.id);
                    return (
                      <div key={m.id}
                        style={{display:'flex',alignItems:'flex-start',gap:10,padding:'12px 16px',background: isChecked ? 'rgba(98,37,153,0.10)' : (isSelected ? 'var(--bg-muted)' : 'transparent'),borderBottom:'1px solid var(--border-hair)'}}>
                        <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(m.id)}
                          aria-label="선택"
                          style={{marginTop:4,width:14,height:14,cursor:'pointer',flexShrink:0}}
                          onClick={e => e.stopPropagation()} />
                        <div onClick={() => setSelected({ ...m, _loaded: false })}
                          role="button" tabIndex={0}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected({ ...m, _loaded: false }); } }}
                          style={{flex:1,minWidth:0,cursor:'pointer'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                          {sideOfView === 'inbox' && (
                            <span style={{flex:'0 0 auto',width:8,height:8,borderRadius:'50%',background: isUnread ? 'var(--state-info)' : 'transparent', border: isUnread ? 'none' : '1px solid var(--border-default)'}} />
                          )}
                          {m.starred ? <span style={{color:'var(--sunshine-yellow)'}}>★</span> : null}
                          <strong style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13,fontWeight: isUnread ? 700 : 500}}>
                            {sideOfView === 'inbox' ? (m.from_name || m.from_addr) : m.to_addr}
                          </strong>
                          <span style={{fontSize:11,color:'var(--fg-muted)',whiteSpace:'nowrap',fontFamily:'var(--font-mono)'}}>
                            {new Date(m.ts).toLocaleDateString()} {new Date(m.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                          </span>
                        </div>
                        <div style={{fontSize:13,fontWeight: isUnread ? 600 : 400,color:'var(--fg-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {m.subject || '(no subject)'}
                        </div>
                        <div style={{fontSize:12,color:'var(--fg-muted)',marginTop:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {(m.preview || '').slice(0, 120)}
                        </div>
                        <div style={{display:'flex',gap:6,marginTop:6,fontSize:10}}>
                          {sideOfView === 'sent' && (
                            <span className="pill" style={{background: STATUS_PILLS[m.status]?.bg || 'var(--bg-muted)', color: STATUS_PILLS[m.status]?.fg || 'var(--fg-secondary)'}}>{m.status}</span>
                          )}
                          {m.spam ? <span className="pill" style={{background:'var(--state-danger-bg)',color:'var(--state-danger)'}}>spam</span> : null}
                          {m.trashed_at ? <span className="pill" style={{background:'var(--bg-muted)',color:'var(--fg-muted)'}}>휴지통</span> : null}
                        </div>
                        </div>
                      </div>
                    );
                  })}
            </div>

            <div className="card" style={{minHeight:'calc(100vh - 300px)'}}>
              {!selected
                ? <div style={{textAlign:'center',color:'var(--fg-muted)',padding:'80px 20px'}}>왼쪽에서 메일을 선택하세요.</div>
                : renderReader(false)}
            </div>
          </div>

          {/* Fullscreen reader (v01.094). The two-pane grid leaves the body
              column narrow on a 4K display; this blows the selected mail up
              to the full viewport. Esc or the toolbar button closes it. */}
          {full && selected && (
            <div className="mail-full" role="dialog" aria-modal="true" aria-label="메일 전체화면 보기">
              <button type="button" className="icon-btn mail-full-close" onClick={() => setFull(false)} title="닫기 (Esc)">✕ 닫기</button>
              <div className="mail-full-inner">{renderReader(true)}</div>
            </div>
          )}
          </>
        )}

        {view === 'compose' && (
          <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>{composeReplyTo ? '답장 작성' : '새 메일 작성'}</h3></summary>
            {/* 자동 임시저장 표시줄 — 60초마다 저장, 다시 열면 복구 */}
            <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:12,padding:'8px 12px',background:'var(--bg-muted)',borderRadius:8,fontSize:12,color:'var(--fg-muted)'}}>
              <span>
                {draftSavedAt
                  ? `임시저장됨 · ${new Date(draftSavedAt).toLocaleTimeString('ko-KR')}`
                  : '1분마다 자동으로 임시저장됩니다'}
              </span>
              <span style={{opacity:.6}}>첨부파일은 임시저장에 포함되지 않습니다</span>
              {draftRestored && (
                <span style={{padding:'2px 8px',borderRadius:999,background:'var(--state-success-bg)',color:'var(--state-success)',fontWeight:600}}>
                  임시저장본을 불러왔습니다
                </span>
              )}
              {draftSavedAt && (
                <button type="button" className="icon-btn" style={{marginLeft:'auto',padding:'2px 10px'}}
                  onClick={() => {
                    if (!confirm('임시저장본을 삭제하고 작성 중인 내용을 비울까요?')) return;
                    clearDraft();
                    setComposeTo(''); setComposeCc(''); setComposeBcc('');
                    setComposeSubject(''); setComposeBody(''); setComposeReplyTo(null);
                  }}>임시저장 삭제</button>
              )}
            </div>
            {draftErr && (
              <div role="alert" style={{marginBottom:12,padding:'8px 12px',background:'var(--state-warning-bg)',color:'var(--state-warning)',borderRadius:8,fontSize:12}}>
                {draftErr}
              </div>
            )}
            {composeReplyTo && (
              <p className="desc">In reply to: <code style={{fontFamily:'var(--font-mono)',fontSize:12}}>{composeReplyTo.subject}</code></p>
            )}
            {/* Single-column form: From / To / CC / BCC / Subject / Body */}
            <div className="field">
              <label>From</label>
              {lockedAccount ? (
                <input type="text" value={lockedAccount} readOnly
                  style={{background:'var(--bg-muted)',color:'var(--fg-secondary)',cursor:'not-allowed'}} />
              ) : (
                <select value={composeFrom} onChange={e => setComposeFrom(e.target.value)}>
                  {inboxes.map(b => <option key={b.address} value={b.address}>{b.label_ko || b.label_en || b.address} &lt;{b.address}&gt;</option>)}
                </select>
              )}
            </div>
            <Text label="To" value={composeTo} onChange={setComposeTo} type="email" />
            <div className="field">
              <label>CC <span style={{fontSize:11,color:'var(--fg-muted)',fontWeight:400}}>(쉼표로 구분)</span></label>
              <input type="text" value={composeCc} onChange={e => setComposeCc(e.target.value)}
                placeholder="alice@example.com, bob@example.com"
                style={{width:'100%'}} />
            </div>
            <div className="field">
              <label>BCC <span style={{fontSize:11,color:'var(--fg-muted)',fontWeight:400}}>(쉼표로 구분)</span></label>
              <input type="text" value={composeBcc} onChange={e => setComposeBcc(e.target.value)}
                placeholder="hidden@example.com"
                style={{width:'100%'}} />
            </div>
            <Text label="Subject" value={composeSubject} onChange={setComposeSubject} />
            <div className="field" style={{marginBottom:14}}>
              <label>Body <span style={{fontSize:11,color:'var(--fg-muted)',fontWeight:400}}>(아래 손잡이를 끌어 높이 조절 · 더블클릭하면 기본 높이)</span></label>
              {window.RichEditor
                ? <window.RichEditor value={composeBody} onChange={setComposeBody} lang="ko" minHeight={320}
                    resizable storageKey="mail-compose" placeholder="메일 본문을 작성하세요…" />
                : <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)} rows={14} style={{width:'100%',resize:'vertical'}} placeholder="(에디터 로딩 중)" />}
            </div>

            {/* Attachments */}
            <div style={{marginTop:14,padding:'12px 14px',background:'var(--bg-muted)',borderRadius:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--fg-primary)'}}>
                  첨부파일 ({composeFiles.length}/{ATT_MAX_FILES})
                  <span style={{marginLeft:10,fontSize:12,color:'var(--fg-muted)',fontWeight:400,fontFamily:'var(--font-mono)'}}>
                    {(composeTotal / 1024 / 1024).toFixed(1)} / 50.0 MB
                  </span>
                </div>
                <label className="icon-btn" style={{cursor:'pointer'}}>
                  파일 추가
                  <input type="file" multiple onChange={pickFiles} style={{display:'none'}} />
                </label>
              </div>
              {composeFiles.length > 0 && (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {composeFiles.map((f, i) => (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 10px',background:'var(--bg-elevated)',border:'1px solid var(--border-default)',borderRadius:8}}>
                      <i data-lucide="paperclip" width="14" height="14" style={{color:'var(--fg-muted)'}} />
                      <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13}}>{f.filename}</span>
                      <span style={{fontSize:11,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>{(f.size / 1024).toFixed(0)} KB</span>
                      <button type="button" className="icon-btn danger" onClick={() => removeFile(i)} style={{padding:'2px 8px'}}>×</button>
                    </div>
                  ))}
                </div>
              )}
              {composeFileErr && (
                <div role="alert" style={{marginTop:8,padding:'8px 12px',background:'var(--state-danger-bg)',color:'var(--state-danger)',borderRadius:6,fontSize:13}}>
                  {composeFileErr}
                </div>
              )}
              {composeTotal > RESEND_MAX_TOTAL && (
                <div role="alert" style={{marginTop:8,padding:'8px 12px',background:'var(--state-warning-bg)',color:'var(--state-warning)',borderRadius:6,fontSize:12}}>
                  Resend 발송 한도(40MB)를 초과합니다. 일부 파일을 제거하세요.
                </div>
              )}
            </div>

            {sendResult && (
              <div role="status" style={{marginTop:14,padding:'10px 14px',borderRadius:8,
                background: sendResult.ok ? 'var(--state-success-bg)' : 'var(--state-danger-bg)',
                color: sendResult.ok ? 'var(--state-success)' : 'var(--state-danger)',fontSize:14}}>
                {sendResult.ok ? '✓ 발송 완료' : `✗ 실패: ${sendResult.msg}`}
              </div>
            )}
            <div style={{marginTop:18,display:'flex',justifyContent:'flex-end',gap:8}}>
              <button type="button" className="icon-btn" onClick={() => { saveDraftNow(); setView('inbox'); }}>닫기 (임시저장)</button>
              <button type="button" className="btn-add" onClick={sendNow} disabled={sending || composeTotal > RESEND_MAX_TOTAL}>
                {sending ? '발송 중…' : '발송'}
              </button>
            </div>
          </details>
        )}
      </>
    );
  }

  function SendNotificationTab() {
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState('users');         // 'users' | 'groups'
    const [search, setSearch] = useState('');
    const [picked, setPicked] = useState(() => new Set());
    const [pickedGroups, setPickedGroups] = useState(() => new Set());
    const [subjectKo, setSubjectKo] = useState('');
    const [subjectEn, setSubjectEn] = useState('');
    const [bodyKo, setBodyKo] = useState('');
    const [bodyEn, setBodyEn] = useState('');
    const [sender, setSender] = useState('admin');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
      const token = adminToken();
      const auth = authHeaders();
      Promise.all([
        fetch('/api/admin/users?limit=500', { headers: auth }).then(r => r.ok ? r.json() : { items: [] }),
        fetch('/api/admin/groups',            { headers: auth }).then(r => r.ok ? r.json() : { items: [] }),
      ]).then(([us, gs]) => {
        setUsers(us.items || []); setGroups(gs.items || []); setLoading(false);
      }).catch(() => setLoading(false));
    }, []);

    const filtered = search.trim()
      ? users.filter(u => (u.email + ' ' + (u.name || '')).toLowerCase().includes(search.toLowerCase()))
      : users;
    function togglePick(id) { setPicked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
    function pickAllVisible() { setPicked(new Set(filtered.map(u => u.id))); }
    function clearPicks() { setPicked(new Set()); }

    async function send() {
      const hasUsers  = picked.size > 0;
      const hasGroups = pickedGroups.size > 0;
      if (!hasUsers && !hasGroups) { alert('받는 사람을 한 명 이상 선택하세요.'); return; }
      if (!subjectKo && !subjectEn) { alert('제목 (KO 또는 EN) 이 필요합니다.'); return; }
      if (!bodyKo && !bodyEn) { alert('본문 (KO 또는 EN) 이 필요합니다.'); return; }
      setBusy(true); setResult(null);
      const token = adminToken();
      try {
        const r = await fetch('/api/admin/notifications', {
          method: 'POST',
          headers: authHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify({
            user_ids: [...picked],
            group_ids: [...pickedGroups],
            sender,
            subject_ko: subjectKo, subject_en: subjectEn,
            body_ko: bodyKo, body_en: bodyEn,
          }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { setResult({ ok: false, msg: d.error || ('http_' + r.status) }); return; }
        setResult({ ok: true, count: d.sent_to });
        setSubjectKo(''); setSubjectEn(''); setBodyKo(''); setBodyEn('');
        clearPicks(); setPickedGroups(new Set());
      } catch (e) { setResult({ ok: false, msg: String(e.message || e) }); }
      finally { setBusy(false); }
    }
    function toggleGroup(id) {
      setPickedGroups(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    }

    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>내부 알림 보내기</h3></summary>
          <p className="desc">
            선택한 회원의 마이페이지에만 표시되는 내부 메시지입니다 (외부로 발송되지 않음).
            외부 이메일이 필요하면 메일함 → 새 메일을 사용하세요.
          </p>
        </details>

        {/* 2-column shell — 받는 사람 picker | 작성 패널. Admin은 화면을
            가득 채우는 게 원칙이라 sparse한 1단 대신 좌우 배치로 복귀. */}
        <div className="grid-2" style={{alignItems:'flex-start',gap:16}}>
          {/* Recipients picker (left) — toggle between user picker / group picker. */}
          <div className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,gap:8,flexWrap:'wrap'}}>
              <h3 style={{margin:0}}>받는 사람</h3>
              <div className="adminlang" role="tablist" aria-label="picker mode">
                <button type="button" className={mode === 'users'  ? 'on' : ''} onClick={() => setMode('users')}>회원 개별</button>
                <span aria-hidden>·</span>
                <button type="button" className={mode === 'groups' ? 'on' : ''} onClick={() => setMode('groups')}>그룹</button>
              </div>
            </div>
            <div style={{fontSize:12,color:'var(--fg-muted)',marginBottom:10}}>
              회원 {picked.size}명{pickedGroups.size > 0 ? ` · 그룹 ${pickedGroups.size}개` : ''} 선택됨
            </div>
            {mode === 'users' ? (
              <>
                <input type="search" placeholder="이름 또는 이메일 검색" value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border-default)',borderRadius:8,fontSize:13,background:'var(--bg-elevated)',color:'var(--fg-primary)',marginBottom:10}} />
                <div style={{display:'flex',gap:6,marginBottom:8}}>
                  <button type="button" className="icon-btn" onClick={pickAllVisible}>보이는 항목 모두 선택</button>
                  <button type="button" className="icon-btn" onClick={clearPicks} disabled={!picked.size}>선택 해제</button>
                </div>
                <div style={{maxHeight:480,overflowY:'auto',border:'1px solid var(--border-subtle)',borderRadius:8}}>
                  {loading
                    ? <div style={{padding:20,color:'var(--fg-muted)',textAlign:'center'}}>Loading…</div>
                    : filtered.length === 0
                      ? <div style={{padding:20,color:'var(--fg-muted)',textAlign:'center'}}>일치하는 회원이 없습니다.</div>
                      : filtered.map(u => (
                        <label key={u.id}
                          style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderBottom:'1px solid var(--border-hair)',cursor:'pointer',
                            background: picked.has(u.id) ? 'var(--state-info-bg)' : 'transparent'}}>
                          <input type="checkbox" checked={picked.has(u.id)} onChange={() => togglePick(u.id)} />
                          <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            <strong style={{fontSize:13}}>{u.name || u.email}</strong>
                            {u.name && <span style={{color:'var(--fg-muted)',fontSize:12,marginLeft:6}}>· {u.email}</span>}
                          </span>
                          <span className="pill" style={{background: u.role==='admin' ? 'var(--sunshine-yellow)' : 'var(--bg-muted)', color: u.role==='admin' ? 'var(--midnight-purple)' : 'var(--fg-secondary)'}}>{u.role}</span>
                        </label>
                      ))}
                </div>
              </>
            ) : (
              <div style={{maxHeight:540,overflowY:'auto',border:'1px solid var(--border-subtle)',borderRadius:8}}>
                {loading
                  ? <div style={{padding:20,color:'var(--fg-muted)',textAlign:'center'}}>Loading…</div>
                  : groups.length === 0
                    ? <div style={{padding:20,color:'var(--fg-muted)',textAlign:'center',fontSize:13}}>저장된 그룹이 없습니다. 회원 정보 → 회원 그룹에서 먼저 만드세요.</div>
                    : groups.map(g => (
                      <label key={g.id}
                        style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderBottom:'1px solid var(--border-hair)',cursor:'pointer',
                          background: pickedGroups.has(g.id) ? 'var(--state-info-bg)' : 'transparent'}}>
                        <input type="checkbox" checked={pickedGroups.has(g.id)} onChange={() => toggleGroup(g.id)} />
                        <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          <strong style={{fontSize:14}}>{g.name_ko}</strong>
                          {g.name_en && <span style={{color:'var(--fg-muted)',fontSize:12,marginLeft:6}}>· {g.name_en}</span>}
                        </span>
                        <span className="pill" style={{background:'var(--bg-muted)',color:'var(--fg-secondary)'}}>{g.member_count}명</span>
                      </label>
                    ))}
              </div>
            )}
          </div>

          {/* Composer (right) — 한 줄당 한 필드, 두 컬럼은 picker 섹션과의
              관계로만 형성. KO/EN은 라벨로 구분. */}
          <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>내용 작성</h3></summary>
            <Text label="발신자 라벨" value={sender} onChange={setSender} hint="자유 입력. 알림 받는 사람에게 표시됩니다." />
            <Text label="제목" value={subjectEn} onChange={setSubjectEn} lang="en" />
            <Area label="본문" value={bodyEn} onChange={setBodyEn} lang="en" rows={8} />
            {result && (
              <div role="status" style={{marginTop:14,padding:'10px 14px',borderRadius:8,
                background: result.ok ? 'var(--state-success-bg)' : 'var(--state-danger-bg)',
                color: result.ok ? 'var(--state-success)' : 'var(--state-danger)',fontSize:14}}>
                {result.ok ? `✓ ${result.count}명에게 발송됨.` : `✗ 실패: ${result.msg}`}
              </div>
            )}
            <div style={{marginTop:14,display:'flex',justifyContent:'flex-end',gap:8}}>
              <button type="button" className="btn-add" onClick={send} disabled={busy || (!picked.size && !pickedGroups.size)}>
                {busy ? '발송 중…' : `발송하기${picked.size || pickedGroups.size ? ` (${picked.size}명${pickedGroups.size ? ' + ' + pickedGroups.size + '그룹' : ''})` : ''}`}
              </button>
            </div>
          </details>
        </div>
      </>
    );
  }

  // NotificationCampaignsTab — read-only audit / history of every internal
  // alert sent. 2-column shell: campaign list | campaign detail. Detail
  // panel shows recipient list with read state pills.
  function NotificationCampaignsTab() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);   // campaign id | null
    const [detail, setDetail] = useState(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
      setLoading(true);
      fetch('/api/admin/notification-campaigns?limit=200', { headers: authHeaders() })
        .then(r => r.ok ? r.json() : { items: [] })
        .then(d => { setItems(d.items || []); setLoading(false); })
        .catch(() => setLoading(false));
    }, [tick]);

    useEffect(() => {
      if (!selected) { setDetail(null); return; }
      setDetail(null);
      fetch('/api/admin/notification-campaigns/' + selected, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(setDetail).catch(() => {});
    }, [selected]);

    async function purge(id) {
      if (!confirm('이 캠페인과 모든 수신자 사본을 영구 삭제합니다. 계속할까요?')) return;
      const r = await fetch('/api/admin/notification-campaigns/' + id, { method: 'DELETE', headers: authHeaders() });
      if (r.ok) { setSelected(null); setTick(t => t + 1); }
    }

    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>발송 기록</h3></summary>
          <p className="desc">
            지금까지 보낸 내부 알림 캠페인입니다. 각 행은 한 번의 "알림 보내기" 액션이며, 수신자별 읽음 상태도 확인할 수 있습니다.
          </p>
        </details>

        <div className="grid-2" style={{alignItems:'flex-start',gap:16}}>
          {/* Campaign list (left) */}
          <div className="card" style={{padding:0,maxHeight:'70vh',overflowY:'auto'}}>
            {loading
              ? <div style={{padding:32,color:'var(--fg-muted)',textAlign:'center'}}>불러오는 중…</div>
              : items.length === 0
                ? <div style={{padding:32,color:'var(--fg-muted)',textAlign:'center'}}>발송 기록이 없습니다.</div>
                : items.map(c => {
                  const isOn = c.id === selected;
                  const subj = c.subject_ko || c.subject_en || '(제목 없음)';
                  const readPct = c.recipient_count > 0 ? Math.round((c.read_count / c.recipient_count) * 100) : 0;
                  return (
                    <button key={c.id} type="button" onClick={() => setSelected(c.id)}
                      style={{display:'block',width:'100%',padding:'12px 16px',background: isOn ? 'var(--bg-muted)' : 'transparent',border:'none',borderBottom:'1px solid var(--border-hair)',cursor:'pointer',textAlign:'left',font:'inherit',color:'inherit'}}>
                      <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:4}}>
                        <strong style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:14}}>{subj}</strong>
                        <span style={{fontSize:11,color:'var(--fg-muted)',whiteSpace:'nowrap',fontFamily:'var(--font-mono)'}}>{new Date(c.ts).toLocaleString()}</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:10,fontSize:12,color:'var(--fg-secondary)'}}>
                        <span>{c.sender}</span>
                        <span>{c.recipient_count}명</span>
                        <span style={{display:'inline-flex',alignItems:'center',gap:4}}>
                          <span style={{width:60,height:5,borderRadius:3,background:'var(--bg-muted)',overflow:'hidden',display:'inline-block'}}>
                            <span style={{display:'block',height:'100%',width: readPct + '%',background:'var(--state-success)'}} />
                          </span>
                          <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--fg-muted)'}}>{readPct}% 읽음</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
          </div>

          {/* Detail panel (right) */}
          <div className="card" style={{minHeight:280}}>
            {!selected
              ? <div style={{padding:32,color:'var(--fg-muted)',textAlign:'center'}}>좌측에서 캠페인을 선택하세요.</div>
              : !detail
                ? <div style={{padding:32,color:'var(--fg-muted)',textAlign:'center'}}>불러오는 중…</div>
                : (
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:14,paddingBottom:14,borderBottom:'1px solid var(--border-hair)'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,color:'var(--fg-muted)',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:4,fontFamily:'var(--font-mono)'}}>{detail.campaign.id}</div>
                        <h2 style={{margin:'0 0 8px',fontSize:18,color:'var(--brand-text)'}}>{detail.campaign.subject_ko || detail.campaign.subject_en || '(제목 없음)'}</h2>
                        <div style={{fontSize:12,color:'var(--fg-secondary)'}}>
                          <strong>발신:</strong> {detail.campaign.sender}{' · '}
                          <span style={{fontFamily:'var(--font-mono)'}}>{new Date(detail.campaign.ts).toLocaleString()}</span>{' · '}
                          <span>관리자: {detail.campaign.actor_user}</span>
                        </div>
                      </div>
                      <button type="button" className="icon-btn danger" onClick={() => purge(detail.campaign.id)}>영구 삭제</button>
                    </div>
                    {detail.campaign.body_ko && (
                      <div style={{padding:12,background:'var(--bg-muted)',borderRadius:8,marginBottom:8,whiteSpace:'pre-wrap',fontSize:13,lineHeight:1.6}}>
                        <div style={{fontSize:10,fontWeight:700,color:'var(--fg-muted)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:6}}>본문 · 한국어</div>
                        {detail.campaign.body_ko}
                      </div>
                    )}
                    {detail.campaign.body_en && (
                      <div style={{padding:12,background:'var(--bg-muted)',borderRadius:8,marginBottom:14,whiteSpace:'pre-wrap',fontSize:13,lineHeight:1.6}}>
                        <div style={{fontSize:10,fontWeight:700,color:'var(--fg-muted)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:6}}>본문 · English</div>
                        {detail.campaign.body_en}
                      </div>
                    )}
                    <div style={{fontSize:11,fontWeight:700,color:'var(--fg-muted)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:8}}>
                      수신자 · {detail.recipients.length}명
                    </div>
                    <div style={{maxHeight:280,overflowY:'auto',border:'1px solid var(--border-subtle)',borderRadius:8}}>
                      {detail.recipients.map(r => (
                        <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderBottom:'1px solid var(--border-hair)',fontSize:13}}>
                          <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                            <strong>{r.name || r.email || r.user_id}</strong>
                            {r.name && <span style={{color:'var(--fg-muted)',fontSize:12,marginLeft:6}}>· {r.email}</span>}
                          </span>
                          {r.read_at
                            ? <span className="pill" style={{background:'var(--state-success-bg)',color:'var(--state-success)'}}>읽음</span>
                            : <span className="pill" style={{background:'var(--bg-muted)',color:'var(--fg-muted)'}}>미읽음</span>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
          </div>
        </div>
      </>
    );
  }

  // MemberGroupsTab — 3-column when a group is selected, 2-col otherwise.
  // Left: group list. Middle: members. Right: add-member picker.
  function MemberGroupsTab() {
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);     // group id | null
    const [detail, setDetail] = useState(null);          // { group, members } | null
    const [tick, setTick] = useState(0);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [search, setSearch] = useState('');
    const [picked, setPicked] = useState(() => new Set());

    useEffect(() => {
      Promise.all([
        fetch('/api/admin/groups', { headers: authHeaders() }).then(r => r.ok ? r.json() : { items: [] }),
        fetch('/api/admin/users?limit=500', { headers: authHeaders() }).then(r => r.ok ? r.json() : { items: [] }),
      ]).then(([gs, us]) => {
        setGroups(gs.items || []); setUsers(us.items || []); setLoading(false);
      }).catch(() => setLoading(false));
    }, [tick]);

    useEffect(() => {
      if (!selected) { setDetail(null); return; }
      setDetail(null);
      fetch('/api/admin/groups/' + selected, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(setDetail).catch(() => {});
    }, [selected, tick]);

    async function createGroup() {
      if (!newName.trim()) return;
      setCreating(true);
      try {
        const r = await fetch('/api/admin/groups', {
          method: 'POST', headers: { 'content-type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ name_ko: newName.trim() }),
        });
        const d = await r.json();
        if (r.ok) { setNewName(''); setSelected(d.id); setTick(t => t + 1); }
      } finally { setCreating(false); }
    }
    async function renameGroup(g, name) {
      await fetch('/api/admin/groups/' + g.id, {
        method: 'PATCH', headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name_ko: name }),
      });
      setTick(t => t + 1);
    }
    async function deleteGroup(g) {
      if (!confirm(`그룹 "${g.name_ko}" 을 삭제하시겠습니까? (멤버십만 풀리고 회원 자체는 유지됩니다)`)) return;
      await fetch('/api/admin/groups/' + g.id, { method: 'DELETE', headers: authHeaders() });
      setSelected(null); setTick(t => t + 1);
    }
    async function addMembers() {
      if (!selected || !picked.size) return;
      await fetch('/api/admin/groups/' + selected + '/members', {
        method: 'POST', headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ user_ids: [...picked] }),
      });
      setPicked(new Set()); setTick(t => t + 1);
    }
    async function removeMember(uid) {
      await fetch('/api/admin/groups/' + selected + '/members', {
        method: 'DELETE', headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ user_ids: [uid] }),
      });
      setTick(t => t + 1);
    }

    const memberIds = new Set((detail?.members || []).map(m => m.user_id));
    const candidates = users.filter(u => !memberIds.has(u.id));
    const filteredCandidates = search.trim()
      ? candidates.filter(u => (u.email + ' ' + (u.name || '')).toLowerCase().includes(search.toLowerCase()))
      : candidates;

    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>회원 그룹</h3></summary>
          <p className="desc">
            회원을 그룹으로 묶어 알림 보내기에서 한 번에 선택할 수 있습니다. 그룹을 삭제해도 회원 자체는 유지됩니다.
          </p>
          <div style={{display:'flex',gap:8,alignItems:'center',marginTop:10}}>
            <input type="text" placeholder="새 그룹 이름" value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createGroup(); }}
              style={{flex:1,maxWidth:320,padding:'9px 12px',border:'1px solid var(--border-default)',borderRadius:8,fontSize:13,background:'var(--bg-elevated)',color:'var(--fg-primary)'}} />
            <button type="button" className="btn-add" onClick={createGroup} disabled={creating || !newName.trim()}>+ 그룹 만들기</button>
          </div>
        </details>

        <div className="grid-3" style={{alignItems:'flex-start',gap:16,gridTemplateColumns:'1fr 1.4fr 1fr'}}>
          {/* Group list */}
          <div className="card" style={{padding:0,maxHeight:'70vh',overflowY:'auto'}}>
            {loading
              ? <div style={{padding:24,color:'var(--fg-muted)',textAlign:'center'}}>불러오는 중…</div>
              : groups.length === 0
                ? <div style={{padding:24,color:'var(--fg-muted)',textAlign:'center'}}>그룹이 없습니다.</div>
                : groups.map(g => {
                  const isOn = g.id === selected;
                  return (
                    <button key={g.id} type="button" onClick={() => setSelected(g.id)}
                      style={{display:'block',width:'100%',padding:'12px 16px',background: isOn ? 'var(--bg-muted)' : 'transparent',border:'none',borderBottom:'1px solid var(--border-hair)',cursor:'pointer',textAlign:'left',font:'inherit',color:'inherit'}}>
                      <div style={{display:'flex',alignItems:'baseline',gap:8}}>
                        <strong style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:14}}>{g.name_ko}</strong>
                        <span className="pill" style={{background:'var(--bg-muted)',color:'var(--fg-secondary)'}}>{g.member_count}명</span>
                      </div>
                      {g.name_en && <div style={{fontSize:12,color:'var(--fg-muted)',marginTop:2}}>{g.name_en}</div>}
                    </button>
                  );
                })}
          </div>

          {/* Members of selected group */}
          <div className="card" style={{minHeight:280}}>
            {!selected
              ? <div style={{padding:32,color:'var(--fg-muted)',textAlign:'center'}}>좌측에서 그룹을 선택하세요.</div>
              : !detail
                ? <div style={{padding:32,color:'var(--fg-muted)',textAlign:'center'}}>불러오는 중…</div>
                : (
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,paddingBottom:14,borderBottom:'1px solid var(--border-hair)'}}>
                      <div style={{flex:1}}>
                        <input type="text" defaultValue={detail.group.name_ko}
                          onBlur={e => { if (e.target.value !== detail.group.name_ko) renameGroup(detail.group, e.target.value); }}
                          style={{width:'100%',padding:'8px 10px',border:'1px solid var(--border-default)',borderRadius:6,fontSize:16,fontWeight:700,background:'var(--bg-elevated)',color:'var(--fg-primary)'}} />
                      </div>
                      <button type="button" className="icon-btn danger" onClick={() => deleteGroup(detail.group)}>그룹 삭제</button>
                    </div>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--fg-muted)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:8}}>
                      소속 회원 · {detail.members.length}명
                    </div>
                    <div style={{maxHeight:480,overflowY:'auto',border:'1px solid var(--border-subtle)',borderRadius:8}}>
                      {detail.members.length === 0
                        ? <div style={{padding:24,color:'var(--fg-muted)',textAlign:'center',fontSize:13}}>아직 그룹원이 없습니다. 우측에서 회원을 선택해 추가하세요.</div>
                        : detail.members.map(m => (
                          <div key={m.user_id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderBottom:'1px solid var(--border-hair)',fontSize:13}}>
                            <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                              <strong>{m.name || m.email || m.user_id}</strong>
                              {m.name && <span style={{color:'var(--fg-muted)',fontSize:12,marginLeft:6}}>· {m.email}</span>}
                            </span>
                            <span className="pill" style={{background: m.role==='admin' ? 'var(--sunshine-yellow)' : 'var(--bg-muted)', color: m.role==='admin' ? 'var(--midnight-purple)' : 'var(--fg-secondary)'}}>{m.role}</span>
                            <button type="button" className="icon-btn danger" onClick={() => removeMember(m.user_id)} style={{padding:'2px 8px',fontSize:11}}>제외</button>
                          </div>
                        ))}
                    </div>
                  </>
                )}
          </div>

          {/* Add-member picker */}
          <div className="card" style={{minHeight:280}}>
            {!selected
              ? <div style={{padding:32,color:'var(--fg-muted)',textAlign:'center'}}>그룹을 먼저 선택하세요.</div>
              : (
                <>
                  <h3 style={{marginTop:0}}>회원 추가 · {picked.size}명 선택됨</h3>
                  <input type="search" placeholder="이름 또는 이메일 검색" value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{width:'100%',padding:'9px 12px',border:'1px solid var(--border-default)',borderRadius:8,fontSize:13,background:'var(--bg-elevated)',color:'var(--fg-primary)',marginBottom:8}} />
                  <div style={{maxHeight:420,overflowY:'auto',border:'1px solid var(--border-subtle)',borderRadius:8,marginBottom:10}}>
                    {filteredCandidates.length === 0
                      ? <div style={{padding:20,color:'var(--fg-muted)',textAlign:'center',fontSize:13}}>모든 회원이 이미 그룹에 있습니다.</div>
                      : filteredCandidates.map(u => (
                        <label key={u.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderBottom:'1px solid var(--border-hair)',cursor:'pointer',background: picked.has(u.id) ? 'var(--state-info-bg)' : 'transparent'}}>
                          <input type="checkbox" checked={picked.has(u.id)} onChange={() => {
                            setPicked(p => { const n = new Set(p); n.has(u.id) ? n.delete(u.id) : n.add(u.id); return n; });
                          }} />
                          <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13}}>
                            <strong>{u.name || u.email}</strong>
                            {u.name && <span style={{color:'var(--fg-muted)',fontSize:12,marginLeft:6}}>· {u.email}</span>}
                          </span>
                        </label>
                      ))}
                  </div>
                  <button type="button" className="btn-add" onClick={addMembers} disabled={!picked.size} style={{width:'100%'}}>
                    + {picked.size}명 추가
                  </button>
                </>
              )}
          </div>
        </div>
      </>
    );
  }

  function InquiryCategoriesTab({ c, set, addItem, removeItem }) {
    const cats = Array.isArray(c.inquiry_categories) ? c.inquiry_categories : [];
    function move(from, to) {
      if (to < 0 || to >= cats.length) return;
      const next = cats.slice();
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      set(['inquiry_categories'], next);
    }
    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>문의 유형 · Inquiry categories</h3></summary>
          <p className="desc">
            공개 사이트 Contact 폼의 \"문의 유형\" 드롭다운 항목입니다. <code>value</code>는 DB에 저장되는 슬러그
            (영문/숫자/언더스코어), 라벨은 KO/EN 양쪽을 채워주세요.
          </p>
          <button type="button" className="btn-add" onClick={() => addItem(['inquiry_categories'], { value: 'cat_' + Date.now().toString(36), label_ko: '새 유형', label_en: 'New category' })}>+ Add category</button>
        </details>
        {cats.length === 0 && (
          <div className="card" style={{textAlign:'center',color:'var(--fg-muted)',padding:32}}>No categories yet. Add one to start.</div>
        )}
        {cats.map((cat, i) => (
          <div className="card" key={i}>
            <div className="rep-head" style={{marginBottom:14}}>
              <strong>{cat.label_ko || cat.label_en || cat.value || '—'}</strong>
              <div className="ctrls">
                <button type="button" className="icon-btn" onClick={() => move(i, i - 1)} disabled={i === 0}>↑</button>
                <button type="button" className="icon-btn" onClick={() => move(i, i + 1)} disabled={i === cats.length - 1}>↓</button>
                <button type="button" className="icon-btn danger" onClick={() => { if (confirm('Delete this category?')) removeItem(['inquiry_categories'], i); }}>Delete</button>
              </div>
            </div>
            <div className="grid-3 tight">
              <Text label="Value (slug)" value={cat.value || ''} onChange={v => set(['inquiry_categories',i,'value'], v)} hint="Stored on the inquiry row. Lowercase, no spaces." />
              <Text label="Label" value={cat.label_en || ''} onChange={v => set(['inquiry_categories',i,'label_en'], v)} lang="en" />
            </div>
          </div>
        ))}
      </>
    );
  }

  function ConsentLogTab() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      (async () => {
        const token = adminToken();
        const res = await fetch('/api/consents?days=90', { headers: authHeaders() });
        if (res.ok) setItems((await res.json()).items || []);
        setLoading(false);
      })();
    }, []);
    if (loading) return <div className="card" style={{textAlign:'center',color:'var(--fg-muted)',padding:40}}>Loading…</div>;
    return (
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <table className="apps-table">
          <thead><tr><th>Time</th><th>Type</th><th>Version</th><th>Granted</th><th>User</th><th>Email</th><th>App ID</th><th>IP</th></tr></thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id}>
                <td><span style={{fontSize:11,fontFamily:'var(--font-mono)',color:'var(--fg-muted)'}}>{new Date(c.ts).toLocaleString()}</span></td>
                <td><strong style={{fontSize:13}}>{c.consent_type}</strong></td>
                <td>{c.version}</td>
                <td>{c.granted ? <span className="pill" style={{background:'var(--state-success-bg)',color:'var(--state-success)'}}>YES</span> : <span className="pill" style={{background:'var(--state-danger-bg)',color:'var(--state-danger)'}}>NO</span>}</td>
                <td><code style={{fontSize:11}}>{(c.user_id || '').slice(0, 14)}</code></td>
                <td>{c.email || '—'}</td>
                <td><code style={{fontSize:11}}>{c.application_id || '—'}</code></td>
                <td><code style={{fontSize:11,color:'var(--fg-muted)'}}>{c.ip}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ---- Legal documents ----------------------------------------------------
  function LegalTab({ c, set }) {
    const docs = c.legal || {};
    const DOC_KEYS = [
      { k: 'tos',                label: '서비스 이용약관' },
      { k: 'privacy_signup',     label: '개인정보 — 회원가입' },
      { k: 'privacy_apply',      label: '개인정보 — 지원서' },
      { k: 'third_party',        label: '제3자 제공' },
      { k: 'analytics_cookies',  label: '분석 쿠키' },
    ];
    const [activeDoc, setActiveDoc] = useState(() =>
      localStorage.getItem('dp_admin_legal_subtab') || DOC_KEYS[0].k);
    useEffect(() => { localStorage.setItem('dp_admin_legal_subtab', activeDoc); }, [activeDoc]);
    const active = DOC_KEYS.find(x => x.k === activeDoc) || DOC_KEYS[0];
    const k = active.k;
    const d = docs[k] || {};

    // Version bump helpers — parse "1.0" / "1.0.2" / "v1.2" loosely, bump
    // the requested segment, write back as "MAJOR.MINOR" (or original
    // shape if it had a patch). Falls back to "1.0" when value is empty.
    function parseVersion(v) {
      const s = String(v || '').replace(/^v/i, '').trim();
      const parts = s.split('.').map(p => parseInt(p, 10));
      while (parts.length < 2) parts.push(0);
      return parts.map(n => isNaN(n) ? 0 : n);
    }
    function fmtVersion(parts) {
      return parts.slice(0, Math.max(2, parts.length)).join('.');
    }
    function bumpVersion(level) {
      const parts = parseVersion(d.version);
      if (level === 'major') { parts[0] += 1; parts[1] = 0; if (parts[2] != null) parts[2] = 0; }
      else                   { parts[1] += 1; if (parts[2] != null) parts[2] = 0; }
      const next = fmtVersion(parts);
      set(['legal', k, 'version'], next);
      // Stamp today as the effective date so the version + date stay in sync.
      set(['legal', k, 'effective'], new Date().toISOString().slice(0, 10));
    }

    return (
      <>
        <div className="card" style={{background:'rgba(180,83,9,0.06)',border:'1px solid rgba(180,83,9,0.20)'}}>
          <p className="desc" style={{margin:0,fontSize:13}}>
            <strong>버전(version)을 올리면 모든 사용자에게 다시 동의를 요구</strong>합니다.
            오타·서식만 고친 경우엔 같은 버전을 유지하고, 문구·범위·목적이 바뀌면 직접 마이너(+0.1) 또는 메이저(+1.0) 버튼으로 올리세요.
          </p>
        </div>

        {/* Sub-tab strip — one button per document, sticky-style. */}
        <div className="card" style={{padding:'10px 12px',display:'flex',gap:6,flexWrap:'wrap'}}>
          {DOC_KEYS.map(it => {
            const dd = docs[it.k] || {};
            const isOn = it.k === activeDoc;
            return (
              <button key={it.k} type="button"
                onClick={() => setActiveDoc(it.k)}
                className="icon-btn"
                style={isOn
                  ? {background:'var(--midnight-purple)',color:'#fff',borderColor:'var(--midnight-purple)'}
                  : {}}>
                {it.label}
                <span style={{marginLeft:8,fontSize:11,fontFamily:'var(--font-mono)',opacity:0.75}}>
                  v{dd.version || '—'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14,gap:14,flexWrap:'wrap'}}>
            <div>
              <h3 style={{margin:0}}>{active.label}</h3>
              <div style={{fontSize:12,color:'var(--fg-muted)',marginTop:2,fontFamily:'var(--font-mono)'}}>c.legal.{k}</div>
            </div>
            <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 10px',background:'var(--bg-muted)',borderRadius:8}}>
                <span style={{fontSize:11,color:'var(--fg-muted)',fontWeight:600}}>버전</span>
                <input value={d.version || ''}
                  onChange={e => set(['legal',k,'version'], e.target.value)}
                  placeholder="1.0"
                  style={{width:74,padding:'4px 8px',border:'1px solid var(--border-default)',borderRadius:6,fontSize:13,fontFamily:'var(--font-mono)',fontWeight:700,textAlign:'center'}} />
              </div>
              <button type="button" className="icon-btn" title="마이너 버전 올리기 (1.0 → 1.1)" onClick={() => bumpVersion('minor')}>+0.1 마이너</button>
              <button type="button" className="icon-btn" title="메이저 버전 올리기 (1.x → 2.0)" onClick={() => bumpVersion('major')}>+1.0 메이저</button>
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 10px',background:'var(--bg-muted)',borderRadius:8}}>
                <span style={{fontSize:11,color:'var(--fg-muted)',fontWeight:600}}>효력일</span>
                <input type="date" value={d.effective || ''}
                  onChange={e => set(['legal',k,'effective'], e.target.value)}
                  style={{padding:'4px 8px',border:'1px solid var(--border-default)',borderRadius:6,fontSize:13}} />
              </div>
            </div>
          </div>
          <div className="grid-2 tight">
            {['ko','en'].map(L => (
              <React.Fragment key={L}>
                <Text label={`Title (${L.toUpperCase()})`} value={d[L]?.title || ''} onChange={v => set(['legal',k,L,'title'], v)} lang={L} />
                <Area label={`Summary (${L.toUpperCase()})`} value={d[L]?.summary || ''} onChange={v => set(['legal',k,L,'summary'], v)} lang={L} />
              </React.Fragment>
            ))}
            {['ko','en'].map(L => (
              <div key={'b'+L} className="field span-2">
                <label>Body ({L.toUpperCase()})</label>
                <window.RichEditor value={d[L]?.body || ''} onChange={v => set(['legal',k,L,'body'], v)} lang={L} minHeight={320} />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ---- API directory -----------------------------------------------------
  function ApiDirectoryTab() {
    const ENDPOINTS = [
      { method: 'GET',  path: '/api/health',                auth: 'public', desc: 'Service health.' },
      { method: 'GET',  path: '/sitemap.xml',               auth: 'public', desc: 'XML sitemap.' },
      { method: 'GET',  path: '/robots.txt',                auth: 'public', desc: 'Robots policy.' },
      { method: 'GET',  path: '/api/public/programs',       auth: 'public · CORS', desc: 'All programs (cards).' },
      { method: 'GET',  path: '/api/public/categories',     auth: 'public · CORS', desc: 'Unique program categories.' },
      { method: 'GET',  path: '/api/public/news',           auth: 'public · CORS', desc: 'Latest news posts (HTML body included).' },
      { method: 'GET',  path: '/api/public/partners',       auth: 'public · CORS', desc: 'Partner organizations.' },
      { method: 'GET',  path: '/api/public/stories',        auth: 'public · CORS', desc: 'Learner stories.' },
      { method: 'GET',  path: '/api/content',               auth: 'public', desc: 'Full content blob (KV).' },
      { method: 'GET',  path: '/api/news',                  auth: 'public', desc: 'News posts (raw, D1).' },
      { method: 'GET',  path: '/api/programs/:id/details',  auth: 'public', desc: 'Long-form program detail.' },
      { method: 'POST', path: '/api/applications',          auth: 'public', desc: 'Submit a program application.' },
      { method: 'POST', path: '/api/inquiries',             auth: 'public', desc: 'Submit a contact-form inquiry.' },
      { method: 'POST', path: '/api/auth/signup',           auth: 'public', desc: 'Create a member account.' },
      { method: 'POST', path: '/api/auth/login',            auth: 'public', desc: 'Log in.' },
      { method: 'POST', path: '/api/auth/logout',           auth: 'session', desc: 'Invalidate session.' },
      { method: 'GET',  path: '/api/auth/me',               auth: 'session', desc: 'Current user info.' },
      { method: 'GET',  path: '/api/me/profile',            auth: 'session', desc: 'Career profile.' },
      { method: 'PUT',  path: '/api/me/profile',            auth: 'session', desc: 'Update career profile.' },
      { method: 'GET',  path: '/api/me/applications',       auth: 'session', desc: "User's submitted applications." },
      { method: 'GET',  path: '/api/me/recommendations',    auth: 'session', desc: 'Personalized recommendations (stub).' },
      { method: 'GET',  path: '/api/me/export',             auth: 'session', desc: 'GDPR Art. 15 — export your data.' },
      { method: 'DELETE', path: '/api/me',                  auth: 'session', desc: 'GDPR Art. 17 — delete account.' },
      { method: 'POST', path: '/api/consents',              auth: 'public/session', desc: 'Record a consent.' },
      { method: 'GET',  path: '/api/applications/:id/receipt', auth: 'admin · session · token', desc: 'Receipt for paid application.' },
      { method: 'POST', path: '/api/analytics',             auth: 'public', desc: 'Ingest visitor events (batched).' },
      { method: 'POST', path: '/api/errors',                auth: 'public', desc: 'Report a client-side error.' },
      { method: 'GET',  path: '/api/wiki/:slug',            auth: 'public', desc: 'Read wiki page.' },
      { method: 'PUT',  path: '/api/content',               auth: 'admin', desc: 'Save content blob.' },
      { method: 'PUT',  path: '/api/wiki/:slug',            auth: 'admin', desc: 'Save wiki page.' },
      { method: 'PUT',  path: '/api/programs/:id/details',  auth: 'admin', desc: 'Save program details.' },
      { method: 'GET',  path: '/api/applications',          auth: 'admin', desc: 'List applications.' },
      { method: 'GET',  path: '/api/inquiries',             auth: 'admin', desc: 'List inquiries.' },
      { method: 'GET',  path: '/api/analytics/summary',     auth: 'admin', desc: 'Aggregate analytics.' },
      { method: 'GET',  path: '/api/analytics/journeys',    auth: 'admin', desc: 'Recent session journeys.' },
      { method: 'GET',  path: '/api/errors',                auth: 'admin', desc: 'List error logs.' },
      { method: 'POST', path: '/api/errors/clear',          auth: 'admin', desc: 'Wipe error logs.' },
      { method: 'GET',  path: '/api/consents',              auth: 'admin', desc: 'List consent records.' },
    ];

    const METHOD_COLOR = { GET:'#0094B4', POST:'#248737', PUT:'#6B2DBE', PATCH:'#92400E', DELETE:'#B91C1C' };
    const badgeBg = (a) => a.includes('admin') ? '#FEE2E2' : a.includes('session') ? '#DBEAFE' : '#DCFCE7';

    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{margin:'0 0 4px'}}>API directory</h3></summary>
          <p className="desc">Worker가 노출하는 모든 HTTP 엔드포인트. <code>/api/public/*</code>는 외부 통합용 CORS 허용. 그 외는 세션 토큰 또는 관리자 Bearer 필요.</p>
          <p className="desc" style={{marginTop:8}}>Base URL: <code>https://koreadreampath.com</code></p>
        </details>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table className="apps-table">
            <thead><tr><th style={{width:80}}>Method</th><th>Path</th><th style={{width:160}}>Auth</th><th>Description</th><th style={{width:80,textAlign:'right'}}></th></tr></thead>
            <tbody>
              {ENDPOINTS.map((e, i) => (
                <tr key={i}>
                  <td><span className="pill" style={{background: METHOD_COLOR[e.method] + '22', color: METHOD_COLOR[e.method]}}>{e.method}</span></td>
                  <td><code style={{fontFamily:'var(--font-mono)',fontSize:12}}>{e.path}</code></td>
                  <td><span className="pill" style={{background: badgeBg(e.auth), color:'var(--fg-primary)'}}>{e.auth}</span></td>
                  <td style={{fontSize:13}}>{e.desc}</td>
                  <td style={{textAlign:'right'}}>
                    {e.method === 'GET' && e.auth.includes('public') && !e.path.includes(':') && (
                      <a className="icon-btn" href={e.path} target="_blank" rel="noopener">Try ↗</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{margin:'0 0 8px'}}>외부 통합 예시</h3></summary>
          <pre style={{background:'#1F1B2E',color:'#E0DDFF',padding:14,borderRadius:8,fontSize:12,fontFamily:'var(--font-mono)',overflowX:'auto'}}>{`curl https://koreadreampath.com/api/public/programs
# → { "items": [{ id, title_ko, title_en, kicker, ... }, ...] }`}</pre>
        </details>
      </>
    );
  }

  // ---- Email templates ----------------------------------------------------
  // Authors transactional email copy. The send pipeline (provider, signing)
  // is wired separately when an email service is added; templates render the
  // {{var}} interpolation against application context.
  function EmailTemplatesTab({ c, set }) {
    const et = c.email_templates || { items: {} };
    const items = et.items || {};
    const KEYS = [
      { id: 'verify_signup',     label: '회원가입 이메일 인증 / Email verification', vars: '{{name}} · {{verify_url}}' },
      { id: 'reset_password',    label: '비밀번호 재설정 / Password reset',          vars: '{{name}} · {{reset_url}}' },
      { id: 'apply_received',    label: '지원 접수 알림 / Apply received',           vars: '{{name}} · {{application_id}}' },
      { id: 'inquiry_received',  label: '문의 접수 알림 / Inquiry received',         vars: '{{name}} · {{inquiry_id}}' },
    ];
    // Test-send state: per-template "to" field + last result.
    const [testTo, setTestTo] = useState('');
    const [testing, setTesting] = useState(null);   // slug being sent
    const [result, setResult] = useState(null);     // { slug, sent, reason, err }

    async function sendTest(slug) {
      if (!testTo) { alert('Enter a recipient email first.'); return; }
      setTesting(slug); setResult(null);
      const token = adminToken();
      try {
        const r = await fetch('/api/admin/email/test', {
          method: 'POST',
          headers: authHeaders({ 'content-type': 'application/json' }),
          body: JSON.stringify({ to: testTo, slug, lang: 'ko' }),
        });
        const d = await r.json().catch(() => ({}));
        setResult({ slug, ...d });
      } catch (e) { setResult({ slug, sent: false, reason: 'network', err: String(e.message || e) }); }
      finally { setTesting(null); }
    }

    return (
      <>
        <details className="card admin-fold" style={{background:'var(--state-info-bg)',borderColor:'var(--state-info)'}} open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3 style={{color:'var(--state-info)',margin:'0 0 6px'}}>Resend integration</h3></summary>
          <p className="desc" style={{color:'var(--state-info)',margin:0,fontSize:13}}>
            Set <code>RESEND_API_KEY</code> as a worker secret to enable real sends.{' '}
            <code>wrangler secret put RESEND_API_KEY</code>. Until then signup / verify / reset
            return the token in the response so flows can still be tested manually.
          </p>
        </details>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Sender identity</h3></summary>
          <p className="desc">Used as the "From" header on every transactional email. Make sure the <code>from_email</code> domain is verified in Resend (SPF + DKIM).</p>
          <div className="grid-2 tight">
            <Text label="From name"  value={et.from_name || ''}  onChange={v => set(['email_templates','from_name'], v)} />
            <Text label="From email" value={et.from_email || ''} onChange={v => set(['email_templates','from_email'], v)} />
          </div>
          <div className="field" style={{marginTop:14}}>
            <label>Forward inbound to (optional)</label>
            <input type="email" value={et.forward_to || ''} onChange={e => set(['email_templates','forward_to'], e.target.value)} placeholder="you@gmail.com" />
            <span className="hint">When set, every inbound email (info@, partner@, …) is also forwarded here, on top of the admin 메일함. The address <strong>must be verified</strong> in Cloudflare → Email → Routing → Destination addresses, or forwarding fails (logged, never bounced).</span>
          </div>
          <div className="field" style={{marginTop:14}}>
            <label>Test recipient (for the buttons below)</label>
            <input type="email" value={testTo} onChange={e => setTestTo(e.target.value)} placeholder="you@example.com" />
            <span className="hint">Sends a real email using the current template + Resend. Variables are filled with placeholder values.</span>
          </div>
          {result && (
            <div role="status" style={{marginTop:14,padding:'10px 14px',borderRadius:8,
              background: result.sent ? 'var(--state-success-bg)' : 'var(--state-warning-bg)',
              color: result.sent ? 'var(--state-success)' : 'var(--state-warning)', fontSize:13}}>
              <strong>{result.slug}</strong>: {result.sent ? '✓ Sent' : `✗ ${result.reason || 'failed'}`}
              {result.err && <div style={{marginTop:6,fontFamily:'var(--font-mono)',fontSize:11,opacity:0.8}}>{result.err}</div>}
              {!result.sent && result.reason === 'no_key' && <div style={{marginTop:4,fontSize:11,opacity:0.8}}>RESEND_API_KEY not configured — set the worker secret.</div>}
            </div>
          )}
        </details>
        {KEYS.map(k => {
          const t = items[k.id] || {};
          return (
            <div className="card" key={k.id}>
              <div className="rep-head" style={{marginBottom:14}}>
                <strong>{k.label}</strong>
                <code style={{fontSize:11,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>{k.id}</code>
              </div>
              <p className="desc" style={{margin:'0 0 12px'}}>Variables available: <code>{k.vars}</code></p>
              <div className="grid-2 tight">
                <Text label="Subject" value={t.subject_en || ''} onChange={v => set(['email_templates','items',k.id,'subject_en'], v)} lang="en" />
                <Area label="Body" value={t.body_en || ''} onChange={v => set(['email_templates','items',k.id,'body_en'], v)} lang="en" rows={8} />
              </div>
              <div style={{marginTop:14,display:'flex',justifyContent:'flex-end'}}>
                <button type="button" className="icon-btn" onClick={() => sendTest(k.id)} disabled={testing === k.id || !testTo}>
                  {testing === k.id ? 'Sending…' : 'Send test'}
                </button>
              </div>
            </div>
          );
        })}
      </>
    );
  }

  // ---- Receipt template ---------------------------------------------------
  // Operator uploads a background image (their letterhead / official receipt
  // form), defines field positions in pixels, and the public /receipt page
  // overlays the live application data. The user prints to PDF.
  function ReceiptTemplateTab({ c, set, addItem, removeItem }) {
    const tpl = c.receipt_template || {};
    const fields = Array.isArray(tpl.fields) ? tpl.fields : [];
    // Sample data so the operator can preview the rendered receipt without
    // a real application. Keys match what Receipt.jsx resolves at runtime.
    const SAMPLE = {
      id: 'A-PREVIEW-0001', date: new Date().toLocaleString(),
      payer: { name: 'Sample Visitor', email: 'sample@example.com', country: 'Korea' },
      program: 'Korean Studies, online',
      track: 'Full scholarship', partial_tier: '70',
      amount: 10, currency: 'USD',
      payment: { method: 'card', card_last4: '4242' },
      issuer: { name: 'KoreaDreamPath', email: 'info@koreadreampath.com' },
      paid_at: new Date().toISOString(),
    };
    const FIELD_KEYS = ['id','date','name','email','country','program','track','partial_tier','amount','currency','payment_method','card_last4','issuer_name','issuer_email'];

    const [previewScale, setPreviewScale] = useState(0.4);
    function moveField(from, to) {
      if (to < 0 || to >= fields.length) return;
      const next = fields.slice();
      const [m] = next.splice(from, 1); next.splice(to, 0, m);
      set(['receipt_template','fields'], next);
    }
    function addField() {
      addItem(['receipt_template','fields'], {
        key: 'name', x: 80, y: 200, w: 600, font_size: 14, color: '#1A1A1A', align: 'left', weight: 400,
      });
    }

    return (
      <>
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Receipt template</h3></summary>
          <p className="desc">
            Upload a background image (your letterhead / receipt form), define field
            positions, and the public <code>/receipt</code> page auto-fills application data
            on top of it. Recommended: A4 at 150 dpi (1240×1754 px).
          </p>
          <div className="grid-2 tight">
            <div className="field">
              <label>Enabled</label>
              <select value={tpl.enabled ? 'yes' : 'no'} onChange={e => set(['receipt_template','enabled'], e.target.value === 'yes')}>
                <option value="no">No (use default HTML receipt)</option>
                <option value="yes">Yes (use this template)</option>
              </select>
            </div>
            <Text label="Background image URL" value={tpl.background_url || ''} onChange={v => set(['receipt_template','background_url'], v)} hint="Absolute https URL or path starting with /" />
            <div className="field">
              <label>Page width (px)</label>
              <input type="number" value={tpl.page_w || 1240} onChange={e => set(['receipt_template','page_w'], parseInt(e.target.value, 10) || 1240)} />
            </div>
            <div className="field">
              <label>Page height (px)</label>
              <input type="number" value={tpl.page_h || 1754} onChange={e => set(['receipt_template','page_h'], parseInt(e.target.value, 10) || 1754)} />
            </div>
          </div>
        </details>

        {/* Live preview pinned at the top of the field list. The operator
            adjusts numbers below and watches the preview update. */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,gap:10,flexWrap:'wrap'}}>
            <h3 style={{margin:0}}>Live preview</h3>
            <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--fg-muted)'}}>
              <span>Zoom</span>
              <input type="range" min="0.2" max="1" step="0.05" value={previewScale} onChange={e => setPreviewScale(parseFloat(e.target.value))} />
              <span style={{fontFamily:'var(--font-mono)',width:50,textAlign:'right'}}>{Math.round(previewScale * 100)}%</span>
            </div>
          </div>
          {!tpl.background_url && <div style={{padding:32,background:'var(--bg-muted)',borderRadius:10,color:'var(--fg-muted)',textAlign:'center'}}>Upload a background image to start.</div>}
          {tpl.background_url && (
            <div style={{overflow:'auto',background:'var(--bg-muted)',padding:20,borderRadius:10}}>
              <div style={{
                position:'relative', flex:'0 0 auto',
                width: tpl.page_w || 1240, height: tpl.page_h || 1754,
                transform: 'scale(' + previewScale + ')', transformOrigin: 'top left',
                background: `url(${tpl.background_url}) no-repeat top left / 100% 100%, #fff`,
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              }}>
                {fields.map((f, i) => {
                  const VALUE = {
                    id: SAMPLE.id, date: SAMPLE.date, name: SAMPLE.payer.name,
                    email: SAMPLE.payer.email, country: SAMPLE.payer.country,
                    program: SAMPLE.program, track: SAMPLE.track, partial_tier: SAMPLE.partial_tier,
                    amount: SAMPLE.amount, currency: SAMPLE.currency,
                    payment_method: SAMPLE.payment.method, card_last4: '•••• ' + SAMPLE.payment.card_last4,
                    issuer_name: SAMPLE.issuer.name, issuer_email: SAMPLE.issuer.email,
                  };
                  const raw = VALUE[f.key];
                  const text = (f.prefix || '') + String(raw == null ? f.key.toUpperCase() : raw) + (f.suffix || '');
                  return (
                    <div key={i} style={{
                      position:'absolute', left:f.x, top:f.y, width:f.w || 'auto',
                      fontSize:f.font_size || 14, color:f.color || '#1A1A1A',
                      fontWeight:f.weight || 400, textAlign:f.align || 'left',
                      lineHeight: 1.2, fontFamily:'var(--font-en)',
                      outline: '1px dashed rgba(98,37,153,0.5)',  // visible only in editor
                    }}>{text}</div>
                  );
                })}
              </div>
              {/* Reserve space so the scaled stage doesn't overflow the card */}
              <div style={{height: (tpl.page_h || 1754) * previewScale}} aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Field list editor */}
        <details className="card admin-fold" open><summary><span className="fold-chevron" aria-hidden="true">▶</span><h3>Fields ({fields.length})</h3></summary>
          <p className="desc">Each field overlays a single piece of data on the background. Move with ↑↓ to control z-order.</p>
          <button type="button" className="btn-add" onClick={addField}>+ Add field</button>
        </details>
        {fields.map((f, i) => (
          <div className="card" key={i}>
            <div className="rep-head" style={{marginBottom:14}}>
              <strong>{i + 1}. <code style={{fontFamily:'var(--font-mono)',fontSize:13}}>{f.key}</code></strong>
              <div className="ctrls">
                <button type="button" className="icon-btn" onClick={() => moveField(i, i - 1)} disabled={i === 0}>↑</button>
                <button type="button" className="icon-btn" onClick={() => moveField(i, i + 1)} disabled={i === fields.length - 1}>↓</button>
                <button type="button" className="icon-btn danger" onClick={() => removeItem(['receipt_template','fields'], i)}>Delete</button>
              </div>
            </div>
            <div className="grid-3 tight">
              <div className="field">
                <label>Data key</label>
                <select value={f.key || 'name'} onChange={e => set(['receipt_template','fields',i,'key'], e.target.value)}>
                  {FIELD_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="field"><label>Prefix</label><input type="text" value={f.prefix || ''} onChange={e => set(['receipt_template','fields',i,'prefix'], e.target.value)} placeholder="$ # " /></div>
              <div className="field"><label>Suffix</label><input type="text" value={f.suffix || ''} onChange={e => set(['receipt_template','fields',i,'suffix'], e.target.value)} placeholder=" USD" /></div>
              <div className="field"><label>X (px)</label><input type="number" value={f.x ?? 0} onChange={e => set(['receipt_template','fields',i,'x'], parseInt(e.target.value, 10) || 0)} /></div>
              <div className="field"><label>Y (px)</label><input type="number" value={f.y ?? 0} onChange={e => set(['receipt_template','fields',i,'y'], parseInt(e.target.value, 10) || 0)} /></div>
              <div className="field"><label>Width (px)</label><input type="number" value={f.w ?? ''} onChange={e => set(['receipt_template','fields',i,'w'], e.target.value ? parseInt(e.target.value, 10) : null)} placeholder="auto" /></div>
              <div className="field"><label>Font size (px)</label><input type="number" value={f.font_size ?? 14} onChange={e => set(['receipt_template','fields',i,'font_size'], parseInt(e.target.value, 10) || 14)} /></div>
              <div className="field">
                <label>Weight</label>
                <select value={String(f.weight || 400)} onChange={e => set(['receipt_template','fields',i,'weight'], parseInt(e.target.value, 10))}>
                  <option value="300">300 light</option><option value="400">400 normal</option><option value="500">500 medium</option><option value="600">600 semi</option><option value="700">700 bold</option>
                </select>
              </div>
              <div className="field">
                <label>Align</label>
                <select value={f.align || 'left'} onChange={e => set(['receipt_template','fields',i,'align'], e.target.value)}>
                  <option value="left">left</option><option value="center">center</option><option value="right">right</option>
                </select>
              </div>
              <Color label="Color" value={f.color || '#1A1A1A'} onChange={v => set(['receipt_template','fields',i,'color'], v)} />
            </div>
          </div>
        ))}
      </>
    );
  }
