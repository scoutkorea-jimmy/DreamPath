// Scholarships.jsx — board (게시판) of scholarship opportunities that
// KoreaDreamPath admins post and maintain themselves. Posts live server-side
// (D1 scholarship_posts via /api/scholarships). Admins create/edit/delete them
// inline on the public page while signed in. Clicking a board item opens an
// INTERNAL detail page (/scholarship/:id) that shows the full info on our site
// (image, labelled info rows like 장학자격/범위, long body, and the external
// apply link). Public front is English; visitors read anonymously.
const { useState: useStateSch, useMemo: useMemoSch } = React;

// Categories the operator asked to keep. The editor offers these; the filter
// chips derive from whatever categories actually appear so custom ones show.
const SCHOLARSHIP_CATEGORIES = ['Government', 'University', 'Private / Foundation'];

// info_json is a JSON array of {label, value}. Accept an array or a string.
function parseScholarshipInfo(v) {
  if (Array.isArray(v)) return v.filter(r => r && (r.label || r.value));
  if (typeof v === 'string' && v.trim()) {
    try { const a = JSON.parse(v); return Array.isArray(a) ? a.filter(r => r && (r.label || r.value)) : []; }
    catch { return []; }
  }
  return [];
}

// ── Board page ───────────────────────────────────────────────────────────────
function Scholarships({ go, lang, c }) {
  const isKo = lang === 'ko';
  const auth = window.useAuth ? window.useAuth() : { user: null, ready: true };
  const canEdit = !!(auth.user && auth.user.role === 'admin');

  const ph = ((c && c.page_heros && c.page_heros.scholarships && (c.page_heros.scholarships.en || c.page_heros.scholarships[lang])) || {});
  const hero = { kicker: ph.kicker, title_l1: ph.title_l1, title_l2: ph.title_l2, sub: ph.sub };
  const hb = window.useHeroBg((c && c.page_heros && c.page_heros.scholarships) || {});
  const s = (c && c.scholarships) || {};
  const intro = (s.intro && (s.intro.en || s.intro[lang])) || '';

  const [items, setItems] = useStateSch([]);
  const [loading, setLoading] = useStateSch(true);
  const [err, setErr] = useStateSch('');
  const [editing, setEditing] = useStateSch(null);
  const [cat, setCat] = useStateSch('all');

  async function load() {
    setLoading(true); setErr('');
    try {
      const res = await fetch('/api/scholarships');
      if (!res.ok) throw new Error('http_' + res.status);
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      setErr(isKo ? '장학 정보를 불러오지 못했습니다.' : 'Failed to load scholarships.');
    }
    setLoading(false);
  }
  React.useEffect(() => { load(); }, []);

  async function savePost(post) {
    setErr('');
    const isNew = !post.id;
    const url = isNew ? '/api/scholarships' : '/api/scholarships/' + encodeURIComponent(post.id);
    try {
      const res = await window.DreamPathAuth.authFetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(post),
      });
      if (!res.ok) throw new Error('http_' + res.status);
      setEditing(null);
      load();
    } catch (e) {
      setErr(isKo ? '저장 실패' : 'Save failed');
    }
  }

  async function deletePost(id) {
    if (!confirm(isKo ? '이 장학 정보를 삭제하시겠습니까?' : 'Delete this scholarship?')) return;
    try {
      const res = await window.DreamPathAuth.authFetch('/api/scholarships/' + encodeURIComponent(id), { method: 'DELETE' });
      if (!res.ok) throw new Error('http_' + res.status);
      load();
    } catch (e) {
      setErr(isKo ? '삭제 실패' : 'Delete failed');
    }
  }

  const cats = useMemoSch(() => {
    const seen = [];
    items.forEach(it => { const k = (it.category || '').trim(); if (k && seen.indexOf(k) === -1) seen.push(k); });
    return seen;
  }, [items]);
  const visible = cat === 'all' ? items : items.filter(it => (it.category || '').trim() === cat);

  function newPost() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    setEditing({ category: 'Government', title: '', organizer: '', summary: '', period: '', details: '', apply_url: '', image: '', info: [], date: today });
  }
  function editPost(it) {
    setEditing({ ...it, info: parseScholarshipInfo(it.info_json) });
  }

  return (
    <div data-screen-label="Scholarships">
      <div className={('phead ' + hb.cls).trim()} style={hb.style}>
        <div className="inner">
          <div className="sec-kicker">{hero.kicker}</div>
          <h1 className={isKo ? '' : 'en'}>
            {hero.title_l1}{hero.title_l2 ? <><br/>{hero.title_l2}</> : null}
          </h1>
          <p>{hero.sub}</p>
        </div>
      </div>
      <section className="section">
        <div className="container">
          {intro ? (
            <div className="schol-note">
              <i data-lucide="info" width="18" height="18" aria-hidden="true"></i>
              <p>{intro}</p>
            </div>
          ) : null}

          {canEdit && (
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:18}}>
              <button className="btn btn-primary btn-sm" onClick={newPost}>
                + {isKo ? '장학 정보 등록' : 'New scholarship'}
              </button>
            </div>
          )}

          {err && <div role="alert" style={{padding:'8px 12px',background:'var(--state-danger-bg)',color:'var(--state-danger)',borderRadius:8,fontSize:14,marginBottom:16}}>{err}</div>}

          {cats.length > 1 ? (
            <div className="schol-filters" role="tablist" aria-label="Scholarship categories">
              <button type="button" className={'schol-chip' + (cat === 'all' ? ' is-active' : '')} onClick={() => setCat('all')}>
                {isKo ? '전체' : 'All'}
              </button>
              {cats.map(cName => (
                <button type="button" key={cName} className={'schol-chip' + (cat === cName ? ' is-active' : '')} onClick={() => setCat(cName)}>
                  {cName}
                </button>
              ))}
            </div>
          ) : null}

          {loading ? (
            <div className="schol-empty">{isKo ? '불러오는 중…' : 'Loading…'}</div>
          ) : visible.length === 0 ? (
            <div className="schol-empty">
              {isKo ? '등록된 장학 정보가 없습니다.' : 'No scholarships posted yet.'}
            </div>
          ) : (
            <div className="schol-board">
              {visible.map(it => (
                <article key={it.id} className="schol-row">
                  {it.image ? (
                    <button type="button" className="schol-thumb" onClick={() => go('scholarshipdetail', it.id)} aria-label={it.title}
                      style={{backgroundImage:`url("${it.image}")`}} />
                  ) : null}
                  <div className="schol-row-body">
                    <div className="schol-row-top">
                      {it.category ? <span className="schol-cat">{it.category}</span> : null}
                      {it.period ? (
                        <span className="schol-deadline">
                          <i data-lucide="calendar" width="13" height="13" aria-hidden="true"></i>{it.period}
                        </span>
                      ) : null}
                      {it.date ? <span className="schol-date">{it.date}</span> : null}
                    </div>
                    <h3 className={isKo ? '' : 'en'}>
                      <button type="button" className="schol-titlebtn" onClick={() => go('scholarshipdetail', it.id)}>{it.title}</button>
                    </h3>
                    {it.organizer ? (
                      <div className="schol-provider">
                        <i data-lucide="building-2" width="14" height="14" aria-hidden="true"></i>{it.organizer}
                      </div>
                    ) : null}
                    {it.summary ? <p className="schol-summary">{it.summary}</p> : null}
                    <div className="schol-row-foot">
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        {canEdit && (
                          <>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => editPost(it)}>{isKo ? '수정' : 'Edit'}</button>
                            <button type="button" className="btn btn-ghost btn-sm" style={{color:'var(--state-danger)'}} onClick={() => deletePost(it.id)}>{isKo ? '삭제' : 'Delete'}</button>
                          </>
                        )}
                      </div>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => go('scholarshipdetail', it.id)}>
                        {isKo ? '자세히 보기' : 'View details'} <i data-lucide="arrow-right" width="14" height="14" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      {editing && <ScholarshipEditor post={editing} onSave={savePost} onCancel={() => setEditing(null)} isKo={isKo} />}
    </div>
  );
}

// ── Detail page (/scholarship/:id) — full info hosted on our site ─────────────
function ScholarshipDetail({ go, lang, c, scholarshipId }) {
  const isKo = lang === 'ko';
  const [post, setPost] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    if (!scholarshipId) { setLoading(false); setErr('not_found'); return; }
    let alive = true;
    setLoading(true); setErr('');
    fetch('/api/scholarships/' + encodeURIComponent(scholarshipId))
      .then(r => { if (!r.ok) throw new Error('http_' + r.status); return r.json(); })
      .then(d => { if (alive) { setPost(d); setLoading(false); } })
      .catch(() => { if (alive) { setErr('not_found'); setLoading(false); } });
    return () => { alive = false; };
  }, [scholarshipId]);

  if (loading) {
    return <div data-screen-label="ScholarshipDetail"><div className="phead"><div className="inner"><h1 className="en">{isKo ? '불러오는 중…' : 'Loading…'}</h1></div></div></div>;
  }
  if (err || !post) {
    return (
      <div data-screen-label="ScholarshipDetail">
        <div className="phead"><div className="inner"><h1 className="en">{isKo ? '찾을 수 없습니다' : 'Not found'}</h1></div></div>
        <section className="section"><div className="container-narrow">
          <button type="button" className="btn btn-secondary" onClick={() => go('scholarships')}>← {isKo ? '장학 목록으로' : 'All scholarships'}</button>
        </div></section>
      </div>
    );
  }

  const info = parseScholarshipInfo(post.info_json);
  const rawUrl = (post.apply_url || '').trim();
  const href = rawUrl ? (/^https?:\/\//i.test(rawUrl) ? rawUrl : 'https://' + rawUrl) : '';

  return (
    <div data-screen-label="ScholarshipDetail">
      <div className="phead">
        <div className="inner">
          <div className="sec-kicker">
            {post.category && <span className="schol-cat" style={{marginRight:8}}>{post.category}</span>}
            {post.period && <span className="schol-deadline"><i data-lucide="calendar" width="13" height="13" aria-hidden="true"></i>{post.period}</span>}
          </div>
          <h1 className={isKo ? '' : 'en'}>{post.title}</h1>
          {post.organizer ? (
            <p className="schol-detail-org"><i data-lucide="building-2" width="15" height="15" aria-hidden="true"></i>{post.organizer}</p>
          ) : null}
        </div>
      </div>
      <section className="section">
        <div className="container-narrow">
          {post.image ? (
            <img className="schol-detail-img" src={post.image} alt={post.title || ''} loading="lazy" />
          ) : null}

          {post.summary ? <p className="schol-detail-lead">{post.summary}</p> : null}

          {info.length ? (
            <dl className="schol-info">
              {info.map((row, i) => (
                <div className="schol-info-row" key={i}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {post.details && post.details.trim() ? (
            <div className="schol-detail-body">{post.details}</div>
          ) : null}

          <div className="schol-detail-cta">
            {href ? (
              <a className="btn btn-primary btn-lg" href={href} target="_blank" rel="noopener noreferrer">
                {isKo ? '신청하러 가기' : 'Go to application'} <i data-lucide="arrow-up-right" width="16" height="16" aria-hidden="true"></i>
              </a>
            ) : null}
            <button type="button" className="btn btn-secondary" onClick={() => go('scholarships')}>
              ← {isKo ? '장학 목록으로' : 'All scholarships'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Editor modal (admin) ─────────────────────────────────────────────────────
function ScholarshipEditor({ post, onSave, onCancel, isKo }) {
  const [draft, setDraft] = React.useState(post);
  const upd = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const info = Array.isArray(draft.info) ? draft.info : [];
  const setInfo = (next) => upd('info', next);
  const addInfo = (label) => setInfo([...info, { label: label || '', value: '' }]);
  const updInfo = (i, k, v) => setInfo(info.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const rmInfo = (i) => setInfo(info.filter((_, idx) => idx !== i));

  const cats = SCHOLARSHIP_CATEGORIES.slice();
  if (draft.category && cats.indexOf(draft.category) === -1) cats.push(draft.category);

  // Common info labels the operator can one-click add (examples, not required).
  const QUICK = isKo
    ? [['장학 자격', '장학 자격'], ['지원 범위', '지원 범위'], ['지원 대상', '지원 대상'], ['선발 인원', '선발 인원']]
    : [['Eligibility', 'Eligibility'], ['Coverage', 'Coverage'], ['Who can apply', 'Who can apply'], ['# of awards', '# of awards']];

  return (
    <div className="auth-overlay" onClick={onCancel}>
      <div className="auth-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" style={{maxWidth:720}}>
        <button type="button" className="auth-close" onClick={onCancel} aria-label="close">×</button>
        <h2>{post.id ? (isKo ? '장학 정보 수정' : 'Edit scholarship') : (isKo ? '장학 정보 등록' : 'New scholarship')}</h2>

        <label className="auth-field"><span>{isKo ? '장학금 명칭' : 'Scholarship name'}</span>
          <input value={draft.title || ''} onChange={e => upd('title', e.target.value)} /></label>
        <label className="auth-field"><span>{isKo ? '주최기관' : 'Host / organizer'}</span>
          <input value={draft.organizer || ''} onChange={e => upd('organizer', e.target.value)} /></label>
        <label className="auth-field"><span>{isKo ? '분류' : 'Category'}</span>
          <select value={draft.category || 'Government'} onChange={e => upd('category', e.target.value)}>
            {cats.map(x => <option key={x} value={x}>{x}</option>)}
          </select></label>
        <label className="auth-field"><span>{isKo ? '접수기간' : 'Application period'}</span>
          <input value={draft.period || ''} onChange={e => upd('period', e.target.value)} placeholder={isKo ? '예: 2026.09.01 ~ 09.30' : 'e.g. 2026.09.01 – 09.30'} /></label>
        <label className="auth-field"><span>{isKo ? '게시일' : 'Posted date'}</span>
          <input value={draft.date || ''} onChange={e => upd('date', e.target.value)} placeholder="YYYY.MM.DD" /></label>

        <div className="auth-field"><span>{isKo ? '대표 이미지 (선택)' : 'Feature image (optional)'}</span>
          <ScholarshipImageField value={draft.image || ''} onChange={v => upd('image', v)} isKo={isKo} />
        </div>

        <label className="auth-field"><span>{isKo ? '내용 (한 줄 요약)' : 'Summary'}</span>
          <textarea rows={2} value={draft.summary || ''} onChange={e => upd('summary', e.target.value)} /></label>

        <div className="auth-field">
          <span>{isKo ? '세부 정보 (장학자격 · 범위 등)' : 'Info rows (eligibility, coverage, …)'}</span>
          {info.map((row, i) => (
            <div key={i} style={{display:'flex',gap:8,marginBottom:8,alignItems:'flex-start'}}>
              <input style={{flex:'0 0 34%'}} placeholder={isKo ? '항목 (예: 장학 자격)' : 'Label (e.g. Eligibility)'} value={row.label || ''} onChange={e => updInfo(i, 'label', e.target.value)} />
              <textarea style={{flex:1}} rows={1} placeholder={isKo ? '내용' : 'Value'} value={row.value || ''} onChange={e => updInfo(i, 'value', e.target.value)} />
              <button type="button" className="btn btn-ghost btn-sm" style={{color:'var(--state-danger)'}} onClick={() => rmInfo(i)} aria-label="remove">×</button>
            </div>
          ))}
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => addInfo('')}>+ {isKo ? '항목 추가' : 'Add row'}</button>
            {QUICK.map(([key, label]) => (
              <button type="button" key={key} className="btn btn-ghost btn-sm" onClick={() => addInfo(label)}>+ {label}</button>
            ))}
          </div>
        </div>

        <label className="auth-field"><span>{isKo ? '주요내용 (본문)' : 'Details (body)'}</span>
          <textarea rows={6} value={draft.details || ''} onChange={e => upd('details', e.target.value)} /></label>
        <label className="auth-field"><span>{isKo ? '신청하러가기 링크' : 'Apply link (URL)'}</span>
          <input value={draft.apply_url || ''} onChange={e => upd('apply_url', e.target.value)} placeholder="https://…" /></label>

        <div style={{display:'flex',gap:8,marginTop:16,justifyContent:'flex-end'}}>
          <button className="btn btn-secondary" type="button" onClick={onCancel}>{isKo ? '취소' : 'Cancel'}</button>
          <button className="btn btn-primary" type="button" onClick={() => onSave(draft)}>{isKo ? '저장' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

// Image uploader — admins post a data URL to /api/admin/upload-image (session
// auth via authFetch; isAdmin accepts an admin session) and store the returned
// /uploads/ URL. Falls back to pasting a URL directly.
function ScholarshipImageField({ value, onChange, isKo }) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setErr(isKo ? '4MB 이하 이미지만 업로드' : 'Max 4MB'); return; }
    setErr(''); setBusy(true);
    try {
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
      });
      const resp = await window.DreamPathAuth.authFetch('/api/admin/upload-image', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dataUrl }),
      });
      if (!resp.ok) throw new Error('upload_failed');
      const j = await resp.json();
      onChange(j.url);
    } catch { setErr(isKo ? '업로드 실패' : 'Upload failed'); }
    setBusy(false);
  }
  return (
    <div>
      {value ? (
        <div style={{marginBottom:8}}>
          <img src={value} alt="" style={{maxWidth:'100%',maxHeight:160,borderRadius:10,border:'1px solid var(--border-subtle)',display:'block'}} />
          <button type="button" className="btn btn-ghost btn-sm" style={{marginTop:6,color:'var(--state-danger)'}} onClick={() => onChange('')}>{isKo ? '이미지 제거' : 'Remove image'}</button>
        </div>
      ) : null}
      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onFile} disabled={busy} />
      {busy && <span style={{marginLeft:8,fontSize:13,color:'var(--fg-muted)'}}>{isKo ? '업로드 중…' : 'Uploading…'}</span>}
      {err && <span style={{marginLeft:8,fontSize:13,color:'var(--state-danger)'}}>{err}</span>}
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={isKo ? '또는 이미지 URL 붙여넣기' : 'or paste an image URL'} style={{marginTop:8,width:'100%'}} />
    </div>
  );
}

window.Scholarships = Scholarships;
window.ScholarshipDetail = ScholarshipDetail;
