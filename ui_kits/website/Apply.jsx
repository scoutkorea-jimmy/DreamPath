// Apply.jsx — 4-step application: basic info → essay → recommender → payment
const { useState: useStateA } = React;

function Apply({ lang, c }) {
  const isKo = lang === 'ko';
  const [step, setStep] = useStateA(0);
  const [form, setForm] = useStateA({
    // step 0 — basic info / academic
    name: '', email: '', country: '', birthdate: '',
    prior_school: '', prior_major: '', prior_gpa: '',
    transcript_note: '',
    // step 1 — essay
    essay_title: '', essay_body: '',
    // step 2 — recommender / scout
    nso: '', recommender_name: '', recommender_role: '',
    recommender_email: '', recommender_letter: '',
    // step 3 — track + payment
    track: '', partial_tier: '70',
    program: (c && c.programs && c.programs[0] && c.programs[0].id) || 'korean-studies',
    payment_method: 'card', card_last4: '',
  });
  const [submitted, setSubmitted] = useStateA(false);
  const [appId, setAppId] = useStateA('');
  const [submitting, setSubmitting] = useStateA(false);
  const [submitError, setSubmitError] = useStateA('');

  const steps = isKo
    ? ['기본 정보 · 학력', '자기 에세이', '스카우트 추천인', '트랙 · 결제']
    : ['Basic info · Academic', 'Personal essay', 'Scout recommender', 'Track · Payment'];

  const next = () => setStep(Math.min(step + 1, steps.length));
  const back = () => setStep(Math.max(step - 1, 0));
  const upd = k => e => setForm({ ...form, [k]: e.target.value });

  // Track prices
  const trackPrice = (t, tier) => {
    if (t === 'full') return 10;
    if (t === 'partial') return tier === '70' ? 7 : tier === '50' ? 5 : 3;
    if (t === 'general') return 0;
    return 0;
  };
  const amount = trackPrice(form.track, form.partial_tier);

  function validateStep(i) {
    if (i === 0) return form.name && form.email && form.country && form.prior_school;
    if (i === 1) return form.essay_title && form.essay_body && form.essay_body.length >= 50;
    if (i === 2) return form.nso && form.recommender_name && form.recommender_email;
    if (i === 3) return form.track && (form.track === 'general' || form.card_last4.length === 4);
    return true;
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, lang }),
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
      setSubmitted(true);
      setStep(4);
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
                <i data-lucide="check-circle-2" width="36" height="36" strokeWidth="1.75" style={{color:'#248737'}}></i>
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

            {step === 0 && <Step0 form={form} upd={upd} isKo={isKo} />}
            {step === 1 && <Step1 form={form} upd={upd} isKo={isKo} />}
            {step === 2 && <Step2 form={form} upd={upd} isKo={isKo} />}
            {step === 3 && <Step3 form={form} setForm={setForm} upd={upd} isKo={isKo} c={c} amount={amount} />}

            <div className="form-actions">
              {step > 0 && <button type="button" className="btn btn-secondary" onClick={back}>← {isKo ? '이전' : 'Back'}</button>}
              {step < 3 && (
                <button type="button" className="btn btn-primary" disabled={!validateStep(step)} onClick={next}>
                  {isKo ? '다음' : 'Next'} →
                </button>
              )}
              {step === 3 && (
                <button type="button" className="btn btn-primary" disabled={!validateStep(3) || submitting} onClick={submit}>
                  {submitting
                    ? (isKo ? '제출 중…' : 'Submitting…')
                    : (form.track === 'general'
                      ? (isKo ? '제출하기' : 'Submit application')
                      : (isKo ? `$${amount} 결제하고 제출` : `Pay $${amount} and submit`))} →
                </button>
              )}
            </div>
            {submitError && (
              <div role="alert" style={{marginTop:12,color:'#B91C1C',fontSize:14}}>{submitError}</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Step0({ form, upd, isKo }) {
  return (
    <>
      <p className="apply-desc">{isKo
        ? '일반 대학 지원에 필요한 기본 정보와 학력 증명 자료를 입력합니다.'
        : 'Basic info and academic records required for a university application.'}</p>
      <div className="form-row">
        <div className="field">
          <label>{isKo ? '이름 *' : 'Full name *'}</label>
          <input value={form.name} onChange={upd('name')} placeholder={isKo ? '홍길동' : 'Your name'} />
        </div>
        <div className="field">
          <label>{isKo ? '이메일 *' : 'Email *'}</label>
          <input type="email" value={form.email} onChange={upd('email')} placeholder="you@example.com" />
        </div>
      </div>
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
          <label>{isKo ? '생년월일' : 'Date of birth'}</label>
          <input type="date" value={form.birthdate} onChange={upd('birthdate')} />
        </div>
      </div>
      <h4 className="apply-sub">{isKo ? '학력' : 'Academic background'}</h4>
      <div className="form-row">
        <div className="field">
          <label>{isKo ? '최종 학교 *' : 'Most recent school *'}</label>
          <input value={form.prior_school} onChange={upd('prior_school')} />
        </div>
        <div className="field">
          <label>{isKo ? '전공/계열' : 'Major / track'}</label>
          <input value={form.prior_major} onChange={upd('prior_major')} />
        </div>
      </div>
      <div className="field">
        <label>{isKo ? 'GPA 또는 학점' : 'GPA or grade average'}</label>
        <input value={form.prior_gpa} onChange={upd('prior_gpa')} placeholder={isKo ? '예: 3.7 / 4.0' : 'e.g. 3.7 / 4.0'} />
      </div>
      <div className="field">
        <label>{isKo ? '학력 증명서 메모' : 'Transcript note'}</label>
        <textarea rows="3" value={form.transcript_note} onChange={upd('transcript_note')}
          placeholder={isKo ? '업로드 대신 메모로 입력하세요. 정식 서류는 이후 이메일로 요청됩니다.' : 'Note here; we\'ll request the official transcript by email later.'} />
        <span className="hint">{isKo ? '* 이 프로토타입에서는 파일 업로드 대신 메모로 기록합니다.' : '* In this prototype, we record a note instead of a file upload.'}</span>
      </div>
    </>
  );
}

function Step1({ form, upd, isKo }) {
  const count = (form.essay_body || '').length;
  return (
    <>
      <p className="apply-desc">{isKo
        ? '본인의 배경, 관심사, 그리고 DreamPath를 통해 이루고 싶은 것에 대해 써주세요.'
        : 'Write about your background, interests, and what you hope to achieve through DreamPath.'}</p>
      <div className="field">
        <label>{isKo ? '에세이 제목 *' : 'Essay title *'}</label>
        <input value={form.essay_title} onChange={upd('essay_title')} placeholder={isKo ? '예: 국경 너머의 학습' : 'e.g. Learning across borders'} />
      </div>
      <div className="field">
        <label>{isKo ? '에세이 본문 * (최소 50자)' : 'Essay body * (min 50 characters)'}</label>
        <textarea rows="10" value={form.essay_body} onChange={upd('essay_body')}
          placeholder={isKo ? '여기에 자기 에세이를 작성해주세요. 최대 3,000자 권장.' : 'Write your personal essay here. Up to ~3,000 characters recommended.'} />
        <span className="hint">{count} {isKo ? '자 입력됨' : 'characters'}</span>
      </div>
    </>
  );
}

function Step2({ form, upd, isKo }) {
  return (
    <>
      <p className="apply-desc">{isKo
        ? '소속 스카우트 조직과 추천인 정보를 입력해주세요. 추천서는 본문에 직접 붙여넣을 수 있습니다.'
        : 'Your scout organization and a recommender. You can paste the recommendation letter directly.'}</p>
      <div className="field">
        <label>{isKo ? '소속 스카우트 조직 (NSO) *' : 'National Scout Organization *'}</label>
        <input value={form.nso} onChange={upd('nso')} placeholder={isKo ? '예: Scouts of Kenya' : 'e.g. Scouts of Kenya'} />
      </div>
      <div className="form-row">
        <div className="field">
          <label>{isKo ? '추천인 이름 *' : 'Recommender name *'}</label>
          <input value={form.recommender_name} onChange={upd('recommender_name')} />
        </div>
        <div className="field">
          <label>{isKo ? '직책/역할' : 'Role'}</label>
          <input value={form.recommender_role} onChange={upd('recommender_role')} placeholder={isKo ? '예: Scout Leader' : 'e.g. Scout Leader'} />
        </div>
      </div>
      <div className="field">
        <label>{isKo ? '추천인 이메일 *' : 'Recommender email *'}</label>
        <input type="email" value={form.recommender_email} onChange={upd('recommender_email')} placeholder="leader@scout.org" />
      </div>
      <div className="field">
        <label>{isKo ? '추천서 내용 (선택)' : 'Recommendation letter (optional)'}</label>
        <textarea rows="6" value={form.recommender_letter} onChange={upd('recommender_letter')}
          placeholder={isKo ? '추천서 본문을 여기에 붙여넣으세요. 비워두면 추천인에게 이메일로 요청됩니다.' : "Paste the letter body here. If blank, we'll request it from the recommender by email."} />
      </div>
    </>
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
