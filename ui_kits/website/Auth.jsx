// Auth.jsx — login/signup modal + useAuth hook
const { useState: useStateAu, useEffect: useEffectAu, useMemo: useMemoAu } = React;

function useAuth() {
  const [_, setTick] = useStateAu(0);
  useEffectAu(() => {
    const unsub = window.DreamPathAuth.subscribe(() => setTick(t => t + 1));
    return () => unsub();
  }, []);
  return {
    user: window.DreamPathAuth.user,
    ready: window.DreamPathAuth.ready,
    signup: window.DreamPathAuth.signup,
    login: window.DreamPathAuth.login,
    logout: window.DreamPathAuth.logout,
  };
}
window.useAuth = useAuth;

function useContentForLegal() {
  const [c, setC] = useStateAu(() => window.DreamPathContent.load());
  useEffectAu(() => {
    const h = () => setC(window.DreamPathContent.load());
    window.addEventListener('dp-content-changed', h);
    return () => window.removeEventListener('dp-content-changed', h);
  }, []);
  return c;
}

// Password complexity, mirrored from the worker so the UI can light up
// rules in real time. A passing password satisfies all five.
function passwordChecks(pw) {
  return {
    length: pw.length >= 10,
    upper:  /[A-Z]/.test(pw),
    lower:  /[a-z]/.test(pw),
    digit:  /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}
function PasswordRules({ pw, isKo }) {
  const checks = passwordChecks(pw);
  const items = [
    { k: 'length', l: isKo ? '10자 이상' : 'At least 10 characters' },
    { k: 'upper',  l: isKo ? '대문자 포함' : 'Uppercase letter' },
    { k: 'lower',  l: isKo ? '소문자 포함' : 'Lowercase letter' },
    { k: 'digit',  l: isKo ? '숫자 포함' : 'Number' },
    { k: 'symbol', l: isKo ? '특수문자 포함' : 'Symbol (!@#$ etc.)' },
  ];
  return (
    <ul style={{listStyle:'none',padding:0,margin:'6px 0 12px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 12px',fontSize:12}}>
      {items.map(it => {
        const ok = checks[it.k];
        return (
          <li key={it.k} style={{display:'flex',alignItems:'center',gap:6,color: ok ? 'var(--state-success)' : 'var(--fg-muted)'}}>
            <span aria-hidden style={{display:'inline-flex',width:14,height:14,borderRadius:'50%',alignItems:'center',justifyContent:'center',background: ok ? 'var(--state-success-bg)' : 'transparent',border: ok ? 'none' : '1px solid var(--border-default)',color:'inherit',fontSize:10,fontWeight:700}}>
              {ok ? '✓' : ''}
            </span>
            <span>{it.l}</span>
          </li>
        );
      })}
    </ul>
  );
}

function AuthModal({ open, onClose, lang, defaultMode = 'login' }) {
  const isKo = lang === 'ko';
  const [mode, setMode] = useStateAu(defaultMode);   // 'login' | 'signup' | 'check_email' | 'needs_activation'
  const [email, setEmail] = useStateAu('');
  const [password, setPassword] = useStateAu('');
  const [passwordConfirm, setPasswordConfirm] = useStateAu('');
  const [name, setName] = useStateAu('');
  // Single concatenated string ("+82 10 1234 5678") matching the existing
  // PhoneField API. We split it on submit so the worker stores the dial code
  // and the digits separately.
  const [phone, setPhone] = useStateAu('');
  const [err, setErr] = useStateAu('');
  const [busy, setBusy] = useStateAu(false);
  const [agreeTos, setAgreeTos] = useStateAu(false);
  const [agreePrivacy, setAgreePrivacy] = useStateAu(false);
  const [docOpen, setDocOpen] = useStateAu(null);
  const [pendingEmail, setPendingEmail] = useStateAu(''); // shown in check_email + needs_activation
  const auth = useAuth();
  const c = useContentForLegal();
  const tosDoc = c && c.legal && c.legal.tos;
  const privacyDoc = c && c.legal && c.legal.privacy_signup;
  const consentsOk = (!tosDoc || agreeTos) && (!privacyDoc || agreePrivacy);
  const pwChecks = useMemoAu(() => passwordChecks(password), [password]);
  const pwOk = pwChecks.length && pwChecks.upper && pwChecks.lower && pwChecks.digit && pwChecks.symbol;
  const pwMatch = password && password === passwordConfirm;

  useEffectAu(() => {
    if (open) {
      setMode(defaultMode);
      setEmail(''); setPassword(''); setPasswordConfirm(''); setName('');
      setPhone('');
      setErr(''); setBusy(false);
      setAgreeTos(false); setAgreePrivacy(false);
      setPendingEmail('');
    }
  }, [open, defaultMode]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (mode === 'signup') {
      if (!consentsOk) {
        setErr(isKo ? '필수 약관에 모두 동의해 주세요.' : 'Please agree to all required terms.');
        return;
      }
      if (!pwOk) {
        setErr(isKo ? '비밀번호 규칙을 모두 만족해야 합니다.' : 'Password must satisfy all rules.');
        return;
      }
      if (!pwMatch) {
        setErr(isKo ? '비밀번호 확인이 일치하지 않습니다.' : 'Passwords do not match.');
        return;
      }
    }
    setBusy(true); setErr('');
    try {
      if (mode === 'signup') {
        // Split "+82 10 1234 5678" → { country: "+82", national: "1012345678" }.
        const phoneTrim = (phone || '').trim();
        const m = phoneTrim.match(/^(\+\d{1,4})\s*(.*)$/);
        const phoneCountry  = m ? m[1] : '';
        const phoneNational = (m ? m[2] : '').replace(/\D/g, '');
        const res = await auth.signup({
          email, password, password_confirm: passwordConfirm, name,
          phone_country: phoneCountry, phone_national: phoneNational, lang,
        });
        if (window.recordConsent) {
          if (tosDoc) await window.recordConsent('tos', tosDoc.version, true, { email });
          if (privacyDoc) await window.recordConsent('privacy_signup', privacyDoc.version, true, { email });
        }
        if (res && res.activation_required) {
          setPendingEmail(email);
          setMode('check_email');
          return;
        }
        onClose && onClose();
      } else {
        await auth.login({ email, password });
        onClose && onClose();
      }
    } catch (e) {
      const msg = String(e.message || 'error');
      // The backend returns "account_not_activated" + email — pivot the UI
      // straight into the activation flow instead of leaving the user stuck.
      if (msg === 'account_not_activated') {
        setPendingEmail(email);
        setMode('needs_activation');
        return;
      }
      const human = {
        invalid_credentials:        isKo ? '이메일 또는 비밀번호가 올바르지 않습니다.' : 'Invalid email or password.',
        invalid_email:              isKo ? '이메일 형식이 올바르지 않습니다.' : 'Invalid email format.',
        password_too_short:         isKo ? '비밀번호는 최소 10자 이상이어야 합니다.' : 'Password must be at least 10 characters.',
        password_missing_uppercase: isKo ? '대문자가 포함되어야 합니다.' : 'Password must include an uppercase letter.',
        password_missing_lowercase: isKo ? '소문자가 포함되어야 합니다.' : 'Password must include a lowercase letter.',
        password_missing_digit:     isKo ? '숫자가 포함되어야 합니다.' : 'Password must include a number.',
        password_missing_symbol:    isKo ? '특수문자가 포함되어야 합니다.' : 'Password must include a symbol.',
        password_mismatch:          isKo ? '비밀번호 확인이 일치하지 않습니다.' : 'Passwords do not match.',
        invalid_phone_country:      isKo ? '국가번호 형식이 올바르지 않습니다.' : 'Invalid country code.',
        invalid_phone_national:     isKo ? '전화번호가 너무 짧습니다.' : 'Phone number is too short.',
        email_taken:                isKo ? '이미 가입된 이메일입니다.' : 'Email already registered.',
        too_many_attempts:          isKo ? '로그인 시도 횟수가 너무 많습니다. 잠시 후 다시 시도해 주세요.' : 'Too many login attempts. Please try again later.',
      }[msg] || (isKo ? '오류가 발생했습니다: ' + msg : 'Error: ' + msg);
      if (msg === 'too_many_attempts' && e.retryAfterSeconds != null) {
        const wait = e.retryAfterSeconds >= 60
          ? isKo ? Math.ceil(e.retryAfterSeconds / 60) + '분 후 다시 시도해주세요.' : ' Please wait ' + Math.ceil(e.retryAfterSeconds / 60) + ' minute(s).'
          : isKo ? Math.ceil(e.retryAfterSeconds) + '초 후 다시 시도해주세요.' : ' Please wait ' + Math.ceil(e.retryAfterSeconds) + ' second(s).';
        setErr(human + wait);
      } else {
        setErr(human);
      }
    } finally {
      setBusy(false);
    }
  }

  async function resendActivationLink() {
    if (busy || !pendingEmail) return;
    setBusy(true); setErr('');
    try {
      await fetch('/api/auth/resend-activation', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, lang }),
      });
    } catch {} finally { setBusy(false); }
  }

  // ── Post-signup: check your email (also used when login finds inactive). ─
  if (mode === 'check_email' || mode === 'needs_activation') {
    return (
      <div className="auth-overlay" onClick={onClose}>
        <div className="auth-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
          <button type="button" className="auth-close" onClick={onClose} aria-label={isKo ? '닫기' : 'Close'}>×</button>
          <div style={{textAlign:'center',padding:'8px 4px 4px'}}>
            <div style={{width:64,height:64,borderRadius:'50%',display:'inline-flex',alignItems:'center',justifyContent:'center',background:'var(--state-info-bg)',color:'var(--state-info)',marginBottom:14}}>
              <i data-lucide="mail-check" width="28" height="28" strokeWidth="1.75" />
            </div>
            <h2 style={{margin:'0 0 8px'}}>{mode === 'check_email'
              ? (isKo ? '이메일을 확인해 주세요' : 'Check your email')
              : (isKo ? '이메일 인증이 필요합니다' : 'Activation required')}</h2>
            <p style={{color:'var(--fg-secondary)',fontSize:14,lineHeight:1.55,margin:'0 0 14px'}}>
              {mode === 'check_email'
                ? (isKo ? '인증코드 6자리를 보내드렸습니다.' : "We've sent you a 6-digit activation code.")
                : (isKo ? '아직 활성화되지 않은 계정입니다. 메일에서 인증코드를 확인해 주세요.' : 'This account is pending activation. Check your inbox for the code.')}
              <br /><strong style={{color:'var(--fg-primary)'}}>{pendingEmail}</strong>
            </p>
            <p style={{color:'var(--fg-muted)',fontSize:12,margin:'0 0 18px'}}>
              {isKo ? '인증코드는 72시간 동안 유효하며, 이 시간이 지나면 가입이 만료되어 다시 시도하셔야 합니다.' : 'Codes are valid for 72 hours; after that the signup expires.'}
            </p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => { window.location.href = '/activate?email=' + encodeURIComponent(pendingEmail); }}>
              {isKo ? '인증코드 입력하기' : 'Enter the code'}
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={resendActivationLink} disabled={busy} style={{marginTop:8}}>
              {isKo ? '메일 다시 보내기' : 'Resend email'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button type="button" className="auth-close" onClick={onClose} aria-label={isKo ? '닫기' : 'Close'}>×</button>
        <h2 id="auth-title">{mode === 'signup' ? (isKo ? '회원가입' : 'Sign up') : (isKo ? '로그인' : 'Log in')}</h2>
        <p className="auth-sub">{mode === 'signup'
          ? (isKo ? 'DreamPath 멤버로 가입하면 지원·커리어 등록·추천을 받을 수 있습니다.' : 'Sign up to apply, manage your career, and get program recommendations.')
          : (isKo ? '계정으로 로그인하세요.' : 'Log in to your account.')}</p>
        <form onSubmit={submit}>
          {mode === 'signup' && (
            <label className="auth-field">
              <span>{isKo ? '이름' : 'Name'}</span>
              <input type="text" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
            </label>
          )}
          {/* Login uses a plain single-field email input with no autofill so
              the operator types it fresh; signup keeps the split id+domain
              EmailField to reduce typos when creating a new account. */}
          {mode === 'login' ? (
            <label className="auth-field">
              <span>{isKo ? '이메일' : 'Email'}</span>
              <input type="email" required value={email}
                onChange={e => setEmail(e.target.value.trim().toLowerCase())}
                name="dp-login-email"
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" />
              <span style={{fontSize:12,color:'var(--fg-muted)',marginTop:4,display:'block'}}>
                {isKo ? '이메일 형식으로 입력해 주세요.' : 'Enter in email format.'}
              </span>
            </label>
          ) : window.EmailField
            ? <window.EmailField label={isKo ? '이메일' : 'Email'} value={email} onChange={setEmail} required lang={lang} autoComplete="email" />
            : (
              <label className="auth-field">
                <span>{isKo ? '이메일' : 'Email'}</span>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </label>
            )}
          {mode === 'signup' && window.PhoneField && (
            <window.PhoneField
              label={isKo ? '휴대전화' : 'Mobile phone'}
              value={phone}
              onChange={setPhone}
              lang={lang}
              hint={isKo ? '국가번호를 선택한 뒤 번호를 입력하세요' : 'Pick a country code, then enter your number'}
            />
          )}
          <label className="auth-field">
            <span>{isKo ? '비밀번호' : 'Password'}</span>
            <input type="password" required minLength={mode === 'signup' ? 10 : undefined}
              value={password} onChange={e => setPassword(e.target.value)}
              name={mode === 'login' ? 'dp-login-password' : 'dp-signup-password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'off'} />
          </label>
          {mode === 'signup' && <PasswordRules pw={password} isKo={isKo} />}
          {mode === 'signup' && (
            <label className="auth-field">
              <span>{isKo ? '비밀번호 확인' : 'Confirm password'}</span>
              <input type="password" required value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                autoComplete="new-password"
                style={passwordConfirm ? { borderColor: pwMatch ? 'var(--state-success)' : 'var(--state-danger)' } : undefined} />
              {passwordConfirm && !pwMatch && (
                <span style={{fontSize:12,color:'var(--state-danger)',marginTop:4,display:'block'}}>
                  {isKo ? '비밀번호가 일치하지 않습니다.' : 'Passwords do not match.'}
                </span>
              )}
            </label>
          )}
          {mode === 'signup' && (
            <div style={{margin:'8px 0 14px'}}>
              {tosDoc && <window.ConsentRow doc={tosDoc} lang={lang} value={agreeTos} onChange={setAgreeTos} required openDoc={d => setDocOpen(d)} />}
              {privacyDoc && <window.ConsentRow doc={privacyDoc} lang={lang} value={agreePrivacy} onChange={setAgreePrivacy} required openDoc={d => setDocOpen(d)} />}
            </div>
          )}
          {err && <div className="auth-err" role="alert">{err}</div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || (mode === 'signup' && (!pwOk || !pwMatch || !consentsOk))}>
            {busy ? (isKo ? '처리 중…' : 'Working…') : (mode === 'signup' ? (isKo ? '가입하기' : 'Create account') : (isKo ? '로그인' : 'Log in'))}
          </button>
          {mode === 'login' && (
            <div style={{textAlign:'center',marginTop:12}}>
              <a href="/reset-password" style={{fontSize:13,color:'var(--fg-muted)',textDecoration:'underline'}}>
                {isKo ? '비밀번호를 잊으셨나요?' : 'Forgot your password?'}
              </a>
            </div>
          )}
        </form>
        {docOpen && <window.LegalModal doc={docOpen} lang={lang} onClose={() => setDocOpen(null)} />}
        <div className="auth-switch">
          {mode === 'signup' ? (
            <>{isKo ? '이미 계정이 있으신가요?' : 'Already have an account?'} <button type="button" onClick={() => setMode('login')}>{isKo ? '로그인' : 'Log in'}</button></>
          ) : (
            <>{isKo ? '계정이 없으신가요?' : "Don't have an account?"} <button type="button" onClick={() => setMode('signup')}>{isKo ? '회원가입' : 'Sign up'}</button></>
          )}
        </div>
      </div>
    </div>
  );
}
window.AuthModal = AuthModal;
