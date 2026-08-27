// Member.jsx — member dashboard with three feature cards (stubs for now)
const { useState: useStateM, useEffect: useEffectM } = React;

function Member({ go, lang, c }) {
  const isKo = lang === 'ko';
  const auth = window.useAuth();
  // Initial section: prefer the "open notifications" intent from the bell
  // dropdown (set by Nav.jsx via sessionStorage) so the user lands directly
  // on the notifications view they clicked from. The flag is one-shot.
  const [section, setSection] = useStateM(() => {
    try {
      // Generic deep-link into a section (e.g. "Open my messages" from /team).
      const generic = sessionStorage.getItem('dp_member_section');
      if (generic) return generic;
      if (sessionStorage.getItem('dp_open_notifications_section') ||
          sessionStorage.getItem('dp_open_notification')) {
        return 'notifications';
      }
    } catch {}
    return 'overview';
  });
  useEffectM(() => {
    try {
      sessionStorage.removeItem('dp_open_notifications_section');
      sessionStorage.removeItem('dp_member_section');
      // dp_open_notification (specific id) is consumed by MemberNotifications
      // below — we leave it here so it survives the initial render.
    } catch {}
  }, []);
  // Unread direct-message count — drives the badge on the Messages tab.
  const [msgUnread, setMsgUnread] = useStateM(0);
  useEffectM(() => {
    if (!auth.user) return;
    let alive = true;
    async function tick() {
      try {
        const res = await window.DreamPathAuth.authFetch('/api/me/messages');
        if (!res.ok) return;
        const d = await res.json();
        if (alive) setMsgUnread(d.unread || 0);
      } catch {}
    }
    tick();
    const t = setInterval(tick, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [auth.user, section]);
  // Unread notification count — drives the badge on the tab. Polled from
  // /api/me/notifications on mount + every 60s while the page is open.
  const [unread, setUnread] = useStateM(0);
  useEffectM(() => {
    const h = (e) => setSection(e.detail);
    window.addEventListener('dp-member-section', h);
    return () => window.removeEventListener('dp-member-section', h);
  }, []);
  useEffectM(() => {
    if (!auth.user) return;
    let alive = true;
    async function tick() {
      try {
        const res = await window.DreamPathAuth.authFetch('/api/me/notifications');
        if (!res.ok) return;
        const d = await res.json();
        if (alive) setUnread(d.unread || 0);
      } catch {}
    }
    tick();
    const t = setInterval(tick, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [auth.user, section]);

  // Editable hero copy (admin → 페이지 헤더) with fallback. Hooks declared
  // before any conditional return to respect the Rules of Hooks.
  const phMember = ((c && c.page_heros && c.page_heros.member && c.page_heros.member[lang]) || {});
  const phMy     = ((c && c.page_heros && c.page_heros.mypage && c.page_heros.mypage[lang]) || {});
  const hbMember = window.useHeroBg((c && c.page_heros && c.page_heros.member) || {});
  const hbMy     = window.useHeroBg((c && c.page_heros && c.page_heros.mypage) || {});

  if (!auth.ready) {
    return <div className="container" style={{padding:'80px 24px',textAlign:'center',color:'var(--fg-muted)'}}>{isKo ? '로딩 중…' : 'Loading…'}</div>;
  }
  if (!auth.user) {
    return (
      <div className={('phead ' + hbMember.cls).trim()} style={hbMember.style}>
        <div className="inner">
          <div className="sec-kicker">{phMember.kicker || (isKo ? '회원 전용' : 'MEMBERS ONLY')}</div>
          <h1 className={isKo ? '' : 'en'}>{phMember.title_l1 || (isKo ? '로그인이 필요합니다.' : 'Please log in.')}</h1>
          <p>{phMember.sub || (isKo ? '회원 페이지를 이용하려면 로그인하거나 회원가입을 진행해주세요.' : 'Log in or create an account to access member features.')}</p>
          <div style={{marginTop:24,display:'flex',gap:12}}>
            <button className="btn btn-primary btn-lg" onClick={() => window.dispatchEvent(new CustomEvent('dp-open-auth', { detail: { mode: 'login' } }))}>
              {isKo ? '로그인' : 'Log in'}
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => window.dispatchEvent(new CustomEvent('dp-open-auth', { detail: { mode: 'signup' } }))}>
              {isKo ? '회원가입' : 'Sign up'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-screen-label="Member">
      <div className={('phead ' + hbMy.cls).trim()} style={hbMy.style}>
        <div className="inner">
          <div className="sec-kicker">{phMy.kicker || (isKo ? '내 페이지' : 'MY PAGE')}</div>
          <h1 className={isKo ? '' : 'en'}>{(phMy.title_l1 || (isKo ? '안녕하세요,' : 'Hello,')) + ' ' + (auth.user.name || auth.user.email)}</h1>
          <p>{phMy.sub || (isKo ? '지원 · 커리어 등록 · 맞춤형 프로그램 추천을 한 곳에서 관리하세요.' : 'Apply, manage your career profile, and get personalized recommendations.')}</p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="member-tabs" role="tablist">
            {[
              { k: 'overview', l_ko: '대시보드', l_en: 'Dashboard' },
              { k: 'messages', l_ko: '메시지', l_en: 'Messages' },
              { k: 'notifications', l_ko: '알림', l_en: 'Notifications' },
              { k: 'applications', l_ko: '내 지원 · 영수증', l_en: 'My applications · receipts' },
              { k: 'career',   l_ko: '커리어 등록', l_en: 'Career profile' },
              { k: 'recommendations', l_ko: '추천 프로그램', l_en: 'Recommendations' },
              { k: 'privacy', l_ko: '개인정보 / GDPR', l_en: 'Privacy / GDPR' },
            ].map(t => (
              <button key={t.k} role="tab" aria-selected={section === t.k}
                className={'member-tab' + (section === t.k ? ' active' : '')}
                onClick={() => setSection(t.k)}>
                {isKo ? t.l_ko : t.l_en}
                {t.k === 'notifications' && unread > 0 && (
                  <span style={{display:'inline-block',marginLeft:6,padding:'1px 7px',borderRadius:999,background:'var(--badge-danger-fill)',color:'var(--fg-on-fill)',fontSize:11,fontWeight:700,fontFamily:'var(--font-mono)'}}>{unread}</span>
                )}
                {t.k === 'messages' && msgUnread > 0 && (
                  <span style={{display:'inline-block',marginLeft:6,padding:'1px 7px',borderRadius:999,background:'var(--badge-danger-fill)',color:'var(--fg-on-fill)',fontSize:11,fontWeight:700,fontFamily:'var(--font-mono)'}}>{msgUnread}</span>
                )}
              </button>
            ))}
          </div>

          {section === 'overview' && <MemberOverview go={go} isKo={isKo} c={c} unread={unread} setSection={setSection} />}
          {section === 'messages' && <MemberMessages isKo={isKo} go={go} onChange={setMsgUnread} />}
          {section === 'notifications' && <MemberNotifications isKo={isKo} onChange={setUnread} />}
          {section === 'applications' && <MemberApplications isKo={isKo} c={c} />}
          {section === 'career' && <MemberCareer isKo={isKo} />}
          {section === 'recommendations' && <MemberRecommendations isKo={isKo} c={c} go={go} />}
          {section === 'privacy' && <MemberPrivacy isKo={isKo} go={go} />}
        </div>
      </section>
    </div>
  );
}

function MemberOverview({ go, isKo, c, unread, setSection }) {
  return (
    <div className="member-grid">
      {unread > 0 && (
        <div className="member-card" style={{borderColor:'var(--state-info)',background:'var(--state-info-bg)',color:'var(--state-info)'}}>
          <div className="sec-kicker" style={{color:'var(--state-info)'}}>{isKo ? '00 · 알림' : '00 · NOTIFICATIONS'}</div>
          <h3 style={{color:'var(--state-info)'}}>{isKo ? `새 알림 ${unread}건` : `${unread} new notification${unread===1?'':'s'}`}</h3>
          <p style={{color:'var(--state-info)'}}>{isKo ? '관리자가 보낸 새로운 알림이 있습니다.' : 'You have new messages from the team.'}</p>
          <button className="btn btn-primary" onClick={() => setSection && setSection('notifications')}>{isKo ? '알림 보기' : 'View'} →</button>
        </div>
      )}
      <div className="member-card">
        <div className="sec-kicker">{isKo ? '01 · 지원' : '01 · APPLY'}</div>
        <h3>{isKo ? '프로그램 지원하기' : 'Apply for a program'}</h3>
        {/* 접수 동결 중에는 "지원 시작"을 눌러 중단 안내를 만나기 전에 여기서 알린다 */}
        <p>{applyFrozen(c)
          ? (isKo ? '신청 접수가 잠시 대기 중입니다. 접수가 다시 열리면 안내드리겠습니다.'
                  : 'The next intake is being prepared. We will post an update when intake reopens.')
          : (isKo ? '관심 있는 프로그램을 선택하고 지원서를 제출하세요.' : 'Pick a program and submit your application.')}</p>
        <button className="btn btn-primary" onClick={() => go('apply')} disabled={applyFrozen(c)}>
          {applyFrozen(c) ? (isKo ? '접수 준비 중' : 'Preparing') : (isKo ? '지원 시작' : 'Start')} {applyFrozen(c) ? '' : '→'}
        </button>
      </div>
      <div className="member-card">
        <div className="sec-kicker">{isKo ? '02 · 커리어' : '02 · CAREER'}</div>
        <h3>{isKo ? '커리어 등록' : 'Career profile'}</h3>
        <p>{isKo ? '학력·관심사·언어 능력을 등록해 두면 추천 정확도가 올라갑니다.' : 'Register your background, interests, and language levels.'}</p>
        <button className="btn btn-secondary" onClick={() => window.dispatchEvent(new CustomEvent('dp-member-section', { detail: 'career' }))}>{isKo ? '입력하기' : 'Edit'} →</button>
      </div>
      <div className="member-card">
        <div className="sec-kicker">{isKo ? '03 · 추천' : '03 · MATCH'}</div>
        <h3>{isKo ? '맞춤형 프로그램 추천' : 'Personalized recommendations'}</h3>
        <p>{isKo ? '커리어 정보 기반으로 가장 잘 맞는 프로그램을 제안합니다.' : 'Get programs ranked by fit, based on your profile.'}</p>
        <button className="btn btn-secondary" onClick={() => window.dispatchEvent(new CustomEvent('dp-member-section', { detail: 'recommendations' }))}>{isKo ? '확인' : 'View'} →</button>
      </div>
    </div>
  );
}

// Direct messages — two-way threads between the member and team members.
// List of conversations → open a thread → read + reply. Polls nothing on its
// own; the parent badge poll keeps the unread count fresh.
function MemberMessages({ isKo, go, onChange }) {
  const [threads, setThreads] = useStateM([]);
  const [loading, setLoading] = useStateM(true);
  const [openTid, setOpenTid] = useStateM(null);
  const [detail, setDetail] = useStateM(null);    // { subject, counterpart, messages[] }
  const [reply, setReply] = useStateM('');
  const [busy, setBusy] = useStateM(false);

  async function load() {
    setLoading(true);
    try {
      const r = await window.DreamPathAuth.authFetch('/api/me/messages');
      if (!r.ok) throw new Error('http');
      const d = await r.json();
      setThreads(d.threads || []);
      onChange && onChange(d.unread || 0);
    } catch {} finally { setLoading(false); }
  }
  useEffectM(() => { load(); }, []);

  async function open(tid) {
    setOpenTid(tid); setDetail(null); setReply('');
    try {
      const r = await window.DreamPathAuth.authFetch('/api/me/messages/' + encodeURIComponent(tid));
      if (!r.ok) return;
      setDetail(await r.json());
      load();   // refresh unread now that this thread is read
    } catch {}
  }
  async function sendReply(e) {
    e.preventDefault();
    if (reply.trim().length < 2) return;
    setBusy(true);
    try {
      const r = await window.DreamPathAuth.authFetch('/api/me/messages', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ thread_id: openTid, body: reply.trim() }),
      });
      if (r.ok) { setReply(''); await open(openTid); }
    } catch {} finally { setBusy(false); }
  }
  async function removeThread(tid) {
    if (!confirm(isKo ? '이 대화를 삭제할까요?' : 'Delete this conversation?')) return;
    try {
      await window.DreamPathAuth.authFetch('/api/me/messages/' + encodeURIComponent(tid), { method: 'DELETE' });
      setOpenTid(null); setDetail(null); load();
    } catch {}
  }
  function fmt(ts) { try { return new Date(ts).toLocaleString(isKo ? 'ko-KR' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return ts; } }
  function initials(nm) { const s = (nm || '').trim(); if (!s) return '?'; const parts = s.split(/\s+/); return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase(); }

  if (loading) return <div className="member-msg-empty">{isKo ? '불러오는 중…' : 'Loading…'}</div>;

  // Thread detail view
  if (openTid && detail) {
    return (
      <div className="member-msg">
        <div className="member-msg-head">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpenTid(null); setDetail(null); }}>
            ← {isKo ? '목록' : 'Back'}
          </button>
          <span className="member-msg-avatar" aria-hidden="true">{initials(detail.counterpart)}</span>
          <div className="member-msg-head-meta">
            <strong>{detail.counterpart}</strong>
            {detail.subject && <span className="member-msg-subject">{detail.subject}</span>}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" style={{color:'var(--state-danger)'}} onClick={() => removeThread(openTid)}>{isKo ? '삭제' : 'Delete'}</button>
        </div>
        <div className="member-msg-thread">
          {(detail.messages || []).map(m => (
            <div key={m.id} className={'member-msg-bubble' + (m.from_me ? ' me' : '')}>
              <div className="member-msg-bubble-body">{m.body}</div>
              <div className="member-msg-bubble-time">{fmt(m.created_at)}</div>
            </div>
          ))}
        </div>
        <form className="member-msg-reply" onSubmit={sendReply}>
          <textarea rows={2} value={reply} onChange={e => setReply(e.target.value)} maxLength={4000}
            placeholder={isKo ? '답장을 입력하세요…' : 'Write a reply…'} />
          <button type="submit" className="btn btn-primary" disabled={busy || reply.trim().length < 2}>
            {busy ? (isKo ? '전송 중…' : 'Sending…') : (isKo ? '보내기' : 'Send')}
          </button>
        </form>
      </div>
    );
  }

  // Conversation list
  return (
    <div className="member-msg">
      {threads.length === 0 ? (
        <div className="member-msg-empty">
          <p>{isKo ? '첫 메시지가 오면 여기에 표시됩니다.' : 'Your first message will appear here.'}</p>
          {go && <button type="button" className="btn btn-secondary" onClick={() => go('team')}>{isKo ? '프로젝트 팀에게 메시지 보내기' : 'Message the project team'} →</button>}
        </div>
      ) : (
        <ul className="member-msg-list">
          {threads.map(t => (
            <li key={t.thread_id}>
              <button type="button" className={'member-msg-item' + (t.unread ? ' unread' : '')} onClick={() => open(t.thread_id)}>
                <span className="member-msg-avatar" aria-hidden="true">{initials(t.counterpart)}</span>
                <span className="member-msg-item-main">
                  <span className="member-msg-item-top">
                    <strong>{t.counterpart}</strong>
                    <span className="member-msg-item-time">{fmt(t.last_at)}</span>
                  </span>
                  {t.subject && <span className="member-msg-item-subject">{t.subject}</span>}
                  <span className="member-msg-item-preview">{t.last_from_me ? (isKo ? '나: ' : 'You: ') : ''}{t.preview}</span>
                </span>
                {t.unread > 0 && <span className="member-msg-dot">{t.unread}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Inbox-style list of admin notifications. List view + click-to-read detail.
// Auto-marks read on first open (server side); Reopen toggles back to unread.
function MemberNotifications({ isKo, onChange }) {
  const [items, setItems] = useStateM([]);
  const [loading, setLoading] = useStateM(true);
  const [opened, setOpened] = useStateM(null);     // detail object | null

  async function load() {
    setLoading(true);
    try {
      const r = await window.DreamPathAuth.authFetch('/api/me/notifications');
      if (!r.ok) throw new Error('http_' + r.status);
      const d = await r.json();
      setItems(d.items || []);
      onChange && onChange(d.unread || 0);
      // If the bell dropdown asked us to auto-open a specific notification,
      // honor it once and clear the flag.
      try {
        const target = sessionStorage.getItem('dp_open_notification');
        if (target) {
          sessionStorage.removeItem('dp_open_notification');
          const hit = (d.items || []).find(it => it.id === target);
          if (hit) open(hit);
        }
      } catch {}
    } catch {} finally { setLoading(false); }
  }
  useEffectM(() => { load(); }, []);

  async function open(n) {
    try {
      const r = await window.DreamPathAuth.authFetch('/api/me/notifications/' + encodeURIComponent(n.id));
      if (!r.ok) return;
      const d = await r.json();
      setOpened(d);
      // Reflect read state in the list immediately.
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read_at: d.read_at } : x));
      onChange && onChange((items.filter(x => !x.read_at && x.id !== n.id).length));
    } catch {}
  }
  async function toggleRead(n) {
    const next = !!n.read_at ? false : true;
    try {
      const r = await window.DreamPathAuth.authFetch('/api/me/notifications/' + encodeURIComponent(n.id), {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ read: next }),
      });
      if (!r.ok) return;
      load();
    } catch {}
  }
  async function remove(n) {
    if (!confirm(isKo ? '이 알림을 삭제할까요?' : 'Delete this notification?')) return;
    try {
      await window.DreamPathAuth.authFetch('/api/me/notifications/' + encodeURIComponent(n.id), { method: 'DELETE' });
      setOpened(null);
      load();
    } catch {}
  }

  if (opened) {
    const subj = isKo ? (opened.subject_ko || opened.subject_en) : (opened.subject_en || opened.subject_ko);
    const body = isKo ? (opened.body_ko || opened.body_en) : (opened.body_en || opened.body_ko);
    return (
      <div className="member-card" style={{padding:0,overflow:'hidden'}}>
        {/* Header band — back link, sender meta, timestamp on one row. */}
        <div style={{display:'flex',gap:12,alignItems:'center',padding:'16px 24px',borderBottom:'1px solid var(--border-hair)',background:'var(--bg-muted)'}}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpened(null)}>← {isKo ? '목록으로' : 'Back to inbox'}</button>
          <span style={{flex:1}} />
          <span style={{fontSize:12,color:'var(--fg-muted)',fontFamily:'var(--font-mono)'}}>{opened.sender}</span>
          <span style={{fontSize:12,color:'var(--fg-muted)'}}>{new Date(opened.ts).toLocaleString()}</span>
        </div>
        {/* Subject + body. Generous padding so the card reads like a letter
            rather than a chat bubble. */}
        <div style={{padding:'28px 28px 8px'}}>
          <div className="sec-kicker" style={{marginBottom:8}}>{isKo ? '받은 알림' : 'Notification'}</div>
          <h2 style={{fontFamily:'var(--font-kr)',fontSize:26,fontWeight:700,letterSpacing:'-0.01em',margin:'0 0 18px',color:'var(--brand-text)'}}>{subj}</h2>
          <div style={{whiteSpace:'pre-wrap',lineHeight:1.75,color:'var(--fg-primary)',fontSize:15,minHeight:120}}>{body}</div>
        </div>
        {/* Action footer — separated by a hairline so primary content stays
            clean. Mark-read on the left, destructive delete on the right. */}
        <div style={{display:'flex',gap:8,justifyContent:'space-between',padding:'18px 24px',borderTop:'1px solid var(--border-hair)',background:'var(--bg-muted)'}}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleRead(opened)}>
            {opened.read_at ? (isKo ? '안 읽음으로' : 'Mark unread') : (isKo ? '읽음 처리' : 'Mark read')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" style={{color:'var(--state-danger)'}} onClick={() => remove(opened)}>
            {isKo ? '삭제' : 'Delete'}
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="member-card" style={{textAlign:'center',color:'var(--fg-muted)'}}>{isKo ? '불러오는 중…' : 'Loading…'}</div>;
  if (!items.length) return <div className="member-card" style={{textAlign:'center',color:'var(--fg-muted)'}}>{isKo ? '새 알림이 오면 여기에 표시됩니다.' : 'New notifications will appear here.'}</div>;

  return (
    <div className="member-card" style={{padding:0,overflow:'hidden'}}>
      <ul style={{listStyle:'none',margin:0,padding:0}}>
        {items.map(n => {
          const isUnread = !n.read_at;
          const subj = isKo ? (n.subject_ko || n.subject_en) : (n.subject_en || n.subject_ko);
          return (
            <li key={n.id}>
              <button type="button" onClick={() => open(n)}
                style={{display:'flex',alignItems:'center',gap:14,width:'100%',padding:'14px 18px',background:'none',border:'none',
                  borderBottom:'1px solid var(--border-hair)',cursor:'pointer',textAlign:'left',font:'inherit',color:'inherit'}}>
                <span style={{flex:'0 0 auto',width:8,height:8,borderRadius:'50%',background: isUnread ? 'var(--state-info)' : 'transparent', border: isUnread ? 'none' : '1px solid var(--border-default)'}} aria-label={isUnread ? 'unread' : 'read'} />
                <span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight: isUnread ? 700 : 500}}>{subj}</span>
                <span style={{fontSize:12,color:'var(--fg-muted)',whiteSpace:'nowrap'}}>{new Date(n.ts).toLocaleDateString()}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// 신청 파이프라인 단계 정의 (v01.092, 설계서 §1). 진행 트래커 + 단계별 액션에 사용.
const PIPELINE_STAGES = [
  { key: 'submitted',         ko: '신청 접수',     en: 'Submitted' },
  { key: 'screen_passed',     ko: '1차 통과',      en: 'Screening passed' },
  { key: 'cufs_no_submitted', ko: '접수번호 제출', en: 'Admission reference' },
  { key: 'cufs_admitted',     ko: '합격 확인',     en: 'Admission verified' },
  { key: 'docs_submitted',    ko: '서류 제출',     en: 'Documents submitted' },
  { key: 'docs_verified',     ko: '서류 검증',     en: 'Documents verified' },
  { key: 'paid',              ko: '결제 완료',     en: 'Paid' },
  { key: 'enrolled',          ko: '등록 확정',     en: 'Enrolled' },
];
function stageIndex(status) {
  const i = PIPELINE_STAGES.findIndex(s => s.key === status);
  return i;
}

function MemberApplications({ isKo, c }) {
  const [items, setItems] = useStateM([]);
  const [loading, setLoading] = useStateM(true);
  const [err, setErr] = useStateM('');

  async function load() {
    try {
      const res = await window.DreamPathAuth.authFetch('/api/me/applications');
      if (!res.ok) throw new Error('http_' + res.status);
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }
  useEffectM(() => { load(); }, []);

  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--fg-muted)'}}>{isKo ? '불러오는 중…' : 'Loading…'}</div>;
  if (err) return <div role="alert" style={{padding:24,color:'var(--state-danger)'}}>{err}</div>;
  if (items.length === 0) return (
    <div style={{padding:'40px 24px',textAlign:'center',background:'var(--bg-muted)',borderRadius:14,color:'var(--fg-secondary)'}}>
      {isKo ? '지원서를 제출하시면 여기에 표시됩니다. 로그인 상태에서 지원해 주세요.' : 'Your applications appear here once you submit one while signed in.'}
    </div>
  );

  return (
    <div style={{display:'grid',gap:18}}>
      {items.map(a => <ApplicationPipeline key={a.id} app={a} c={c} isKo={isKo} onChange={load} />)}
    </div>
  );
}

// 접수 동결(c.apply_gate.closed) 판정 + 서버 거절 문구. worker 가 학생측
// 제출을 503 applications_closed 로 막으므로, 화면도 같은 말을 해야 한다 —
// 안 그러면 "제출에 실패했습니다"라는 원인 불명 오류로 보인다.
function applyFrozen(c) {
  return !!(c && c.apply_gate && c.apply_gate.closed);
}
async function frozenMessage(res, isKo) {
  if (!res || res.status !== 503) return null;
  const d = await res.clone().json().catch(() => ({}));
  if (d.error !== 'applications_closed') return null;
  return isKo
    ? '신청 접수가 잠시 대기 중입니다. 접수가 다시 열리면 안내드리겠습니다.'
    : 'The next intake is being prepared, so this step opens again with it.';
}

// 신청 한 건의 단계별 진행 화면. 상단에 고유번호 + 진행 트래커, 하단에
// 현재 status에 맞는 액션 패널을 렌더한다.
function ApplicationPipeline({ app, c, isKo, onChange }) {
  const programs = (c && c.programs) || [];
  const p = programs.find(x => x.id === app.program);
  const progName = p ? (isKo ? p.title_ko : p.title_en) : (app.program || '—');
  const dt = app.submitted_at ? new Date(app.submitted_at).toLocaleString(isKo ? 'ko-KR' : 'en-US') : '—';
  const curIdx = stageIndex(app.status);
  const isRejected = app.status === 'screen_rejected';
  const isCancelled = app.status === 'cancelled';

  return (
    <div className="member-card" style={{padding:24}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,flexWrap:'wrap'}}>
        <div>
          {app.candidate_no && (
            <div style={{fontSize:12,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--fg-muted)'}}>
              {isKo ? '고유번호' : 'ID'} <strong style={{fontFamily:'var(--font-mono)',color:'var(--brand-text)',fontSize:14}}>{app.candidate_no}</strong>
            </div>
          )}
          <h3 style={{margin:'4px 0 4px'}}>{progName}</h3>
          <div style={{fontSize:13,color:'var(--fg-secondary)'}}>{dt}</div>
        </div>
        <StatusBadge status={app.status} isKo={isKo} />
      </div>

      {/* 진행 트래커 — 탈락/취소가 아닐 때만 */}
      {!isRejected && !isCancelled && (
        <div style={{display:'flex',flexWrap:'wrap',gap:6,margin:'16px 0',paddingTop:14,borderTop:'1px solid var(--border-hair)'}}>
          {PIPELINE_STAGES.map((s, i) => {
            const done = curIdx >= 0 && i < curIdx;
            const active = i === curIdx;
            return (
              <span key={s.key} style={{
                fontSize:11,padding:'3px 9px',borderRadius:999,whiteSpace:'nowrap',
                fontWeight: active ? 700 : 500,
                background: active ? 'var(--brand-text)' : done ? 'var(--state-success-bg)' : 'var(--bg-muted)',
                color: active ? 'var(--fg-on-fill)' : done ? 'var(--state-success)' : 'var(--fg-muted)',
              }}>{done ? '✓ ' : ''}{isKo ? s.ko : s.en}</span>
            );
          })}
        </div>
      )}

      {/* 접수 동결 안내 — 버튼을 눌러보고 나서야 알게 되지 않도록 위에 둔다 */}
      {applyFrozen(c) && !isRejected && !isCancelled && (
        <div role="status" style={{margin:'0 0 12px',padding:'12px 14px',background:'var(--state-warning-bg)',color:'var(--state-warning)',borderRadius:10,fontSize:13,lineHeight:1.6,wordBreak:'keep-all'}}>
          <strong>{isKo ? '신규 모집 준비 중' : 'Next intake in preparation'}</strong>
          <div style={{marginTop:4}}>
            {isKo
              ? '다음 모집을 준비하는 동안 다음 단계 제출은 잠시 대기 상태입니다. 이미 제출하신 내용은 그대로 보관되며, 진행 일정은 담당자가 개별로 안내드립니다.'
              : 'Submissions are paused while we update the site. Everything you have already submitted is kept as is.'}
          </div>
        </div>
      )}

      {/* 단계별 액션 패널 */}
      <div style={{marginTop:8}}>
        {app.status === 'submitted'         && <StageInfo isKo={isKo} tone="info" ko="제출이 완료되었습니다. 1차 서류 심사 결과를 기다려 주세요 (영업일 기준 7일 이내)." en="Submitted. Please wait for the first screening result (within 7 business days)." />}
        {app.status === 'screen_rejected'   && <StageRejected isKo={isKo} note={app.screen_note} />}
        {app.status === 'screen_passed'     && <CufsGuidePanel app={app} isKo={isKo} onChange={onChange} />}
        {app.status === 'cufs_no_submitted' && <AdmissionPanel app={app} isKo={isKo} onChange={onChange} />}
        {app.status === 'cufs_admitted'     && <DocumentsPanel app={app} isKo={isKo} onChange={onChange} />}
        {app.status === 'docs_submitted'    && <StageInfo isKo={isKo} tone="info" ko="서류를 제출했습니다. 관리자 검증 후 결제 단계가 열립니다." en="Documents submitted. The payment step opens after admin verification." />}
        {app.status === 'docs_verified'     && <PaymentPanel app={app} program={p} isKo={isKo} onChange={onChange} />}
        {app.status === 'paid'              && <StagePaid app={app} isKo={isKo} />}
        {app.status === 'enrolled'          && <StageEnrolled app={app} isKo={isKo} />}
        {app.status === 'cancelled'         && <StageInfo isKo={isKo} tone="muted" ko="이 신청은 취소되었습니다." en="This application was cancelled." />}
      </div>
    </div>
  );
}

function StatusBadge({ status, isKo }) {
  const map = {
    submitted:         { ko: '심사 대기',   en: 'IN REVIEW',  tone: 'info' },
    screen_passed:     { ko: '1차 통과',    en: 'PASSED',     tone: 'info' },
    screen_rejected:   { ko: '미선정',      en: 'NOT SELECTED', tone: 'danger' },
    cufs_no_submitted: { ko: '검증 대기',   en: 'VERIFYING',  tone: 'info' },
    cufs_admitted:     { ko: '서류 단계',   en: 'DOCUMENTS',  tone: 'info' },
    docs_submitted:    { ko: '검증 대기',   en: 'VERIFYING',  tone: 'info' },
    docs_verified:     { ko: '결제 가능',   en: 'PAYMENT OPEN', tone: 'warning' },
    paid:              { ko: '결제 완료',   en: 'PAID',       tone: 'success' },
    enrolled:          { ko: '등록 확정',   en: 'ENROLLED',   tone: 'success' },
    cancelled:         { ko: '취소됨',      en: 'CANCELLED',  tone: 'muted' },
  };
  const m = map[status] || { ko: status, en: (status || '').toUpperCase(), tone: 'info' };
  const bg = { info:'var(--state-info-bg)', success:'var(--state-success-bg)', danger:'var(--state-danger-bg)', warning:'var(--state-warning-bg, #fff7ed)', muted:'var(--bg-muted)' }[m.tone];
  const fg = { info:'var(--state-info)', success:'var(--state-success)', danger:'var(--state-danger)', warning:'var(--state-warning, #b45309)', muted:'var(--fg-muted)' }[m.tone];
  return <div style={{padding:'4px 12px',borderRadius:999,background:bg,color:fg,fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}>{isKo ? m.ko : m.en}</div>;
}

function StageInfo({ isKo, ko, en, tone }) {
  const bg = tone === 'muted' ? 'var(--bg-muted)' : 'var(--state-info-bg)';
  const fg = tone === 'muted' ? 'var(--fg-secondary)' : 'var(--state-info)';
  return <div style={{padding:'14px 16px',background:bg,color:fg,borderRadius:10,fontSize:14,lineHeight:1.6}}>{isKo ? ko : en}</div>;
}

function StageRejected({ isKo, note }) {
  return (
    <div style={{padding:'14px 16px',background:'var(--state-danger-bg)',color:'var(--state-danger)',borderRadius:10,fontSize:14,lineHeight:1.6}}>
      <strong>{isKo ? '이번 심사에서는 다른 지원자가 선정되었습니다.' : 'Other applicants were selected in this screening.'}</strong>
      {note && <div style={{marginTop:8,whiteSpace:'pre-wrap',color:'var(--fg-secondary)'}}>{note}</div>}
    </div>
  );
}

// screen_passed → 파트너 대학 입학 안내 + 접수번호 입력 (POST /cufs-reg-no).
// 주의 — 경로·컬럼 이름의 `cufs` 는 내부 식별자라 그대로 둔다(마이그레이션 비용 대비
//    이득이 없다). 화면에 보이는 문구만 기관 중립으로 쓴다.
function CufsGuidePanel({ app, isKo, onChange }) {
  const [regNo, setRegNo] = useStateM('');
  const [busy, setBusy] = useStateM(false);
  const [err, setErr] = useStateM('');
  async function submitReg() {
    if (!regNo.trim()) { setErr(isKo ? '접수번호를 입력하세요.' : 'Enter your admission reference number.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await window.DreamPathAuth.authFetch('/api/me/applications/' + encodeURIComponent(app.id) + '/cufs-reg-no', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cufs_reg_no: regNo.trim() }),
      });
      const frozen = await frozenMessage(r, isKo);
      if (frozen) { setErr(frozen); setBusy(false); return; }
      if (!r.ok) throw new Error('http_' + r.status);
      onChange && onChange();
    } catch (e) { setErr(isKo ? '제출을 다시 시도해 주세요.' : 'Please submit again.'); }
    finally { setBusy(false); }
  }
  return (
    <div style={{padding:'16px 18px',background:'var(--bg-muted)',borderRadius:12}}>
      <h4 style={{margin:'0 0 10px',fontSize:16}}>{isKo ? '다음 단계: 파트너 대학 입학 절차' : 'Next: partner university admission'}</h4>
      <p style={{fontSize:14,color:'var(--fg-secondary)',lineHeight:1.6,margin:'0 0 12px'}}>
        {isKo ? '파트너 대학의 입학 절차를 진행하신 뒤, 발급받은 접수번호를 입력해 주세요. 절차 안내는 담당자가 개별로 드립니다.'
              : 'Complete the partner university admission process, then enter the reference number you receive. Your coordinator will send the details.'}
      </p>
      {/* 2026-08-22: 파트너 대학 협의 문제로 외부 입시 링크를 내렸다. 담당자가
          개별 안내하는 방식으로 대체 — 링크만 남기면 학생이 잘못 접수한다. */}
      <div style={{fontSize:13,color:'var(--fg-secondary)',padding:'10px 12px',background:'var(--bg-elevated)',border:'1px solid var(--border-default)',borderRadius:8}}>
        {isKo ? '입학 절차 안내는 담당자가 개별로 드립니다. 안내를 받으신 뒤 발급된 접수번호를 아래에 입력해 주세요.'
              : 'Your coordinator will send the admission steps. Once you have them, enter the reference number below.'}
      </div>
      {/* 결제 주체 경고 */}
      <div style={{marginTop:14,padding:'12px 14px',background:'var(--state-warning-bg, #fff7ed)',color:'var(--state-warning, #b45309)',borderRadius:10,fontSize:13,lineHeight:1.6}}>
        <strong>{isKo ? '결제 주체를 꼭 구분하세요' : 'Know who collects each payment'}</strong>
        <div style={{marginTop:6}}>{isKo ? '전형료 — 파트너 대학에서 결제 (정상)' : 'Application fee — paid to the partner university (normal)'}</div>
        <div>{isKo ? '등록금 — 합격 후 이 사이트(마이페이지)에서 결제합니다. 등록금을 받는 곳은 여기 한 군데입니다' : 'Tuition — paid here on the member page after admission. This is the single place that collects tuition.'}</div>
      </div>
      <div className="field" style={{marginTop:14}}>
        <label>{isKo ? '입학 접수번호' : 'Admission reference number'}</label>
        <input value={regNo} onChange={e => setRegNo(e.target.value)} placeholder={isKo ? '파트너 대학에서 발급받은 번호' : 'Number issued by the partner university'} />
      </div>
      {err && <div role="alert" style={{color:'var(--state-danger)',fontSize:13,marginBottom:8}}>{err}</div>}
      <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={submitReg}>
        {busy ? (isKo ? '제출 중…' : 'Submitting…') : (isKo ? '접수번호 제출' : 'Submit reference number')}
      </button>
    </div>
  );
}

// cufs_no_submitted → 합격증(admission_certificate) 업로드 + 제출(POST /admission).
function AdmissionPanel({ app, isKo, onChange }) {
  const [busy, setBusy] = useStateM(false);
  const [submitting, setSubmitting] = useStateM(false);
  const [uploaded, setUploaded] = useStateM(null);
  const [err, setErr] = useStateM('');

  // 기존 업로드 여부 확인.
  useEffectM(() => {
    (async () => {
      try {
        const r = await window.DreamPathAuth.authFetch('/api/me/applications/' + encodeURIComponent(app.id) + '/files');
        if (!r.ok) return;
        const d = await r.json();
        const f = (d.items || []).find(x => x.kind === 'admission_certificate');
        if (f) setUploaded(f);
      } catch {}
    })();
  }, [app.id]);

  async function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true); setErr('');
    try {
      const meta = await uploadMemberFile(f, 'admission_certificate', app.id, null);
      setUploaded({ filename: meta.filename, size: meta.size, kind: 'admission_certificate' });
    } catch (ex) { setErr(ex.message || (isKo ? '업로드를 다시 시도해 주세요' : 'Please try uploading again')); }
    finally { setBusy(false); }
  }
  async function confirm() {
    setSubmitting(true); setErr('');
    try {
      const r = await window.DreamPathAuth.authFetch('/api/me/applications/' + encodeURIComponent(app.id) + '/admission', { method: 'POST' });
      const frozen = await frozenMessage(r, isKo);
      if (frozen) { setErr(frozen); setSubmitting(false); return; }
      if (!r.ok) throw new Error('http');
      onChange && onChange();
    } catch (e) { setErr(isKo ? '제출을 다시 시도해 주세요.' : 'Please submit again.'); }
    finally { setSubmitting(false); }
  }
  return (
    <div style={{padding:'16px 18px',background:'var(--bg-muted)',borderRadius:12}}>
      <h4 style={{margin:'0 0 10px',fontSize:16}}>{isKo ? '합격증 업로드' : 'Upload admission certificate'}</h4>
      <p style={{fontSize:14,color:'var(--fg-secondary)',lineHeight:1.6,margin:'0 0 12px'}}>
        {isKo ? '합격 발표 후, 합격증(또는 합격 확인 화면 캡처)을 업로드하고 제출해 주세요. 관리자가 접수번호와 대조해 확인합니다.'
              : 'After results are announced, upload your admission certificate (or a screenshot) and submit. An admin will verify it against your reference number.'}
      </p>
      <label className="btn btn-secondary btn-sm" style={{cursor:'pointer'}}>
        {uploaded ? (isKo ? '다시 선택' : 'Choose again') : (isKo ? '파일 선택' : 'Choose file')}
        <input type="file" accept="application/pdf,image/*" style={{display:'none'}} onChange={onPick} disabled={busy} />
      </label>
      {busy && <span className="hint" style={{marginLeft:10}}>{isKo ? '업로드 중…' : 'Uploading…'}</span>}
      {uploaded && !busy && <span className="hint" style={{marginLeft:10,color:'var(--state-success)'}}>✓ {uploaded.filename}</span>}
      {err && <div role="alert" style={{color:'var(--state-danger)',fontSize:13,marginTop:8}}>{err}</div>}
      <div style={{marginTop:14}}>
        <button type="button" className="btn btn-primary btn-sm" disabled={!uploaded || submitting} onClick={confirm}>
          {submitting ? (isKo ? '제출 중…' : 'Submitting…') : (isKo ? '합격증 제출 완료' : 'Submit admission')}
        </button>
      </div>
    </div>
  );
}

// cufs_admitted → 학력 증빙 서류 3종 업로드 + 제출(POST /documents).
function DocumentsPanel({ app, isKo, onChange }) {
  const [submitting, setSubmitting] = useStateM(false);
  const [err, setErr] = useStateM('');
  async function confirm() {
    setSubmitting(true); setErr('');
    try {
      const r = await window.DreamPathAuth.authFetch('/api/me/applications/' + encodeURIComponent(app.id) + '/documents', { method: 'POST' });
      const frozen = await frozenMessage(r, isKo);
      if (frozen) { setErr(frozen); setSubmitting(false); return; }
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        if (d.error === 'missing_documents') { setErr(isKo ? '서류 3종을 모두 업로드해야 제출할 수 있습니다.' : 'Upload all three documents before submitting.'); }
        else throw new Error('http');
        setSubmitting(false); return;
      }
      onChange && onChange();
    } catch (e) { setErr(isKo ? '제출을 다시 시도해 주세요.' : 'Please submit again.'); }
    finally { setSubmitting(false); }
  }
  return (
    <div style={{padding:'16px 18px',background:'var(--bg-muted)',borderRadius:12}}>
      <h4 style={{margin:'0 0 6px',fontSize:16}}>{isKo ? '학력 증빙 서류 3종 제출' : 'Submit 3 academic documents'}</h4>
      <p style={{fontSize:14,color:'var(--fg-secondary)',lineHeight:1.6,margin:'0 0 4px'}}>
        {isKo ? '아래 3종을 모두 업로드한 뒤 제출하세요. 관리자 검증을 통과하면 등록금 결제 단계가 열립니다.'
              : 'Upload all three below, then submit. After admin verification the tuition payment step opens.'}
      </p>
      <ApplicationFiles appId={app.id} isKo={isKo} />
      {err && <div role="alert" style={{color:'var(--state-danger)',fontSize:13,marginTop:8}}>{err}</div>}
      <div style={{marginTop:12}}>
        <button type="button" className="btn btn-primary btn-sm" disabled={submitting} onClick={confirm}>
          {submitting ? (isKo ? '제출 중…' : 'Submitting…') : (isKo ? '서류 제출 완료' : 'Submit documents')}
        </button>
      </div>
    </div>
  );
}

// docs_verified → 결제 동의 3종 + 카드 + 결제(POST /pay). 금액은 program.tuition.
function PaymentPanel({ app, program, isKo, onChange }) {
  const tuition = program && Number.isFinite(parseInt(program.tuition, 10)) ? parseInt(program.tuition, 10) : null;
  const [consents, setConsents] = useStateM({ consent_cufs_refund: false, consent_kdp_refund: false, consent_pg_pii: false });
  const [card, setCard] = useStateM('');
  const [exp, setExp] = useStateM('');
  const [cvc, setCvc] = useStateM('');
  const [busy, setBusy] = useStateM(false);
  const [err, setErr] = useStateM('');
  const allConsented = consents.consent_cufs_refund && consents.consent_kdp_refund && consents.consent_pg_pii;
  const last4 = card.replace(/\D/g, '').slice(-4);
  const canPay = allConsented && last4.length === 4 && exp && cvc && tuition && tuition > 0;

  const CONSENT_ROWS = [
    { k: 'consent_cufs_refund', ko: '파트너 대학의 환불 규정에 동의합니다.', en: 'I agree to the partner university refund policy.' },
    { k: 'consent_kdp_refund',  ko: 'KoreaDreamPath 환불 규정에 동의합니다.', en: 'I agree to the KoreaDreamPath refund policy.' },
    { k: 'consent_pg_pii',      ko: '결제를 위한 PG사 개인정보 제공에 동의합니다.', en: 'I agree to share personal data with the payment provider.' },
  ];

  async function pay() {
    setBusy(true); setErr('');
    try {
      const r = await window.DreamPathAuth.authFetch('/api/me/applications/' + encodeURIComponent(app.id) + '/pay', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ consents, card_last4: last4, lang: isKo ? 'ko' : 'en' }),
      });
      const frozen = await frozenMessage(r, isKo);
      if (frozen) { setErr(frozen); setBusy(false); return; }
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        if (d.error === 'tuition_not_set') setErr(isKo ? '등록금은 공개 예정입니다(예약 단계). 확정되면 안내드리겠습니다.' : 'Tuition will be announced soon (reserved). We will let you know once it is confirmed.');
        else if (d.error === 'consent_required') setErr(isKo ? '결제 동의 3종에 모두 동의해야 합니다.' : 'All three consents are required.');
        else setErr(isKo ? '결제를 다시 시도해 주세요.' : 'Please try the payment again.');
        setBusy(false); return;
      }
      onChange && onChange();
    } catch (e) { setErr(isKo ? '연결 상태를 확인한 뒤 다시 시도해 주세요.' : 'Please check your connection and try again.'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{padding:'16px 18px',background:'var(--bg-muted)',borderRadius:12}}>
      <h4 style={{margin:'0 0 10px',fontSize:16}}>{isKo ? '등록금 결제' : 'Tuition payment'}</h4>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',background:'var(--bg-elevated)',borderRadius:10,marginBottom:14}}>
        <span style={{fontSize:13,color:'var(--fg-secondary)'}}>{isKo ? '결제 금액' : 'Amount due'}</span>
        {/* 등록금이 아직 공개되지 않은 동안에는 숫자 대신 상태를 보여준다.
             (금액이 정해지면 자동으로 금액 표시로 돌아온다) */}
        <strong style={{fontSize: tuition != null && tuition > 0 ? 20 : 15}}>
          {tuition != null && tuition > 0
            ? `US $${tuition}.00`
            : (isKo ? '공개 예정 · 예약 단계' : 'To be announced · reserved')}
        </strong>
      </div>

      {CONSENT_ROWS.map(row => (
        <label key={row.k} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'8px 0',fontSize:14,cursor:'pointer'}}>
          <input type="checkbox" checked={consents[row.k]} onChange={e => setConsents(s => ({ ...s, [row.k]: e.target.checked }))} style={{marginTop:3}} />
          <span>{isKo ? row.ko : row.en}</span>
        </label>
      ))}

      <div className="field" style={{marginTop:10}}>
        <label>{isKo ? '카드 번호' : 'Card number'}</label>
        <input inputMode="numeric" maxLength="19" placeholder="0000 0000 0000 0000"
          value={card}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g,'').slice(0,16);
            setCard(digits.replace(/(.{4})/g,'$1 ').trim());
          }} />
      </div>
      <div className="form-row">
        <div className="field">
          <label>{isKo ? '만료일 (MM/YY)' : 'Expiry (MM/YY)'}</label>
          <input inputMode="numeric" maxLength="5" placeholder="MM/YY" value={exp}
            onChange={(e) => { const d = e.target.value.replace(/\D/g,'').slice(0,4); setExp(d.length > 2 ? `${d.slice(0,2)}/${d.slice(2)}` : d); }} />
        </div>
        <div className="field">
          <label>CVC</label>
          <input inputMode="numeric" maxLength="4" placeholder="123" value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g,'').slice(0,4))} />
        </div>
      </div>
      <div style={{fontSize:12,color:'var(--fg-muted)',marginBottom:10}}>
        {isKo ? '이 프로토타입은 결제 절차를 시뮬레이션합니다. 카드 번호는 마지막 4자리만 저장됩니다.'
              : 'This prototype simulates the payment flow. Only the last 4 digits are stored.'}
      </div>
      {err && <div role="alert" style={{color:'var(--state-danger)',fontSize:13,marginBottom:8}}>{err}</div>}
      <button type="button" className="btn btn-primary" disabled={!canPay || busy} onClick={pay}>
        {busy ? (isKo ? '결제 중…' : 'Processing…') : (isKo ? `US $${tuition || 0} 결제하기` : `Pay US $${tuition || 0}`)}
      </button>
    </div>
  );
}

function StagePaid({ app, isKo }) {
  return (
    <div>
      <StageInfo isKo={isKo} tone="success" ko="등록금 결제가 완료되었습니다. 최종 등록 확정을 기다려 주세요." en="Payment complete. Awaiting final enrollment confirmation." />
      {app.receipt_token && (
        <div style={{marginTop:12}}>
          <a className="btn btn-secondary btn-sm" href={`/receipt?id=${encodeURIComponent(app.id)}&token=${encodeURIComponent(app.receipt_token)}`} target="_blank" rel="noopener">
            {isKo ? '영수증 보기 / 인쇄' : 'View / print receipt'}
          </a>
        </div>
      )}
    </div>
  );
}

function StageEnrolled({ app, isKo }) {
  return (
    <div>
      <div style={{padding:'14px 16px',background:'var(--state-success-bg)',color:'var(--state-success)',borderRadius:10,fontSize:15,fontWeight:600}}>
        {isKo ? '등록이 최종 확정되었습니다. 환영합니다.' : 'Your enrollment is confirmed. Welcome aboard.'}
      </div>
      {app.receipt_token && (
        <div style={{marginTop:12}}>
          <a className="btn btn-secondary btn-sm" href={`/receipt?id=${encodeURIComponent(app.id)}&token=${encodeURIComponent(app.receipt_token)}`} target="_blank" rel="noopener">
            {isKo ? '영수증 보기 / 인쇄' : 'View / print receipt'}
          </a>
        </div>
      )}
    </div>
  );
}

// 마이페이지 공용 단일 파일 업로더 — base64로 /api/applications/upload 호출.
async function uploadMemberFile(file, kind, appId, recommenderIdx) {
  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  if (file.type && !allowed.includes(file.type)) throw new Error('PDF / 이미지만 가능합니다.');
  if (file.size > 10 * 1024 * 1024) throw new Error('최대 10MB.');
  const b64 = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => { const u = String(r.result || ''); const i = u.indexOf(','); res(i >= 0 ? u.slice(i+1) : u); };
    r.onerror = () => rej(new Error('read_failed'));
    r.readAsDataURL(file);
  });
  const r = await window.DreamPathAuth.authFetch('/api/applications/upload', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, recommender_idx: recommenderIdx == null ? null : recommenderIdx, application_id: appId, filename: file.name, mime: file.type || 'application/pdf', content_base64: b64 }),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || ('http_' + r.status)); }
  return await r.json();
}

// File panel inside each MemberApplications row. Lists every file attached
// to the application and exposes a Replace / Remove control per slot, plus
// an Upload control for any of the three "academic" slots that are still
// empty. Re-uploads call POST /api/applications/upload with the same
// application_id; the worker enforces ownership via session token.
function ApplicationFiles({ appId, isKo }) {
  const [files, setFiles] = useStateM([]);
  const [loading, setLoading] = useStateM(true);
  const [err, setErr] = useStateM('');

  // Three primary academic slots that we surface as "always-visible" upload
  // targets. Recommendation letters are listed as-is (one per recommender)
  // and any legacy 'transcript' file is shown at the top of the list.
  const ACADEMIC_SLOTS = [
    { kind: 'transcript_graduation',  label_ko: '졸업(예정)증명서', label_en: 'Certificate of Graduation' },
    { kind: 'transcript_recognition', label_ko: '아포스티유 / 학력인정확인서 / 영사확인',
                                      label_en: 'Apostille / Academic Recognition / Consular' },
    { kind: 'transcript_translation', label_ko: '한글번역공증본 (KO/EN 외)',
                                      label_en: 'Notarized Korean translation' },
  ];

  async function load() {
    setLoading(true); setErr('');
    try {
      const r = await window.DreamPathAuth.authFetch('/api/me/applications/' + encodeURIComponent(appId) + '/files');
      if (!r.ok) throw new Error('http_' + r.status);
      const d = await r.json();
      setFiles(d.items || []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }
  useEffectM(() => { load(); }, [appId]);

  // Find current file for one of the academic slots (or null if not uploaded).
  function fileFor(kind) { return files.find(f => f.kind === kind) || null; }

  async function uploadToSlot(kind, file, recommenderIdx) {
    if (!file) return;
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (file.type && !allowed.includes(file.type)) { setErr(isKo ? 'PDF / 이미지만 가능합니다.' : 'PDF or image only.'); return; }
    if (file.size > 10 * 1024 * 1024) { setErr(isKo ? '최대 10MB.' : 'Max 10 MB.'); return; }
    setErr('');
    const b64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        const dataUrl = String(r.result || '');
        const i = dataUrl.indexOf(',');
        res(i >= 0 ? dataUrl.slice(i + 1) : dataUrl);
      };
      r.onerror = () => rej(new Error('read_failed'));
      r.readAsDataURL(file);
    }).catch(() => null);
    if (!b64) { setErr(isKo ? '파일을 다시 선택해 주세요.' : 'Please pick the file again.'); return; }
    try {
      const r = await window.DreamPathAuth.authFetch('/api/applications/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind,
          recommender_idx: recommenderIdx == null ? null : recommenderIdx,
          application_id: appId,
          filename: file.name,
          mime: file.type || 'application/pdf',
          content_base64: b64,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || ('http_' + r.status));
      }
      await load();
    } catch (e) { setErr(e.message || (isKo ? '업로드를 다시 시도해 주세요' : 'Please try uploading again')); }
  }

  async function replaceFile(prevFile, file) {
    // Atomic-ish: upload new first, only then delete the old. If upload
    // fails the old file is preserved so the application is never left
    // in a documents-missing state.
    const before = files;
    await uploadToSlot(prevFile.kind, file, prevFile.recommender_idx);
    try {
      const r = await window.DreamPathAuth.authFetch('/api/me/application-files/' + prevFile.id, { method: 'DELETE' });
      if (!r.ok) throw new Error('http_' + r.status);
      await load();
    } catch (e) {
      setErr((isKo ? '새 파일은 업로드되었습니다. 기존 파일 정리는 다시 시도해 주세요. ' : 'The new file uploaded. Please retry removing the old file. ') + (e.message || ''));
      // Don't roll back — leaving both is safer than losing the new one.
      void before;
    }
  }

  async function removeFile(f) {
    if (!confirm(isKo ? '이 파일을 삭제할까요?' : 'Delete this file?')) return;
    try {
      const r = await window.DreamPathAuth.authFetch('/api/me/application-files/' + f.id, { method: 'DELETE' });
      if (!r.ok) throw new Error('http_' + r.status);
      await load();
    } catch (e) { setErr(e.message); }
  }

  function downloadHref(f) { return '/api/me/application-files/' + f.id + '/download'; }

  if (loading) return null;

  // Files outside the 3 academic slots — recommendation letters + legacy
  // single-transcript uploads. Listed as-is below the slotted area.
  const otherFiles = files.filter(f => !ACADEMIC_SLOTS.some(s => s.kind === f.kind));

  return (
    <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid var(--border-hair)'}}>
      <div className="sec-kicker" style={{margin:'0 0 10px'}}>{isKo ? '제출 서류' : 'SUBMITTED DOCUMENTS'}</div>

      {ACADEMIC_SLOTS.map(slot => {
        const cur = fileFor(slot.kind);
        return (
          <div key={slot.kind} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--bg-muted)',borderRadius:8,marginBottom:8}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:'var(--fg-primary)'}}>{isKo ? slot.label_ko : slot.label_en}</div>
              {cur ? (
                <a href={downloadHref(cur)} style={{fontSize:12,color:'var(--scouting-purple)',textDecoration:'underline',display:'block',marginTop:2,wordBreak:'break-all'}}>
                  {cur.filename} ({Math.round(cur.size/1024)} KB)
                </a>
              ) : (
                <div style={{fontSize:12,color:'var(--fg-muted)',marginTop:2}}>{isKo ? '업로드 대기 중' : 'Awaiting upload'}</div>
              )}
            </div>
            <label className="btn btn-secondary btn-sm" style={{cursor:'pointer'}}>
              {cur ? (isKo ? '교체' : 'Replace') : (isKo ? '업로드' : 'Upload')}
              <input type="file" accept="application/pdf,image/*" style={{display:'none'}}
                onChange={e => {
                  const f = e.target.files && e.target.files[0];
                  e.target.value = '';
                  if (!f) return;
                  if (cur) replaceFile(cur, f); else uploadToSlot(slot.kind, f, null);
                }} />
            </label>
            {cur && (
              <button type="button" className="btn btn-ghost btn-sm" style={{color:'var(--state-danger)'}} onClick={() => removeFile(cur)}>
                {isKo ? '삭제' : 'Remove'}
              </button>
            )}
          </div>
        );
      })}

      {otherFiles.length > 0 && (
        <div style={{marginTop:12}}>
          <div style={{fontSize:12,color:'var(--fg-muted)',marginBottom:6}}>{isKo ? '기타 첨부' : 'Other files'}</div>
          {otherFiles.map(f => (
            <div key={f.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'var(--bg-muted)',borderRadius:8,marginBottom:6}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,color:'var(--fg-secondary)'}}>{f.kind}{f.recommender_idx != null ? ` · #${f.recommender_idx + 1}` : ''}</div>
                <a href={downloadHref(f)} style={{fontSize:13,color:'var(--scouting-purple)',textDecoration:'underline',wordBreak:'break-all'}}>
                  {f.filename} ({Math.round(f.size/1024)} KB)
                </a>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" style={{color:'var(--state-danger)'}} onClick={() => removeFile(f)}>
                {isKo ? '삭제' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}

      {err && <div role="alert" style={{marginTop:8,padding:'6px 10px',background:'var(--state-danger-bg)',color:'var(--state-danger)',borderRadius:6,fontSize:12}}>{err}</div>}
    </div>
  );
}

function MemberCareer({ isKo }) {
  const [form, setForm] = useStateM({
    country: '', birthdate: '', current_school: '', current_major: '',
    goal: '', interests: '', korean_level: '', english_level: '', career_summary: '',
  });
  const [photo, setPhoto] = useStateM('');                  // data URL
  const [photoSize, setPhotoSize] = useStateM(0);
  const [photoErr, setPhotoErr] = useStateM('');
  const [loading, setLoading] = useStateM(true);
  const [savedAt, setSavedAt] = useStateM(null);
  const [err, setErr] = useStateM('');
  const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

  useEffectM(() => {
    (async () => {
      try {
        const res = await window.DreamPathAuth.authFetch('/api/me/profile');
        if (res.ok) {
          const data = await res.json();
          setForm(prev => ({ ...prev, ...Object.fromEntries(Object.entries(data).filter(([k,v]) => v != null && k in prev)) }));
          if (data.photo) { setPhoto(data.photo); setPhotoSize(data.photo_size || 0); }
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  function pickPhoto(e) {
    setPhotoErr('');
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setPhotoErr(isKo ? '이미지 파일만 업로드할 수 있습니다.' : 'Image files only.'); return; }
    if (f.size > PHOTO_MAX_BYTES) { setPhotoErr(isKo ? '2MB 이하의 이미지만 업로드 가능합니다.' : 'Max 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setPhoto(String(reader.result || '')); setPhotoSize(f.size); };
    reader.onerror = () => setPhotoErr(isKo ? '파일을 다시 선택해 주세요' : 'Please pick the file again');
    reader.readAsDataURL(f);
  }
  function clearPhoto() { setPhoto(''); setPhotoSize(0); setPhotoErr(''); }

  async function save(e) {
    e.preventDefault();
    setErr('');
    try {
      const res = await window.DreamPathAuth.authFetch('/api/me/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, photo: photo || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (d.error === 'photo_too_large') throw new Error(isKo ? '사진이 2MB를 초과합니다.' : 'Photo exceeds 2 MB.');
        if (d.error === 'invalid_photo')   throw new Error(isKo ? '사진 형식을 확인해 주세요 (JPG · PNG).' : 'Please use a JPG or PNG photo.');
        throw new Error('save_failed');
      }
      setSavedAt(new Date());
    } catch (e) {
      setErr(e.message && e.message !== 'save_failed' ? e.message : (isKo ? '저장을 다시 시도해주세요.' : 'Please try saving again.'));
    }
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--fg-muted)'}}>{isKo ? '불러오는 중…' : 'Loading…'}</div>;

  // Use the global .field primitive (label above input, full width, padded)
  // — apply-field was a typo that no CSS targets, so the form rendered with
  // raw browser defaults (label inline + tiny input).
  const F = ({ k, label, type = 'text', area = false }) => (
    <div className="field">
      <label>{label}</label>
      {area
        ? <textarea value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })} rows={4} />
        : <input type={type} value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })} />}
    </div>
  );

  return (
    <form onSubmit={save} className="apply-card" style={{maxWidth:760,margin:'0 auto'}}>
      <h3 className="apply-sub">{isKo ? '프로필 사진' : 'Profile photo'}</h3>
      <div style={{display:'flex',gap:18,alignItems:'center',marginBottom:14,padding:'14px 16px',background:'var(--bg-muted)',borderRadius:10}}>
        <div style={{width:96,height:96,borderRadius:'50%',background:'var(--bg-elevated)',border:'2px solid var(--border-default)',display:'grid',placeItems:'center',overflow:'hidden',flexShrink:0}}>
          {photo
            ? <img src={photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
            : <i data-lucide="user" width="36" height="36" style={{color:'var(--fg-muted)'}}></i>}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,color:'var(--fg-secondary)',marginBottom:8}}>
            {isKo ? '2MB 이하의 이미지(JPG·PNG·WEBP). 정사각형 권장.' : 'Image up to 2 MB (JPG / PNG / WEBP). Square recommended.'}
          </div>
          <div style={{display:'flex',gap:8}}>
            <label className="btn btn-secondary btn-sm" style={{cursor:'pointer'}}>
              {isKo ? '이미지 선택' : 'Choose image'}
              <input type="file" accept="image/*" onChange={pickPhoto} style={{display:'none'}} />
            </label>
            {photo && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearPhoto}>
                {isKo ? '제거' : 'Remove'}
              </button>
            )}
          </div>
          {photoSize > 0 && (
            <div style={{fontSize:12,color:'var(--fg-muted)',marginTop:6,fontFamily:'var(--font-mono)'}}>
              {(photoSize / 1024).toFixed(0)} KB
            </div>
          )}
          {photoErr && <div role="alert" style={{color:'var(--state-danger)',fontSize:13,marginTop:6}}>{photoErr}</div>}
        </div>
      </div>

      <h3 className="apply-sub">{isKo ? '학력 · 배경' : 'Background'}</h3>
      <div className="form-row">
        <F k="country" label={isKo ? '국가' : 'Country'} />
        <F k="birthdate" label={isKo ? '생년월일' : 'Birthdate'} type="date" />
      </div>
      <div className="form-row">
        <F k="current_school" label={isKo ? '재학 / 출신 학교' : 'School'} />
        <F k="current_major"  label={isKo ? '전공' : 'Major'} />
      </div>

      <h3 className="apply-sub">{isKo ? '목표 · 관심사' : 'Goals & interests'}</h3>
      <F k="goal" label={isKo ? '학습 목표' : 'Learning goal'} area />
      <F k="interests" label={isKo ? '관심 키워드 (쉼표로 구분)' : 'Interest keywords (comma-separated)'} />

      <h3 className="apply-sub">{isKo ? '언어' : 'Languages'}</h3>
      <div className="form-row">
        <div className="field">
          <label>{isKo ? '한국어 레벨' : 'Korean level'}</label>
          <select value={form.korean_level || ''} onChange={e => setForm({ ...form, korean_level: e.target.value })}>
            <option value="">{isKo ? '선택해주세요' : 'Select your level'}</option>
            <option value="5">(5) Native Speaker</option>
            <option value="4">(4) Professional (TOPIK 5~6)</option>
            <option value="3">(3) Intermediate (TOPIK 3~4)</option>
            <option value="2">(2) Basic (TOPIK 1~2)</option>
            <option value="1">(1) Beginner (Test Needed)</option>
          </select>
        </div>
        <F k="english_level" label={isKo ? '영어 레벨' : 'English level'} />
      </div>

      <h3 className="apply-sub">{isKo ? '간단 자기소개' : 'Short summary'}</h3>
      <div className="field">
        <label>{isKo ? '한 단락으로 자신을 소개해주세요. (500자 내외)' : 'A short paragraph about yourself. (~500 characters)'}</label>
        <textarea
          value={form.career_summary || ''}
          onChange={e => {
            const v = e.target.value;
            if (v.length <= 500) setForm({ ...form, career_summary: v });
          }}
          rows={6}
          maxLength={500}
        />
        <div style={{fontSize:12,color:(form.career_summary||'').length >= 500 ? 'var(--state-danger)' : 'var(--fg-muted)',fontFamily:'var(--font-mono)',marginTop:6,textAlign:'right'}}>
          {(form.career_summary || '').length} / 500
        </div>
      </div>

      {err && <div role="alert" style={{color:'var(--state-danger)',marginTop:12}}>{err}</div>}
      <div className="form-actions" style={{marginTop:24}}>
        <button type="submit" className="btn btn-primary">{isKo ? '저장' : 'Save'}</button>
        {savedAt && <span style={{color:'var(--state-success)',fontSize:13,marginLeft:12}}>✓ {isKo ? '저장됨' : 'Saved'} {savedAt.toLocaleTimeString()}</span>}
      </div>
    </form>
  );
}

function MemberRecommendations({ isKo, c, go }) {
  const [items, setItems] = useStateM([]);
  const [loading, setLoading] = useStateM(true);
  const programs = (c && c.programs) || [];

  useEffectM(() => {
    (async () => {
      try {
        const res = await window.DreamPathAuth.authFetch('/api/me/recommendations');
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--fg-muted)'}}>{isKo ? '추천 생성 중…' : 'Generating recommendations…'}</div>;

  return (
    <div>
      <p className="sec-sub" style={{maxWidth:680,margin:'0 0 24px'}}>
        {isKo ? '아래는 현재 입력하신 정보 기반의 추천입니다. 커리어 정보를 더 채울수록 정확해집니다.' : 'Recommendations based on your current profile. The more you fill in, the more accurate they get.'}
      </p>
      <div className="prog-grid">
        {items.map((rec, i) => {
          const p = programs.find(x => x.id === rec.program_id);
          if (!p) return null;
          return (
            <article key={i} className="prog" onClick={() => go('program', p.id)}
              role="button" tabIndex="0">
              <div className="prog-media" style={{'--c1': p.color, '--c2': 'var(--midnight-purple)', '--accent': p.accent}} aria-hidden="true">
                <i data-lucide={p.icon} width="44" height="44" strokeWidth="1.5" className="prog-icon"></i>
                <div className="prog-chips">
                  <span className="pc">{Math.round(rec.match * 100)}% {isKo ? '일치' : 'match'}</span>
                </div>
              </div>
              <p className="prog-kicker">{p.kicker}</p>
              <h3 className={'prog-title' + (isKo ? '' : ' en')}>{isKo ? p.title_ko : p.title_en}</h3>
              <p className="prog-sub">{isKo ? rec.reason_ko : rec.reason_en}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function MemberPrivacy({ isKo, go }) {
  const [busy, setBusy] = useStateM(false);
  const [err, setErr] = useStateM('');

  async function exportData() {
    setBusy(true); setErr('');
    try {
      const res = await window.DreamPathAuth.authFetch('/api/me/export');
      if (!res.ok) throw new Error('http_' + res.status);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'koreadreampath-my-data.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function deleteAccount() {
    const phrase = isKo ? '계정 삭제' : 'DELETE';
    const input = window.prompt(
      (isKo
        ? '계정 삭제는 영구적으로 적용됩니다. 개인정보는 익명화되고 30일 이내 완전 파기됩니다.\n\n계속하려면 다음 문구를 정확히 입력하세요: '
        : 'Deleting your account is permanent. Personal data is anonymized and fully removed within 30 days.\n\nType the following to confirm: '
      ) + phrase
    );
    if (input !== phrase) return;
    setBusy(true); setErr('');
    try {
      const res = await window.DreamPathAuth.authFetch('/api/me', { method: 'DELETE' });
      if (!res.ok) throw new Error('http_' + res.status);
      await window.DreamPathAuth.logout();
      go('home');
      alert(isKo ? '계정이 삭제되었습니다.' : 'Your account has been deleted.');
    } catch (e) { setErr(e.message); setBusy(false); }
  }

  return (
    <div style={{maxWidth:760,margin:'0 auto'}}>
      <div className="apply-card" style={{marginBottom:16}}>
        <h3 className="apply-sub" style={{marginTop:0}}>{isKo ? '내 데이터 다운로드' : 'Download my data'}</h3>
        <p style={{color:'var(--fg-secondary)',fontSize:14,lineHeight:1.6}}>
          {isKo
            ? 'GDPR Art. 15에 따라 회사가 보유한 본인의 모든 개인정보를 JSON 형식으로 받아볼 수 있습니다.'
            : 'Per GDPR Art. 15, you can download all personal data we hold about you, in JSON.'}
        </p>
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={exportData}>
          {busy ? (isKo ? '내보내는 중…' : 'Exporting…') : (isKo ? 'JSON 다운로드' : 'Download JSON')}
        </button>
      </div>

      <div className="apply-card" style={{borderColor:'rgba(185,28,28,0.30)',background:'rgba(185,28,28,0.03)'}}>
        <h3 className="apply-sub" style={{marginTop:0,color:'var(--state-danger)'}}>{isKo ? '계정 삭제' : 'Delete account'}</h3>
        <p style={{color:'var(--fg-secondary)',fontSize:14,lineHeight:1.6}}>
          {isKo
            ? '계정과 커리어 프로필이 즉시 삭제됩니다. 지원서는 학교 입학 기록 처리를 위해 제출자 정보(user_id)만 분리되며 익명 통계 형태로 남을 수 있습니다.'
            : 'Your account and career profile are deleted immediately. Submitted applications keep their record but are detached from your account and may remain as anonymous statistics.'}
        </p>
        {err && <div role="alert" style={{color:'var(--state-danger)',fontSize:13,marginBottom:10}}>{err}</div>}
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={deleteAccount}
          style={{borderColor:'var(--state-danger)',color:'var(--state-danger)'}}>
          {isKo ? '계정 삭제' : 'Delete my account'}
        </button>
      </div>
    </div>
  );
}

window.Member = Member;
