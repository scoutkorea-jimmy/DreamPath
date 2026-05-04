// Auth.jsx — login/signup modal + useAuth hook
const { useState: useStateAu, useEffect: useEffectAu } = React;

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

function AuthModal({ open, onClose, lang, defaultMode = 'login' }) {
  const isKo = lang === 'ko';
  const [mode, setMode] = useStateAu(defaultMode);
  const [email, setEmail] = useStateAu('');
  const [password, setPassword] = useStateAu('');
  const [name, setName] = useStateAu('');
  const [err, setErr] = useStateAu('');
  const [busy, setBusy] = useStateAu(false);
  const [agreeTos, setAgreeTos] = useStateAu(false);
  const [agreePrivacy, setAgreePrivacy] = useStateAu(false);
  const [docOpen, setDocOpen] = useStateAu(null);
  const auth = useAuth();
  const c = useContentForLegal();
  const tosDoc = c && c.legal && c.legal.tos;
  const privacyDoc = c && c.legal && c.legal.privacy_signup;
  // Only gate signup on consents that actually have a document to consent TO.
  // If a legal doc is missing (KV mis-save, schema in flux), don't deadlock the
  // user behind a checkbox that was never rendered.
  const consentsOk = (!tosDoc || agreeTos) && (!privacyDoc || agreePrivacy);

  useEffectAu(() => {
    if (open) {
      setMode(defaultMode);
      setEmail(''); setPassword(''); setName(''); setErr(''); setBusy(false);
      setAgreeTos(false); setAgreePrivacy(false);
    }
  }, [open, defaultMode]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (mode === 'signup' && !consentsOk) {
      setErr(isKo ? '필수 약관에 모두 동의해 주세요.' : 'Please agree to all required terms.');
      return;
    }
    setBusy(true); setErr('');
    try {
      if (mode === 'signup') {
        await auth.signup({ email, password, name });
        // Record consent right after the user exists so it ties to user_id
        if (window.recordConsent) {
          if (tosDoc) await window.recordConsent('tos', tosDoc.version, true, { email });
          if (privacyDoc) await window.recordConsent('privacy_signup', privacyDoc.version, true, { email });
        }
      } else {
        await auth.login({ email, password });
      }
      onClose && onClose();
    } catch (e) {
      const msg = String(e.message || 'error');
      const human = {
        invalid_credentials: isKo ? '이메일 또는 비밀번호가 올바르지 않습니다.' : 'Invalid email or password.',
        invalid_email: isKo ? '이메일 형식이 올바르지 않습니다.' : 'Invalid email format.',
        password_too_short: isKo ? '비밀번호는 최소 8자 이상이어야 합니다.' : 'Password must be at least 8 characters.',
        email_taken: isKo ? '이미 가입된 이메일입니다.' : 'Email already registered.',
      }[msg] || (isKo ? '오류가 발생했습니다: ' + msg : 'Error: ' + msg);
      setErr(human);
    } finally {
      setBusy(false);
    }
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
          <label className="auth-field">
            <span>{isKo ? '이메일' : 'Email'}</span>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label className="auth-field">
            <span>{isKo ? '비밀번호' : 'Password'} {mode === 'signup' && <em style={{color:'var(--fg-muted)',fontWeight:400}}>({isKo ? '최소 8자' : 'min 8 chars'})</em>}</span>
            <input type="password" required minLength={mode === 'signup' ? 8 : undefined}
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          </label>
          {mode === 'signup' && (
            <div style={{margin:'8px 0 14px'}}>
              {tosDoc && <window.ConsentRow doc={tosDoc} lang={lang} value={agreeTos} onChange={setAgreeTos} required openDoc={d => setDocOpen(d)} />}
              {privacyDoc && <window.ConsentRow doc={privacyDoc} lang={lang} value={agreePrivacy} onChange={setAgreePrivacy} required openDoc={d => setDocOpen(d)} />}
            </div>
          )}
          {err && <div className="auth-err" role="alert">{err}</div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? (isKo ? '처리 중…' : 'Working…') : (mode === 'signup' ? (isKo ? '가입하기' : 'Create account') : (isKo ? '로그인' : 'Log in'))}
          </button>
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
