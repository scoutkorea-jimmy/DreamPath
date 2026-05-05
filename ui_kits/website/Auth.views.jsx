// Auth.views.jsx — public SPA views for the email-verify + password-reset
// flows. Both screens read the `token` query-string param, hit the matching
// /api/auth/* endpoint, and show a clear success / failure state.
//
// These don't depend on AuthModal — a user clicking the link in their email
// (eventually) lands here directly without needing to be logged in.
const { useState: useStateAV, useEffect: useEffectAV } = React;

function VerifyEmailView({ go, lang }) {
  const isKo = lang === 'ko';
  const [state, setState] = useStateAV('working');   // 'working' | 'ok' | 'invalid' | 'expired' | 'used' | 'error'
  const [msg, setMsg] = useStateAV('');

  useEffectAV(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { setState('invalid'); return; }
    (async () => {
      try {
        const r = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok) { setState('ok'); return; }
        if (d.error === 'expired')      setState('expired');
        else if (d.error === 'already_used') setState('used');
        else if (d.error === 'invalid_token') setState('invalid');
        else { setState('error'); setMsg(d.error || ('http_' + r.status)); }
      } catch (e) {
        setState('error'); setMsg(String(e.message || e));
      }
    })();
  }, []);

  const T = {
    working:  isKo ? '이메일 인증 처리 중…' : 'Verifying your email…',
    ok:       isKo ? '이메일이 확인되었습니다 ✓' : 'Email verified ✓',
    invalid:  isKo ? '인증 링크가 유효하지 않습니다.' : 'This verification link is invalid.',
    expired:  isKo ? '인증 링크가 만료되었습니다. 새 링크를 요청해 주세요.' : 'This link has expired. Please request a new one.',
    used:     isKo ? '이 인증 링크는 이미 사용되었습니다.' : 'This link has already been used.',
    error:    isKo ? '오류가 발생했습니다.' : 'Something went wrong.',
  };
  const ok = state === 'ok';
  return (
    <div className="container-narrow" style={{padding:'80px 24px',textAlign:'center'}}>
      <div style={{width:72,height:72,borderRadius:'50%',display:'inline-flex',alignItems:'center',justifyContent:'center',
        background: ok ? 'var(--state-success-bg)' : 'var(--bg-muted)',
        color: ok ? 'var(--state-success)' : 'var(--fg-secondary)', margin:'0 auto 16px'}}>
        <i data-lucide={ok ? 'check-circle-2' : (state === 'working' ? 'loader' : 'mail-x')} width="32" height="32" strokeWidth="1.75" aria-hidden="true"></i>
      </div>
      <h1 style={{fontFamily:'var(--font-en)',fontSize:32,margin:'0 0 8px',color:'var(--brand-text)'}}>
        {isKo ? '이메일 인증' : 'Email verification'}
      </h1>
      <p style={{color:'var(--fg-secondary)',fontSize:16}}>{T[state]}</p>
      {msg && <p style={{color:'var(--fg-muted)',fontSize:13,fontFamily:'var(--font-mono)'}}>{msg}</p>}
      <div style={{marginTop:24,display:'flex',justifyContent:'center',gap:8}}>
        <button type="button" className="btn btn-primary" onClick={() => go('home')}>
          {isKo ? '홈으로' : 'Go home'}
        </button>
      </div>
    </div>
  );
}
window.VerifyEmailView = VerifyEmailView;

function ResetPasswordView({ go, lang }) {
  const isKo = lang === 'ko';
  // Two-mode view:
  //   no token in URL → show "request a reset link" form
  //   token present  → show "set a new password" form
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [email, setEmail] = useStateAV('');
  const [password, setPassword] = useStateAV('');
  const [busy, setBusy] = useStateAV(false);
  const [done, setDone] = useStateAV(null);   // 'requested' | 'reset'
  const [err, setErr] = useStateAV('');
  const [devLink, setDevLink] = useStateAV('');

  async function requestReset(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(''); setDevLink('');
    try {
      const r = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error || ('http_' + r.status)); return; }
      setDone('requested');
      // Until SMTP is wired the API returns the token directly so the
      // operator can test the flow. Show it as a clickable link so they
      // can hop straight to the reset form.
      if (d.token) setDevLink(window.location.origin + '/reset-password?token=' + encodeURIComponent(d.token));
    } catch (e) { setErr(String(e.message || e)); }
    finally { setBusy(false); }
  }
  async function confirmReset(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/auth/confirm-password-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr({
          invalid_token:        isKo ? '재설정 링크가 유효하지 않습니다.' : 'Invalid reset link.',
          expired:              isKo ? '링크가 만료되었습니다. 새 링크를 요청해 주세요.' : 'Link expired. Please request a new one.',
          already_used:         isKo ? '이미 사용된 링크입니다.' : 'This link was already used.',
          password_too_short:   isKo ? '비밀번호는 최소 8자 이상이어야 합니다.' : 'Password must be at least 8 characters.',
        }[d.error] || (d.error || ('http_' + r.status)));
        return;
      }
      setDone('reset');
    } catch (e) { setErr(String(e.message || e)); }
    finally { setBusy(false); }
  }

  if (done === 'reset') {
    return (
      <div className="container-narrow" style={{padding:'80px 24px',textAlign:'center'}}>
        <h1 style={{fontFamily:'var(--font-en)',fontSize:32,color:'var(--brand-text)'}}>{isKo ? '비밀번호가 재설정되었습니다' : 'Password reset'}</h1>
        <p style={{color:'var(--fg-secondary)'}}>{isKo ? '새 비밀번호로 로그인해 주세요.' : 'Sign in with your new password.'}</p>
        <button type="button" className="btn btn-primary" style={{marginTop:18}}
          onClick={() => { go('home'); window.dispatchEvent(new CustomEvent('dp-open-auth', { detail: { mode: 'login' } })); }}>
          {isKo ? '로그인' : 'Log in'}
        </button>
      </div>
    );
  }

  if (token) {
    return (
      <div className="container-narrow" style={{padding:'80px 24px'}}>
        <h1 style={{fontFamily:'var(--font-en)',fontSize:32,color:'var(--brand-text)',textAlign:'center'}}>{isKo ? '새 비밀번호 설정' : 'Set a new password'}</h1>
        <form onSubmit={confirmReset} className="apply-card" style={{maxWidth:480,margin:'24px auto 0'}}>
          <label className="auth-field">
            <span>{isKo ? '새 비밀번호 (8자 이상)' : 'New password (min 8 chars)'}</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} />
          </label>
          {err && <div role="alert" style={{color:'var(--state-danger)',fontSize:13,marginTop:8}}>{err}</div>}
          <button type="submit" className="btn btn-primary btn-block" style={{marginTop:14}} disabled={busy}>
            {busy ? (isKo ? '처리 중…' : 'Working…') : (isKo ? '비밀번호 재설정' : 'Reset password')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="container-narrow" style={{padding:'80px 24px'}}>
      <h1 style={{fontFamily:'var(--font-en)',fontSize:32,color:'var(--brand-text)',textAlign:'center'}}>{isKo ? '비밀번호 재설정' : 'Reset your password'}</h1>
      <p style={{color:'var(--fg-secondary)',textAlign:'center',marginTop:8}}>
        {isKo ? '가입하신 이메일을 입력하시면 재설정 링크를 보내드립니다.' : 'Enter your email and we\'ll send a reset link.'}
      </p>
      <form onSubmit={requestReset} className="apply-card" style={{maxWidth:480,margin:'24px auto 0'}}>
        {window.EmailField
          ? <window.EmailField label={isKo ? '이메일' : 'Email'} value={email} onChange={setEmail} required lang={lang} />
          : (
            <label className="auth-field">
              <span>{isKo ? '이메일' : 'Email'}</span>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </label>
          )}
        {err && <div role="alert" style={{color:'var(--state-danger)',fontSize:13,marginTop:8}}>{err}</div>}
        {done === 'requested' && (
          <div role="status" style={{padding:'10px 14px',background:'var(--state-success-bg)',color:'var(--state-success)',borderRadius:8,marginTop:12,fontSize:14}}>
            {isKo ? '재설정 링크가 발송되었습니다 (해당 이메일이 등록된 경우).' : 'If that email exists, a reset link is on its way.'}
            {devLink && (
              <div style={{marginTop:8,fontSize:12,fontFamily:'var(--font-mono)'}}>
                <strong>DEV:</strong>{' '}
                <a href={devLink} style={{color:'inherit',textDecoration:'underline'}}>{devLink}</a>
                <div style={{opacity:0.8,marginTop:4}}>{isKo ? 'SMTP 연동 전이라 토큰 링크를 직접 노출합니다. 운영 시 제거됩니다.' : 'Shown only until SMTP is wired; remove for production.'}</div>
              </div>
            )}
          </div>
        )}
        <button type="submit" className="btn btn-primary btn-block" style={{marginTop:14}} disabled={busy}>
          {busy ? (isKo ? '발송 중…' : 'Sending…') : (isKo ? '재설정 링크 받기' : 'Send reset link')}
        </button>
      </form>
    </div>
  );
}
window.ResetPasswordView = ResetPasswordView;
