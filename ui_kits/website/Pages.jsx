// Partners + Stories + News + Contact (bundled) — content-driven via c.page_heros
function PageHero({ h, isKo, bg }) {
  const hb = window.useHeroBg(bg);
  return (
    <div className={('phead ' + hb.cls).trim()} style={hb.style}>
      <div className="inner">
        <div className="sec-kicker">{h.kicker}</div>
        <h1 className={isKo ? '' : 'en'}>
          {h.title_l1}{h.title_l2 ? <><br/>{h.title_l2}</> : null}
        </h1>
        <p>{h.sub}</p>
      </div>
    </div>
  );
}

function Partners({ lang, c }) {
  const isKo = lang === 'ko';
  const list = (c && c.partners) || window.PARTNERS;
  const h = ((c && c.page_heros && c.page_heros.partners && (c.page_heros.partners.en || c.page_heros.partners[lang])) || {});
  return (
    <div data-screen-label="Partners">
      <PageHero h={h} isKo={isKo} bg={(c && c.page_heros && c.page_heros.partners) || {}} />
      <section className="section">
        <div className="container">
          <div className="partners-grid">
            {list.map((p, i) => {
              const inner = (
                <>
                  <div className={'partner-logo' + (p.logo ? ' has-img' : '')} style={{'--c': p.color}}>
                    {p.logo ? <img src={p.logo} alt={p.name} loading="lazy" /> : p.name}
                  </div>
                  <div className="partner-body">
                    <div className="partner-role">{isKo ? p.role_ko : p.role_en}</div>
                    <div className={'partner-name' + (isKo ? '' : ' en')}>{p.name}</div>
                    <div className="partner-full">{p.full}</div>
                  </div>
                </>
              );
              return p.url
                ? <a key={i} className="partner partner-link" href={p.url} target="_blank" rel="noopener noreferrer">{inner}</a>
                : <div key={i} className="partner">{inner}</div>;
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

// Resolve a story's stable id. We prefer an explicit `id`/`slug`, then fall
// back to `s1`, `s2`, ... so legacy stories without an id still get a URL.
function storyIdOf(s, i) { return (s && (s.id || s.slug)) || ('s' + (i + 1)); }

function Stories({ go, lang, c }) {
  const isKo = lang === 'ko';
  const list = (c && c.stories) || window.STORIES;
  const h = ((c && c.page_heros && c.page_heros.stories && (c.page_heros.stories.en || c.page_heros.stories[lang])) || {});
  // Two groups: leaders who recommend the program, and learner reviews.
  const card = (s) => {
    const i = list.indexOf(s);
    const sid = storyIdOf(s, i);
    return (
      <button key={sid} type="button" onClick={() => go && go('storydetail', sid)}
        className="story"
        style={{'--c1': s.tag_color, '--c2': 'var(--scouting-purple)', textAlign:'left', cursor:'pointer', font:'inherit', color:'inherit'}}>
        <span className="tag" style={{background: s.tag_color + '22', color: s.tag_color}}>{s.tag}</span>
        <blockquote className={isKo ? '' : 'en'}>"{s.quote_en || s.quote_ko}"</blockquote>
        <div className="story-foot">
          <div className="story-avatar" />
          <div>
            <div className="story-name">{s.name}</div>
            <div className="story-prog">{s.program}</div>
          </div>
        </div>
      </button>
    );
  };
  const leaders = list.filter(s => s.kind === 'leader');
  const learners = list.filter(s => s.kind !== 'leader');
  const Section = ({ kicker, title, items, muted }) => items.length === 0 ? null : (
    <section className="section" style={muted ? { background: 'var(--bg-muted)' } : null}>
      <div className="container">
        <div className="sec-kicker">{kicker}</div>
        {title ? <h2 className="en" style={{margin:'4px 0 28px',fontSize:'clamp(26px,3.4vw,40px)'}}>{title}</h2> : null}
        <div className="stories-grid">{items.map(card)}</div>
      </div>
    </section>
  );
  return (
    <div data-screen-label="Stories">
      <PageHero h={h} isKo={isKo} bg={(c && c.page_heros && c.page_heros.stories) || {}} />
      <Section kicker="LEADERS WHO RECOMMEND" title="Voices from leaders" items={leaders} />
      <Section kicker="LEARNER STORIES" title="What learners say" items={learners} muted={leaders.length > 0} />
    </div>
  );
}

// /stories/:id — single-story detail view. Pulls the story by id (or
// position-based fallback) from c.stories and renders an extended layout.
// 404s back to /stories if the id doesn't match.
function StoryDetail({ go, lang, c, storyId }) {
  const isKo = lang === 'ko';
  const list = (c && Array.isArray(c.stories)) ? c.stories : [];
  const idx = list.findIndex((s, i) => storyIdOf(s, i) === storyId);
  if (idx < 0) {
    return (
      <div data-screen-label="StoryDetail" className="container" style={{padding:'80px 24px',textAlign:'center'}}>
        <h1 style={{fontFamily:'var(--font-en)'}}>{isKo ? '후기를 찾을 수 없습니다' : 'Story not found'}</h1>
        <p style={{color:'var(--fg-muted)'}}>{isKo ? '삭제됐거나 잘못된 링크일 수 있어요.' : 'It may have been removed or the link is wrong.'}</p>
        <button type="button" className="btn btn-primary" onClick={() => go('stories')} style={{marginTop:18}}>
          {isKo ? '전체 후기로' : 'All stories'}
        </button>
      </div>
    );
  }
  const s = list[idx];
  return (
    <div data-screen-label="StoryDetail">
      <div className="phead">
        <div className="inner">
          <div className="sec-kicker">{s.tag}</div>
          <h1 className={isKo ? '' : 'en'}>{s.name}</h1>
          <p>{s.program}</p>
        </div>
      </div>
      <section className="section">
        <div className="container-narrow">
          <blockquote
            className={isKo ? '' : 'en'}
            style={{
              fontSize:'clamp(22px, 3vw, 32px)', fontWeight:600, lineHeight:1.45,
              borderLeft:`4px solid ${s.tag_color || 'var(--scouting-purple)'}`,
              padding:'8px 24px', margin:'0 0 32px', color:'var(--fg-primary)',
            }}>
            "{isKo ? s.quote_ko : s.quote_en}"
          </blockquote>
          <div style={{display:'flex',gap:14,alignItems:'center',color:'var(--fg-secondary)'}}>
            <div className="story-avatar" style={{flex:'0 0 auto'}} />
            <div>
              <div style={{fontWeight:700,color:'var(--fg-primary)'}}>{s.name}</div>
              <div style={{fontSize:14}}>{s.program}</div>
            </div>
          </div>
          <div style={{marginTop:48,display:'flex',gap:8}}>
            <button type="button" className="btn btn-secondary" onClick={() => go('stories')}>
              ← {isKo ? '전체 후기로' : 'All stories'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { try { navigator.clipboard.writeText(window.location.href); } catch {} }}>
              🔗 {isKo ? '링크 복사' : 'Copy link'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function News({ go, lang, c }) {
  const isKo = lang === 'ko';
  const auth = window.useAuth ? window.useAuth() : { user: null, ready: true };
  const canEdit = auth.user && (auth.user.role === 'admin' || auth.user.role === 'member');
  const h = ((c && c.page_heros && c.page_heros.news && (c.page_heros.news.en || c.page_heros.news[lang])) || {});

  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(null); // post object or { _new: true }
  const [err, setErr] = React.useState('');

  async function load() {
    setLoading(true); setErr('');
    try {
      const res = await fetch('/api/news');
      if (!res.ok) throw new Error('http_' + res.status);
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      setErr(isKo ? '소식을 불러오지 못했습니다.' : 'Failed to load news.');
    }
    setLoading(false);
  }
  React.useEffect(() => { load(); }, []);

  async function savePost(post) {
    setErr('');
    const isNew = !post.id;
    const url = isNew ? '/api/news' : '/api/news/' + encodeURIComponent(post.id);
    const method = isNew ? 'POST' : 'PUT';
    try {
      const res = await window.DreamPathAuth.authFetch(url, {
        method,
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
    if (!confirm(isKo ? '이 소식을 삭제하시겠습니까?' : 'Delete this post?')) return;
    try {
      const res = await window.DreamPathAuth.authFetch('/api/news/' + encodeURIComponent(id), { method: 'DELETE' });
      if (!res.ok) throw new Error('http_' + res.status);
      load();
    } catch (e) {
      setErr(isKo ? '삭제 실패' : 'Delete failed');
    }
  }

  return (
    <div data-screen-label="News">
      <PageHero h={h} isKo={isKo} bg={(c && c.page_heros && c.page_heros.news) || {}} />
      <section className="section">
        <div className="container-narrow">
          {canEdit && (
            <div style={{marginBottom:24,display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn btn-primary btn-sm" onClick={() => setEditing({ tag:'NEW', tag_color:'#6B2DBE'/* tokens-first 예외: 신규 태그 기본 색(브랜드 퍼플). 데이터 기본값 */, date: new Date().toISOString().slice(0,10).replace(/-/g,'.'), title_ko:'', title_en:'', body_ko:'', body_en:'' })}>
                + {isKo ? '새 소식 작성' : 'New post'}
              </button>
            </div>
          )}
          {err && <div role="alert" style={{padding:'8px 12px',background:'var(--state-danger-bg)',color:'var(--state-danger)',borderRadius:8,fontSize:14,marginBottom:16}}>{err}</div>}
          {loading ? (
            <div style={{padding:40,textAlign:'center',color:'var(--fg-muted)'}}>{isKo ? '불러오는 중…' : 'Loading…'}</div>
          ) : items.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:'var(--fg-muted)'}}>{isKo ? '등록된 소식이 없습니다.' : 'No posts yet.'}</div>
          ) : (
            <div className="news-list">
              {items.map(n => <NewsRow key={n.id} n={n} isKo={isKo} canEdit={canEdit} go={go} onEdit={() => setEditing(n)} onDelete={() => deletePost(n.id)} />)}
            </div>
          )}
        </div>
      </section>
      {editing && <NewsEditor post={editing} onSave={savePost} onCancel={() => setEditing(null)} isKo={isKo} />}
    </div>
  );
}

// Each news row navigates to /news/:id when the title or "자세히" is clicked.
// Inline expand-in-place is gone — single-source linkable URLs are nicer for
// sharing and analytics, and the detail view fits a longer body anyway.
function NewsRow({ n, isKo, canEdit, go, onEdit, onDelete }) {
  return (
    <div className="news-item"
      style={{display:'block',padding:'16px 20px',borderRadius:14,marginBottom:8,background:'var(--bg-elevated)',border:'1px solid var(--border-hair)'}}>
      <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
        <span className="news-tag" style={{background: (n.tag_color || 'var(--fg-muted)') + '22', color: n.tag_color || 'var(--fg-muted)'}}>{n.tag}</span>
        <span className="news-date">{n.date}</span>
        <button type="button"
          className={'news-title' + (isKo ? '' : ' en')}
          onClick={() => go && go('newsdetail', n.id)}
          style={{flex:1,minWidth:0,background:'none',border:'none',font:'inherit',color:'inherit',cursor:'pointer',textAlign:'left',padding:0}}>
          {isKo ? n.title_ko : n.title_en}
        </button>
        {canEdit && (
          <span style={{display:'flex',gap:6}}>
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>{isKo ? '수정' : 'Edit'}</button>
            <button className="btn btn-ghost btn-sm" style={{color:'var(--state-danger)'}} onClick={onDelete}>{isKo ? '삭제' : 'Delete'}</button>
          </span>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => go && go('newsdetail', n.id)} title={isKo ? '자세히 보기' : 'Read more'}>
          <i data-lucide="arrow-right" width="14" height="14" strokeWidth="2" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  );
}

// /news/:id — single-post detail. Loads the post via /api/news/:id (public)
// and renders the full HTML body. 404s back to /news on a bad id.
function NewsDetail({ go, lang, c, newsId }) {
  const isKo = lang === 'ko';
  const [post, setPost] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');
  React.useEffect(() => {
    if (!newsId) { setLoading(false); return; }
    setLoading(true); setErr('');
    fetch('/api/news/' + encodeURIComponent(newsId))
      .then(r => r.ok ? r.json() : Promise.reject(new Error('http_' + r.status)))
      .then(setPost)
      .catch(e => setErr(String(e.message || e)))
      .finally(() => setLoading(false));
  }, [newsId]);

  if (loading) return <div className="container" style={{padding:'80px 24px',textAlign:'center',color:'var(--fg-muted)'}}>{isKo ? '불러오는 중…' : 'Loading…'}</div>;
  if (err || !post) {
    return (
      <div data-screen-label="NewsDetail" className="container" style={{padding:'80px 24px',textAlign:'center'}}>
        <h1 style={{fontFamily:'var(--font-en)'}}>{isKo ? '소식을 찾을 수 없습니다' : 'Post not found'}</h1>
        <p style={{color:'var(--fg-muted)'}}>{isKo ? '삭제됐거나 잘못된 링크일 수 있어요.' : 'It may have been removed or the link is wrong.'}</p>
        <button type="button" className="btn btn-primary" onClick={() => go('news')} style={{marginTop:18}}>
          {isKo ? '전체 소식으로' : 'All news'}
        </button>
      </div>
    );
  }
  const title = isKo ? post.title_ko : post.title_en;
  const body  = isKo ? post.body_ko  : post.body_en;
  return (
    <div data-screen-label="NewsDetail">
      <div className="phead">
        <div className="inner">
          <div className="sec-kicker">
            {post.tag && <span className="news-tag" style={{background: (post.tag_color || 'var(--fg-muted)') + '22', color: post.tag_color || 'var(--fg-muted)', marginRight:8}}>{post.tag}</span>}
            <span style={{color:'var(--fg-muted)',fontFamily:'var(--font-mono)',fontSize:13}}>{post.date}</span>
          </div>
          <h1 className={isKo ? '' : 'en'}>{title}</h1>
        </div>
      </div>
      <section className="section">
        <div className="container-narrow">
          {body && body.trim()
            ? <div style={{color:'var(--fg-primary)',lineHeight:1.75,fontSize:16}} dangerouslySetInnerHTML={{ __html: body }} />
            : <p style={{color:'var(--fg-muted)'}}>{isKo ? '본문이 비어 있습니다.' : 'No body content.'}</p>}
          <div style={{marginTop:48,display:'flex',gap:8}}>
            <button type="button" className="btn btn-secondary" onClick={() => go('news')}>
              ← {isKo ? '전체 소식으로' : 'All news'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { try { navigator.clipboard.writeText(window.location.href); } catch {} }}>
              🔗 {isKo ? '링크 복사' : 'Copy link'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function NewsEditor({ post, onSave, onCancel, isKo }) {
  const [draft, setDraft] = React.useState(post);
  const upd = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  return (
    <div className="auth-overlay" onClick={onCancel}>
      <div className="auth-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" style={{maxWidth:680}}>
        <button type="button" className="auth-close" onClick={onCancel} aria-label="close">×</button>
        <h2>{post.id ? (isKo ? '소식 수정' : 'Edit post') : (isKo ? '새 소식' : 'New post')}</h2>
        <label className="auth-field"><span>{isKo ? '태그' : 'Tag'}</span><input value={draft.tag || ''} onChange={e => upd('tag', e.target.value)} /></label>
        <label className="auth-field"><span>{isKo ? '태그 색' : 'Tag color'}</span><input type="color" value={draft.tag_color || '#6B2DBE'/* tokens-first 예외: <input type=color>는 var() 불가, 리터럴 hex 필수 */} onChange={e => upd('tag_color', e.target.value)} /></label>
        <label className="auth-field"><span>{isKo ? '날짜' : 'Date'}</span><input value={draft.date || ''} onChange={e => upd('date', e.target.value)} placeholder="YYYY.MM.DD" /></label>
        <label className="auth-field"><span>{isKo ? '제목 (한국어)' : 'Title (KO)'}</span><input value={draft.title_ko || ''} onChange={e => upd('title_ko', e.target.value)} lang="ko" /></label>
        <label className="auth-field"><span>{isKo ? '제목 (영문)' : 'Title (EN)'}</span><input value={draft.title_en || ''} onChange={e => upd('title_en', e.target.value)} lang="en" /></label>
        <div className="auth-field"><span>{isKo ? '본문 (한국어)' : 'Body (KO)'}</span>
          <window.RichEditor value={draft.body_ko || ''} onChange={v => upd('body_ko', v)} lang="ko" />
        </div>
        <div className="auth-field"><span>{isKo ? '본문 (영문)' : 'Body (EN)'}</span>
          <window.RichEditor value={draft.body_en || ''} onChange={v => upd('body_en', v)} lang="en" />
        </div>
        <div style={{display:'flex',gap:8,marginTop:16,justifyContent:'flex-end'}}>
          <button className="btn btn-secondary" type="button" onClick={onCancel}>{isKo ? '취소' : 'Cancel'}</button>
          <button className="btn btn-primary" type="button" onClick={() => onSave(draft)}>{isKo ? '저장' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function Contact({ lang, c }) {
  const isKo = lang === 'ko';
  const list = (c && c.faq) || window.FAQ;
  const h = ((c && c.page_heros && c.page_heros.contact && (c.page_heros.contact.en || c.page_heros.contact[lang])) || {});
  const cta = ((c && c.partner_cta && (c.partner_cta.en || c.partner_cta[lang])) || {});
  const [open, setOpen] = React.useState(null);
  // Honor ?tab=form (used by the ChatBot fallback to deep-link straight
  // to the Send-a-message form). Falls back to the FAQ tab.
  const initialTab = (() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab');
      return t === 'form' ? 'form' : 'faq';
    } catch { return 'faq'; }
  })();
  const [tab, setTab] = React.useState(initialTab); // 'faq' | 'form'
  return (
    <div data-screen-label="Contact">
      <PageHero h={h} isKo={isKo} bg={(c && c.page_heros && c.page_heros.contact) || {}} />
      <section className="section">
        <div className="container-narrow">
          <div className="contact-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'faq'}
              className={'contact-tab' + (tab === 'faq' ? ' active' : '')}
              onClick={() => setTab('faq')}>
              {isKo ? '자주 묻는 질문 (FAQ)' : 'FAQ'}
            </button>
            <button role="tab" aria-selected={tab === 'form'}
              className={'contact-tab' + (tab === 'form' ? ' active' : '')}
              onClick={() => setTab('form')}>
              {isKo ? '직접 문의하기' : 'Send a message'}
            </button>
          </div>
          {tab === 'form' && <InquiryForm lang={lang} c={c} />}
          {tab === 'faq' && (() => {
            // Group items by category preserving the original order. The
            // category header surfaces a Lucide icon (per item's
            // category_icon field — the first item in each group wins) so
            // category visuals stay consistent with the rest of the site's
            // icon system. Items missing a category land in an "Other" bin.
            const groups = [];
            const indexByCat = new Map();
            list.forEach((f, i) => {
              const key = (isKo ? f.category_ko : f.category_en) || (isKo ? '기타' : 'Other');
              if (!indexByCat.has(key)) {
                indexByCat.set(key, groups.length);
                groups.push({ title: key, icon: f.category_icon || '', items: [] });
              }
              groups[indexByCat.get(key)].items.push({ f, i });
            });
            return (
              <div className="faq-list">
                {groups.map((g, gi) => (
                  <div className="faq-group" key={gi}>
                    <div className="faq-group-head">
                      {g.icon && (
                        <span className="faq-group-icon" aria-hidden="true">
                          <i data-lucide={g.icon} width="22" height="22" strokeWidth="1.75"></i>
                        </span>
                      )}
                      <h3 className={isKo ? '' : 'en'}>{g.title}</h3>
                      <span className="faq-group-count">{g.items.length} {isKo ? '문항' : 'questions'}</span>
                    </div>
                    {g.items.map(({ f, i }) => (
                      <div key={i} className={'faq-item' + (open === i ? ' open' : '')}
                        onClick={() => setOpen(open === i ? null : i)}
                        role="button" tabIndex="0"
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(open === i ? null : i); } }}
                        aria-expanded={open === i}>
                        <div className="faq-q">
                          <h4 className={isKo ? '' : 'en'}>{isKo ? f.q_ko : f.q_en}</h4>
                          <div className="faq-icon"><i data-lucide="plus" width="18" height="18" strokeWidth="2"></i></div>
                        </div>
                        <div className="faq-a">{isKo ? f.a_ko : f.a_en}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}

          <div style={{marginTop:56,padding:40,background:'var(--bg-muted)',borderRadius:28,textAlign:'center'}}>
            <div className="sec-kicker">{cta.kicker}</div>
            <h3 style={{fontFamily:isKo?'var(--font-kr)':'var(--font-en)',fontSize:28,fontWeight:700,margin:'8px 0 16px'}}>
              {cta.title}
            </h3>
            <p style={{color:'var(--fg-secondary)',fontSize:16,margin:'0 0 20px'}}>
              {cta.sub}
            </p>
            <a className="btn btn-primary" href={`mailto:${(c && c.brand && c.brand.partners_email) || 'info@koreadreampath.com'}`}>{cta.cta}</a>
          </div>
        </div>
      </section>
    </div>
  );
}

function InquiryForm({ lang, c }) {
  const isKo = lang === 'ko';
  const auth = window.useAuth ? window.useAuth() : { user: null };
  // Categories sourced from c.inquiry_categories (admin-editable). Falls
  // back to a hardcoded set so the form still works on a stale cache.
  const FALLBACK_CATS = [
    { value: 'general',     label_ko: '일반 문의',     label_en: 'General inquiry' },
    { value: 'program',     label_ko: '프로그램 관련', label_en: 'About a program' },
    { value: 'partnership', label_ko: '파트너십',      label_en: 'Partnership' },
    { value: 'media',       label_ko: '취재 / 미디어', label_en: 'Media / press' },
    { value: 'bug',         label_ko: '오류 신고',     label_en: 'Report a bug' },
  ];
  const CATS = (c && Array.isArray(c.inquiry_categories) && c.inquiry_categories.length) ? c.inquiry_categories : FALLBACK_CATS;
  const [form, setForm] = React.useState({
    name: auth.user ? (auth.user.name || '') : '',
    email: auth.user ? auth.user.email : '',
    phone: '',
    category: CATS[0].value,
    subject: '',
    body: '',
  });
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(null); // null | { id }
  const [err, setErr] = React.useState('');
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr('');
    try {
      const headers = { 'content-type': 'application/json' };
      if (auth.user && window.DreamPathAuth.token) headers['authorization'] = 'Bearer ' + window.DreamPathAuth.token;
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...form, lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error === 'validation'
          ? (isKo ? '입력 정보를 확인해주세요.' : 'Please check your inputs.')
          : (isKo ? '제출 실패. 잠시 후 다시 시도해주세요.' : 'Submission failed. Please try again.'));
        return;
      }
      setDone(data);
    } catch (e) {
      setErr(isKo ? '네트워크 오류가 발생했습니다.' : 'Network error.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="apply-card" style={{textAlign:'center',padding:40}}>
        <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(36,135,55,0.12)',display:'inline-flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
          <i data-lucide="circle-check-big" width="32" height="32" strokeWidth="1.75" style={{color:'var(--state-success)'}}></i>
        </div>
        <h3 style={{fontFamily:isKo?'var(--font-kr)':'var(--font-en)',fontSize:24,fontWeight:700,margin:'0 0 8px'}}>
          {isKo ? '문의가 접수되었습니다.' : 'Your message is in.'}
        </h3>
        <p style={{color:'var(--fg-secondary)'}}>
          {isKo
            ? <>접수 ID: <strong>{done.id}</strong> · 영업일 기준 2~3일 내에 답변 드리겠습니다.</>
            : <>Reference: <strong>{done.id}</strong> · We'll get back to you within 2–3 business days.</>}
        </p>
        <button type="button" className="btn btn-secondary" style={{marginTop:16}} onClick={() => { setDone(null); setForm({ ...form, subject: '', body: '' }); }}>
          {isKo ? '새 문의 작성' : 'Send another'}
        </button>
      </div>
    );
  }

  return (
    <form className="apply-card" onSubmit={submit}>
      <p className="apply-desc">{isKo
        ? '아래 양식을 작성해주시면 운영팀이 확인 후 답변 드립니다.'
        : 'Send us a note below — the team will reply by email.'}</p>
      {/* Single-column layout: 이름 → 이메일 → 전화 → (문의유형 + 제목) → 내용 */}
      <div className="field">
        <label>{isKo ? '이름 *' : 'Name *'}</label>
        <input value={form.name} onChange={upd('name')} required />
      </div>
      <window.EmailField
        label={isKo ? '이메일 *' : 'Email *'}
        value={form.email}
        onChange={(v) => setForm(f => ({ ...f, email: v }))}
        required
        lang={lang}
      />
      <window.PhoneField
        label={isKo ? '전화 (선택)' : 'Phone (optional)'}
        value={form.phone}
        onChange={(v) => setForm(f => ({ ...f, phone: v }))}
        lang={lang}
      />
      <div className="form-row">
        <div className="field">
          <label>{isKo ? '문의 유형' : 'Category'}</label>
          <select value={form.category} onChange={upd('category')}>
            {CATS.map(cat => <option key={cat.value} value={cat.value}>{isKo ? cat.label_ko : cat.label_en}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{isKo ? '제목 *' : 'Subject *'}</label>
          <input value={form.subject} onChange={upd('subject')} required />
        </div>
      </div>
      <div className="field">
        <label>{isKo ? '내용 * (10자 이상)' : 'Message * (min 10 chars)'}</label>
        <textarea rows="6" value={form.body} onChange={upd('body')} required minLength={10} />
      </div>
      {err && <div role="alert" style={{padding:'8px 12px',background:'var(--state-danger-bg)',color:'var(--state-danger)',borderRadius:8,fontSize:14,marginTop:8}}>{err}</div>}
      <div className="form-actions" style={{marginTop:20,justifyContent:'flex-end',display:'flex',gap:8}}>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? (isKo ? '제출 중…' : 'Sending…') : (isKo ? '문의 보내기' : 'Send message')}
        </button>
      </div>
    </form>
  );
}

window.InquiryForm = InquiryForm;
window.Partners = Partners;
window.Stories = Stories;
window.StoryDetail = StoryDetail;
window.News = News;
window.NewsDetail = NewsDetail;
window.NewsEditor = NewsEditor;
window.Contact = Contact;
