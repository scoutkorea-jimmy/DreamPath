// Team.jsx — project team page (linked from footer).
// Sections render as groups (e.g. HQ / GLOBAL TEAM). Each member card shows
// a 1:1 photo (grayscale at rest, colour on hover), name, title and a short
// bio (약력). An always-on "Message the coordinator" CTA + per-member message
// buttons open a message modal. Sending requires login; logged-out users are
// prompted to sign up. Messages land in the admin inbox (category 'team').
const { useState: useStateT, useEffect: useEffectT } = React;

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

  useEffectT(() => {
    if (open && window.lucide && window.lucide.createIcons) { try { window.lucide.createIcons(); } catch {} }
  });

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
      // When the team member is linked to an account, send a real direct
      // message to their inbox (threaded, repliable). Otherwise fall back to
      // the admin inbox so the button still does something useful.
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
      if (res.status === 401) { setErr(isKo ? '로그인이 필요합니다.' : 'Please log in first.'); setBusy(false); return; }
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
          <i data-lucide="x" width="20" height="20" strokeWidth="2" aria-hidden="true"></i>
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
            <div className="tm-done-icon"><i data-lucide="check" width="28" height="28" strokeWidth="2.5" aria-hidden="true"></i></div>
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
          // Always-on entry point: logged-out users see a sign-up prompt
          // rather than a dead button. Signing up (or logging in) lets them
          // come back and send the message.
          <div className="tm-gate">
            <div className="tm-gate-icon"><i data-lucide="user-plus" width="26" height="26" strokeWidth="2" aria-hidden="true"></i></div>
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
                {!busy && <i data-lucide="send" width="16" height="16" strokeWidth="2" aria-hidden="true"></i>}
              </button>
            </div>
          </form>
        )}
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
  // Coordinator — always-on message recipient. Falls back to a generic
  // "Coordinator" label if the operator hasn't filled one in.
  const coordinator = t.coordinator || { name: '코디네이터', name_en: 'Coordinator', role_ko: '지원·문의 총괄', role_en: 'Applicant support & inquiries' };
  const coordName = isKo ? (coordinator.name || coordinator.name_en) : (coordinator.name_en || coordinator.name);
  const [target, setTarget] = useStateT(null);

  // Re-render the Lucide icons whenever the section/modal markup changes.
  useEffectT(() => {
    if (window.lucide && window.lucide.createIcons) { try { window.lucide.createIcons(); } catch {} }
  });

  return (
    <div data-screen-label="Project Team">
      <div className="phead">
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
      <section className="section-tight">
        <div className="container-narrow">
          <div className="team-coord-band">
            <div className="team-coord-photo" style={{backgroundImage: coordinator.image ? `url(${coordinator.image})` : 'none'}}>
              {!coordinator.image && (coordName || '?').charAt(0)}
            </div>
            <div className="team-coord-copy">
              <div className="sec-kicker">{isKo ? '궁금한 점이 있나요?' : 'HAVE A QUESTION?'}</div>
              <h2>{isKo ? '코디네이터에게 메시지 보내기' : 'Message our coordinator'}</h2>
              <p>{isKo
                ? '프로그램·지원 절차·일정 등 무엇이든 코디네이터에게 직접 물어보세요. 회원가입 후 메시지를 보내면 운영팀이 확인해 회신드립니다.'
                : 'Ask the coordinator anything — programs, how to apply, schedules. Sign up, send a message, and the team will reply.'}</p>
            </div>
            <div className="team-coord-action">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => setTarget(coordinator)}>
                <i data-lucide="mail" width="18" height="18" strokeWidth="2" aria-hidden="true"></i>
                {isKo ? '메시지 보내기' : 'Send a message'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {sections.map((s, si) => (
        <section key={si} className="section" style={si % 2 === 1 ? { background: 'var(--bg-muted)' } : null}>
          <div className="container">
            <div className="sec-kicker team-group-title">{isKo ? s.kicker_ko : (s.kicker_en || s.kicker_ko)}</div>
            <div className="team-page-grid">
              {(s.members || []).map((m, mi) => {
                const name = isKo ? (m.name || m.name_en) : (m.name_en || m.name);
                const role = isKo ? m.role_ko : (m.role_en || m.role_ko);
                const bio  = isKo ? m.bio_ko : (m.bio_en || m.bio_ko);
                return (
                  <article key={mi} className="team-page-card">
                    <div className="team-page-photo" style={{backgroundImage: m.image ? `url(${m.image})` : 'none'}}>
                      {!m.image && (name || '?').charAt(0)}
                    </div>
                    <div className="team-page-body">
                      <div className="team-page-name">{name}</div>
                      <div className="team-page-role">{role}</div>
                      {bio && <p className="team-page-bio">{bio}</p>}
                      {m.messageable && (
                        <button type="button" className="btn btn-outline btn-sm team-msg-btn" onClick={() => setTarget(m)}>
                          <i data-lucide="mail" width="15" height="15" strokeWidth="2" aria-hidden="true"></i>
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
          <div className="cta-banner" style={{padding:'56px 48px'}}>
            <div>
              <div className="sec-kicker" style={{color:'rgba(255,255,255,0.85)'}}>{cta.kicker}</div>
              <h2>{cta.title}</h2>
              <p>{cta.sub}</p>
            </div>
            <div className="btn-wrap">
              <a className="btn btn-lg btn-white" href={`mailto:${cta.email || 'info@koreadreampath.com'}`}>
                {cta.button} <i data-lucide="arrow-right" width="18" height="18" strokeWidth="2" aria-hidden="true"></i>
              </a>
            </div>
          </div>
        </div>
      </section>

      <TeamMessageModal open={!!target} member={target} lang={lang} go={go} onClose={() => setTarget(null)} />
    </div>
  );
}
window.Team = Team;
