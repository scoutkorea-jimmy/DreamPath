// Helper used by both Apply state init and the Step2 list controls.
function blankRecommender() {
  return { name: '', email: '', phone: '', member_country: '', training_level: '', letter_file: null };
}

// Default essay prompts when c.essay_questions is empty / not yet edited
// by the operator. Each entry is admin-editable from the content store.
// min_chars / max_chars apply to the body; the title is short-form.
function defaultEssayQuestions() {
  return [
    { prompt_ko: '국경 너머의 학습 — 본인의 배경, 관심사, DreamPath를 통해 이루고 싶은 것에 대해 작성하세요.',
      prompt_en: 'Learning across borders — write about your background, interests, and what you hope to achieve through DreamPath.',
      placeholder_ko: '본인의 이야기를 자유롭게 작성하세요.', placeholder_en: 'Tell us your story.',
      min_chars: 500, max_chars: 1500 },
    { prompt_ko: '5년 후의 나 — 학업 계획, 커리어 목표, DreamPath 이후의 길에 대해 작성하세요.',
      prompt_en: 'Where I see myself in 5 years — academic plan, career goals, and your path after DreamPath.',
      placeholder_ko: '학업 · 커리어 · 영향력에 대해 작성하세요.', placeholder_en: 'Studies, career, impact.',
      min_chars: 500, max_chars: 1500 },
  ];
}

// Upload a single file to /api/applications/upload → returns { id, filename,
// size, mime, r2_key } on success. Caps + MIME whitelisted server-side; this
// helper just shuttles the bytes as base64. Used by the Apply form's
// transcript + per-recommender PDF pickers.
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

// Apply.jsx — 5-step application:
//   1) Consent
//   2) Personal + admission referrer
//   3) Basic info + academic + 3 separate document uploads
//   4) Essays (admin-editable prompts) + scout recommenders
//   5) Track + payment (program list filtered to status='open')
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
    return await r.json();   // { exists, form?, step?, updated_at?, expires_at?, ttl_hours }
  } catch { return null; }
}
async function pushServerDraft(form, step) {
  try {
    // PCI: never persist card_exp / card_cvc anywhere on the server,
    // not even in a draft. card_last4 is the only card field we may
    // keep. The user re-enters expiry + CVC on each session.
    const safe = { ...form };
    delete safe.card_exp;
    delete safe.card_cvc;
    const r = await window.DreamPathAuth.authFetch('/api/me/apply-draft', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ form: safe, step }),
    });
    if (!r.ok) return null;
    return await r.json();   // { ok, updated_at, size_bytes, expires_at, ttl_hours }
  } catch { return null; }
}
async function deleteServerDraft() {
  try { await window.DreamPathAuth.authFetch('/api/me/apply-draft', { method: 'DELETE' }); }
  catch {}
}

function Apply({ lang, c }) {
  const isKo = lang === 'ko';
  const { user } = (window.useAuth ? window.useAuth() : { user: null });
  const _restored = loadApplyDraft();

  const essayQuestions = (c && Array.isArray(c.essay_questions) && c.essay_questions.length > 0)
    ? c.essay_questions
    : defaultEssayQuestions();

  // Build initial essays[] sized to the current question count, padding /
  // trimming any restored draft so we never crash on length mismatch.
  function essaysInitial(restored) {
    const src = (restored && Array.isArray(restored.essays)) ? restored.essays : [];
    return essayQuestions.map((_, i) => src[i] || { title: '', body: '' });
  }

  const [step, setStep] = useStateA(_restored?.step || 0);
  const [docOpen, setDocOpen] = useStateA(null);
  const [form, setForm] = useStateA(_restored?.form || {
    consent_personal: false,
    consent_third_party: false,
    name: '', email: '', birthdate: '',
    admission_referrer_code: '',
    country: '',
    prior_school: '', prior_major: '', prior_gpa: '',
    transcript_note: '',
    // Three separate document slots (each is { id, filename, size, mime } when uploaded)
    transcript_graduation: null,    // 졸업(예정)증명서
    transcript_recognition: null,   // 아포스티유 / 학력인정확인서 / 영사확인 중 택1
    transcript_translation: null,   // 한글번역공증본 (KO/EN 외 서류)
    // Essays now driven by admin-editable c.essay_questions (default = 2 questions)
    essays: essaysInitial(_restored?.form),
    recommenders: [
      blankRecommender(),
      blankRecommender(),
      blankRecommender(),
    ],
    track: '', partial_tier: '70',
    program: '',
    payment_method: 'card', card_last4: '',
    card_exp: '', card_cvc: '',
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

  // Auto-save draft to sessionStorage on every form / step change. This is the
  // "바로바로 자동 저장" behavior — each keystroke triggers a re-render → effect
  // → save. The 임시저장 button just confirms it visually with a toast.
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

  // Server-side draft state: expiry timestamp + last-saved indicator.
  // expires_at is an ISO string; the client renders it as a friendly
  // "남은 시간" badge so the user knows their work is safe.
  const [serverDraft, setServerDraft] = useStateA({ expires_at: null, updated_at: null, hydrated: false });
  const [serverSaving, setServerSaving] = useStateA(false);

  // On first mount (or whenever the user's logged-in identity becomes
  // available), pull the server draft. Server copy wins over a stale
  // sessionStorage copy because it's the cross-device source of truth.
  // We mirror the server draft into sessionStorage so subsequent keystroke
  // edits continue to debounce-up to the server cleanly.
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

  // Debounced server-side persistence: any time the form/step changes and
  // the user is logged in, schedule a PUT 1.5s after they stop typing.
  // Cancellation on unmount + on each new edit keeps it to one PUT per
  // burst. The submit screen sets `submitted=true` which gates the effect
  // so we don't race against the post-submit DELETE.
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

  const [submitted, setSubmitted] = useStateA(false);
  const [appId, setAppId] = useStateA('');
  const [receiptUrl, setReceiptUrl] = useStateA('');
  const [submitting, setSubmitting] = useStateA(false);
  const [submitError, setSubmitError] = useStateA('');

  const steps = isKo
    ? ['개인정보 동의', '개인정보 · 추천코드', '기본 정보 · 학력 · 서류', '에세이 · 스카우트 추천인', '트랙 · 결제']
    : ['Consent', 'Personal · Referrer', 'Basic · Academic · Documents', 'Essays · Recommenders', 'Track · Payment'];

  // Default the program to the first currently-open one as soon as content
  // loads, but only if the user hasn't already picked one in their draft.
  const openPrograms = ((c && c.programs) || []).filter(p =>
    String(p.status || '').toLowerCase() === 'open' || p.status === undefined
  );
  useEffectA(() => {
    if (!form.program && openPrograms.length > 0) {
      setForm(f => ({ ...f, program: openPrograms[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPrograms.length]);

  // Permissive next/back — the user explicitly asked for the ability to move
  // forward even when required fields are blank. Validation still runs on the
  // final submit so half-filled applications don't slip through.
  const next = () => setStep(Math.min(step + 1, steps.length));
  const back = () => setStep(Math.max(step - 1, 0));
  const upd = k => e => setForm({ ...form, [k]: e.target.value });

  const trackPrice = (t, tier) => {
    if (t === 'full') return 10;
    if (t === 'partial') return tier === '70' ? 7 : tier === '50' ? 5 : 3;
    if (t === 'general') return 0;
    return 0;
  };
  const amount = trackPrice(form.track, form.partial_tier);

  // Hard validation — only enforced on the final Submit, not on Next.
  function validateForSubmit() {
    if (!form.consent_personal || !form.consent_third_party) return isKo ? '개인정보 동의가 필요합니다.' : 'Consent is required.';
    if (!form.name || !form.email) return isKo ? '이름과 이메일을 입력하세요.' : 'Name and email are required.';
    if (!form.country || !form.prior_school) return isKo ? '국가와 최종 학교를 입력하세요.' : 'Country and most recent school are required.';
    // Essays — each must meet its own min_chars and not exceed max_chars
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
    if (!form.track) return isKo ? '트랙을 선택하세요.' : 'Pick a track.';
    if (form.track !== 'general') {
      if (form.card_last4.length !== 4) return isKo ? '카드 번호를 입력하세요.' : 'Enter a card number.';
      if (!form.card_exp) return isKo ? '만료일(MM/YY)을 입력하세요.' : 'Enter expiry (MM/YY).';
      if (!form.card_cvc) return isKo ? 'CVC를 입력하세요.' : 'Enter CVC.';
    }
    if (!form.program) return isKo ? '프로그램을 선택하세요.' : 'Pick a program.';
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
      // Pair each pre-uploaded file id with its upload_token so the server
      // can prove the submitter is the original uploader before adopting
      // the orphan row (sec fix P2-6, 2026-05-19).
      const file_ids = [];
      const file_tokens = [];
      ['transcript_graduation', 'transcript_recognition', 'transcript_translation'].forEach(k => {
        const f = form[k];
        if (f && f.id) { file_ids.push(f.id); file_tokens.push(f.upload_token || ''); }
      });
      (form.recommenders || []).forEach(r => {
        if (r && r.letter_file && r.letter_file.id) {
          file_ids.push(r.letter_file.id);
          file_tokens.push(r.letter_file.upload_token || '');
        }
      });
      // Map first 2 essays to legacy columns for backward compat. Full list
      // also goes in essays_json for any future questions beyond the first 2.
      const e0 = form.essays[0] || { title: '', body: '' };
      const e1 = form.essays[1] || { title: '', body: '' };
      const payload = {
        ...form,
        essay_title:   e0.title, essay_body:   e0.body,
        essay_title_2: e1.title, essay_body_2: e1.body,
        essays_json: JSON.stringify(form.essays || []),
        recommenders_json: JSON.stringify(form.recommenders || []),
        file_ids,
        file_tokens,
        lang,
      };
      delete payload.recommenders;
      delete payload.essays;
      delete payload.transcript_graduation;
      delete payload.transcript_recognition;
      delete payload.transcript_translation;
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
      setReceiptUrl(data.receipt_url || '');
      setSubmitted(true);
      setStep(5);
      clearApplyDraft();
      // Drop the server-side copy too so a follow-up visit doesn't restore
      // the just-submitted draft. Worker also DELETEs on submit as a backstop.
      if (user) deleteServerDraft();
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

  if (submitted) {
    return (
      <div data-screen-label="Apply · Complete">
        <div className="phead">
          <div className="inner">
            <div className="sec-kicker">{isKo ? '신청 완료' : 'APPLICATION COMPLETE'}</div>
            <h1 className={isKo ? '' : 'en'}>
              {isKo ? '지원이 접수되었습니다.' : 'Your application is in.'}
            </h1>
            <p>{isKo
              ? `지원 ID: ${appId} · 이메일로 확인 메일이 발송됩니다.`
              : `Application ID: ${appId} · a confirmation email is on its way.`}</p>
          </div>
        </div>
        <section className="section">
          <div className="container-narrow">
            <div className="apply-card" style={{textAlign:'center'}}>
              <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(36,135,55,0.12)',display:'inline-flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
                <i data-lucide="check-circle-2" width="36" height="36" strokeWidth="1.75" style={{color:'var(--state-success)'}}></i>
              </div>
              <h3 style={{fontFamily:isKo?'var(--font-kr)':'var(--font-en)',fontSize:28,fontWeight:700,margin:'0 0 12px'}}>
                {isKo ? '감사합니다, ' : 'Thanks, '}{form.name}.
              </h3>
              <p style={{color:'var(--fg-secondary)',fontSize:16,lineHeight:1.6,maxWidth:520,margin:'0 auto 20px'}}>
                {isKo
                  ? '소속 NSO 확인 및 서류 검토 후 영업일 기준 7일 이내에 연락드립니다.'
                  : "After NSO verification and document review, we'll get back to you within 7 business days."}
              </p>
              {amount > 0 && (
                <div style={{display:'inline-block',padding:'12px 20px',background:'var(--bg-muted)',borderRadius:12,fontSize:14,color:'var(--fg-secondary)'}}>
                  {isKo ? '결제 완료: ' : 'Payment received: '}<strong>US ${amount}.00</strong>
                </div>
              )}
              {receiptUrl && (
                <div style={{marginTop:24}}>
                  <a className="btn btn-primary" href={receiptUrl} target="_blank" rel="noopener">
                    {isKo ? '영수증 보기 / 인쇄' : 'View / print receipt'} →
                  </a>
                  <p style={{marginTop:12,fontSize:13,color:'var(--fg-muted)'}}>
                    {isKo ? '영수증 링크는 결제 확인 이메일에도 포함됩니다.' : 'The receipt link is also included in your confirmation email.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div data-screen-label="Apply">
      <div className="phead">
        <div className="inner">
          <div className="sec-kicker">{isKo ? '지원하기' : 'HOW TO APPLY'}</div>
          <h1 className={isKo ? '' : 'en'}>
            {isKo ? '5단계. 온라인으로 완료.' : 'Five steps. All online.'}
          </h1>
          <p>{isKo
            ? '동의 · 개인정보 · 서류 · 에세이 · 결제. 약 20분 소요됩니다.'
            : 'Consent · personal · documents · essay · payment. About 20 minutes.'}</p>
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
          {/* Persistent 72-hour TTL notice — always visible while the form is
              open so the user knows their saved draft has a real expiry.
              Logged-in users see the live expires_at countdown; logged-out
              users see a softer message + the prompt to log in for cross-
              device persistence. */}
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
                    ? '입력 내용은 이 브라우저에만 임시 저장됩니다. 다른 기기에서도 이어쓰려면 로그인 후 작성해주세요. (서버 임시저장본은 마지막 수정 후 72시간 동안 유지됩니다.)'
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
            {step === 1 && <Step0 form={form} setForm={setForm} upd={upd} isKo={isKo} lang={lang} />}
            {step === 2 && <Step1 form={form} setForm={setForm} upd={upd} isKo={isKo} />}
            {step === 3 && <Step2 form={form} setForm={setForm} upd={upd} isKo={isKo} lang={lang} essayQuestions={essayQuestions} />}
            {step === 4 && <Step3 form={form} setForm={setForm} upd={upd} isKo={isKo} c={c} amount={amount} openPrograms={openPrograms} />}

            <div className="form-actions" style={{flexWrap:'wrap',gap:8}}>
              {step > 0 && <button type="button" className="btn btn-secondary" onClick={back}>← {isKo ? '이전' : 'Back'}</button>}
              <button type="button" className="btn btn-ghost" onClick={manualSave}
                title={isKo ? '입력한 내용을 저장하고 언제든 돌아올 수 있습니다.' : 'Save what you have so far and come back any time.'}>
                {isKo ? '임시저장' : 'Save draft'}
              </button>
              {step < 4 && (
                <button type="button" className="btn btn-primary" onClick={next}>
                  {isKo ? '다음' : 'Next'} →
                </button>
              )}
              {step === 4 && (
                <button type="button" className="btn btn-primary" disabled={submitting} onClick={submit}>
                  {submitting
                    ? (isKo ? '제출 중…' : 'Submitting…')
                    : (form.track === 'general'
                      ? (isKo ? '제출하기' : 'Submit application')
                      : (isKo ? `$${amount} 결제하고 제출` : `Pay $${amount} and submit`))} →
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
          ? '동의하신 내역은 IP, 브라우저 정보, 시각과 함께 GDPR Art. 7에 따라 기록됩니다.'
          : 'Your consent is recorded with IP, user agent, and timestamp per GDPR Art. 7.'}
      </p>
    </>
  );
}

function Step0({ form, setForm, upd, isKo, lang }) {
  return (
    <>
      <p className="apply-desc">{isKo
        ? '본인 정보와, 받으신 입학 추천인 코드(있을 경우)를 입력합니다.'
        : 'Your personal info and the admission referrer code you received (if any).'}</p>
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

function Step1({ form, setForm, upd, isKo }) {
  return (
    <>
      <p className="apply-desc">{isKo
        ? '국가, 학력 정보, 그리고 세 가지 학력 증빙 서류를 업로드합니다. 각 서류는 별도로 업로드하며, 마이페이지에서 언제든 교체할 수 있습니다.'
        : 'Country, academic background, and three separate academic documents. Each uploads independently and can be replaced any time from your member page.'}</p>
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
          <label>{isKo ? '최종 학교 *' : 'Most recent school *'}</label>
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
        <label>{isKo ? '학력 증명서 메모 (선택)' : 'Transcript note (optional)'}</label>
        <textarea rows="3" value={form.transcript_note} onChange={upd('transcript_note')}
          placeholder={isKo ? '서류와 관련해 알려주실 내용이 있다면 적어주세요.' : 'Anything reviewers should know about your documents.'} />
      </div>

      <h4 className="apply-sub">{isKo ? '학력 증빙 서류 (3종)' : 'Academic documents (3 types)'}</h4>
      <p className="hint" style={{marginBottom:12}}>{isKo
        ? '각 서류는 PDF · PNG · JPEG · WebP, 최대 10MB까지 업로드할 수 있습니다.'
        : 'Each document accepts PDF · PNG · JPEG · WebP, up to 10 MB.'}</p>

      <DocumentUpload
        slotKey="transcript_graduation"
        kind="transcript_graduation"
        title_ko="1. 졸업(예정)증명서 1부"
        title_en="1. Certificate of Graduation (or Expected Graduation) — 1 copy"
        form={form} setForm={setForm} isKo={isKo}
      />
      <DocumentUpload
        slotKey="transcript_recognition"
        kind="transcript_recognition"
        title_ko="2. 아포스티유 확인 · 학력인정확인서 · 영사확인 중 택1 (1부)"
        title_en="2. Apostille, Academic Recognition Confirmation, or Consular Confirmation — choose one (1 copy)"
        form={form} setForm={setForm} isKo={isKo}
      />
      <DocumentUpload
        slotKey="transcript_translation"
        kind="transcript_translation"
        title_ko="3. 한글번역공증본 (국문·영문 외 서류에 한함)"
        title_en="3. Notarized Korean translation (only for documents not in Korean or English)"
        form={form} setForm={setForm} isKo={isKo}
      />
    </>
  );
}

// One labelled file slot inside Step1. Each picker calls /api/applications/upload
// independently and stores the resulting file metadata at form[slotKey].
function DocumentUpload({ slotKey, kind, title_ko, title_en, form, setForm, isKo }) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const file = form[slotKey];
  async function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true); setErr('');
    try {
      const meta = await uploadApplyFile(f, kind, null);
      setForm({ ...form, [slotKey]: meta });
    } catch (ex) { setErr(ex.message || (isKo ? '업로드 실패' : 'Upload failed')); }
    finally { setBusy(false); }
  }
  function clearFile() { setForm({ ...form, [slotKey]: null }); }
  return (
    <div className="field" style={{padding:'14px 16px',background:'var(--bg-muted)',borderRadius:10,marginBottom:12}}>
      <label style={{fontWeight:600}}>{isKo ? title_ko : title_en}</label>
      <input type="file" accept="application/pdf,image/*" onChange={onPick} disabled={busy} style={{padding:'8px 0'}} />
      {busy && <span className="hint">{isKo ? '업로드 중…' : 'Uploading…'}</span>}
      {!busy && file && (
        <div style={{display:'flex',gap:10,alignItems:'center',marginTop:6}}>
          <span className="hint" style={{color:'var(--state-success)',flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            ✓ {file.filename} ({Math.round(file.size/1024)} KB)
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearFile} style={{color:'var(--state-danger)'}}>
            {isKo ? '제거' : 'Remove'}
          </button>
        </div>
      )}
      {err && <span className="hint" style={{color:'var(--state-danger)'}}>{err}</span>}
    </div>
  );
}

function Step2({ form, setForm, upd, isKo, lang, essayQuestions }) {
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

      <h4 className="apply-sub">{isKo ? '스카우트 추천인 (최소 3명)' : 'Scout recommenders (minimum 3)'}</h4>
      <p className="hint" style={{marginBottom:12}}>{isKo
        ? '추천인 정보(이름, 이메일, 전화번호 — 국제번호 형식 +국가코드, 회원국명, 훈련 수준)를 최소 3명 입력해주세요. 추천서는 각 추천인별로 PDF 업로드 가능합니다.'
        : 'Provide at least 3 recommenders with name, email, international phone (+country code), member country, and training level. PDF letter is optional per recommender.'}</p>

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
          <button type="button" className="icon-btn danger" onClick={onRemove}>
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
          <label>{isKo ? '회원국명 *' : 'Member country *'}</label>
          <input value={rec.member_country} onChange={e => set('member_country', e.target.value)}
            placeholder={isKo ? '예: Scouts of Kenya' : 'e.g. Scouts of Kenya'} />
        </div>
      </div>
      {window.EmailField
        ? <window.EmailField label={isKo ? '이메일 *' : 'Email *'} value={rec.email} onChange={(v) => set('email', v)} required lang={lang} />
        : (
          <div className="form-row">
            <div className="field">
              <label>{isKo ? '이메일 *' : 'Email *'}</label>
              <input type="email" value={rec.email} onChange={e => set('email', e.target.value)} placeholder="leader@scout.org" />
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

function Step3({ form, setForm, upd, isKo, c, amount, openPrograms }) {
  const TRACKS = [
    { id: 'full',    name_ko: '전체 장학',     name_en: 'Full scholarship',
      desc_ko: '100% 장학 지원. 지원 완료 시 $10 처리비.', desc_en: '100% scholarship. $10 processing fee on submission.',
      price: 10, badge_ko: '지원자 심사', badge_en: 'competitive' },
    { id: 'partial', name_ko: '부분 장학',     name_en: 'Partial scholarship',
      desc_ko: '70% / 50% / 30% 중 선택. 처리비는 티어에 따라 다릅니다.', desc_en: 'Choose 70% / 50% / 30%. Processing fee varies.',
      price: null, badge_ko: '추천 트랙', badge_en: 'recommended' },
    { id: 'general', name_ko: '일반 등록',     name_en: 'Standard registration',
      desc_ko: '장학 없이 일반 등록. 처리비 없음.', desc_en: 'Regular registration without scholarship. No fee.',
      price: 0, badge_ko: null, badge_en: null },
  ];
  const PARTIALS = [
    { tier: '70', pct: '70%', price: 7 },
    { tier: '50', pct: '50%', price: 5 },
    { tier: '30', pct: '30%', price: 3 },
  ];
  return (
    <>
      <p className="apply-desc">{isKo
        ? '지원할 프로그램과 장학 트랙을 선택하세요. 선택에 따라 결제 금액이 결정됩니다.'
        : 'Pick your program and scholarship track. Payment depends on your choice.'}</p>

      <div className="field">
        <label>{isKo ? '지원 프로그램 (현재 모집 중)' : 'Program (currently open)'}</label>
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

      <h4 className="apply-sub">{isKo ? '트랙 선택 *' : 'Choose a track *'}</h4>
      <div className="track-grid">
        {TRACKS.map(t => (
          <label key={t.id} className={'track-card' + (form.track === t.id ? ' on' : '')}>
            <input type="radio" name="track" value={t.id}
              checked={form.track === t.id} onChange={() => setForm({ ...form, track: t.id })} />
            <div className="track-head">
              <span className="track-name">{isKo ? t.name_ko : t.name_en}</span>
              {t.badge_ko && <span className="track-badge">{isKo ? t.badge_ko : t.badge_en}</span>}
            </div>
            <p className="track-desc">{isKo ? t.desc_ko : t.desc_en}</p>
            <div className="track-price">
              {t.id === 'partial' ? (isKo ? '$3 ~ $7' : '$3 – $7')
                : t.price === 0 ? (isKo ? '무료' : 'Free')
                : `$${t.price}`}
            </div>
          </label>
        ))}
      </div>

      {form.track === 'partial' && (
        <>
          <h4 className="apply-sub">{isKo ? '장학 비율 선택' : 'Pick scholarship tier'}</h4>
          <div className="tier-row">
            {PARTIALS.map(t => (
              <label key={t.tier} className={'tier-chip' + (form.partial_tier === t.tier ? ' on' : '')}>
                <input type="radio" name="tier" value={t.tier}
                  checked={form.partial_tier === t.tier} onChange={() => setForm({ ...form, partial_tier: t.tier })} />
                <span className="tier-pct">{t.pct}</span>
                <span className="tier-fee">${t.price}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {form.track && form.track !== 'general' && (
        <>
          <h4 className="apply-sub">{isKo ? '결제' : 'Payment'}</h4>
          <div className="pay-summary">
            <div>
              <div className="pay-label">{isKo ? '결제 금액' : 'Amount due'}</div>
              <div className="pay-amount">US ${amount}.00</div>
            </div>
            <div className="pay-lock"><i data-lucide="lock" width="14" height="14" strokeWidth="2"></i> Secured</div>
          </div>
          <div className="field">
            <label>{isKo ? '카드 번호' : 'Card number'}</label>
            <input inputMode="numeric" maxLength="19" placeholder="0000 0000 0000 0000"
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g,'').slice(0,16);
                setForm({ ...form, card_last4: digits.slice(-4) });
                e.target.value = digits.replace(/(.{4})/g,'$1 ').trim();
              }} />
          </div>
          <div className="form-row">
            <div className="field">
              <label>{isKo ? '만료일 (MM/YY)' : 'Expiry (MM/YY)'}</label>
              <input
                inputMode="numeric"
                maxLength="5"
                placeholder="MM/YY"
                value={form.card_exp || ''}
                onChange={(e) => {
                  // Auto-format MM/YY: keep digits, insert slash after 2.
                  const digits = e.target.value.replace(/\D/g,'').slice(0,4);
                  const formatted = digits.length > 2 ? `${digits.slice(0,2)}/${digits.slice(2)}` : digits;
                  setForm({ ...form, card_exp: formatted });
                }}
              />
            </div>
            <div className="field">
              <label>{isKo ? 'CVC' : 'CVC'}</label>
              <input
                inputMode="numeric"
                maxLength="4"
                placeholder="123"
                value={form.card_cvc || ''}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g,'').slice(0,4);
                  setForm({ ...form, card_cvc: digits });
                }}
              />
            </div>
          </div>
          <div className="pay-note">{isKo
            ? '이 프로토타입은 실제로 결제를 처리하지 않습니다. 카드 번호 마지막 4자리만 저장됩니다.'
            : 'This prototype does not process real payments. Only the last 4 digits are recorded.'}</div>
        </>
      )}
    </>
  );
}

window.Apply = Apply;
