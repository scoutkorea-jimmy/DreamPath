// Helper used by both Apply state init and the recommender list controls.
function blankRecommender() {
  return { name: '', email: '', phone: '', member_country: '', training_level: '', letter_file: null };
}

// Default essay prompts when c.essay_questions is empty / not yet edited
// by the operator. Each entry is admin-editable from the content store.
function defaultEssayQuestions() {
  // 현재 기본 1문항 (관리자 → 지원 에세이 문항 탭에서 추가/편집 가능).
  return [
    { prompt_ko: '국경 너머의 학습 — 본인의 배경, 관심사, DreamPath를 통해 이루고 싶은 것에 대해 작성하세요.',
      prompt_en: 'Learning across borders — write about your background, interests, and what you hope to achieve through DreamPath.',
      placeholder_ko: '본인의 이야기를 자유롭게 작성하세요.', placeholder_en: 'Tell us your story.',
      min_chars: 500, max_chars: 1500 },
  ];
}

// Upload one recommendation-letter PDF to /api/applications/upload →
// returns { upload_token, filename, size, mime }. Document uploads (학력
// 증빙·합격증)은 1차 신청에서 제거되어 마이페이지의 합격 후 단계로
// 이동했다(v01.092). 추천서 PDF만 여기 남는다.
async function uploadApplyFile(file, kind, recommenderIdx, applicationId) {
  if (!file) return null;
  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  if (file.type && !allowed.includes(file.type)) throw new Error('PDF / 이미지만 가능합니다.');
  if (file.size > 10 * 1024 * 1024) throw new Error('최대 10MB.');
  const b64 = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = String(r.result || '');
      const i = dataUrl.indexOf(',');
      res(i >= 0 ? dataUrl.slice(i + 1) : dataUrl);
    };
    r.onerror = () => rej(new Error('읽기 실패'));
    r.readAsDataURL(file);
  });
  const headers = { 'content-type': 'application/json' };
  const tk = window.DreamPathAuth && window.DreamPathAuth.token;
  if (tk) headers['authorization'] = 'Bearer ' + tk;
  const res = await fetch('/api/applications/upload', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      kind,
      recommender_idx: recommenderIdx,
      application_id: applicationId || null,
      filename: file.name,
      mime: file.type || 'application/pdf',
      content_base64: b64,
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || ('http_' + res.status));
  }
  return await res.json();
}

// Apply.jsx — 1차 신청서 (v01.092, 설계서 §3.2). 신 파이프라인의 첫 단계만
// 담당한다: draft → submitted. 서류 3종·트랙·결제는 합격 이후 단계(마이
// 페이지)로 분리됐다.
//   Step 0) 개인정보 동의 2종
//   Step 1) 개인정보 · 추천코드 · 프로그램 선택
//   Step 2) 학력 정보 (서류 업로드 없음)
//   Step 3) 에세이 · 추천인 3명
// 제출 성공 → 학생 고유번호(candidate_no) 발급 + 스크리닝 대기.
const { useState: useStateA, useEffect: useEffectA } = React;

const APPLY_DRAFT_KEY = 'dp_apply_draft_v1';
function loadApplyDraft() {
  try {
    const raw = sessionStorage.getItem(APPLY_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function saveApplyDraft(form, step) {
  try { sessionStorage.setItem(APPLY_DRAFT_KEY, JSON.stringify({ form, step, ts: Date.now() })); }
  catch {}
}
function clearApplyDraft() {
  try { sessionStorage.removeItem(APPLY_DRAFT_KEY); } catch {}
}

// Server-side draft helpers — used in addition to sessionStorage when the
// user is logged in. The server copy is the authoritative one for cross-
// device resume; sessionStorage is the keystroke-by-keystroke buffer.
async function fetchServerDraft() {
  try {
    const r = await window.DreamPathAuth.authFetch('/api/me/apply-draft');
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
async function pushServerDraft(form, step) {
  try {
    const r = await window.DreamPathAuth.authFetch('/api/me/apply-draft', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ form, step }),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
async function deleteServerDraft() {
  try { await window.DreamPathAuth.authFetch('/api/me/apply-draft', { method: 'DELETE' }); }
  catch {}
}

function Apply({ lang, c, go }) {
  const isKo = lang === 'ko';
  const { user } = (window.useAuth ? window.useAuth() : { user: null });
  const _restored = loadApplyDraft();

  const essayQuestions = (c && Array.isArray(c.essay_questions) && c.essay_questions.length > 0)
    ? c.essay_questions
    : defaultEssayQuestions();

  function essaysInitial(restored) {
    const src = (restored && Array.isArray(restored.essays)) ? restored.essays : [];
    return essayQuestions.map((_, i) => src[i] || { title: '', body: '' });
  }

  const [step, setStep] = useStateA(_restored?.step || 0);
  const [docOpen, setDocOpen] = useStateA(null);
  const [form, setForm] = useStateA(_restored?.form || {
    consent_personal: false,
    consent_third_party: false,
    name: '', email: '', birthdate: '', phone: '',
    admission_referrer_code: '',
    program: '',
    country: '',
    prior_school: '', prior_major: '', prior_gpa: '',
    transcript_note: '',
    essays: essaysInitial(_restored?.form),
    recommenders: [
      blankRecommender(),
      blankRecommender(),
      blankRecommender(),
    ],
  });

  // Re-sync essays array length whenever the admin changes the question count.
  useEffectA(() => {
    const want = essayQuestions.length;
    const got = (form.essays || []).length;
    if (want !== got) {
      const next = essayQuestions.map((_, i) => (form.essays && form.essays[i]) || { title: '', body: '' });
      setForm(f => ({ ...f, essays: next }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [essayQuestions.length]);

  // Auto-save draft to sessionStorage on every form / step change.
  useEffectA(() => { saveApplyDraft(form, step); }, [form, step]);
  const [draftToast, setDraftToast] = useStateA(!!_restored);
  useEffectA(() => {
    if (!draftToast) return;
    const t = setTimeout(() => setDraftToast(false), 5000);
    return () => clearTimeout(t);
  }, [draftToast]);
  const [savedToast, setSavedToast] = useStateA(false);
  useEffectA(() => {
    if (!savedToast) return;
    const t = setTimeout(() => setSavedToast(false), 2200);
    return () => clearTimeout(t);
  }, [savedToast]);

  const [serverDraft, setServerDraft] = useStateA({ expires_at: null, updated_at: null, hydrated: false });
  const [serverSaving, setServerSaving] = useStateA(false);
  const [submitted, setSubmitted] = useStateA(false);
  const [appId, setAppId] = useStateA('');
  const [candidateNo, setCandidateNo] = useStateA('');
  const [submitting, setSubmitting] = useStateA(false);
  const [submitError, setSubmitError] = useStateA('');

  // Pull the server draft on first mount (logged-in users) — cross-device resume.
  useEffectA(() => {
    if (!user) { setServerDraft({ expires_at: null, updated_at: null, hydrated: true }); return; }
    let alive = true;
    (async () => {
      const d = await fetchServerDraft();
      if (!alive) return;
      if (d && d.exists && d.form) {
        setForm(d.form);
        setStep(typeof d.step === 'number' ? d.step : 0);
        saveApplyDraft(d.form, d.step || 0);
        setServerDraft({ expires_at: d.expires_at, updated_at: d.updated_at, hydrated: true });
        setDraftToast(true);
      } else {
        setServerDraft({ expires_at: null, updated_at: null, hydrated: true });
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user && user.id]);

  // Debounced server-side persistence.
  useEffectA(() => {
    if (!user || submitted || !serverDraft.hydrated) return;
    setServerSaving(true);
    const t = setTimeout(async () => {
      const d = await pushServerDraft(form, step);
      if (d && d.ok) setServerDraft(s => ({ ...s, expires_at: d.expires_at, updated_at: d.updated_at }));
      setServerSaving(false);
    }, 1500);
    return () => { clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, step, user && user.id, submitted, serverDraft.hydrated]);

  const steps = isKo
    ? ['개인정보 동의', '개인정보 · 프로그램', '학력 정보', '에세이 · 추천인']
    : ['Consent', 'Personal · Program', 'Academic', 'Essays · Recommenders'];

  // Programs currently accepting applications.
  const openPrograms = ((c && c.programs) || []).filter(p =>
    String(p.status || '').toLowerCase() === 'open' || p.status === undefined
  );

  // Permissive next/back — validation runs only on the final submit.
  const next = () => setStep(Math.min(step + 1, steps.length));
  const back = () => setStep(Math.max(step - 1, 0));
  const upd = k => e => setForm({ ...form, [k]: e.target.value });

  // Hard validation — only enforced on the final Submit.
  function validateForSubmit() {
    if (!form.consent_personal || !form.consent_third_party) return isKo ? '개인정보 동의가 필요합니다.' : 'Consent is required.';
    if (!form.name || !form.email) return isKo ? '이름과 이메일을 입력하세요.' : 'Name and email are required.';
    if (!/^\+/.test((form.phone || '').trim())) return isKo ? '전화번호를 국제번호(+국가코드) 형식으로 입력하세요.' : 'Enter your phone in international format (+country code).';
    if (!form.country) return isKo ? '국가를 선택하세요.' : 'Country is required.';
    if (!form.program) return isKo ? '지원할 프로그램을 선택하세요.' : 'Pick a program.';
    for (let i = 0; i < essayQuestions.length; i++) {
      const q = essayQuestions[i];
      const e = (form.essays && form.essays[i]) || { title: '', body: '' };
      const len = (e.body || '').length;
      const min = q.min_chars || 500;
      const max = q.max_chars || 1500;
      if (!e.title) return (isKo ? `에세이 ${i+1}의 제목을 입력하세요.` : `Essay ${i+1} needs a title.`);
      if (len < min) return (isKo ? `에세이 ${i+1}은 최소 ${min}자 이상이어야 합니다.` : `Essay ${i+1} needs at least ${min} characters.`);
      if (len > max) return (isKo ? `에세이 ${i+1}은 최대 ${max}자까지 가능합니다.` : `Essay ${i+1} can be at most ${max} characters.`);
    }
    const recs = form.recommenders || [];
    if (recs.length < 3) return isKo ? '추천인은 최소 3명입니다.' : 'At least 3 recommenders required.';
    for (const r of recs) {
      if (!r.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email || '') ||
          !/^\+/.test((r.phone || '').trim()) || !r.member_country || !r.training_level) {
        return isKo ? '추천인 정보를 모두 입력하세요.' : 'Fill in every recommender field.';
      }
    }
    return '';
  }

  async function manualSave() {
    saveApplyDraft(form, step);
    if (user) {
      setServerSaving(true);
      const d = await pushServerDraft(form, step);
      if (d && d.ok) setServerDraft(s => ({ ...s, expires_at: d.expires_at, updated_at: d.updated_at }));
      setServerSaving(false);
    }
    setSavedToast(true);
  }

  async function submit() {
    if (submitting) return;
    if (!user) {
      setSubmitError(isKo
        ? '신청서 정상 접수를 위해 회원가입(또는 로그인)이 필요합니다.'
        : 'Please sign up (or log in) to submit your application.');
      window.dispatchEvent(new CustomEvent('dp-open-auth', { detail: { mode: 'signup' } }));
      return;
    }
    const reason = validateForSubmit();
    if (reason) { setSubmitError(reason); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      const headers = { 'content-type': 'application/json' };
      const tk = window.DreamPathAuth && window.DreamPathAuth.token;
      if (tk) headers['authorization'] = 'Bearer ' + tk;
      // Recommendation-letter PDFs are linked by upload_token. (Academic
      // documents moved to the post-admission stage on the member page.)
      const file_tokens = [];
      (form.recommenders || []).forEach(r => {
        if (r && r.letter_file && r.letter_file.upload_token) {
          file_tokens.push(r.letter_file.upload_token);
        }
      });
      const e0 = form.essays[0] || { title: '', body: '' };
      const e1 = form.essays[1] || { title: '', body: '' };
      const payload = {
        ...form,
        essay_title:   e0.title, essay_body:   e0.body,
        essay_title_2: e1.title, essay_body_2: e1.body,
        essays_json: JSON.stringify(form.essays || []),
        recommenders_json: JSON.stringify(form.recommenders || []),
        file_tokens,
        lang,
      };
      delete payload.recommenders;
      delete payload.essays;
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.error === 'validation'
          ? (isKo ? '입력 정보를 확인해 주세요.' : 'Please check your inputs.')
          : (isKo ? '제출에 실패했습니다. 다시 시도해 주세요.' : 'Submission failed. Please try again.');
        setSubmitError(msg);
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      setAppId(data.id);
      setCandidateNo(data.candidate_no || '');
      setSubmitted(true);
      setStep(steps.length);
      clearApplyDraft();
      if (user) deleteServerDraft();
      // Record the two first-stage consents (privacy + third-party=CUFS).
      const privacyDoc = c && c.legal && c.legal.privacy_apply;
      const thirdDoc   = c && c.legal && c.legal.third_party;
      if (window.recordConsent) {
        if (privacyDoc) await window.recordConsent('privacy_apply', privacyDoc.version, true, { email: form.email, application_id: data.id });
        if (thirdDoc)   await window.recordConsent('third_party',   thirdDoc.version,   true, { email: form.email, application_id: data.id });
      }
    } catch (e) {
      setSubmitError(isKo
        ? '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        : 'A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const phApply = ((c && c.page_heros && c.page_heros.apply && c.page_heros.apply[lang]) || {});
  const phDone  = ((c && c.page_heros && c.page_heros.apply_done && c.page_heros.apply_done[lang]) || {});
  const hbApply = window.useHeroBg((c && c.page_heros && c.page_heros.apply) || {});
  const hbDone  = window.useHeroBg((c && c.page_heros && c.page_heros.apply_done) || {});

  if (submitted) {
    return (
      <div data-screen-label="Apply · Complete">
        <div className={('phead ' + hbDone.cls).trim()} style={hbDone.style}>
          <div className="inner">
            <div className="sec-kicker">{phDone.kicker || (isKo ? '신청 완료' : 'APPLICATION COMPLETE')}</div>
            <h1 className={isKo ? '' : 'en'}>
              {phDone.title_l1 || (isKo ? '1차 신청이 접수되었습니다.' : 'Your application is in.')}
            </h1>
            <p>{isKo
              ? '서류 검토(1차 스크리닝)가 끝나면 결과를 안내드립니다.'
              : "We'll let you know once the first screening is complete."}</p>
          </div>
        </div>
        <section className="section">
          <div className="container-narrow">
            <div className="apply-card" style={{textAlign:'center'}}>
              <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(36,135,55,0.12)',display:'inline-flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
                <i data-lucide="circle-check-big" width="36" height="36" strokeWidth="1.75" style={{color:'var(--state-success)'}}></i>
              </div>
              <h3 style={{fontFamily:isKo?'var(--font-kr)':'var(--font-en)',fontSize:28,fontWeight:700,margin:'0 0 12px'}}>
                {isKo ? '감사합니다, ' : 'Thanks, '}{form.name}.
              </h3>
              {candidateNo && (
                <div style={{display:'inline-block',padding:'14px 22px',background:'var(--bg-muted)',borderRadius:12,margin:'0 auto 16px'}}>
                  <div style={{fontSize:12,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--fg-muted)',marginBottom:4}}>{isKo ? '학생 고유번호' : 'Applicant ID'}</div>
                  <div style={{fontSize:24,fontWeight:800,fontFamily:'var(--font-mono)',color:'var(--brand-text)'}}>{candidateNo}</div>
                </div>
              )}
              <p style={{color:'var(--fg-secondary)',fontSize:16,lineHeight:1.6,maxWidth:560,margin:'0 auto 8px'}}>
                {isKo
                  ? '이 고유번호는 이후 모든 절차(접수번호 · 합격증 · 서류 · 결제)에서 본인 확인에 사용됩니다. 진행 상황은 마이페이지에서 확인하실 수 있습니다.'
                  : 'This ID identifies you throughout the next steps (CUFS reference, admission, documents, payment). Track progress on your member page.'}
              </p>
              <div style={{marginTop:20}}>
                <button className="btn btn-primary" onClick={() => go && go('member')}>
                  {isKo ? '마이페이지에서 진행 상황 보기' : 'View progress on my page'} →
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div data-screen-label="Apply">
      <div className={('phead ' + hbApply.cls).trim()} style={hbApply.style}>
        <div className="inner">
          <div className="sec-kicker">{phApply.kicker || (isKo ? '지원하기' : 'HOW TO APPLY')}</div>
          <h1 className={isKo ? '' : 'en'}>
            {phApply.title_l1 || (isKo ? '1차 신청. 온라인으로 완료.' : 'Apply online.')}{phApply.title_l2 ? <><br/>{phApply.title_l2}</> : null}
          </h1>
          <p>{phApply.sub || (isKo
            ? '동의 · 개인정보 · 학력 · 에세이. 약 15분 소요됩니다. 합격 후 단계(서류 · 결제)는 마이페이지에서 진행됩니다.'
            : 'Consent · personal · academic · essays. About 15 minutes. Post-admission steps happen on your member page.')}</p>
        </div>
      </div>

      <section className="section">
        <div className="container-narrow">
          {draftToast && (
            <div role="status" aria-live="polite"
              style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'12px 16px',marginBottom:14,background:'var(--state-info-bg)',color:'var(--state-info)',borderRadius:10,fontSize:14,fontWeight:600}}>
              <span>{isKo ? '↻ 작성 중이던 지원서를 복원했습니다.' : '↻ Restored your in-progress application.'}</span>
              <button type="button" onClick={async () => {
                clearApplyDraft();
                if (user) await deleteServerDraft();
                window.location.reload();
              }}
                style={{background:'none',border:'1px solid currentColor',borderRadius:6,padding:'4px 10px',color:'inherit',cursor:'pointer',fontSize:12,fontWeight:600}}>
                {isKo ? '처음부터 다시' : 'Start over'}
              </button>
            </div>
          )}
          <div role="status" style={{
            display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,
            padding:'10px 14px',marginBottom:14,
            background:'var(--bg-muted)',color:'var(--fg-secondary)',
            borderRadius:10,fontSize:13,lineHeight:1.5,
          }}>
            <span>
              {user
                ? (isKo
                    ? '입력하시는 즉시 서버에 자동 저장되어 다른 기기에서도 이어서 작성할 수 있습니다. 임시저장본은 마지막 수정 후 72시간 동안만 보관됩니다.'
                    : 'Your work auto-saves to the server as you type, so you can resume on any device. Drafts are kept for 72 hours after the last edit.')
                : (isKo
                    ? '입력 내용은 이 브라우저에만 임시 저장됩니다. 다른 기기에서도 이어쓰려면 로그인 후 작성해주세요.'
                    : 'Your work is buffered in this browser only. Log in to keep a 72-hour, cross-device server copy.')}
            </span>
            {user && serverDraft.expires_at && (
              <span style={{whiteSpace:'nowrap',fontFamily:'var(--font-mono)',fontSize:12,color:'var(--fg-muted)'}}>
                {serverSaving ? (isKo ? '저장 중…' : 'Saving…') : (isKo ? '만료: ' : 'Expires: ') + new Date(serverDraft.expires_at).toLocaleString(isKo ? 'ko-KR' : 'en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
              </span>
            )}
          </div>
          {!user && (
            <div role="status"
              style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'12px 16px',marginBottom:14,background:'var(--state-warning-bg, #fff7ed)',color:'var(--state-warning, #b45309)',borderRadius:10,fontSize:14,fontWeight:600}}>
              <span>{isKo
                ? '신청서를 정상 접수하려면 회원가입(또는 로그인)이 필요합니다.'
                : 'You need to sign up (or log in) for your application to be properly received.'}</span>
              <button type="button" className="btn btn-primary btn-sm"
                onClick={() => window.dispatchEvent(new CustomEvent('dp-open-auth', { detail: { mode: 'signup' } }))}>
                {isKo ? '회원가입' : 'Sign up'}
              </button>
            </div>
          )}
          <div className="apply-card">
            <div className="step-indicator" aria-hidden="true">
              {steps.map((s, i) => (
                <div key={i} className={'dot' + (i < step ? ' done' : i === step ? ' active' : '')} />
              ))}
            </div>
            <div style={{fontSize:12,letterSpacing:'0.14em',textTransform:'uppercase',color:'var(--scouting-purple)',fontWeight:700,marginBottom:8}}>
              STEP {step + 1} / {steps.length}
            </div>
            <h2 style={{fontFamily:isKo?'var(--font-kr)':'var(--font-en)',fontSize:30,fontWeight:700,letterSpacing:'-0.02em',margin:'0 0 28px'}}>
              {steps[step]}
            </h2>

            {step === 0 && <ConsentStep form={form} setForm={setForm} isKo={isKo} c={c} openDoc={d => setDocOpen(d)} />}
            {step === 1 && <StepPersonal form={form} setForm={setForm} upd={upd} isKo={isKo} lang={lang} openPrograms={openPrograms} />}
            {step === 2 && <StepAcademic form={form} setForm={setForm} upd={upd} isKo={isKo} />}
            {step === 3 && <StepEssaysRecommenders form={form} setForm={setForm} upd={upd} isKo={isKo} lang={lang} essayQuestions={essayQuestions} />}

            <div className="form-actions" style={{flexWrap:'wrap',gap:8}}>
              {step > 0 && <button type="button" className="btn btn-secondary" onClick={back}>← {isKo ? '이전' : 'Back'}</button>}
              <button type="button" className="btn btn-ghost" onClick={manualSave}
                title={isKo ? '입력한 내용을 저장하고 언제든 돌아올 수 있습니다.' : 'Save what you have so far and come back any time.'}>
                {isKo ? '임시저장' : 'Save draft'}
              </button>
              {step < steps.length - 1 && (
                <button type="button" className="btn btn-primary" onClick={next}>
                  {isKo ? '다음' : 'Next'} →
                </button>
              )}
              {step === steps.length - 1 && (
                <button type="button" className="btn btn-primary" disabled={submitting} onClick={submit}>
                  {submitting
                    ? (isKo ? '제출 중…' : 'Submitting…')
                    : (isKo ? '1차 신청 제출' : 'Submit application')} →
                </button>
              )}
            </div>
            {savedToast && (
              <div role="status" aria-live="polite" style={{marginTop:10,fontSize:13,color:'var(--state-success)'}}>
                ✓ {isKo ? '임시저장 되었습니다. 이 브라우저에서 언제든 이어서 작성할 수 있습니다.' : 'Saved. You can resume in this browser any time.'}
              </div>
            )}
            {submitError && (
              <div role="alert" style={{marginTop:12,padding:'8px 12px',background:'var(--state-danger-bg)',color:'var(--state-danger)',borderRadius:8,fontSize:14}}>{submitError}</div>
            )}
            {docOpen && <window.LegalModal doc={docOpen} lang={lang} onClose={() => setDocOpen(null)} />}
          </div>
        </div>
      </section>
    </div>
  );
}

function ConsentStep({ form, setForm, isKo, c, openDoc }) {
  const privacyDoc = c && c.legal && c.legal.privacy_apply;
  const thirdDoc   = c && c.legal && c.legal.third_party;
  return (
    <>
      <p className="apply-desc">{isKo
        ? '지원서 처리를 위해 다음 두 가지 동의가 필요합니다. 각 항목의 전문을 확인하신 뒤 동의해 주세요. 동의하지 않으실 경우 지원이 진행되지 않습니다.'
        : 'Two consents are required to process your application. Review each document and confirm. Without these, the application cannot proceed.'}</p>

      {privacyDoc && (
        <window.ConsentRow doc={privacyDoc} lang={isKo ? 'ko' : 'en'}
          value={form.consent_personal}
          onChange={v => setForm({ ...form, consent_personal: v })}
          required openDoc={openDoc} />
      )}

      {thirdDoc && (
        <window.ConsentRow doc={thirdDoc} lang={isKo ? 'ko' : 'en'}
          value={form.consent_third_party}
          onChange={v => setForm({ ...form, consent_third_party: v })}
          required openDoc={openDoc} />
      )}

      <p className="hint" style={{marginTop:14}}>
        {isKo
          ? '제3자 제공 동의는 입학 절차를 위해 CUFS(사이버한국외국어대학교)에 정보를 제공하는 데 대한 동의입니다. 동의 내역은 IP, 브라우저 정보, 시각과 함께 GDPR Art. 7에 따라 기록됩니다.'
          : 'The third-party consent covers sharing your information with CUFS for the admission process. Your consent is recorded with IP, user agent, and timestamp per GDPR Art. 7.'}
      </p>
    </>
  );
}

// Step 1 — 개인정보 · 추천코드 · 프로그램 선택.
function StepPersonal({ form, setForm, upd, isKo, lang, openPrograms }) {
  return (
    <>
      <p className="apply-desc">{isKo
        ? '본인 정보와 지원할 프로그램을 입력합니다. 받으신 입학 추천인 코드가 있다면 함께 입력해 주세요.'
        : 'Your personal info and the program you are applying to. Add a referrer code if you received one.'}</p>
      <div className="form-row">
        <div className="field">
          <label>{isKo ? '이름 *' : 'Full name *'}</label>
          <input value={form.name} onChange={upd('name')} placeholder={isKo ? '홍길동' : 'Your name'} />
        </div>
        {window.EmailField
          ? <window.EmailField label={isKo ? '이메일 *' : 'Email *'} value={form.email} onChange={(v) => setForm(f => ({ ...f, email: v }))} required lang={lang} />
          : (
            <div className="field">
              <label>{isKo ? '이메일 *' : 'Email *'}</label>
              <input type="email" value={form.email} onChange={upd('email')} placeholder="you@example.com" />
            </div>
          )}
      </div>
      <div className="form-row">
        <div className="field">
          <label>{isKo ? '생년월일' : 'Date of birth'}</label>
          <input type="date" value={form.birthdate} onChange={upd('birthdate')} />
        </div>
        {window.PhoneField
          ? <window.PhoneField label={isKo ? '전화번호 *' : 'Phone *'} value={form.phone} onChange={(v) => setForm(f => ({ ...f, phone: v }))} required lang={lang} hint={isKo ? '국가코드 선택 + 번호 입력' : 'Pick country code + enter number'} />
          : (
            <div className="field">
              <label>{isKo ? '전화번호 (국제번호) *' : 'Phone (international) *'}</label>
              <input type="tel" value={form.phone} onChange={upd('phone')} placeholder="+82 10 1234 5678" />
            </div>
          )}
      </div>
      <div className="form-row">
        <div className="field">
          <label>{isKo ? '지원 프로그램 *' : 'Program *'}</label>
          {openPrograms.length === 0
            ? (
              <div style={{padding:'12px 14px',background:'var(--state-warning-bg, #fff7ed)',color:'var(--state-warning, #b45309)',borderRadius:8,fontSize:14}}>
                {isKo ? '현재 모집 중인 프로그램이 없습니다. 잠시 후 다시 확인해주세요.' : 'No programs are currently open. Please check back soon.'}
              </div>
            )
            : (
              <select value={form.program} onChange={upd('program')}>
                <option value="">{isKo ? '선택하세요' : 'Select…'}</option>
                {openPrograms.map(p => (
                  <option key={p.id} value={p.id}>{isKo ? p.title_ko : p.title_en}</option>
                ))}
              </select>
            )}
        </div>
        <div className="field">
          <label>{isKo ? '입학 추천인 코드 (선택)' : 'Admission referrer code (optional)'}</label>
          <input value={form.admission_referrer_code} onChange={upd('admission_referrer_code')}
            placeholder={isKo ? '예: KDP-AB12CD' : 'e.g. KDP-AB12CD'} />
          <span className="hint">{isKo ? '코드를 받으셨다면 정확히 입력해주세요. 없으면 비워두셔도 됩니다.' : 'Enter exactly as received. Leave blank if you do not have one.'}</span>
        </div>
      </div>
    </>
  );
}

// Step 2 — 학력 정보 (서류 업로드는 합격 후 단계로 이동, v01.092).
function StepAcademic({ form, setForm, upd, isKo }) {
  return (
    <>
      <p className="apply-desc">{isKo
        ? '국가와 학력 정보를 입력합니다. 학력 증빙 서류는 1차 통과 및 CUFS 합격 이후 마이페이지에서 제출하게 됩니다.'
        : 'Country and academic background. Supporting documents are submitted on your member page after you pass screening and are admitted to CUFS.'}</p>
      <div className="form-row">
        <div className="field">
          <label>{isKo ? '국가 *' : 'Country *'}</label>
          <select value={form.country} onChange={upd('country')}>
            <option value="">{isKo ? '선택하세요' : 'Select…'}</option>
            <option>Kenya</option><option>Philippines</option><option>Peru</option><option>Korea</option><option>Indonesia</option>
            <option>Vietnam</option><option>Thailand</option><option>Malaysia</option><option>Egypt</option><option>Nigeria</option>
            <option>Other</option>
          </select>
        </div>
        <div className="field">
          <label>{isKo ? '최종 학교' : 'Most recent school'}</label>
          <input value={form.prior_school} onChange={upd('prior_school')} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>{isKo ? '전공/계열' : 'Major / track'}</label>
          <input value={form.prior_major} onChange={upd('prior_major')} />
        </div>
        <div className="field">
          <label>{isKo ? 'GPA 또는 학점' : 'GPA or grade average'}</label>
          <input value={form.prior_gpa} onChange={upd('prior_gpa')} placeholder={isKo ? '예: 3.7 / 4.0' : 'e.g. 3.7 / 4.0'} />
        </div>
      </div>
      <div className="field">
        <label>{isKo ? '학력 관련 메모 (선택)' : 'Academic note (optional)'}</label>
        <textarea rows="3" value={form.transcript_note} onChange={upd('transcript_note')}
          placeholder={isKo ? '학력과 관련해 알려주실 내용이 있다면 적어주세요.' : 'Anything reviewers should know about your background.'} />
      </div>
    </>
  );
}

// Step 3 — 에세이 + 추천인 3명.
function StepEssaysRecommenders({ form, setForm, upd, isKo, lang, essayQuestions }) {
  function setEssay(i, patch) {
    const list = [...(form.essays || [])];
    list[i] = { ...(list[i] || { title: '', body: '' }), ...patch };
    setForm({ ...form, essays: list });
  }

  return (
    <>
      <p className="apply-desc">{isKo
        ? '아래 에세이 문항에 답해주세요. 각 본문은 최소 500자 이상, 최대 1500자까지 작성할 수 있으며, 1500자에 도달하면 더 이상 입력되지 않습니다. 입력하시는 즉시 자동 저장됩니다.'
        : 'Answer the essay prompts below. Each body must be 500–1,500 characters; input stops at 1,500. Your work auto-saves as you type.'}</p>

      {essayQuestions.map((q, i) => {
        const e = (form.essays && form.essays[i]) || { title: '', body: '' };
        const min = q.min_chars || 500;
        const max = q.max_chars || 1500;
        const len = (e.body || '').length;
        const tooShort = len > 0 && len < min;
        const atMax = len >= max;
        return (
          <div key={i} style={{marginBottom:18}}>
            <h4 className="apply-sub">{isKo ? `에세이 ${i + 1}` : `Essay ${i + 1}`}</h4>
            <div className="hint" style={{marginBottom:10,whiteSpace:'pre-wrap'}}>{isKo ? q.prompt_ko : q.prompt_en}</div>
            <div className="field">
              <label>{isKo ? '제목 *' : 'Title *'}</label>
              <input value={e.title} onChange={ev => setEssay(i, { title: ev.target.value })}
                placeholder={isKo ? '에세이 제목' : 'Essay title'} />
            </div>
            <div className="field">
              <label>{isKo ? `본문 * (${min}~${max}자)` : `Body * (${min}–${max} characters)`}</label>
              <textarea
                rows="8"
                value={e.body}
                maxLength={max}
                onChange={ev => {
                  const v = ev.target.value;
                  if (v.length <= max) setEssay(i, { body: v });
                }}
                placeholder={isKo ? (q.placeholder_ko || '') : (q.placeholder_en || '')}
              />
              <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:12,fontFamily:'var(--font-mono)'}}>
                <span style={{color: tooShort ? 'var(--state-warning, #b45309)' : 'var(--fg-muted)'}}>
                  {tooShort
                    ? (isKo ? `최소 ${min}자 이상 작성해주세요.` : `At least ${min} characters required.`)
                    : (isKo ? `최소 ${min}자 / 최대 ${max}자` : `Min ${min} / Max ${max}`)}
                </span>
                <span style={{color: atMax ? 'var(--state-danger)' : len >= min ? 'var(--state-success)' : 'var(--fg-muted)'}}>
                  {len} / {max}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      <h4 className="apply-sub">{isKo ? '추천인 (최소 3명)' : 'Recommenders (minimum 3)'}</h4>
      <p className="hint" style={{marginBottom:12}}>{isKo
        ? '추천인 정보(이름, 이메일, 전화번호 — 국제번호 형식 +국가코드, 소속 청년 교육 파트너 기관, 활동 경력)를 최소 3명 입력해주세요. 추천서는 각 추천인별로 PDF 업로드 가능합니다.'
        : 'Provide at least 3 recommenders with name, email, international phone (+country code), affiliated youth-education partner organization, and activity background. PDF letter is optional per recommender.'}</p>

      {(form.recommenders || []).map((r, i) => (
        <RecommenderCard key={i} index={i} rec={r} isKo={isKo} lang={lang}
          onChange={(next) => {
            const list = [...(form.recommenders || [])];
            list[i] = next;
            setForm({ ...form, recommenders: list });
          }}
          onRemove={form.recommenders.length > 3 ? () => {
            const list = (form.recommenders || []).filter((_, j) => j !== i);
            setForm({ ...form, recommenders: list });
          } : null}
        />
      ))}

      <button type="button" className="btn btn-secondary btn-sm"
        onClick={() => setForm({ ...form, recommenders: [...(form.recommenders || []), blankRecommender()] })}>
        + {isKo ? '추천인 추가' : 'Add recommender'}
      </button>
    </>
  );
}

function RecommenderCard({ index, rec, isKo, lang, onChange, onRemove }) {
  const set = (k, v) => onChange({ ...rec, [k]: v });
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  async function onPdf(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true); setErr('');
    try {
      const meta = await uploadApplyFile(f, 'recommendation', index);
      set('letter_file', meta);
    } catch (ex) {
      setErr(ex.message || (isKo ? '업로드 실패' : 'Upload failed'));
    } finally { setBusy(false); }
  }
  return (
    <div style={{background:'var(--bg-muted)',borderRadius:14,padding:'18px 20px',marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <strong style={{fontSize:13,letterSpacing:'0.06em',textTransform:'uppercase',color:'var(--fg-secondary)'}}>
          {isKo ? `추천인 ${index + 1}` : `Recommender ${index + 1}`}
        </strong>
        {onRemove && (
          <button type="button" className="btn btn-ghost btn-sm" style={{color:'var(--state-danger)'}} onClick={onRemove}>
            {isKo ? '삭제' : 'Remove'}
          </button>
        )}
      </div>
      <div className="form-row">
        <div className="field">
          <label>{isKo ? '이름 *' : 'Name *'}</label>
          <input value={rec.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="field">
          <label>{isKo ? '소속 청년 교육 파트너 기관 *' : 'Affiliated youth-education partner *'}</label>
          <input value={rec.member_country} onChange={e => set('member_country', e.target.value)}
            placeholder={isKo ? '예: Youth Leaders of Kenya' : 'e.g. Youth Leaders of Kenya'} />
        </div>
      </div>
      {window.EmailField
        ? <window.EmailField label={isKo ? '이메일 *' : 'Email *'} value={rec.email} onChange={(v) => set('email', v)} required lang={lang} />
        : (
          <div className="form-row">
            <div className="field">
              <label>{isKo ? '이메일 *' : 'Email *'}</label>
              <input type="email" value={rec.email} onChange={e => set('email', e.target.value)} placeholder="mentor@youth.org" />
            </div>
          </div>
        )}
      {window.PhoneField
        ? <window.PhoneField label={isKo ? '전화번호 *' : 'Phone *'} value={rec.phone} onChange={(v) => set('phone', v)} required lang={lang} hint={isKo ? '국가코드 선택 + 번호 입력' : 'Pick country code + enter number'} />
        : (
          <div className="form-row">
            <div className="field">
              <label>{isKo ? '전화번호 (국제번호) *' : 'Phone (international) *'}</label>
              <input type="tel" value={rec.phone} onChange={e => set('phone', e.target.value)} placeholder="+82 10 1234 5678" />
            </div>
          </div>
        )}
      <div className="form-row">
        <div className="field">
          <label>{isKo ? '훈련 수준 *' : 'Training level *'}</label>
          <select value={rec.training_level} onChange={e => set('training_level', e.target.value)}>
            <option value="">{isKo ? '선택' : 'Select…'}</option>
            <option>Wood Badge</option>
            <option>ALT (Assistant Leader Trainer)</option>
            <option>LT (Leader Trainer)</option>
            <option>Adult Leader</option>
            <option>Section Leader</option>
            <option>Other</option>
          </select>
        </div>
        <div className="field">
          <label>{isKo ? '추천서 (PDF, 선택)' : 'Recommendation letter (PDF, optional)'}</label>
          <input type="file" accept="application/pdf,image/*" onChange={onPdf} disabled={busy} style={{padding:'8px 0'}} />
          {busy && <span className="hint">{isKo ? '업로드 중…' : 'Uploading…'}</span>}
          {!busy && rec.letter_file && (
            <span className="hint" style={{color:'var(--state-success)'}}>✓ {rec.letter_file.filename} ({Math.round(rec.letter_file.size/1024)} KB)</span>
          )}
          {err && <span className="hint" style={{color:'var(--state-danger)'}}>{err}</span>}
        </div>
      </div>
    </div>
  );
}

window.Apply = Apply;
