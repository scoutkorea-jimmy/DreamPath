// forms.jsx — shared form-field components reused across InquiryForm,
// AuthModal, Apply, Member etc. so contact-shaped inputs (email, phone)
// follow a single visual + interaction rule. See KMS · Forms guide.
//
// EmailField: splits the address visually around the @ — two inputs
// joined by a literal "@" character. Internally still emits one full
// string so the rest of the app stays unchanged.
//
// PhoneField: country-code <select> + national-number <input>. The
// stored value is the concatenated international form, e.g. "+8210...".

(function () {
  // ── Country dial codes ────────────────────────────────────────────────
  // Curated list — Korea + the markets the project targets first, then a
  // representative spread of major regions. Operator can extend by editing
  // this array (no admin UI on purpose — phone codes don't change often).
  const COUNTRY_CODES = [
    { c: 'KR', d: '+82',  ko: '대한민국',     en: 'Korea, Republic of' },
    { c: 'US', d: '+1',   ko: '미국',         en: 'United States' },
    { c: 'JP', d: '+81',  ko: '일본',         en: 'Japan' },
    { c: 'CN', d: '+86',  ko: '중국',         en: 'China' },
    { c: 'TW', d: '+886', ko: '대만',         en: 'Taiwan' },
    { c: 'HK', d: '+852', ko: '홍콩',         en: 'Hong Kong' },
    { c: 'VN', d: '+84',  ko: '베트남',       en: 'Vietnam' },
    { c: 'TH', d: '+66',  ko: '태국',         en: 'Thailand' },
    { c: 'PH', d: '+63',  ko: '필리핀',       en: 'Philippines' },
    { c: 'ID', d: '+62',  ko: '인도네시아',   en: 'Indonesia' },
    { c: 'MY', d: '+60',  ko: '말레이시아',   en: 'Malaysia' },
    { c: 'SG', d: '+65',  ko: '싱가포르',     en: 'Singapore' },
    { c: 'IN', d: '+91',  ko: '인도',         en: 'India' },
    { c: 'AU', d: '+61',  ko: '호주',         en: 'Australia' },
    { c: 'NZ', d: '+64',  ko: '뉴질랜드',     en: 'New Zealand' },
    { c: 'GB', d: '+44',  ko: '영국',         en: 'United Kingdom' },
    { c: 'DE', d: '+49',  ko: '독일',         en: 'Germany' },
    { c: 'FR', d: '+33',  ko: '프랑스',       en: 'France' },
    { c: 'IT', d: '+39',  ko: '이탈리아',     en: 'Italy' },
    { c: 'ES', d: '+34',  ko: '스페인',       en: 'Spain' },
    { c: 'NL', d: '+31',  ko: '네덜란드',     en: 'Netherlands' },
    { c: 'BE', d: '+32',  ko: '벨기에',       en: 'Belgium' },
    { c: 'CH', d: '+41',  ko: '스위스',       en: 'Switzerland' },
    { c: 'AT', d: '+43',  ko: '오스트리아',   en: 'Austria' },
    { c: 'SE', d: '+46',  ko: '스웨덴',       en: 'Sweden' },
    { c: 'NO', d: '+47',  ko: '노르웨이',     en: 'Norway' },
    { c: 'DK', d: '+45',  ko: '덴마크',       en: 'Denmark' },
    { c: 'FI', d: '+358', ko: '핀란드',       en: 'Finland' },
    { c: 'PL', d: '+48',  ko: '폴란드',       en: 'Poland' },
    { c: 'IE', d: '+353', ko: '아일랜드',     en: 'Ireland' },
    { c: 'PT', d: '+351', ko: '포르투갈',     en: 'Portugal' },
    { c: 'GR', d: '+30',  ko: '그리스',       en: 'Greece' },
    { c: 'TR', d: '+90',  ko: '터키',         en: 'Türkiye' },
    { c: 'RU', d: '+7',   ko: '러시아',       en: 'Russia' },
    { c: 'AE', d: '+971', ko: '아랍에미리트', en: 'United Arab Emirates' },
    { c: 'SA', d: '+966', ko: '사우디',       en: 'Saudi Arabia' },
    { c: 'EG', d: '+20',  ko: '이집트',       en: 'Egypt' },
    { c: 'ZA', d: '+27',  ko: '남아공',       en: 'South Africa' },
    { c: 'KE', d: '+254', ko: '케냐',         en: 'Kenya' },
    { c: 'NG', d: '+234', ko: '나이지리아',   en: 'Nigeria' },
    { c: 'BR', d: '+55',  ko: '브라질',       en: 'Brazil' },
    { c: 'AR', d: '+54',  ko: '아르헨티나',   en: 'Argentina' },
    { c: 'MX', d: '+52',  ko: '멕시코',       en: 'Mexico' },
    { c: 'CO', d: '+57',  ko: '콜롬비아',     en: 'Colombia' },
    { c: 'CL', d: '+56',  ko: '칠레',         en: 'Chile' },
    { c: 'PE', d: '+51',  ko: '페루',         en: 'Peru' },
    { c: 'CA', d: '+1',   ko: '캐나다',       en: 'Canada' },
  ];
  window.DP_COUNTRY_CODES = COUNTRY_CODES;

  // EmailField — single full-string state, two visual halves split on @.
  function EmailField({ label, value, onChange, required, autoComplete, hint, lang }) {
    const isKo = (lang || document.documentElement.lang) === 'ko';
    const v = value || '';
    const at = v.indexOf('@');
    const local  = at >= 0 ? v.slice(0, at) : v;
    const domain = at >= 0 ? v.slice(at + 1) : '';

    function setLocal(next)  { onChange((next || '') + '@' + domain); }
    function setDomain(next) { onChange(local + '@' + (next || '')); }

    return (
      <label className="auth-field dp-email-field">
        <span>{label}</span>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <input
            type="text"
            value={local}
            onChange={e => setLocal(e.target.value)}
            required={required}
            autoComplete={autoComplete || 'email'}
            placeholder={isKo ? '아이디' : 'username'}
            inputMode="email"
            style={{flex:1,minWidth:0}}
          />
          <span aria-hidden="true" style={{color:'var(--fg-muted)',fontSize:16,fontWeight:600,userSelect:'none'}}>@</span>
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            required={required}
            autoComplete="email"
            placeholder="example.com"
            inputMode="email"
            style={{flex:1,minWidth:0}}
          />
        </div>
        {hint && <span className="hint" style={{fontSize:12,color:'var(--fg-muted)',marginTop:4}}>{hint}</span>}
      </label>
    );
  }
  window.EmailField = EmailField;

  // PhoneField — country dial-code <select> + national number input.
  // Stored value: the concatenated international form, e.g. "+82 10 1234 5678".
  // Operator-friendly: parsing back from the stored string picks the longest
  // matching dial code so we round-trip cleanly when editing existing data.
  function PhoneField({ label, value, onChange, required, hint, lang }) {
    const isKo = (lang || document.documentElement.lang) === 'ko';
    const v = (value || '').trim();

    // Pick the dial code by longest prefix match.
    const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.d.length - a.d.length);
    const matched = v.startsWith('+') ? sortedCodes.find(cc => v.startsWith(cc.d)) : null;
    const dial = matched ? matched.d : '+82';                    // default to KR
    const number = matched ? v.slice(matched.d.length).trim() : v.replace(/^\+/, '');

    function setDial(d)   { onChange((d + ' ' + number).trim()); }
    function setNumber(n) { onChange((dial + ' ' + (n || '')).trim()); }

    return (
      <label className="auth-field dp-phone-field">
        <span>{label}</span>
        <div style={{display:'flex',gap:8}}>
          <select
            value={dial}
            onChange={e => setDial(e.target.value)}
            aria-label={isKo ? '국가 번호' : 'Country code'}
            style={{flex:'0 0 auto',minWidth:120}}
          >
            {COUNTRY_CODES.map(cc => (
              <option key={cc.c + cc.d} value={cc.d}>{cc.d} {isKo ? cc.ko : cc.en}</option>
            ))}
          </select>
          <input
            type="tel"
            inputMode="tel"
            value={number}
            onChange={e => setNumber(e.target.value)}
            required={required}
            autoComplete="tel-national"
            placeholder={isKo ? '10 1234 5678' : '10 1234 5678'}
            style={{flex:1,minWidth:0}}
          />
        </div>
        {hint && <span className="hint" style={{fontSize:12,color:'var(--fg-muted)',marginTop:4}}>{hint}</span>}
      </label>
    );
  }
  window.PhoneField = PhoneField;
})();
