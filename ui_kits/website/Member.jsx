// Member.jsx — member dashboard with three feature cards (stubs for now)
const { useState: useStateM, useEffect: useEffectM } = React;

function Member({ go, lang, c }) {
  const isKo = lang === 'ko';
  const auth = window.useAuth();
  const [section, setSection] = useStateM('overview'); // overview | applications | career | recommendations
  useEffectM(() => {
    const h = (e) => setSection(e.detail);
    window.addEventListener('dp-member-section', h);
    return () => window.removeEventListener('dp-member-section', h);
  }, []);

  if (!auth.ready) {
    return <div className="container" style={{padding:'80px 24px',textAlign:'center',color:'var(--fg-muted)'}}>{isKo ? '로딩 중…' : 'Loading…'}</div>;
  }
  if (!auth.user) {
    return (
      <div className="phead">
        <div className="inner">
          <div className="sec-kicker">{isKo ? '회원 전용' : 'MEMBERS ONLY'}</div>
          <h1 className={isKo ? '' : 'en'}>{isKo ? '로그인이 필요합니다.' : 'Please log in.'}</h1>
          <p>{isKo ? '회원 페이지를 이용하려면 로그인하거나 회원가입을 진행해주세요.' : 'Log in or create an account to access member features.'}</p>
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
      <div className="phead">
        <div className="inner">
          <div className="sec-kicker">{isKo ? '내 페이지' : 'MY PAGE'}</div>
          <h1 className={isKo ? '' : 'en'}>{(isKo ? '안녕하세요, ' : 'Hello, ') + (auth.user.name || auth.user.email)}</h1>
          <p>{isKo ? '지원 · 커리어 등록 · 맞춤형 프로그램 추천을 한 곳에서 관리하세요.' : 'Apply, manage your career profile, and get personalized recommendations.'}</p>
        </div>
      </div>

      <section className="section">
        <div className="container">
          <div className="member-tabs" role="tablist">
            {[
              { k: 'overview', l_ko: '대시보드', l_en: 'Dashboard' },
              { k: 'applications', l_ko: '내 지원 · 영수증', l_en: 'My applications · receipts' },
              { k: 'career',   l_ko: '커리어 등록', l_en: 'Career profile' },
              { k: 'recommendations', l_ko: '추천 프로그램', l_en: 'Recommendations' },
              { k: 'privacy', l_ko: '개인정보 / GDPR', l_en: 'Privacy / GDPR' },
            ].map(t => (
              <button key={t.k} role="tab" aria-selected={section === t.k}
                className={'member-tab' + (section === t.k ? ' active' : '')}
                onClick={() => setSection(t.k)}>
                {isKo ? t.l_ko : t.l_en}
              </button>
            ))}
          </div>

          {section === 'overview' && <MemberOverview go={go} isKo={isKo} c={c} />}
          {section === 'applications' && <MemberApplications isKo={isKo} c={c} />}
          {section === 'career' && <MemberCareer isKo={isKo} />}
          {section === 'recommendations' && <MemberRecommendations isKo={isKo} c={c} go={go} />}
          {section === 'privacy' && <MemberPrivacy isKo={isKo} go={go} />}
        </div>
      </section>
    </div>
  );
}

function MemberOverview({ go, isKo, c }) {
  return (
    <div className="member-grid">
      <div className="member-card">
        <div className="sec-kicker">{isKo ? '01 · 지원' : '01 · APPLY'}</div>
        <h3>{isKo ? '프로그램 지원하기' : 'Apply for a program'}</h3>
        <p>{isKo ? '관심 있는 프로그램을 선택하고 지원서를 제출하세요.' : 'Pick a program and submit your application.'}</p>
        <button className="btn btn-primary" onClick={() => go('apply')}>{isKo ? '지원 시작' : 'Start'} →</button>
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

function MemberApplications({ isKo, c }) {
  const [items, setItems] = useStateM([]);
  const [loading, setLoading] = useStateM(true);
  const [err, setErr] = useStateM('');
  const programs = (c && c.programs) || [];

  useEffectM(() => {
    (async () => {
      try {
        const res = await window.DreamPathAuth.authFetch('/api/me/applications');
        if (!res.ok) throw new Error('http_' + res.status);
        const data = await res.json();
        setItems(data.items || []);
      } catch (e) { setErr(e.message); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--fg-muted)'}}>{isKo ? '불러오는 중…' : 'Loading…'}</div>;
  if (err) return <div role="alert" style={{padding:24,color:'var(--state-danger)'}}>{err}</div>;
  if (items.length === 0) return (
    <div style={{padding:'40px 24px',textAlign:'center',background:'var(--bg-muted)',borderRadius:14,color:'var(--fg-secondary)'}}>
      {isKo ? '아직 제출한 지원이 없습니다. 로그인 상태에서 지원하면 여기에 표시됩니다.' : 'No applications yet. Submit one while logged in to see it here.'}
    </div>
  );

  return (
    <div style={{display:'grid',gap:14}}>
      {items.map(a => {
        const p = programs.find(x => x.id === a.program);
        const dt = a.submitted_at ? new Date(a.submitted_at).toLocaleString(isKo ? 'ko-KR' : 'en-US') : '—';
        return (
          <div key={a.id} className="member-card" style={{padding:24}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16}}>
              <div>
                <div className="sec-kicker" style={{margin:0}}>{a.id}</div>
                <h3 style={{margin:'4px 0 8px'}}>{p ? (isKo ? p.title_ko : p.title_en) : (a.program || '—')}</h3>
                <div style={{fontSize:13,color:'var(--fg-secondary)'}}>
                  {dt} · {isKo ? '트랙' : 'Track'}: {a.track || '—'}
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{padding:'4px 10px',borderRadius:999,background:a.status === 'paid' ? '#DCFCE7' : '#E0E7FF',color:a.status === 'paid' ? 'var(--state-success)' : '#3730A3',fontSize:12,fontWeight:700,display:'inline-block'}}>
                  {a.status === 'paid' ? (isKo ? '결제 완료' : 'PAID') : (a.status || '').toUpperCase()}
                </div>
                {a.amount > 0 && <div style={{fontSize:18,fontWeight:700,marginTop:8}}>${a.amount}.00</div>}
              </div>
            </div>
            {a.status === 'paid' && a.receipt_token && (
              <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid var(--border-hair)',display:'flex',gap:8}}>
                <a className="btn btn-secondary btn-sm" href={`/receipt?id=${encodeURIComponent(a.id)}&token=${encodeURIComponent(a.receipt_token)}`} target="_blank" rel="noopener">
                  {isKo ? '영수증 보기 / 인쇄' : 'View / print receipt'}
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MemberCareer({ isKo }) {
  const [form, setForm] = useStateM({
    country: '', birthdate: '', current_school: '', current_major: '',
    goal: '', interests: '', korean_level: '', english_level: '', career_summary: '',
  });
  const [loading, setLoading] = useStateM(true);
  const [savedAt, setSavedAt] = useStateM(null);
  const [err, setErr] = useStateM('');

  useEffectM(() => {
    (async () => {
      try {
        const res = await window.DreamPathAuth.authFetch('/api/me/profile');
        if (res.ok) {
          const data = await res.json();
          setForm(prev => ({ ...prev, ...Object.fromEntries(Object.entries(data).filter(([k,v]) => v != null && k in prev)) }));
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function save(e) {
    e.preventDefault();
    setErr('');
    try {
      const res = await window.DreamPathAuth.authFetch('/api/me/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('save_failed');
      setSavedAt(new Date());
    } catch (e) {
      setErr(isKo ? '저장 실패. 다시 시도해주세요.' : 'Save failed. Please try again.');
    }
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'var(--fg-muted)'}}>{isKo ? '불러오는 중…' : 'Loading…'}</div>;

  const F = ({ k, label, type = 'text', area = false }) => (
    <label className="apply-field">
      <span>{label}</span>
      {area
        ? <textarea value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })} rows={4} />
        : <input type={type} value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })} />}
    </label>
  );

  return (
    <form onSubmit={save} className="apply-card" style={{maxWidth:760,margin:'0 auto'}}>
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
        <F k="korean_level"  label={isKo ? '한국어 레벨' : 'Korean level'} />
        <F k="english_level" label={isKo ? '영어 레벨' : 'English level'} />
      </div>

      <h3 className="apply-sub">{isKo ? '간단 자기소개' : 'Short summary'}</h3>
      <F k="career_summary" label={isKo ? '한 단락으로 자신을 소개해주세요.' : 'A short paragraph about yourself.'} area />

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
              <div className="prog-media" style={{'--c1': p.color, '--c2': '#4D006E', '--accent': p.accent}} aria-hidden="true">
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
        ? '계정을 삭제하면 되돌릴 수 없습니다. 개인정보는 익명화되고 30일 이내 완전 파기됩니다.\n\n계속하려면 다음 문구를 정확히 입력하세요: '
        : 'Deleting your account cannot be undone. Personal data is anonymized and fully removed within 30 days.\n\nType the following to confirm: '
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
