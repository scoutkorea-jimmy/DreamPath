// Team.jsx — project team page (linked from footer).
// Sections render as groups (e.g. HQ / GLOBAL TEAM). Each member card shows
// a 1:1 photo (grayscale at rest, colour on hover), name, title and a short
// bio (약력). An always-on "Message the coordinator" CTA + per-member message
// buttons open a message modal. Sending requires login; logged-out users are
// prompted to sign up. Linked members get a real DM to their inbox.
//
// NOTE: icons here are inline SVG, NOT lucide <i data-lucide> placeholders.
// Lucide rewrites those <i> nodes into <svg> in-place, which fights React's
// reconciliation inside this dynamic modal/button tree and throws
// "removeChild ... is not a child of this node", blanking the page. Inline
// SVG is fully React-managed and crash-free.
const { useState: useStateT, useEffect: useEffectT } = React;

function TIcon({ name, size = 16 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  switch (name) {
    case 'x': return <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
    case 'check': return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
    case 'user-plus': return <svg {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
    case 'send': return <svg {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
    case 'mail': return <svg {...p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>;
    case 'arrow-right': return <svg {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
    default: return null;
  }
}

function TeamMessageModal({ open, onClose, member, lang, go }) {
  const isKo = lang === 'ko';
  const [subject, setSubject] = useStateT('');
  const [bodyText, setBodyText] = useStateT('');
  const [busy, setBusy] = useStateT(false);
  const [err, setErr] = useStateT('');
  const [done, setDone] = useStateT(false);
  const auth = window.useAuth();

  useEffectT(() => {
    if (open) { setSubject(''); setBodyText(''); setErr(''); setDone(false); setBusy(false); }
  }, [open, member]);

  if (!open || !member) return null;

  const name = isKo ? (member.name || member.name_en) : (member.name_en || member.name);
  const role = isKo ? (member.role_ko || member.role_en) : (member.role_en || member.role_ko);
  const u = auth.user || {};
  const loggedOut = !auth.user;

  function openAuth(mode) {
    onClose();
    window.dispatchEvent(new CustomEvent('dp-open-auth', { detail: { mode } }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!subject.trim()) { setErr(isKo ? '제목을 입력해주세요.' : 'Please enter a subject.'); return; }
    if (bodyText.trim().length < 10) { setErr(isKo ? '메시지를 10자 이상 입력해주세요.' : 'Your message must be at least 10 characters.'); return; }
    setBusy(true);
    try {
      // Linked members → real direct message; otherwise fall back to the
      // admin inbox so the button still does something useful.
      const dm = member.messageable && member.key;
      const res = dm
        ? await window.DreamPathAuth.authFetch('/api/me/messages', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to_key: member.key, subject: subject.trim(), body: bodyText.trim() }),
          })
        : await window.DreamPathAuth.authFetch('/api/team/message', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: name, subject: subject.trim(), body: bodyText.trim(), lang }),
          });
      if (res.status === 401) { setErr(isKo ? '로그인이 만료되었어요. 다시 로그인해주세요.' : 'Your session expired. Please log in again.'); setBusy(false); return; }
      if (!res.ok) { setErr(isKo ? '전송에 실패했습니다. 잠시 후 다시 시도해주세요.' : 'Could not send. Please try again shortly.'); setBusy(false); return; }
      setDone(true);
    } catch {
      setErr(isKo ? '네트워크 오류가 발생했습니다.' : 'A network error occurred.');
    }
    setBusy(false);
  }

  return (
    <div className="tm-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="tm-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="tm-close" onClick={onClose} aria-label={isKo ? '닫기' : 'Close'}>
          <TIcon name="x" size={20} />
        </button>

        <div className="tm-head">
          <div className="tm-avatar" style={{backgroundImage: member.image ? `url(${member.image})` : 'none'}}>
            {!member.image && (name || '?').charAt(0)}
          </div>
          <div>
            <div className="sec-kicker">{isKo ? '메시지 보내기' : 'SEND A MESSAGE'}</div>
            <div className="tm-to">{name}</div>
            {role && <div className="tm-to-role">{role}</div>}
          </div>
        </div>

        {done ? (
          <div className="tm-done">
            <div className="tm-done-icon"><TIcon name="check" size={28} /></div>
            <h3>{isKo ? '메시지를 보냈어요' : 'Message sent'}</h3>
            <p>{member.messageable
              ? (isKo ? `${name}님께 메시지가 전달되었습니다. 답장은 마이페이지 → 메시지에서 받아볼 수 있어요.` : `Your message to ${name} was delivered. You'll see any reply under My page → Messages.`)
              : (isKo ? `${name}님께 메시지가 전달되었습니다. 운영팀이 확인 후 회신드릴게요.` : `Your message to ${name} has been delivered. The team will get back to you.`)}</p>
            <div className="tm-actions" style={{justifyContent:'center'}}>
              {member.messageable && go && (
                <button type="button" className="btn btn-ghost" onClick={() => { try { sessionStorage.setItem('dp_member_section', 'messages'); } catch {} onClose(); go('member'); }}>
                  {isKo ? '메시지함 열기' : 'Open my messages'}
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={onClose}>{isKo ? '확인' : 'Done'}</button>
            </div>
          </div>
        ) : loggedOut ? (
          <div className="tm-gate">
            <div className="tm-gate-icon"><TIcon name="user-plus" size={26} /></div>
            <h3>{isKo ? '회원가입 후 메시지를 보낼 수 있어요' : 'Sign up to send a message'}</h3>
            <p>{isKo
              ? '메시지를 보내려면 먼저 회원가입(또는 로그인)을 해주세요. 가입은 1분이면 끝나고, 보내주신 메시지는 운영팀이 확인해 회신드립니다.'
              : 'Create an account (or log in) to send your message. It takes under a minute, and the team will reply to whatever you send.'}</p>
            <div className="tm-gate-actions">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => openAuth('signup')}>
                {isKo ? '회원가입하기' : 'Create an account'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => openAuth('login')}>
                {isKo ? '이미 계정이 있어요 · 로그인' : 'I already have an account · Log in'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="tm-from">
              {isKo ? '보내는 사람: ' : 'Sending as: '}
              <strong>{u.name || u.email}</strong>{u.name && u.email ? ` · ${u.email}` : ''}
            </p>
            <label className="tm-label">{isKo ? '제목' : 'Subject'}</label>
            <input type="text" className="tm-input" value={subject} maxLength={140}
              onChange={e => setSubject(e.target.value)}
              placeholder={isKo ? '예: 프로그램 참여 문의' : 'e.g. Question about joining a program'} />
            <label className="tm-label">{isKo ? '메시지' : 'Message'}</label>
            <textarea className="tm-input tm-area" value={bodyText} rows={6} maxLength={4000}
              onChange={e => setBodyText(e.target.value)}
              placeholder={isKo ? '전하고 싶은 내용을 적어주세요.' : 'Write your message here.'} />
            {err && <div role="alert" className="tm-err">{err}</div>}
            <div className="tm-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>{isKo ? '취소' : 'Cancel'}</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? (isKo ? '보내는 중…' : 'Sending…') : (isKo ? '메시지 보내기' : 'Send message')}
                {!busy && <TIcon name="send" />}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// Profile modal — clicking a team member (or the coordinator) opens their full
// bio/약력. Reuses the tm-overlay/tm-modal shell of TeamMessageModal. When the
// member is messageable, a "send a message" button hands off to onMessage.
function TeamProfileModal({ open, member, lang, onClose, onMessage }) {
  if (!open || !member) return null;
  const isKo = lang === 'ko';
  const pick = (ko, en) => isKo ? (ko || en) : (en || ko);
  const name = pick(member.name, member.name_en);
  const role = pick(member.role_ko, member.role_en);
  const bio     = pick(member.bio_ko, member.bio_en);                    // ① BIO 문구
  const career  = pick(member.career_ko, member.career_en);             // ② 주요 약력
  const project = pick(member.project_role_ko, member.project_role_en); // ③ 이번 프로젝트 주요 역할
  const credentials = pick(member.credentials_ko, member.credentials_en); // ④ CREDENTIALS
  // 주요 링크: one per line, "Label | URL" or bare URL.
  const links = (pick(member.links_ko, member.links_en) || '')
    .split('\n').map(s => s.trim()).filter(Boolean)
    .map(line => {
      const bar = line.indexOf('|');
      if (bar !== -1) return { label: line.slice(0, bar).trim(), url: line.slice(bar + 1).trim() };
      return { label: line, url: line };
    })
    .filter(l => l.url);
  const contactEmail = member.contact_email || '';
  const hasAny = bio || career || project || credentials || links.length || contactEmail;
  return (
    <div className="tm-overlay team-profile-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="tm-modal team-profile-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="tm-close" onClick={onClose} aria-label={isKo ? '닫기' : 'Close'}>
          <TIcon name="x" size={18} />
        </button>
        <div className="team-profile-head">
          <div className="team-profile-photo" style={{backgroundImage: member.image ? `url(${member.image})` : 'none'}}>
            {!member.image && (name || '?').charAt(0)}
          </div>
          <div className="team-profile-id">
            <div className="team-profile-name">{name}</div>
            {role && <div className="team-profile-role">{role}</div>}
          </div>
        </div>
        {bio && (
          <div className="team-profile-section">
            <div className="team-profile-label">BIO</div>
            <p className="team-profile-bio">{bio}</p>
          </div>
        )}
        {career && (
          <div className="team-profile-section">
            <div className="team-profile-label">{isKo ? '주요 약력' : 'Key background'}</div>
            <p className="team-profile-bio">{career}</p>
          </div>
        )}
        {project && (
          <div className="team-profile-section">
            <div className="team-profile-label">{isKo ? '이번 프로젝트 주요 역할' : 'Role in this project'}</div>
            <p className="team-profile-bio">{project}</p>
          </div>
        )}
        {credentials && (
          <div className="team-profile-section">
            <div className="team-profile-label">CREDENTIALS</div>
            <p className="team-profile-bio">{credentials}</p>
          </div>
        )}
        {links.length > 0 && (
          <div className="team-profile-section">
            <div className="team-profile-label">{isKo ? '주요 링크' : 'Key links'}</div>
            <ul className="team-profile-links">
              {links.map((l, i) => (
                <li key={i}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {contactEmail && (
          <div className="team-profile-section">
            <div className="team-profile-label">{isKo ? '연락처' : 'Contact'}</div>
            <p className="team-profile-bio"><a href={`mailto:${contactEmail}`}>{contactEmail}</a></p>
          </div>
        )}
        {!hasAny && <p className="team-profile-bio team-profile-bio-empty">{isKo ? '등록된 약력이 없습니다.' : 'No bio available yet.'}</p>}
        {/* 메시지 보내기는 항상 노출. 로그아웃 사용자는 메시지 모달이 회원가입/로그인으로
            유도하고, 로그인 사용자는 계정 연결 멤버면 DM, 미연결 멤버면 문의함으로 전달. */}
        <div className="team-profile-actions">
          <button type="button" className="btn btn-primary" onClick={() => { onClose(); onMessage(member); }}>
            <TIcon name="mail" size={16} />
            {isKo ? '메시지 보내기' : 'Send a message'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Team({ go, lang, c }) {
  const isKo = lang === 'ko';
  const t = (c && c.project_team) || {};
  const hero = (t.hero && t.hero[lang]) || {};
  const sections = t.sections || [];
  const cta = (t.cta && t.cta[lang]) || {};
  // Coordinator can be designated from a team member (admin) — when it carries
  // a member_key we mirror that member fully (name/role/photo/account), so it
  // stays in sync. Otherwise it's a standalone manual entry.
  let coordinator = t.coordinator || { name: '코디네이터', name_en: 'Coordinator', role_ko: '지원·문의 총괄', role_en: 'Applicant support & inquiries' };
  if (coordinator && coordinator.member_key) {
    const ref = sections.reduce((acc, s) => acc || (s.members || []).find(m => m && m.key === coordinator.member_key), null);
    if (ref) coordinator = ref;
  }
  const coordName = isKo ? (coordinator.name || coordinator.name_en) : (coordinator.name_en || coordinator.name);
  const pick = (ko, en) => isKo ? (ko || en) : (en || ko);
  const cc = t.coord_cta || {}; // editable copy for the top message band
  const hbTeam = window.useHeroBg(t.hero); // progressive hero background
  const [target, setTarget] = useStateT(null);
  const [profile, setProfile] = useStateT(null);

  return (
    <div data-screen-label="Project Team">
      <div className={('phead ' + hbTeam.cls).trim()} style={hbTeam.style}>
        <div className="inner">
          <div className="sec-kicker">{hero.kicker}</div>
          <h1 className={isKo ? '' : 'en'}>
            {hero.title_l1}{hero.title_l2 ? <><br/>{hero.title_l2}</> : null}
          </h1>
          <p>{hero.sub}</p>
        </div>
      </div>

      {/* Always-on coordinator CTA — visible to everyone; logged-out users
          are prompted to sign up inside the modal. */}
      <section className="section-tight team-coord-section">
        <div className="container-narrow">
          <div className="team-coord-band">
            <div className="team-coord-photo" style={{backgroundImage: coordinator.image ? `url(${coordinator.image})` : 'none'}}>
              {!coordinator.image && (coordName || '?').charAt(0)}
            </div>
            <div className="team-coord-copy">
              <div className="sec-kicker">{pick(cc.kicker_ko, cc.kicker_en) || (isKo ? '궁금한 점이 있나요?' : 'HAVE A QUESTION?')}</div>
              <h2>{pick(cc.title_ko, cc.title_en) || (isKo ? 'CEO에게 물어보세요' : 'Meet our CEO')}</h2>
              <p>{pick(cc.sub_ko, cc.sub_en) || (isKo
                ? '궁금한 이야기가 있다면 무엇이든 들려주세요. 우리 CEO가 직접 듣고, 가장 적절한 답을 드릴 수 있는 사람을 연결해 드립니다.'
                : 'Have something on your mind? Share it — our CEO will personally read it and connect you with the right person to give you the best answer.')}</p>
            </div>
            <div className="team-coord-action">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => setTarget(coordinator)}>
                <TIcon name="mail" size={18} />
                {isKo ? '메시지 보내기' : 'Send a message'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {sections.map((s, si) => (
        <section key={si} className="section team-section" style={si % 2 === 1 ? { background: 'var(--bg-muted)' } : null}>
          <div className="container">
            <div className="sec-kicker team-group-title">{isKo ? s.kicker_ko : (s.kicker_en || s.kicker_ko)}</div>
            <div className="team-page-grid">
              {(s.members || []).map((m, mi) => {
                const name = isKo ? (m.name || m.name_en) : (m.name_en || m.name);
                const role = isKo ? m.role_ko : (m.role_en || m.role_ko);
                const bio  = isKo ? m.bio_ko : (m.bio_en || m.bio_ko);
                return (
                  <article key={mi} className="team-page-card team-page-card-click"
                    role="button" tabIndex={0}
                    onClick={() => setProfile(m)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProfile(m); } }}
                    aria-label={(name || '') + (isKo ? ' 약력 보기' : ' — view bio')}>
                    <div className="team-page-photo" style={{backgroundImage: m.image ? `url(${m.image})` : 'none'}}>
                      {!m.image && (name || '?').charAt(0)}
                    </div>
                    <div className="team-page-body">
                      <div className="team-page-name">{name}</div>
                      <div className="team-page-role">{role}</div>
                      {bio && <p className="team-page-bio">{bio}</p>}
                      <span className="team-page-more">{isKo ? '약력 보기 →' : 'View bio →'}</span>
                      {m.messageable && (
                        <button type="button" className="btn btn-outline btn-sm team-msg-btn"
                          onClick={e => { e.stopPropagation(); setTarget(m); }}>
                          <TIcon name="mail" size={15} />
                          {isKo ? '메시지 보내기' : 'Send a message'}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ))}

      <section className="section-tight">
        <div className="container-narrow">
          <div className="cta-banner">
            <div>
              <div className="sec-kicker" style={{color:'rgba(255,255,255,0.85)'}}>{cta.kicker}</div>
              <h2>{cta.title}</h2>
              <p>{cta.sub}</p>
            </div>
            <div className="btn-wrap">
              <a className="btn btn-lg btn-white" href={`mailto:${cta.email || 'info@koreadreampath.com'}`}>
                {cta.button} <TIcon name="arrow-right" size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <TeamProfileModal open={!!profile} member={profile} lang={lang} onClose={() => setProfile(null)} onMessage={(m) => setTarget(m)} />
      <TeamMessageModal open={!!target} member={target} lang={lang} go={go} onClose={() => setTarget(null)} />
    </div>
  );
}
window.Team = Team;
