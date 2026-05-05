// Helper used by both Apply state init and the Step2 list controls.
function blankRecommender() {
  return { name: '', email: '', phone: '', member_country: '', training_level: '', letter_file: null };
}

// Upload a single file to /api/applications/upload → returns { id, filename,
// size, mime, r2_key } on success. Caps + MIME whitelisted server-side; this
// helper just shuttles the bytes as base64. Used by the Apply form's
// transcript + per-recommender PDF pickers.
async function uploadApplyFile(file, kind, recommenderIdx) {
  if (!file) return null;
  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  if (file.type && !allowed.includes(file.type)) throw new Error('PDF / 이미지만 가능합니다.');
  if (file.size > 10 * 1024 * 1024) throw new Error('최대 10MB.');
  const b64 = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = String(r.result || '');
      // Strip the "data:<mime>;base64," prefix.
      const i = dataUrl.indexOf(',');
      res(i >= 0 ? dataUrl.slice(i + 1) : dataUrl);
    };
    r.onerror = () => rej(new Error('읽기 실패'));
    r.readAsDataURL(file);
  });
  const res = await fetch('/api/applications/upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      kind,
      recommender_idx: recommenderIdx,
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

// Apply.jsx — 4-step application:
//   1) personal + admission referrer code
//   2) basic info + academic
//   3) essays (2 questions) + scout recommender (optional, with PDF upload)
//   4) track + payment
const { useState: useStateA, useEffect: useEffectA } = React;

// Apply form draft persistence — sessionStorage so a refresh / accidental
// navigation doesn't wipe the user's work mid-application. Cleared after
// successful submit. Per-tab (sessionStorage) so one tab's draft doesn't
// leak into another visitor on a shared device.
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

function Apply({ lang, c }) {
  const isKo = lang === 'ko';
  const _restored = loadApplyDraft();
  const [step, setStep] = useStateA(_restored?.step || 0);
  const [docOpen, setDocOpen] = useStateA(null);
  const [form, setForm] = useStateA(_restored?.form || {
    // step 0 — consent
    consent_personal: false,
    consent_third_party: false,
    // step 1 — personal info + admission referrer code
    name: '', email: '', birthdate: '',
    admission_referrer_code: '',
    // step 2 — basic info + academic
    country: '',
    prior_school: '', prior_major: '', prior_gpa: '',
    transcript_note: '',
    // Real PDF upload for the transcript (optional). { id, filename, size }
    // when present. Submitted as part of file_ids[].
    transcript_file: null,
    // step 3 — essays + scout recommenders (>=3)
    essay_title: '', essay_body: '',
    essay_title_2: '', essay_body_2: '',
    recommenders: [
      blankRecommender(),
      blankRecommender(),
      blankRecommender(),
    ],
    // step 4 — track + payment
    track: '', partial_tier: '70',
    program: (c && c.programs && c.programs[0] && c.programs[0].id) || 'korean-studies',
    payment_method: 'card', card_last4: '',
  });
  // Auto-save draft to sessionStorage on every form / step change.
  useEffectA(() => { saveApplyDraft(form, step); }, [form, step]);
  // One-time toast: tell the visitor their draft was restored.
  const [draftToast, setDraftToast] = useStateA(!!_restored);
  useEffectA(() => {
    if (!draftToast) return;
    const t = setTimeout(() => setDraftToast(false), 5000);
    return () => clearTimeout(t);
  }, [draftToast]);
  const [submitted, setSubmitted] = useStateA(false);
  const [appId, setAppId] = useStateA('');
  const [receiptUrl, setReceiptUrl] = useStateA('');
  const [submitting, setSubmitting] = useStateA(false);
  const [submitError, setSubmitError] = useStateA('');

  const steps = isKo
    ? ['개인정보 동의', '개인정보 · 추천코드', '기본 정보 · 학력', '에세이 · 스카우트 추천인', '트랙 · 결제']
    : ['Consent', 'Personal · Referrer code', 'Basic · Academic', 'Essays · Scout recommender', 'Track · Payment'];

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

  function validateStep(i) {
    if (i === 0) return form.consent_personal && form.consent_third_party;
    if (i === 1) return form.name && form.email; // referrer code is optional
    if (i === 2) return form.country && form.prior_school;
    if (i === 3) {
      const essaysOK = form.essay_title && form.essay_body && form.essay_body.length >= 50
                    && form.essay_title_2 && form.essay_body_2 && form.essay_body_2.length >= 50;
      const recs = form.recommenders || [];
      const recsOK = recs.length >= 3 && recs.every(r =>
        r.name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email || '')
        && /^\+/.test((r.phone || '').trim())
        && r.member_country && r.training_level
      );
      return essaysOK && recsOK;
    }
    if (i === 4) return form.track && (form.track === 'general' || form.card_last4.length === 4);
    return true;
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const headers = { 'content-type': 'application/json' };
      const tk = window.DreamPathAuth && window.DreamPathAuth.token;
      if (tk) headers['authorization'] = 'Bearer ' + tk;
      // Collect uploaded file ids — transcript + each recommender's letter.
      // Worker submitApplication() adopts these rows by setting their
      // application_id once the new application is committed.
      const file_ids = [];
      if (form.transcript_file && form.transcript_file.id) file_ids.push(form.transcript_file.id);
      (form.recommenders || []).forEach(r => {
        if (r && r.letter_file && r.letter_file.id) file_ids.push(r.letter_file.id);
      });
      const payload = {
        ...form,
        recommenders_json: JSON.stringify(form.recommenders || []),
        file_ids,
        lang,
      };
      delete payload.recommenders;
      delete payload.transcript_file;        // not a column on applications
      // recommenders_json now carries letter_file metadata per recommender.
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
      // Application submitted — wipe the local draft so a refresh on the
      // success screen doesn't put the user back at step 0 with stale data.
      clearApplyDraft();

      // GDPR audit trail — record both consents tied to this application
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
            {isKo ? '4단계. 온라인으로 완료.' : 'Four steps. All online.'}
          </h1>
          <p>{isKo
            ? '서류 · 에세이 · 추천인 · 결제. 약 15분 소요됩니다.'
            : 'Documents · essay · recommender · payment. About 15 minutes.'}</p>
        </div>
      </div>

      <section className="section">
        <div className="container-narrow">
          {draftToast && (
            <div role="status" aria-live="polite"
              style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'12px 16px',marginBottom:14,background:'var(--state-info-bg)',color:'var(--state-info)',borderRadius:10,fontSize:14,fontWeight:600}}>
              <span>{isKo ? '↻ 작성 중이던 지원서를 복원했습니다.' : '↻ Restored your in-progress application.'}</span>
              <button type="button" onClick={() => { clearApplyDraft(); window.location.reload(); }}
                style={{background:'none',border:'1px solid currentColor',borderRadius:6,padding:'4px 10px',color:'inherit',cursor:'pointer',fontSize:12,fontWeight:600}}>
                {isKo ? '처음부터 다시' : 'Start over'}
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
            {step === 1 && <Step0 form={form} upd={upd} isKo={isKo} />}
            {step === 2 && <Step1 form={form} setForm={setForm} upd={upd} isKo={isKo} />}
            {step === 3 && <Step2 form={form} setForm={setForm} upd={upd} isKo={isKo} />}
            {step === 4 && <Step3 form={form} setForm={setForm} upd={upd} isKo={isKo} c={c} amount={amount} />}

            <div className="form-actions">
              {step > 0 && <button type="button" className="btn btn-secondary" onClick={back}>← {isKo ? '이전' : 'Back'}</button>}
              {step < 4 && (
                <button type="button" className="btn btn-primary" disabled={!validateStep(step)} onClick={next}>
                  {isKo ? '다음' : 'Next'} →
                </button>
              )}
              {step === 4 && (
                <button type="button" className="btn btn-primary" disabled={!validateStep(4) || submitting} onClick={submit}>
                  {submitting
                    ? (isKo ? '제출 중…' : 'Submitting…')
                    : (form.track === 'general'
                      ? (isKo ? '제출하기' : 'Submit application')
                      : (isKo ? `$${amount} 결제하고 제출` : `Pay $${amount} and submit`))} →
                </button>
              )}
            </div>
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

function Step0({ form, upd, isKo }) {
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
        ? '국가, 학력 정보, 학력 증명 메모를 입력합니다.'
        : 'Country, academic background, and a transcript note.'}</p>
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
        <label>{isKo ? '학력 증명서 메모' : 'Transcript note'}</label>
        <textarea rows="3" value={form.transcript_note} onChange={upd('transcript_note')}
          placeholder={isKo ? 'PDF가 없으면 메모로 입력하세요.' : 'Notes here if you cannot attach a PDF.'} />
      </div>
      <TranscriptUpload form={form} setForm={setForm} isKo={isKo} />
    </>
  );
}

function TranscriptUpload({ form, setForm, isKo }) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  async function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true); setErr('');
    try {
      const meta = await uploadApplyFile(f, 'transcript', null);
      setForm({ ...form, transcript_file: meta });
    } catch (ex) { setErr(ex.message || (isKo ? '업로드 실패' : 'Upload failed')); }
    finally { setBusy(false); }
  }
  return (
    <div className="field">
      <label>{isKo ? '학력 증명서 첨부 (PDF · 이미지, 선택)' : 'Transcript file (PDF / image, optional)'}</label>
      <input type="file" accept="application/pdf,image/*" onChange={onPick} disabled={busy} style={{padding:'8px 0'}} />
      {busy && <span className="hint">{isKo ? '업로드 중…' : 'Uploading…'}</span>}
      {!busy && form.transcript_file && (
        <span className="hint" style={{color:'var(--state-success)'}}>✓ {form.transcript_file.filename} ({Math.round(form.transcript_file.size/1024)} KB)</span>
      )}
      {err && <span className="hint" style={{color:'var(--state-danger)'}}>{err}</span>}
      <span className="hint">{isKo ? '최대 10MB. PDF · PNG · JPEG · WebP.' : 'Max 10 MB. PDF / PNG / JPEG / WebP.'}</span>
    </div>
  );
}

function Step2({ form, setForm, upd, isKo }) {
  const c1 = (form.essay_body || '').length;
  const c2 = (form.essay_body_2 || '').length;

  return (
    <>
      <p className="apply-desc">{isKo
        ? '두 가지 에세이 문항에 답해주세요. 추천인은 최소 3명을 입력해야 합니다.'
        : 'Answer both essay questions. At least 3 recommenders are required.'}</p>

      <h4 className="apply-sub">{isKo ? '에세이 1' : 'Essay 1'}</h4>
      <div className="field">
        <label>{isKo ? '제목 *' : 'Title *'}</label>
        <input value={form.essay_title} onChange={upd('essay_title')}
          placeholder={isKo ? '예: 국경 너머의 학습' : 'e.g. Learning across borders'} />
      </div>
      <div className="field">
        <label>{isKo ? '본문 * (최소 50자)' : 'Body * (min 50 characters)'}</label>
        <textarea rows="6" value={form.essay_body} onChange={upd('essay_body')}
          placeholder={isKo ? '본인의 배경, 관심사, DreamPath를 통해 이루고 싶은 것에 대해 작성하세요.' : 'Background, interests, and what you hope to achieve through DreamPath.'} />
        <span className="hint">{c1} {isKo ? '자' : 'characters'}</span>
      </div>

      <h4 className="apply-sub">{isKo ? '에세이 2' : 'Essay 2'}</h4>
      <div className="field">
        <label>{isKo ? '제목 *' : 'Title *'}</label>
        <input value={form.essay_title_2} onChange={upd('essay_title_2')}
          placeholder={isKo ? '예: 5년 후의 나' : 'e.g. Where I see myself in 5 years'} />
      </div>
      <div className="field">
        <label>{isKo ? '본문 * (최소 50자)' : 'Body * (min 50 characters)'}</label>
        <textarea rows="6" value={form.essay_body_2} onChange={upd('essay_body_2')}
          placeholder={isKo ? '학업 계획, 커리어 목표, DreamPath 이후에 대해 작성하세요.' : 'Academic plan, career goals, and your path after DreamPath.'} />
        <span className="hint">{c2} {isKo ? '자' : 'characters'}</span>
      </div>

      <h4 className="apply-sub">{isKo ? '스카우트 추천인 (최소 3명)' : 'Scout recommenders (minimum 3)'}</h4>
      <p className="hint" style={{marginBottom:12}}>{isKo
        ? '추천인 정보(이름, 이메일, 전화번호 — 국제번호 형식 +국가코드, 회원국명, 훈련 수준)를 최소 3명 입력해주세요. 추천서는 각 추천인별로 PDF 업로드 가능합니다.'
        : 'Provide at least 3 recommenders with name, email, international phone (+country code), member country, and training level. PDF letter is optional per recommender.'}</p>

      {(form.recommenders || []).map((r, i) => (
        <RecommenderCard key={i} index={i} rec={r} isKo={isKo}
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

function RecommenderCard({ index, rec, isKo, onChange, onRemove }) {
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
      set('letter_file', meta);   // { id, filename, size, mime, r2_key }
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

function Step3({ form, setForm, upd, isKo, c, amount }) {
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
  const progList = (c && c.programs) || [];
  return (
    <>
      <p className="apply-desc">{isKo
        ? '지원할 프로그램과 장학 트랙을 선택하세요. 선택에 따라 결제 금액이 결정됩니다.'
        : 'Pick your program and scholarship track. Payment depends on your choice.'}</p>

      <div className="field">
        <label>{isKo ? '지원 프로그램' : 'Program'}</label>
        <select value={form.program} onChange={upd('program')}>
          {progList.map(p => (
            <option key={p.id} value={p.id}>{isKo ? p.title_ko : p.title_en}</option>
          ))}
        </select>
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
          <div className="form-row">
            <div className="field">
              <label>{isKo ? '카드 번호' : 'Card number'}</label>
              <input inputMode="numeric" maxLength="19" placeholder="0000 0000 0000 0000"
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g,'').slice(0,16);
                  setForm({ ...form, card_last4: digits.slice(-4) });
                  e.target.value = digits.replace(/(.{4})/g,'$1 ').trim();
                }} />
            </div>
            <div className="field">
              <label>{isKo ? '만료 · CVC' : 'Expiry · CVC'}</label>
              <input placeholder="MM/YY · 123" />
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
