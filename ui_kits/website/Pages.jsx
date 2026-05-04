// Partners + Stories + News + Contact (bundled) — content-driven via c.page_heros
function PageHero({ h, isKo }) {
  return (
    <div className="phead">
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
  const h = ((c && c.page_heros && c.page_heros.partners && c.page_heros.partners[lang]) || {});
  return (
    <div data-screen-label="Partners">
      <PageHero h={h} isKo={isKo} />
      <section className="section">
        <div className="container">
          <div className="partners-grid">
            {list.map((p, i) => (
              <div key={i} className="partner">
                <div className="partner-logo" style={{'--c': p.color}}>{p.name}</div>
                <div className="partner-body">
                  <div className="partner-role">{isKo ? p.role_ko : p.role_en}</div>
                  <div className={'partner-name' + (isKo ? '' : ' en')}>{p.name}</div>
                  <div className="partner-full">{p.full}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stories({ lang, c }) {
  const isKo = lang === 'ko';
  const list = (c && c.stories) || window.STORIES;
  const h = ((c && c.page_heros && c.page_heros.stories && c.page_heros.stories[lang]) || {});
  return (
    <div data-screen-label="Stories">
      <PageHero h={h} isKo={isKo} />
      <section className="section">
        <div className="container">
          <div className="stories-grid">
            {list.map((s, i) => (
              <div key={i} className="story" style={{'--c1': s.tag_color, '--c2': '#622599'}}>
                <span className="tag" style={{background: s.tag_color + '22', color: s.tag_color}}>{s.tag}</span>
                <blockquote className={isKo ? '' : 'en'}>"{isKo ? s.quote_ko : s.quote_en}"</blockquote>
                <div className="story-foot">
                  <div className="story-avatar" />
                  <div>
                    <div className="story-name">{s.name}</div>
                    <div className="story-prog">{s.program}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function News({ lang, c }) {
  const isKo = lang === 'ko';
  const auth = window.useAuth ? window.useAuth() : { user: null, ready: true };
  const canEdit = auth.user && (auth.user.role === 'admin' || auth.user.role === 'member');
  const h = ((c && c.page_heros && c.page_heros.news && c.page_heros.news[lang]) || {});

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
      <PageHero h={h} isKo={isKo} />
      <section className="section">
        <div className="container-narrow">
          {canEdit && (
            <div style={{marginBottom:24,display:'flex',justifyContent:'flex-end',gap:8}}>
              <button className="btn btn-primary btn-sm" onClick={() => setEditing({ tag:'NEW', tag_color:'#622599', date: new Date().toISOString().slice(0,10).replace(/-/g,'.'), title_ko:'', title_en:'', body_ko:'', body_en:'' })}>
                + {isKo ? '새 소식 작성' : 'New post'}
              </button>
            </div>
          )}
          {err && <div role="alert" style={{color:'#B91C1C',marginBottom:16}}>{err}</div>}
          {loading ? (
            <div style={{padding:40,textAlign:'center',color:'#666'}}>{isKo ? '불러오는 중…' : 'Loading…'}</div>
          ) : items.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:'#666'}}>{isKo ? '등록된 소식이 없습니다.' : 'No posts yet.'}</div>
          ) : (
            <div className="news-list">
              {items.map(n => <NewsRow key={n.id} n={n} isKo={isKo} canEdit={canEdit} onEdit={() => setEditing(n)} onDelete={() => deletePost(n.id)} />)}
            </div>
          )}
        </div>
      </section>
      {editing && <NewsEditor post={editing} onSave={savePost} onCancel={() => setEditing(null)} isKo={isKo} />}
    </div>
  );
}

function NewsRow({ n, isKo, canEdit, onEdit, onDelete }) {
  const [open, setOpen] = React.useState(false);
  const body = isKo ? n.body_ko : n.body_en;
  const hasBody = body && body.replace(/<[^>]+>/g, '').trim().length > 0;
  return (
    <div className={'news-item' + (open ? ' open' : '')}
      style={{display:'block',padding:'16px 20px',borderRadius:14,marginBottom:8,background:'#fff',border:'1px solid var(--border-hair)'}}>
      <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}
        onClick={() => hasBody && setOpen(o => !o)}
        role={hasBody ? 'button' : undefined} tabIndex={hasBody ? 0 : undefined}>
        <span className="news-tag" style={{background: (n.tag_color || '#666') + '22', color: n.tag_color || '#666'}}>{n.tag}</span>
        <span className="news-date">{n.date}</span>
        <span className={'news-title' + (isKo ? '' : ' en')} style={{flex:1,minWidth:0}}>{isKo ? n.title_ko : n.title_en}</span>
        {canEdit && (
          <span style={{display:'flex',gap:6}} onClick={e => e.stopPropagation()}>
            <button className="icon-btn" onClick={onEdit}>{isKo ? '수정' : 'Edit'}</button>
            <button className="icon-btn danger" onClick={onDelete}>{isKo ? '삭제' : 'Delete'}</button>
          </span>
        )}
        {hasBody && (
          <i data-lucide={open ? 'chevron-up' : 'chevron-down'} width="18" height="18" strokeWidth="1.75" style={{color:'var(--fg-muted)'}}></i>
        )}
      </div>
      {open && hasBody && (
        <div className="news-body" style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--border-hair)',color:'var(--fg-secondary)',lineHeight:1.7}}
          dangerouslySetInnerHTML={{ __html: body }} />
      )}
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
        <label className="auth-field"><span>{isKo ? '태그 색' : 'Tag color'}</span><input type="color" value={draft.tag_color || '#622599'} onChange={e => upd('tag_color', e.target.value)} /></label>
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
  const h = ((c && c.page_heros && c.page_heros.contact && c.page_heros.contact[lang]) || {});
  const cta = ((c && c.partner_cta && c.partner_cta[lang]) || {});
  const [open, setOpen] = React.useState(null);
  const [tab, setTab] = React.useState('faq'); // 'faq' | 'form'
  return (
    <div data-screen-label="Contact">
      <PageHero h={h} isKo={isKo} />
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
          {tab === 'form' && <InquiryForm lang={lang} />}
          {tab === 'faq' && (
          <div className="faq-list">
            {list.map((f, i) => (
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
          )}

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

function InquiryForm({ lang }) {
  const isKo = lang === 'ko';
  const auth = window.useAuth ? window.useAuth() : { user: null };
  const [form, setForm] = React.useState({
    name: auth.user ? (auth.user.name || '') : '',
    email: auth.user ? auth.user.email : '',
    phone: '',
    category: 'general',
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
          <i data-lucide="check-circle-2" width="32" height="32" strokeWidth="1.75" style={{color:'#248737'}}></i>
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

  const CATEGORIES = [
    { v: 'general',     ko: '일반 문의',       en: 'General inquiry' },
    { v: 'program',     ko: '프로그램 관련',   en: 'About a program' },
    { v: 'partnership', ko: '파트너십',        en: 'Partnership' },
    { v: 'media',       ko: '취재 / 미디어',   en: 'Media / press' },
    { v: 'bug',         ko: '오류 신고',       en: 'Report a bug' },
  ];

  return (
    <form className="apply-card" onSubmit={submit} style={{maxWidth:680,margin:'0 auto'}}>
      <p className="apply-desc">{isKo
        ? '아래 양식을 작성해주시면 운영팀이 확인 후 답변 드립니다.'
        : 'Send us a note below — the team will reply by email.'}</p>
      <div className="form-row">
        <div className="field">
          <label>{isKo ? '이름 *' : 'Name *'}</label>
          <input value={form.name} onChange={upd('name')} required />
        </div>
        <div className="field">
          <label>{isKo ? '이메일 *' : 'Email *'}</label>
          <input type="email" value={form.email} onChange={upd('email')} required />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>{isKo ? '전화 (선택)' : 'Phone (optional)'}</label>
          <input type="tel" value={form.phone} onChange={upd('phone')} placeholder="+82 10 ..." />
        </div>
        <div className="field">
          <label>{isKo ? '문의 유형' : 'Category'}</label>
          <select value={form.category} onChange={upd('category')}>
            {CATEGORIES.map(c => <option key={c.v} value={c.v}>{isKo ? c.ko : c.en}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label>{isKo ? '제목 *' : 'Subject *'}</label>
        <input value={form.subject} onChange={upd('subject')} required />
      </div>
      <div className="field">
        <label>{isKo ? '내용 * (10자 이상)' : 'Message * (min 10 chars)'}</label>
        <textarea rows="6" value={form.body} onChange={upd('body')} required minLength={10} />
      </div>
      {err && <div role="alert" style={{color:'#B91C1C',marginTop:8,fontSize:14}}>{err}</div>}
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
window.News = News;
window.NewsEditor = NewsEditor;
window.Contact = Contact;
