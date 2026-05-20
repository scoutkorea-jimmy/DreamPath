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

  async function requestReset(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr('');
    try {
      await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // The server always responds 200 ok=true regardless of whether the
      // email exists / is rate-limited — so we always show the "check
      // your email" confirmation. The dev fallback that returned the
      // token in the response is gone; tokens travel via email only.
      setDone('requested');
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
        // Server folds invalid / consumed / expired token into a single
        // opaque response. password_too_short is a format error so it
        // stays distinct.
        setErr({
          invalid_request:      isKo ? '재설정 링크가 유효하지 않거나 만료되었거나 이미 사용되었습니다. 새 링크를 요청해 주세요.' : 'Reset link is invalid, expired, or already used. Please request a new one.',
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
          {err && <div role="alert" style={{padding:'8px 12px',background:'var(--state-danger-bg)',color:'var(--state-danger)',borderRadius:8,fontSize:13,marginTop:8}}>{err}</div>}
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
        {err && <div role="alert" style={{padding:'8px 12px',background:'var(--state-danger-bg)',color:'var(--state-danger)',borderRadius:8,fontSize:13,marginTop:8}}>{err}</div>}
        {done === 'requested' && (
          <div role="status" style={{padding:'10px 14px',background:'var(--state-success-bg)',color:'var(--state-success)',borderRadius:8,marginTop:12,fontSize:14}}>
            {isKo ? '재설정 링크가 발송되었습니다 (해당 이메일이 등록된 경우).' : 'If that email exists, a reset link is on its way.'}
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

// ActivateAccountView — entry point for the activation email link
//   /activate?email=<addr>&code=<6-digit>
// Reads both query params; if both are present it auto-submits, otherwise it
// renders an email + code form so the user can paste them by hand.
function ActivateAccountView({ go, lang }) {
  const isKo = lang === 'ko';
  const params = new URLSearchParams(window.location.search);
  const initialEmail = params.get('email') || '';
  const initialCode  = (params.get('code') || '').replace(/\D/g, '').slice(0, 6);
  const [email, setEmail] = useStateAV(initialEmail);
  const [code, setCode]   = useStateAV(initialCode);
  const [state, setState] = useStateAV(initialEmail && initialCode.length === 6 ? 'working' : 'idle'); // idle | working | ok | failed
  const [resentAt, setResentAt] = useStateAV(0);

  async function submitActivation(e_, c_) {
    setState('working');
    try {
      const r = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: e_, code: c_ }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        // Auto-login the activated user via the returned session token.
        if (d.token && window.DreamPathAuth && window.DreamPathAuth.adoptSession) {
          window.DreamPathAuth.adoptSession(d.token, d.user);
        }
        setState('ok');
        return;
      }
      // Server returns one opaque failure shape for all rejection modes
      // (no such email / expired / wrong code / locked / already active) so
      // an attacker can't distinguish between them. We surface the same
      // single message no matter what.
      setState('failed');
    } catch {
      setState('failed');
    }
  }

  useEffectAV(() => {
    if (initialEmail && initialCode.length === 6) submitActivation(initialEmail, initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resend() {
    if (!email) return;
    if (resentAt && Date.now() - resentAt < 60_000) return;
    setResentAt(Date.now());
    try {
      await fetch('/api/auth/resend-activation', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, lang }),
      });
    } catch {}
  }

  if (state === 'ok') {
    return (
      <div className="container-narrow" style={{padding:'80px 24px',textAlign:'center'}}>
        <div style={{width:72,height:72,borderRadius:'50%',display:'inline-flex',alignItems:'center',justifyContent:'center',background:'var(--state-success-bg)',color:'var(--state-success)',margin:'0 auto 16px'}}>
          <i data-lucide="check-circle-2" width="32" height="32" strokeWidth="1.75" aria-hidden="true"></i>
        </div>
        <h1 style={{fontFamily:'var(--font-en)',fontSize:32,margin:'0 0 8px',color:'var(--brand-text)'}}>
          {isKo ? '계정이 활성화되었습니다' : 'Account activated'}
        </h1>
        <p style={{color:'var(--fg-secondary)',fontSize:16,marginBottom:24}}>
          {isKo ? '환영합니다! 이제 로그인 상태로 진입합니다.' : 'Welcome — you are now signed in.'}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => go('member')}>
          {isKo ? '내 페이지로' : 'My page →'}
        </button>
      </div>
    );
  }

  return (
    <div className="container-narrow" style={{padding:'80px 24px',maxWidth:520,margin:'0 auto'}}>
      <h1 style={{fontFamily:'var(--font-en)',fontSize:32,margin:'0 0 6px',color:'var(--brand-text)'}}>
        {isKo ? '계정 활성화' : 'Activate your account'}
      </h1>
      <p style={{color:'var(--fg-secondary)',fontSize:14,marginBottom:24}}>
        {isKo ? '메일로 받은 6자리 인증코드를 입력하세요. 코드는 발송 후 72시간 동안 유효합니다.' : 'Enter the 6-digit code sent to your email. Codes are valid for 72 hours.'}
      </p>
      <form onSubmit={(e) => { e.preventDefault(); submitActivation(email, code); }}>
        {window.EmailField
          ? <window.EmailField label={isKo ? '이메일' : 'Email'} value={email}
              onChange={(v) => setEmail((v || '').trim().toLowerCase())} required lang={lang} />
          : (
            <label className="auth-field">
              <span>{isKo ? '이메일' : 'Email'}</span>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value.trim().toLowerCase())} autoComplete="email" />
            </label>
          )}
        <label className="auth-field">
          <span>{isKo ? '인증코드 (6자리)' : 'Activation code (6 digits)'}</span>
          <input type="text" inputMode="numeric" pattern="\d{6}" required value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoComplete="one-time-code"
            style={{fontFamily:'var(--font-mono)',fontSize:20,letterSpacing:'0.4em',textAlign:'center'}} />
        </label>
        {state === 'failed' && (
          <div className="auth-err" role="alert" style={{marginTop:8}}>
            {isKo
              ? '활성화에 실패했습니다. 인증코드가 일치하지 않거나, 만료되었거나, 시도 횟수가 너무 많을 수 있습니다. 코드를 다시 확인하시거나, "다시 보내기"로 새 코드를 받으세요.'
              : 'Activation failed. The code may be wrong, expired, or attempted too many times. Re-check it or request a new one with "Resend".'}
          </div>
        )}
        <button type="submit" className="btn btn-primary btn-block" style={{marginTop:14}} disabled={state === 'working' || code.length !== 6}>
          {state === 'working' ? (isKo ? '확인 중…' : 'Verifying…') : (isKo ? '활성화' : 'Activate')}
        </button>
      </form>
      <div style={{textAlign:'center',marginTop:18,fontSize:13,color:'var(--fg-muted)'}}>
        {isKo ? '코드를 못 받으셨나요?' : "Didn't get the code?"}{' '}
        <button type="button" onClick={resend}
          disabled={!email || (resentAt && Date.now() - resentAt < 60_000)}
          style={{background:'none',border:'none',color:'var(--scouting-purple)',fontWeight:600,cursor:'pointer',padding:0}}>
          {resentAt && Date.now() - resentAt < 60_000
            ? (isKo ? '잠시 후 다시 시도' : 'Try again shortly')
            : (isKo ? '다시 보내기' : 'Resend')}
        </button>
      </div>
    </div>
  );
}
window.ActivateAccountView = ActivateAccountView;
