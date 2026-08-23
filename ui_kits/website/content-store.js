// content-store.js — admin-editable content store backed by Cloudflare KV.
// Public site GETs /api/content. Admin saves PUT /api/content with bearer token.
// SessionStorage holds a per-visitor cache to keep first paint instant.

(function() {
  const STORAGE_KEY = 'dp_content_v1';
  const API_URL = '/api/content';
  const TOKEN_KEY = 'dp_admin_token';

  // Deep clone helper. `structuredClone` is only available in Chrome ≥98 /
  // Firefox ≥94 / Safari ≥15.4 — older browsers (Chrome 79/92 seen in the
  // error log) threw "structuredClone is not defined" at app init, which
  // crashed the entire SPA into a white screen. DEFAULT_CONTENT and saved
  // content are pure JSON (no functions/Dates/Maps), so JSON round-trip is a
  // safe fallback. Exposed on window so admin.html shares one implementation.
  function dpClone(o) {
    if (typeof structuredClone === 'function') {
      try { return structuredClone(o); } catch { /* fall through */ }
    }
    return JSON.parse(JSON.stringify(o));
  }
  window.dpClone = dpClone;

  // Hero background helper (v01.079). Every page hero can carry an optional
  // bg_image (upload), bg_color (picker), and bg_position (focal point). Returns
  // { cls, style } applied to the hero element. Language-independent. Used by
  // Home/About/Pages/Programs/Team so the behaviour stays consistent.
  //   - image present → dark overlay + white text (always legible), cover-fit
  //     with the chosen focal position (works on both mobile & desktop).
  //   - solid color only → text auto-flips dark/light by luminance.
  //   - neither → '' (component keeps its default gradient/grey).
  function isDarkHex(hex) {
    const m = String(hex || '').trim().replace('#', '');
    if (!(m.length === 3 || m.length === 6)) return false;
    const f = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
    const r = parseInt(f.slice(0, 2), 16), g = parseInt(f.slice(2, 4), 16), b = parseInt(f.slice(4, 6), 16);
    if ([r, g, b].some(n => Number.isNaN(n))) return false;
    // Relative luminance (sRGB). < 0.5 → dark background → needs light text.
    const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return L < 0.5;
  }
  function heroBg(node) {
    node = node || {};
    const img = node.bg_image, color = node.bg_color;
    const pos = node.bg_position || 'center';
    if (img) {
      return { cls: 'has-hero-media', style: {
        backgroundImage: `linear-gradient(rgba(17,9,38,0.55), rgba(17,9,38,0.55)), url("${img}")`,
        backgroundSize: 'cover', backgroundPosition: pos, backgroundRepeat: 'no-repeat',
      } };
    }
    if (color) {
      return { cls: isDarkHex(color) ? 'has-hero-dark' : 'has-hero-light', style: { background: color } };
    }
    return { cls: '', style: null };
  }
  window.heroBg = heroBg;
  window.isDarkHex = isDarkHex;

  // v01.081 — progressive hero background for slow / overseas connections.
  // A React hook: returns the same {cls,style} as heroBg, BUT only applies the
  // image once it has actually loaded within a timeout. On a slow link
  // (Save-Data or 2g) the image is never requested at all. Until/unless the
  // image is ready it falls back to the color (bg_color) or the component's
  // default — so a heavy photo never blocks first paint abroad.
  //   - image loads fast  → photo shown.
  //   - image too slow / save-data / 2g → color only (or default).
  // Tip: set BOTH a background image AND a background color for a graceful
  // colored fallback on slow networks.
  const HERO_IMG_TIMEOUT_MS = 2500;
  function colorFallback(node) {
    if (node.bg_color) return { cls: isDarkHex(node.bg_color) ? 'has-hero-dark' : 'has-hero-light', style: { background: node.bg_color } };
    return { cls: '', style: null }; // component keeps its default gradient/grey
  }
  function connectionIsSlow() {
    try {
      const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!c) return false;
      if (c.saveData) return true;
      return /(^|\b)(slow-2g|2g)$/.test(c.effectiveType || '');
    } catch { return false; }
  }
  // Hook: true once `src` has loaded within the timeout. Returns false on a
  // slow link (Save-Data / 2g) without ever requesting the image. Reused by
  // useHeroBg and the program-detail header.
  function useImageReady(src) {
    const R = window.React;
    const [ready, setReady] = R.useState(false);
    R.useEffect(() => {
      setReady(false);
      if (!src || connectionIsSlow()) return; // slow link → never fetch the image
      let settled = false;
      const im = new Image();
      const timer = setTimeout(() => { settled = true; }, HERO_IMG_TIMEOUT_MS); // too slow → keep fallback
      im.onload = () => { if (!settled) { settled = true; clearTimeout(timer); setReady(true); } };
      im.onerror = () => { if (!settled) { settled = true; clearTimeout(timer); } };
      im.src = src;
      return () => { settled = true; clearTimeout(timer); };
    }, [src]);
    return ready;
  }
  window.useImageReady = useImageReady;
  function useHeroBg(node) {
    node = node || {};
    const R = window.React;
    if (!R || !R.useState) return heroBg(node); // safety: no React → static
    const img = node.bg_image;
    const ready = useImageReady(img);
    if (img && ready) {
      return {
        cls: 'has-hero-media',
        style: {
          backgroundImage: `linear-gradient(rgba(17,9,38,0.55), rgba(17,9,38,0.55)), url("${img}")`,
          backgroundSize: 'cover', backgroundPosition: node.bg_position || 'center', backgroundRepeat: 'no-repeat',
        },
      };
    }
    return colorFallback(node);
  }
  window.useHeroBg = useHeroBg;

  // Default content — schema for the entire public site
  const DEFAULT_CONTENT = {
    brand: {
      name_kr: 'KoreaDreamPath',
      name_en: 'KoreaDreamPath',
      // Wordmark split for two-tone display: { mark } + { accent }
      wordmark_mark: 'KoreaDream',
      wordmark_accent: 'Path',
      logo_mark: '/assets/logo-dreampath-mark.svg',
      footer_tagline_ko: '글로벌 청년 교육 파트너 네트워크를 활용해 청년 리더를 한국의 고등교육으로 연결하는 독립 평생교육 이니셔티브.',
      footer_tagline_en: 'An independent lifelong-education initiative connecting young leaders worldwide to Korean higher education through a global youth-education partner network.',
      email: 'info@koreadreampath.com',
      partners_email: 'info@koreadreampath.com',
    },
    nav: {
      // Display order on the public site is fixed in Nav.jsx:
      //   소개 → 프로그램 → 장학 프로그램 → 문의하기
      ko: { about: '소개', programs: '프로그램', scholarships: '장학 프로그램', news: '프로그램 소식', stories: '프로그램 후기', partners: '파트너십', contact: '문의하기', apply: '지원하기' },
      en: { about: 'About', programs: 'Programs', scholarships: 'Scholarships', news: 'Program news', stories: 'Program reviews', partners: 'Partnerships', contact: 'Contact', apply: 'Apply' },
    },
    hero: {
      ko: {
        kicker: '글로벌 청소년 평생 교육 이니셔티브',
        title_l1: '170개국의 청년 리더,',
        title_l2: '하나의 학습 경로로.',
        sub: 'Dream Path는 전 세계 청소년 리더를 한국의 고등교육으로 연결합니다. 온라인으로, 합리적인 비용으로, 신뢰받는 청년 교육 네트워크 위에서.',
        cta1: '프로그램 둘러보기',
        cta2: '어떻게 작동하나요',
      },
      en: {
        kicker: 'A GLOBAL YOUTH LIFELONG-EDUCATION INITIATIVE',
        title_l1: 'One learning path,',
        title_l2: '170 countries of young leaders.',
        sub: 'Dream Path connects young leaders worldwide to Korean higher education — online, affordable, and built on a trusted global youth-education network.',
        cta1: 'Explore programs',
        cta2: 'How it works',
      },
      // Hero accent stars (brand sparkle motif) — count drives how many
      // stars render; actual color cycles through 3 brand tones in CSS
      // (Star Gold / Vivid Purple / Deep Indigo). The `color` field
      // is informational only and ignored at render time so the page
      // stays in palette even if accidentally edited.
      dots: [
        { color: '#F4B72E', label: 'Star Gold (lead)' },
        { color: '#6B2DBE', label: 'Vivid Purple' },
        { color: '#1E1654', label: 'Deep Indigo' },
        { color: '#F4B72E', label: 'Star Gold (echo)' },
      ],
    },
    how: {
      ko: { kicker: 'HOW IT WORKS', title: '기존 네트워크를 학습자 파이프라인으로.' },
      en: { kicker: 'HOW IT WORKS', title: 'Turning an existing network into a learner pipeline.' },
      steps: [
        { n: '01', icon: 'user-check',
          t_ko: '청년 교육 파트너가 학습자를 추천합니다',   t_en: 'A youth-education partner nominates the learner',
          d_ko: '국가별 청년 교육 파트너 기관이 검증한 학습자만 지원할 수 있습니다.',
          d_en: 'Only learners vetted by their national youth-education partner can apply.' },
        { n: '02', icon: 'file-check',
          t_ko: '프로그램을 선택하고 지원서를 제출합니다', t_en: 'Choose a program and submit',
          d_ko: '마이크로디그리, 온라인 학위, 어학 트랙 중에서 선택할 수 있습니다.',
          d_en: 'Pick from micro-degrees, full online degrees, or language tracks.' },
        { n: '03', icon: 'graduation-cap',
          t_ko: '파트너 대학에서 학습이 시작됩니다',       t_en: 'Learning begins at the partner university',
          d_ko: '파트너 대학과 함께 운영합니다. 100% 온라인.',
          d_en: 'Delivered with our partner university. 100% online.' },
      ],
    },
    programs_section: {
      ko: { kicker: 'PROGRAMS', title: '5개의 마이크로디그리. 모두 온라인.', sub: 'AI, 스토리텔링, 유튜브, K-뷰티, 비즈니스 한국어까지 글로벌 학습자를 위한 5개 과정을 확인하세요.' },
      en: { kicker: 'PROGRAMS', title: 'Five micro-degrees. All online.',  sub: 'Explore five tracks for global learners in AI, storytelling, YouTube, K-beauty, and business Korean.' },
    },
    programs: [
      // tuition: 프로그램별 등록금(USD, 최소단위=달러). 결제 단계에서 이 값을
      // 자동으로 불러와 표기·청구한다(단일 출처). 0이면 결제가 차단되므로
      // 관리자가 admin → 프로그램 탭에서 실제 금액을 입력해야 한다. v01.092.
      { id: 'ai-language', kicker: 'MICRO-DEGREE',
        title_ko: 'AI와 언어교육', title_en: 'AI & Language',
        sub_ko: 'AI 기반 영어교육, 언어학, 커뮤니케이션, 빅데이터를 연결하는 1년형 마이크로디그리입니다.',
        sub_en: 'A one-year micro-degree connecting AI-powered language education, linguistics, communication, and big data.',
        meta: ['~1 year', '100% online', 'EN / KO support'], status: 'open', tuition: 500,
        color: '#1565C0', accent: '#42A5F5', icon: 'languages' },
      { id: 'media-content-storytelling', kicker: 'MICRO-DEGREE',
        title_ko: '미디어 콘텐츠 스토리텔링', title_en: 'Media Content Storytelling',
        sub_ko: '역사, 리더십, 커뮤니케이션, 스피치를 통해 글로벌 무대용 스토리텔링 역량을 키웁니다.',
        sub_en: 'Build storytelling power for global stages through history, leadership, communication, and speech.',
        meta: ['~1 year', '100% online', 'EN / KO support'], status: 'open', tuition: 500,
        color: '#7B1FA2', accent: '#CE93D8', icon: 'mic' },
      { id: 'youtube-master', kicker: 'MICRO-DEGREE',
        title_ko: '유튜브 마스터', title_en: 'YouTube Master',
        sub_ko: '채널 기획부터 촬영, 편집, 수익화까지 실제 유튜브 채널을 만드는 과정입니다.',
        sub_en: 'Go from channel strategy to shooting, editing, and monetization while building a live YouTube channel.',
        meta: ['~1 year', '100% online', 'EN / KO support'], status: 'open', tuition: 500,
        color: '#C62828', accent: '#EF5350', icon: 'video' },
      { id: 'k-beauty-styling', kicker: 'MICRO-DEGREE',
        title_ko: '기초 K-뷰티 스타일링', title_en: 'Basic K-Beauty Styling',
        sub_ko: '색채, 네일, 피부관리, 메이크업을 한 번에 배우는 K-뷰티 입문 트랙입니다.',
        sub_en: 'An entry-level K-beauty track covering color, nails, skincare, and makeup in one program.',
        meta: ['~1 year', '100% online', 'EN / KO support'], status: 'open', tuition: 500,
        color: '#AD1457', accent: '#F06292', icon: 'sparkles' },
      { id: 'business-korean', kicker: 'MICRO-DEGREE',
        title_ko: '비즈니스 한국어', title_en: 'Business Korean',
        sub_ko: '입문부터 발표·협상까지, 한국 기업 환경에 맞춘 실전 한국어를 집중적으로 익힙니다.',
        sub_en: 'Move from beginner foundations to presentations and negotiations in Korean business contexts.',
        meta: ['~1 year', '100% online', 'EN / KO support'], status: 'open', tuition: 500,
        color: '#00695C', accent: '#4DB6AC', icon: 'briefcase' },
    ],
    partners_section: {
      ko: { kicker: 'PARTNERS', title: '신뢰받는 네트워크 위에서.', sub: 'Dream Path는 파트너 교육기관, 글로벌 청년 교육 파트너 네트워크, 후원 기관과 함께 운영됩니다.' },
      en: { kicker: 'PARTNERS', title: 'Built on a trusted network.',   sub: 'Dream Path operates with partner universities, a global youth-education partner network, and supporting institutions.' },
    },
    partners: [
      // logo: optional URL or data URL — rendered in the home "partner
      // strip" and on /partners cards. When empty, falls back to the
      // stylized "name" text on a colored chip background.
      // url: optional partner website — when set, the logo links out to it in
      // a new tab (home strip + /partners card). Empty → internal /partners.
      { name: 'KDP',  full: '주식회사 코리아드림패스',                role_ko: '운영 파트너',          role_en: 'Operating partner',              color: '#6B2DBE', logo: '', url: '' },
    ],
    stories_section: {
      ko: { kicker: 'STORIES', title: '먼저 걸어간 사람들.' },
      en: { kicker: 'STORIES', title: 'People who walked the path first.' },
    },
    stories: [
      { tag: 'Kenya',       tag_color: '#FF5655', name: 'Amina K.', program: 'Korean Studies',
        quote_ko: '청년 멘토 덕분에 Dream Path를 알게 됐어요. 지금은 한국어로 일기를 씁니다.',
        quote_en: 'A youth mentor told me about Dream Path. Now I write my journal in Korean.' },
      { tag: 'Philippines', tag_color: '#0094B4', name: 'Jomar D.', program: 'Business in Korea',
        quote_ko: '온라인이지만 한국 학생들과 실제로 프로젝트를 했어요. 그게 제일 컸습니다.',
        quote_en: "It's online, but I worked on real projects with Korean students. That made the difference." },
      { tag: 'Peru',        tag_color: '#248737', name: 'Sofía M.', program: 'Digital Media',
        quote_ko: '처음엔 영어가 걱정이었는데, 자막이랑 멘토 덕분에 따라갈 수 있었어요.',
        quote_en: 'I was worried about my English, but captions and a mentor got me through.' },
    ],
    news: [
      { tag: 'INITIATIVE', tag_color: '#1F5FBD', date: '2026.05.27', title_ko: '국제 청년 교육 컨퍼런스에서 Dream Path 공식 발표', title_en: 'Dream Path presented at the International Youth Education Conference' },
      { tag: 'Korea',      tag_color: '#FF5655', date: '2026.04.10', title_ko: '첫 파트너십 MOU 체결',                       title_en: 'First partnership MOU signed' },
      { tag: 'Cohort',     tag_color: '#248737', date: '2026.03.15', title_ko: '첫 코호트 지원자 인터뷰: 12개국 40명',                title_en: 'First cohort interviews: 40 applicants, 12 countries' },
      { tag: 'Partners',   tag_color: '#0094B4', date: '2026.02.20', title_ko: '아시아-태평양 지역 청년 교육 파트너 라운드테이블',     title_en: 'Asia-Pacific youth-education partner roundtable' },
    ],
    cta_banner: {
      ko: { title: '배움은 여기서 시작됩니다,', sub: '온라인으로, 어디서나 함께합니다.', cta: '학습하러 가기' },
      en: { title: 'Your learning starts here.', sub: 'Online, from wherever you are.',  cta: 'Start learning' },
    },
    // FAQ schema (2026-05-19 v01.055 — categorized + line-broken):
    //   { category_ko, category_en, category_icon, q_ko, q_en, a_ko, a_en }
    // - category_icon is a Lucide icon name (e.g. 'book-open') — keep it
    //   in sync with the rest of the site's icon system so the FAQ tab
    //   visuals match step icons, nav icons, etc. Do not use emojis.
    // - Answers may contain literal "\n" for paragraph breaks; the public
    //   page uses CSS `white-space: pre-line` on `.faq-a` to preserve them.
    // The default below is a minimal 2-category sample so a brand-new
    // deployment has something to render; the live site's full 28-item
    // KV blob in dp_content_v1 (refreshed 2026-05-21 v01.060) is the
    // source of truth. Live categories: About the Program (7), Tuition
    // Payment & Refunds (5), Scholarships (3), Learning Experience (5),
    // Certification & Career (4), Partners & Operations (4).
    faq: [
      { category_ko: '프로그램 소개', category_en: 'About the Program', category_icon: 'book-open',
        q_ko: 'Dream Path는 어떤 프로그램인가요?',
        q_en: 'What is Dream Path?',
        a_ko: 'Dream Path는 100% 온라인으로 한국 대학 수준 강의를 들을 수 있는 글로벌 교육 프로그램입니다.\n\n(주)코리아드림패스가 파트너 교육기관과 함께 운영합니다.',
        a_en: 'Dream Path is a 100% online program offering Korean university-level courses worldwide.\n\nOperated by Korea Dream Path Co., Ltd. together with a partner institution.' },
      { category_ko: '비용 · 결제',  category_en: 'Pricing & Payment', category_icon: 'wallet',
        q_ko: '비용은 얼마인가요?',
        q_en: 'How much does it cost?',
        a_ko: '학점당 $60.\n12학점 마이크로디그리 = $720.\n입학비 $72 · 지원비 $22 별도.',
        a_en: '$60 per credit.\n12-credit Micro-Degree = $720.\nOne-time admission $72 + application $22.' },
    ],
    icons: {
      // Named icon slots — any Lucide icon name.
      // Admin can swap these freely.
      nav_apply:   'send',
      cta_arrow:   'arrow-right',
      card_arrow:  'arrow-up-right',
      program_list_1: 'book-open',
      program_list_2: 'briefcase',
      program_list_3: 'video',
      program_list_4: 'graduation-cap',
      step_1: 'user-check',
      step_2: 'file-check',
      step_3: 'graduation-cap',
      apply_success: 'circle-check-big',
      news_arrow: 'arrow-up-right',
      faq_toggle: 'plus',
    },
    // ─── Apply essay questions (admin-editable) ─────────────────────────
    // Each entry powers one essay slot in the public Apply form (Step 4).
    // Add / remove items to control how many essays the applicant must
    // answer. min_chars / max_chars cap the body length; the textarea
    // refuses input past max_chars and shows a live counter.
    // 현재 기본 1문항. 관리자 → 지원 에세이 문항 탭에서 추가/편집/삭제 가능.
    essay_questions: [
      { prompt_ko: '국경 너머의 학습 — 본인의 배경, 관심사, 그리고 DreamPath를 통해 이루고 싶은 것에 대해 작성하세요.',
        prompt_en: 'Learning across borders — write about your background, interests, and what you hope to achieve through DreamPath.',
        placeholder_ko: '본인의 이야기를 자유롭게 작성하세요.',
        placeholder_en: 'Tell us your story.',
        min_chars: 500, max_chars: 1500 },
    ],
    // ─── Error page copy (per code × language) ──────────────────────────
    // Each entry: { title, body, primary_label, secondary_label, helpful_note }.
    // Errors.jsx reads c.errors[code][lang] with fallback to the hardcoded
    // defaults inside the component, so removing keys is safe.
    errors: {
      '401': {
        ko: { title: '로그인이 필요합니다.', body: '이 페이지에 접근하려면 로그인이 필요합니다.', primary_label: '로그인', secondary_label: '홈으로', helpful_note: '도움이 필요하신가요? info@koreadreampath.com 으로 연락주세요.' },
        en: { title: 'Please log in\nto continue.', body: 'You need to be signed in to access this page.', primary_label: 'Log in', secondary_label: 'Go to home', helpful_note: 'Need help? Contact us at info@koreadreampath.com' },
      },
      '403': {
        ko: { title: '접근 권한이 없습니다.', body: '죄송합니다. 이 페이지에 접근할 권한이 없습니다.', primary_label: '홈으로', secondary_label: '뒤로 가기', helpful_note: '' },
        en: { title: "You don't have\npermission.", body: 'Sorry, you are not authorized to access this page.', primary_label: 'Go to home', secondary_label: 'Go back', helpful_note: '' },
      },
      '404': {
        ko: { title: '페이지를 찾을 수 없습니다.', body: '찾으시는 페이지가 존재하지 않거나 이동되었습니다.', primary_label: '홈으로', secondary_label: '프로그램 보기', helpful_note: '' },
        en: { title: 'Page not found.', body: "The page you're looking for doesn't exist or has been moved.", primary_label: 'Go to home', secondary_label: 'Browse programs', helpful_note: '' },
      },
      '500': {
        ko: { title: '문제가 발생했습니다.', body: '문제를 해결하는 중입니다. 잠시 후 다시 시도해주세요.', primary_label: '다시 시도', secondary_label: '홈으로', helpful_note: '' },
        en: { title: 'Something went\nwrong on our end.', body: "We're working to fix the issue. Please try again later.", primary_label: 'Try again', secondary_label: 'Go to home', helpful_note: '' },
      },
      '503': {
        ko: { title: '일시적으로 이용할 수 없습니다.', body: '점검 중이거나 트래픽이 많습니다. 잠시 후 다시 시도해주세요.', primary_label: '잠시 후 다시 시도', secondary_label: '홈으로', helpful_note: '' },
        en: { title: 'Temporarily\nunavailable.', body: "We're performing maintenance or experiencing high traffic. Please try again soon.", primary_label: 'Try again later', secondary_label: 'Go to home', helpful_note: '' },
      },
      'offline': {
        ko: { title: '네트워크 연결 안 됨', body: '인터넷 연결을 확인하고 다시 시도해주세요.', primary_label: '다시 시도', secondary_label: '홈으로', helpful_note: '' },
        en: { title: "You're offline.", body: 'Please check your internet connection and try again.', primary_label: 'Try again', secondary_label: 'Go to home', helpful_note: '' },
      },
    },

    // ─── Legal documents (GDPR / 개인정보보호법) ────────────────────────
    // Each doc has a `version` string. Bumping the version invalidates
    // prior consent — users must re-agree. Editable in Setup → Legal.
    legal: {
      tos: {
        version: '1.0',
        effective: '2026-05-04',
        ko: { title: '서비스 이용약관', summary: '본 약관은 KoreaDreamPath 회원이 서비스를 이용함에 있어 권리·의무 및 책임사항을 정합니다.', body:
`<h2>제1조 (목적)</h2><p>본 약관은 KoreaDreamPath(이하 "회사")가 제공하는 서비스의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
<h2>제2조 (정의)</h2><ul><li><strong>"서비스"</strong>란 회사가 koreadreampath.com 및 관련 채널을 통해 제공하는 모든 콘텐츠 및 기능을 말합니다.</li><li><strong>"회원"</strong>이란 본 약관에 동의하고 서비스에 가입한 자를 말합니다.</li></ul>
<h2>제3조 (약관의 효력 및 변경)</h2><p>본 약관은 사이트에 게시함으로써 효력이 발생합니다. 회사는 합리적인 사유가 발생할 경우 약관을 개정할 수 있으며, 변경된 약관은 시행일 7일 이전에 공지합니다.</p>
<h2>제4조 (회원가입)</h2><p>회원가입은 회원이 약관 및 개인정보 처리방침에 동의하고, 회사가 정한 가입 양식에 정보를 기재하여 신청합니다.</p>
<h2>제5조 (서비스 제공 및 변경)</h2><p>회사는 다음과 같은 서비스를 제공합니다: 프로그램 정보 제공, 지원서 접수, 회원 커리어 관리, 추천 프로그램 제안 등.</p>
<h2>제6조 (회원 의무)</h2><p>회원은 타인의 정보를 도용하지 않으며, 서비스의 안정적 운영을 방해하지 않습니다.</p>
<h2>제7조 (책임 제한)</h2><p>천재지변 또는 회사의 합리적 통제를 벗어난 사유로 인한 서비스 제공의 지연 또는 중단에 대해 회사는 책임을 지지 않습니다.</p>
<h2>제8조 (준거법 및 관할)</h2><p>본 약관과 관련된 분쟁은 대한민국 법령에 따르며, 회사 본사 소재지 관할 법원에서 해결합니다.</p>` },
        en: { title: 'Terms of Service', summary: 'These Terms govern your use of the KoreaDreamPath service.', body:
`<h2>1. Purpose</h2><p>These Terms set out the rights, obligations, and responsibilities of KoreaDreamPath ("we", "the Service") and members in relation to the use of the Service at koreadreampath.com.</p>
<h2>2. Definitions</h2><ul><li><strong>Service</strong> means all content and features provided through koreadreampath.com and related channels.</li><li><strong>Member</strong> means a person who agrees to these Terms and creates an account.</li></ul>
<h2>3. Effect &amp; Changes</h2><p>These Terms take effect upon posting. We may amend them with 7 days' notice published on the site.</p>
<h2>4. Registration</h2><p>To register, you must agree to these Terms and the Privacy Policy and provide the required information.</p>
<h2>5. Services Provided</h2><p>The Service includes program information, application intake, member career profiles, and program recommendations.</p>
<h2>6. Member Obligations</h2><p>You agree not to impersonate others or interfere with the operation of the Service.</p>
<h2>7. Limitation of Liability</h2><p>We are not liable for delays or interruptions caused by events outside our reasonable control.</p>
<h2>8. Governing Law &amp; Jurisdiction</h2><p>These Terms are governed by the laws of the Republic of Korea, with exclusive jurisdiction in the courts where our headquarters are located.</p>` },
      },
      privacy_signup: {
        version: '1.0',
        effective: '2026-05-04',
        ko: { title: '개인정보 수집 · 이용 동의 (회원가입용)', summary: '회원가입을 위해 최소한의 개인정보를 수집·이용합니다.', body:
`<h2>1. 수집 항목</h2><p>이메일, 비밀번호(해시), 이름. (선택) 커리어 프로필: 국가, 학교, 전공, 관심사, 언어 능력, 자기소개.</p>
<h2>2. 수집 목적</h2><ul><li>회원 식별 및 로그인</li><li>지원 / 추천 프로그램 매칭</li><li>주요 공지 발송</li></ul>
<h2>3. 보유 기간</h2><p>회원 탈퇴 시까지. 탈퇴 후에는 30일 이내 파기. 단, 관련 법령에 따라 보존이 필요한 정보는 해당 법령에서 정한 기간 동안 보관합니다.</p>
<h2>4. 거부 권리</h2><p>회원가입을 위해 필수 항목 수집·이용에 동의하지 않으실 경우 회원가입이 제한됩니다. 선택 항목은 동의하지 않으셔도 회원가입이 가능합니다.</p>
<h2>5. 보호 조치</h2><p>비밀번호는 PBKDF2-SHA256으로 단방향 해시 처리되며, 모든 통신은 HTTPS로 암호화됩니다. 데이터는 Cloudflare D1(EU/APAC 리전)에 저장됩니다.</p>` },
        en: { title: 'Personal Data Consent — Sign up', summary: 'To create an account we collect a minimum set of personal data.', body:
`<h2>1. What we collect</h2><p>Email, password (hashed), name. Optional career profile: country, school, major, interests, language proficiency, summary.</p>
<h2>2. Why</h2><ul><li>Authenticate you and operate your account</li><li>Match applications and program recommendations</li><li>Send essential service notices</li></ul>
<h2>3. Retention</h2><p>Until you delete your account, then deleted within 30 days. Records that we are required by law to keep are retained for the legally required period only.</p>
<h2>4. Right to refuse</h2><p>You may refuse, but if you do, we cannot create an account for you. Optional fields can be skipped.</p>
<h2>5. Safeguards</h2><p>Passwords are stored as one-way PBKDF2-SHA256 hashes. All traffic uses HTTPS. Data is stored on Cloudflare D1 (EU / APAC regions).</p>` },
      },
      privacy_apply: {
        version: '1.0',
        effective: '2026-05-04',
        ko: { title: '개인정보 수집 · 이용 동의 (지원용)', summary: '지원서 처리를 위해 다음 정보를 수집합니다. 동의해 주셔야 지원이 가능합니다.', body:
`<h2>1. 수집 항목 (필수)</h2><p>이름, 이메일, 생년월일, 입학 추천인 코드(선택), 국가, 최종 학교, 전공, GPA, 학력 메모, 에세이 2건, 추천인 정보(이름, 이메일, 국제 전화번호, 소속 청년 교육 파트너 기관명, 활동 경력, 추천서 PDF 파일명).</p>
<h2>2. 수집 항목 (선택)</h2><p>결제용 카드 마지막 4자리. (전체 카드번호는 저장하지 않습니다.)</p>
<h2>3. 수집 목적</h2><ul><li>지원서 검토 및 평가</li><li>합격 여부 통지</li><li>청년 교육 파트너 기관과의 추천인 검증 커뮤니케이션</li><li>결제 처리 및 영수증 발급</li></ul>
<h2>4. 보유 기간</h2><p>최종 합격/불합격 통지 후 1년 (재지원·이의제기 기간). 이후 익명 통계로 전환되며 식별 정보는 파기됩니다.</p>
<h2>5. 거부 권리</h2><p>본 동의를 거부하실 경우 지원이 불가능합니다.</p>
<h2>6. 처리 위탁 / 보안</h2><p>데이터는 Cloudflare 플랫폼에서 처리되며, EU GDPR Art. 28 기준의 데이터 처리 계약(DPA)을 따릅니다.</p>` },
        en: { title: 'Personal Data Consent — Application', summary: 'To process your application we collect the data below. Consent is required to apply.', body:
`<h2>1. What we collect (required)</h2><p>Name, email, date of birth, admission referrer code (optional), country, most-recent school, major, GPA, transcript note, two essays, recommender details (name, email, international phone, affiliated youth-education partner organization, activity background, PDF filename).</p>
<h2>2. What we collect (optional)</h2><p>Last 4 digits of the payment card. We never store the full card number.</p>
<h2>3. Purpose</h2><ul><li>Review and evaluate the application</li><li>Notify the outcome</li><li>Verify the recommender via the affiliated youth-education partner organization where applicable</li><li>Process payment and issue receipts</li></ul>
<h2>4. Retention</h2><p>One year after final notification (covers reapplication and appeal). After that, identifying details are deleted and only anonymous statistics are retained.</p>
<h2>5. Right to refuse</h2><p>If you refuse, we cannot accept the application.</p>
<h2>6. Processing &amp; security</h2><p>Data is processed on Cloudflare under a Data Processing Agreement aligned with EU GDPR Art. 28.</p>` },
      },
      third_party: {
        version: '1.0',
        effective: '2026-05-04',
        ko: { title: '제3자 개인정보 제공 동의', summary: '지원하신 프로그램의 운영기관(파트너 대학)에 본인의 정보를 제공하는 것에 대한 동의입니다.', body:
`<h2>1. 제공 받는 자</h2><p>지원자가 선택한 프로그램의 운영 파트너 교육기관. 향후 추가 파트너 기관이 추가될 수 있으며, 그 경우 별도 고지합니다.</p>
<h2>2. 제공 항목</h2><p>이름, 이메일, 국가, 생년월일, 학력 정보, 에세이, 추천인 정보, 신청 프로그램, 합격 여부.</p>
<h2>3. 제공 목적</h2><p>입학 심사, 코호트 등록, 학생 관리.</p>
<h2>4. 제공 받는 자의 보유 기간</h2><p>해당 기관의 학생 기록 관리 정책에 따름. 통상 졸업 후 5~10년.</p>
<h2>5. 거부 권리</h2><p>제3자 제공에 동의하지 않으실 경우 합격 후 학적 등록이 불가능합니다.</p>
<h2>6. 국외 이전 안내 (GDPR)</h2><p>일부 파트너 기관은 EU 외 지역(대한민국)에 소재합니다. 한국은 EU 적정성 결정(2021)에 따라 적정 보호 수준 국가로 인정받았습니다.</p>` },
        en: { title: 'Third-Party Data Sharing Consent', summary: 'Consent to share your application data with the partner institution that runs the program.', body:
`<h2>1. Recipient</h2><p>The partner institution that runs your selected program (e.g. Cyber Hankuk University of Foreign Studies). Additional partners may be added with separate notice.</p>
<h2>2. Data shared</h2><p>Name, email, country, date of birth, academic record, essays, recommender information, selected program, admission decision.</p>
<h2>3. Purpose</h2><p>Admission review, cohort enrollment, ongoing student records.</p>
<h2>4. Recipient retention</h2><p>According to the recipient's student-records policy, typically 5–10 years after graduation.</p>
<h2>5. Right to refuse</h2><p>If you refuse, you will not be able to enroll if admitted.</p>
<h2>6. Cross-border note (GDPR)</h2><p>Some partner institutions are outside the EU (in the Republic of Korea). Korea is recognised by the EU Adequacy Decision (2021) as providing an adequate level of protection.</p>` },
      },
      analytics_cookies: {
        version: '1.0',
        effective: '2026-05-04',
        ko: { title: '분석 쿠키 / 추적 동의', summary: '서비스 개선을 위해 사이트 사용 패턴을 익명으로 수집합니다.', body:
`<p>접속 경로, 페이지뷰, 클릭 등의 사용 패턴을 익명 세션 ID 기반으로 수집합니다. 식별 정보(이름·이메일)와 결합되지 않습니다. IP는 국가 추정 후 7일 후 마지막 옥텟이 마스킹됩니다.</p>` },
        en: { title: 'Analytics / tracking consent', summary: 'We collect anonymous usage patterns to improve the service.', body:
`<p>We collect entry source, pageviews, and click patterns under an anonymous session id. This data is never combined with identifying details (name/email). IP addresses are used only to estimate country; the last octet is masked after 7 days.</p>` },
      },
    },
    // ─── Member roles & permissions matrix ──────────────────────────────
    // Authored in admin → Members → Roles & permissions. Backend
    // enforcement is a follow-up; today this is policy-only.
    member_roles: {
      roles: [
        {
          id: 'member',
          label_ko: '회원',
          label_en: 'Member',
          pages: {
            home: { view: true },
            about: { view: true },
            programs: { view: true, apply: true },
            scholarships: { view: true, apply: true },
            apply: { view: true, apply: true },
            partners: { view: true },
            stories: { view: true, comment: true },
            news: { view: true },
            contact: { view: true },
            team: { view: true },
            member: { view: true, edit_own: true },
            receipt: { view: true },
          },
        },
        {
          id: 'admin',
          label_ko: '관리자',
          label_en: 'Admin',
          pages: {
            home: { view: true, edit_others: true },
            about: { view: true, edit_others: true },
            programs: { view: true, apply: true, edit_others: true },
            scholarships: { view: true, apply: true, edit_others: true },
            apply: { view: true, apply: true, edit_others: true },
            partners: { view: true, edit_others: true },
            stories: { view: true, comment: true, edit_others: true },
            news: { view: true, edit_others: true },
            contact: { view: true, edit_others: true },
            team: { view: true, edit_others: true },
            member: { view: true, edit_own: true, edit_others: true },
            receipt: { view: true, edit_others: true },
          },
        },
      ],
    },
    // ─── Inboxes (admin Mailbox tab) ─────────────────────────────────────
    // Addresses the operator wants to manage from the admin console. The
    // Cloudflare Email Routing rule for each address must be set up to
    // hand off to the dream-path worker (see admin → API · 통합 → 받은 메일).
    // Sending uses Resend (env.RESEND_API_KEY); the from-address dropdown
    // in the compose form is built from this list.
    inboxes: [
      { address: 'hello@koreadreampath.com',   label_ko: 'Hello',   label_en: 'Hello',   enabled: true },
      { address: 'partner@koreadreampath.com', label_ko: 'Partner', label_en: 'Partner', enabled: true },
      { address: 'info@koreadreampath.com',    label_ko: 'Info',    label_en: 'Info',    enabled: true },
    ],
    // ─── Public site-verification meta tags ─────────────────────────────
    // These are NOT secrets — they're domain ownership proofs that need to
    // be in the public HTML head for the verification crawler to read.
    // Operator pastes the value from each search-console UI; App.jsx
    // injects matching <meta> tags on every page.
    site_verifications: {
      google:        '',  // <meta name="google-site-verification" content="...">
      naver:         '',  // <meta name="naver-site-verification" content="...">
      bing:          '',  // <meta name="msvalidate.01" content="...">
      facebook:      '',  // <meta name="facebook-domain-verification" content="...">
      pinterest:     '',  // <meta name="p:domain_verify" content="...">
      yandex:        '',  // <meta name="yandex-verification" content="...">
    },
    // ─── Receipt template (auto-fill PDF) ────────────────────────────────
    // Operator-uploaded background image (e.g. their letterhead / receipt
    // form) + a list of named fields with absolute coordinates. The public
    // /receipt page renders the image + overlays the application's data
    // at the configured positions. The user prints (Cmd-P) to save as PDF.
    //
    // page_w / page_h are CSS px at the rendered scale; defaults match
    // A4 at ~150 dpi (1240×1754) so a typical letterhead PDF rasterised at
    // that resolution lines up. The template is only used when enabled=true;
    // otherwise the legacy HTML receipt renders.
    receipt_template: {
      enabled: false,
      background_url: '',
      page_w: 1240,
      page_h: 1754,
      // Each field: data key + position + style.
      // Available data keys (resolved by Receipt.jsx):
      //   id, date, name, email, country, program, track, partial_tier,
      //   amount, currency, payment_method, card_last4, issuer_name, issuer_email
      fields: [
        { key: 'id',           x: 800, y: 120, w: 380, font_size: 16, color: '#1A1A1A', align: 'right', weight: 700, prefix: '#' },
        { key: 'date',         x: 800, y: 150, w: 380, font_size: 14, color: '#1A1A1A', align: 'right' },
        { key: 'name',         x: 80,  y: 360, w: 600, font_size: 18, color: '#1A1A1A', align: 'left',  weight: 700 },
        { key: 'email',        x: 80,  y: 396, w: 600, font_size: 14, color: '#444' },
        { key: 'program',      x: 80,  y: 560, w: 600, font_size: 16, color: '#1A1A1A', weight: 600 },
        { key: 'track',        x: 80,  y: 590, w: 600, font_size: 13, color: '#666' },
        { key: 'amount',       x: 800, y: 580, w: 380, font_size: 22, color: '#1A1A1A', align: 'right', weight: 700, prefix: '$' },
      ],
    },
    // ─── Email templates (transactional) ─────────────────────────────────
    // Authored under admin → 사이트 설정 → Email templates. Each template has
    // a slug (verify_signup, reset_password, apply_received, ...), KO + EN
    // subject, and KO + EN body (text or simple HTML). The actual sending
    // pipeline (provider, from-address, signing) is wired separately when
    // an email service is added — for now templates are stored so the
    // operator can author copy in advance.
    email_templates: {
      from_name:  'KoreaDreamPath',
      from_email: 'info@koreadreampath.com',
      // Optional: when set, every inbound email (info@, partner@, …) is also
      // forwarded to this real inbox by the email() worker, in addition to
      // being stored in the admin 메일함. The address must be verified in
      // Cloudflare → Email → Routing → Destination addresses first, otherwise
      // forwarding fails (logged, never bounced).
      forward_to: '',
      // Per-template content. Keys are stable slugs so worker code can
      // resolve them by name without relying on array order.
      items: {
        verify_signup: {
          subject_ko: '[KoreaDreamPath] 이메일 인증을 완료해 주세요',
          subject_en: '[KoreaDreamPath] Please verify your email',
          body_ko:    '안녕하세요 {{name}}님,\n\n아래 링크를 눌러 이메일 인증을 완료해 주세요. 링크는 24시간 동안 유효합니다.\n\n{{verify_url}}\n\n감사합니다.\nKoreaDreamPath 팀',
          body_en:    'Hi {{name}},\n\nClick the link below to verify your email. The link is valid for 24 hours.\n\n{{verify_url}}\n\nThanks,\nThe KoreaDreamPath team',
        },
        // Sent by signup() — 6-digit numeric code + clickable link. Either
        // path completes activation. {{expires_hours}} = 72 by default.
        activate_account: {
          subject_ko: '[KoreaDreamPath] 회원가입 인증코드: {{code}}',
          subject_en: '[KoreaDreamPath] Your activation code: {{code}}',
          body_ko:    '안녕하세요 {{name}}님,\n\nKoreaDreamPath 회원가입을 환영합니다. 아래 인증코드를 입력하거나 링크를 눌러 계정을 활성화해 주세요.\n\n인증코드: {{code}}\n링크: {{activation_url}}\n\n인증코드와 링크는 {{expires_hours}}시간 동안 유효합니다. 이 시간이 지나면 계정이 자동으로 삭제되며, 다시 가입하셔야 합니다.\n\n본인이 가입을 시도하지 않으셨다면 이 메일을 무시하셔도 됩니다.',
          body_en:    'Hi {{name}},\n\nWelcome to KoreaDreamPath. Enter the code below or click the link to activate your account.\n\nCode: {{code}}\nLink: {{activation_url}}\n\nThe code and link are valid for {{expires_hours}} hours. After that, the unactivated account is deleted automatically and you will need to sign up again.\n\nIf you did not request this signup, you can safely ignore this email.',
        },
        activate_reminder: {
          subject_ko: '[KoreaDreamPath] 회원가입 인증이 아직 완료되지 않았습니다',
          subject_en: '[KoreaDreamPath] Your KoreaDreamPath signup is still pending',
          body_ko:    '안녕하세요 {{name}}님,\n\n회원가입 인증이 아직 완료되지 않았습니다. 아래 인증코드를 입력하거나 링크를 눌러 활성화를 마쳐 주세요.\n\n인증코드: {{code}}\n링크: {{activation_url}}\n\n남은 유효시간이 짧으므로 가능한 빨리 활성화해 주세요.',
          body_en:    'Hi {{name}},\n\nYour signup verification is still pending. Enter the code below or click the link to finish activation.\n\nCode: {{code}}\nLink: {{activation_url}}\n\nThe remaining window is short — please activate as soon as you can.',
        },
        reset_password: {
          subject_ko: '[KoreaDreamPath] 비밀번호 재설정 안내',
          subject_en: '[KoreaDreamPath] Reset your password',
          body_ko:    '안녕하세요 {{name}}님,\n\n비밀번호를 재설정하시려면 아래 링크를 눌러 주세요. 링크는 1시간 동안 유효합니다.\n\n{{reset_url}}\n\n본인이 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다.',
          body_en:    'Hi {{name}},\n\nClick the link below to reset your password. The link is valid for 1 hour.\n\n{{reset_url}}\n\nIf you did not request this, you can ignore this email.',
        },
        apply_received: {
          subject_ko: '[KoreaDreamPath] 1차 신청이 접수되었습니다 (고유번호 {{candidate_no}})',
          subject_en: '[KoreaDreamPath] Your application was received (ID {{candidate_no}})',
          body_ko:    '안녕하세요 {{name}}님,\n\n1차 신청이 정상적으로 접수되었습니다.\n\n학생 고유번호: {{candidate_no}}\n\n이 번호는 모든 절차에서 본인 확인에 사용되니 보관해 주세요. 서류 검토(1차 스크리닝) 후 영업일 기준 7일 이내에 결과를 안내드립니다. 진행 상황은 마이페이지에서 확인하실 수 있습니다.\n\n감사합니다.\nKoreaDreamPath 팀',
          body_en:    'Hi {{name}},\n\nYour application has been received.\n\nApplicant ID: {{candidate_no}}\n\nPlease keep this number — it identifies you throughout the process. After the first screening, we will share the result within 7 business days. You can track progress on your member page.\n\nThanks,\nThe KoreaDreamPath team',
        },
        // ── 파이프라인 단계 안내 메일 (v01.092) ──────────────────────────
        screen_passed: {
          subject_ko: '[KoreaDreamPath] 1차 통과 — 다음 단계 안내 ({{candidate_no}})',
          subject_en: '[KoreaDreamPath] You passed screening — next steps ({{candidate_no}})',
          body_ko:    '안녕하세요 {{name}}님,\n\n1차 서류 심사를 통과하셨습니다. 축하드립니다!\n\n다음 단계는 파트너 대학의 입학 절차입니다. 절차 안내는 담당자가 개별로 드립니다.\n\n⚠️ 중요 — 결제 주체를 꼭 구분하세요.\n· 전형료: 파트너 대학에서 결제합니다 (정상).\n· 등록금: 파트너 대학에서 결제하지 마세요. 합격 후 KoreaDreamPath 홈페이지에서만 결제합니다.\n\n입학 절차를 마치신 뒤 발급받은 접수번호를 마이페이지에 입력해 주세요.\n\nKoreaDreamPath 팀',
          body_en:    'Hi {{name}},\n\nYou passed the first document screening. Congratulations!\n\nThe next step is the partner university admission process. Your coordinator will send the details.\n\n⚠️ Important — know who collects each payment:\n· Application fee: paid to the partner university (normal).\n· Tuition: do NOT pay to the partner university. Pay only on the KoreaDreamPath site after admission.\n\nAfter completing those steps, enter your admission reference number on your member page.\n\nThe KoreaDreamPath team',
        },
        screen_rejected: {
          subject_ko: '[KoreaDreamPath] 1차 심사 결과 안내 ({{candidate_no}})',
          subject_en: '[KoreaDreamPath] Result of your first screening ({{candidate_no}})',
          body_ko:    '안녕하세요 {{name}}님,\n\n안타깝게도 이번 1차 심사에서는 선정되지 못했습니다.\n\n{{note}}\n\n관심을 가져 주셔서 진심으로 감사드리며, 다음 기회에 다시 만나뵙기를 바랍니다.\n\nKoreaDreamPath 팀',
          body_en:    'Hi {{name}},\n\nUnfortunately you were not selected in this first screening.\n\n{{note}}\n\nThank you sincerely for your interest — we hope to see you apply again.\n\nThe KoreaDreamPath team',
        },
        admission_verified: {
          subject_ko: '[KoreaDreamPath] 합격증 확인 완료 — 서류 제출 안내 ({{candidate_no}})',
          subject_en: '[KoreaDreamPath] Admission verified — please submit documents ({{candidate_no}})',
          body_ko:    '안녕하세요 {{name}}님,\n\n합격증이 확인되었습니다. 이제 학력 증빙 서류 3종을 마이페이지에서 제출해 주세요.\n\n1) 졸업(예정)증명서\n2) 아포스티유 · 학력인정확인서 · 영사확인 중 택1\n3) 한글번역공증본 (국문·영문 외 서류에 한함)\n\n서류 검토가 끝나면 등록금 결제 단계가 열립니다.\n\nKoreaDreamPath 팀',
          body_en:    'Hi {{name}},\n\nYour admission certificate has been verified. Please submit the three academic documents on your member page.\n\n1) Certificate of (expected) graduation\n2) Apostille / academic recognition / consular confirmation (choose one)\n3) Notarized Korean translation (only for non-KO/EN documents)\n\nOnce the documents are reviewed, the tuition payment step will open.\n\nThe KoreaDreamPath team',
        },
        docs_verified: {
          subject_ko: '[KoreaDreamPath] 서류 검토 완료 — 등록금 결제 안내 ({{candidate_no}})',
          subject_en: '[KoreaDreamPath] Documents verified — tuition payment ({{candidate_no}})',
          body_ko:    '안녕하세요 {{name}}님,\n\n제출하신 서류가 모두 확인되었습니다. 이제 마이페이지에서 등록금을 결제하실 수 있습니다.\n\n결제 금액: US ${{amount}}\n\n결제 전 환불 규정 등 동의 절차가 있으니 안내에 따라 진행해 주세요.\n\nKoreaDreamPath 팀',
          body_en:    'Hi {{name}},\n\nAll your documents have been verified. You can now pay the tuition on your member page.\n\nAmount due: US ${{amount}}\n\nThere are a few agreements (refund policy, etc.) before payment — please follow the prompts.\n\nThe KoreaDreamPath team',
        },
        payment_received: {
          subject_ko: '[KoreaDreamPath] 등록금 결제 완료 ({{candidate_no}})',
          subject_en: '[KoreaDreamPath] Tuition payment received ({{candidate_no}})',
          body_ko:    '안녕하세요 {{name}}님,\n\n등록금 결제가 정상적으로 완료되었습니다.\n\n학생 고유번호: {{candidate_no}}\n결제 금액: US ${{amount}}\n\n영수증은 마이페이지에서 확인·인쇄하실 수 있습니다. 최종 등록 확정 후 다시 안내드리겠습니다.\n\nKoreaDreamPath 팀',
          body_en:    'Hi {{name}},\n\nYour tuition payment was completed successfully.\n\nApplicant ID: {{candidate_no}}\nAmount paid: US ${{amount}}\n\nYou can view and print the receipt on your member page. We will confirm your final enrollment shortly.\n\nThe KoreaDreamPath team',
        },
        enrolled: {
          subject_ko: '[KoreaDreamPath] 등록이 확정되었습니다 🎉 ({{candidate_no}})',
          subject_en: '[KoreaDreamPath] Your enrollment is confirmed 🎉 ({{candidate_no}})',
          body_ko:    '안녕하세요 {{name}}님,\n\n모든 절차가 완료되어 등록이 최종 확정되었습니다. 환영합니다!\n\n학생 고유번호: {{candidate_no}}\n\n개강 및 수업 안내는 별도로 전달드리겠습니다.\n\nKoreaDreamPath 팀',
          body_en:    'Hi {{name}},\n\nAll steps are complete and your enrollment is now confirmed. Welcome aboard!\n\nApplicant ID: {{candidate_no}}\n\nWe will send course and start-date details separately.\n\nThe KoreaDreamPath team',
        },
        inquiry_received: {
          subject_ko: '[KoreaDreamPath] 문의가 접수되었습니다',
          subject_en: '[KoreaDreamPath] We received your inquiry',
          body_ko:    '안녕하세요 {{name}}님,\n\n문의가 정상적으로 접수되었습니다 (접수번호: {{inquiry_id}}). 운영팀이 확인 후 답변 드리겠습니다.',
          body_en:    'Hi {{name}},\n\nWe received your inquiry (reference: {{inquiry_id}}). Our team will get back to you shortly.',
        },
      },
    },
    // ─── Inquiry categories (Contact form 문의 유형) ────────────────────
    // Read by Pages.jsx → InquiryForm dropdown. Operator authors the list
    // under admin → 학생 지원 → 문의 유형. `value` is what gets stored on
    // the inquiries row; ko/en is the label visitors see.
    inquiry_categories: [
      { value: 'general',     label_ko: '일반 문의',     label_en: 'General inquiry' },
      { value: 'program',     label_ko: '프로그램 관련', label_en: 'About a program' },
      { value: 'partnership', label_ko: '파트너십',      label_en: 'Partnership' },
      { value: 'media',       label_ko: '취재 / 미디어', label_en: 'Media / press' },
      { value: 'bug',         label_ko: '오류 신고',     label_en: 'Report a bug' },
      // Not shown on the public Contact dropdown — applied automatically to
      // messages members send to a team member from /team (v01.072). Kept
      // here so the admin inbox renders a friendly category label.
      { value: 'team',        label_ko: '팀 메시지',     label_en: 'Team message' },
    ],
    // ─── Top notice banner (development / launch / maintenance) ─────────
    notice: {
      // 2026-08-23: 기본값을 false 로 내렸다. KV 에서 끈 것만으로는 부족했다 —
      // 원격 콘텐츠가 도착하기 전 첫 페인트는 이 기본값으로 그려지므로,
      // 방문자는 매번 "6월 중순 오픈" 이라는 **두 달 지난 배너를 잠깐 보고**
      // 있었다. 문구에서도 날짜를 뺀다: 코드에 박힌 날짜는 반드시 낡는다.
      enabled: false,
      style: 'dev',  // 'dev' | 'info' | 'warning' (changes the stripe color)
      ko: '🚧 홈페이지를 정비하고 있습니다',
      en: '🚧 This site is being updated',
    },
    // ─── Site-entry notice gate (blocking modal on every visit) ──────────
    // Full-screen disclaimer shown on every page load until the visitor
    // checks the acknowledgement box and clicks Enter. Temporary launch
    // gate — the operator flips enabled:false (admin → 콘텐츠) once the site
    // is officially public, with no redeploy needed.
    entry_gate: {
      // 2026-08-22: operator turned the notice off for the content-refresh
      // round. The KV blob carries no entry_gate key, so this default IS the
      // live value — flip it back here (or via admin → 설정 → 공지) to show
      // the gate again with fresh copy.
      enabled: false,
      title_ko: '홈페이지 정식 공개 안내',
      title_en: 'Preview Notice',
      body_ko: '본 홈페이지는 정보 최신화 작업 중입니다. 현재 제공되는 정보는 최종 확정 정보가 아니며 일부 변경될 수 있으니 참고 부탁드립니다.',
      body_en: 'This website is being updated. The information currently provided is not final and may be subject to change. Please keep this in mind.',
      check_ko: '위 안내 내용을 확인했습니다.',
      check_en: 'I have read and understood the notice above.',
      button_ko: '확인하고 입장하기',
      button_en: 'Acknowledge & enter',
    },
    // ─── Programs visibility gate (프로그램 공개 중단 스위치) ─────────────
    // hidden:true 면 공개 사이트에서 프로그램을 통째로 내린다 — 홈 티저,
    // /programs 목록, /program/:id 상세, 상단 메뉴, 푸터 열, 사이트맵,
    // 구조화 데이터까지. **데이터(programs[])는 그대로 둔다** — 다시 켜면
    // 그날의 목록이 그대로 돌아온다.
    // 2026-08-22: 협력 대학 협의 문제로 운영자가 내림.
    programs_gate: {
      hidden: true,
      title_ko: '현재 공개된 신규 프로그램이 없습니다',
      title_en: 'No new programs are published right now',
      body_ko: '기존 프로그램은 예정대로 진행되고 있습니다.\n새로운 프로그램이 준비되면 이 페이지에서 별도로 안내드리겠습니다.',
      body_en: 'Programs already under way are running as planned.\nNew programs will be announced separately on this page.',
    },
    // ─── Application intake gate (신청 접수 중단 스위치) ──────────────────
    // closed:true freezes every applicant-side submission — the public Apply
    // form, the API behind it, and the member-page pipeline steps (접수번호 /
    // 합격증 / 서류 / 결제). The worker enforces the same flag, so hiding the
    // form is not the whole story: a replayed POST is refused too.
    // Flip it in admin → 페이지·콘텐츠 → 지원. Operator turned it on
    // 2026-08-22 for the site-refresh round.
    apply_gate: {
      closed: true,
      title_ko: '현재 신규 모집 중인 프로그램이 없습니다',
      title_en: 'No new program intake is open right now',
      body_ko: '기존 프로그램은 예정대로 진행되고 있습니다.\n신규 프로그램 모집이 시작되면 이 페이지에서 별도로 안내드리겠습니다.',
      body_en: 'Programs already under way are running as planned.\nWe will announce a new intake separately on this page once one opens.',
    },
    // ─── Homepage banner ads (popup modal) ──────────────────────────────
    // Up to 3 image banners shown in a modal on the first homepage load of a
    // session. Image-only (uploaded to R2 → URL). Each item: image (URL),
    // link (optional click-through), alt (a11y/admin label), active (toggle).
    // Visitors get "Close" (session) and "Don't show again today" (per-day,
    // localStorage). `enabled:false` or no active items → modal never shows.
    banners: {
      enabled: true,
      items: [],   // [{ image:'', link:'', alt:'', active:true }] — max 3
    },
    // ─── OG / SEO meta (per-route social-card overrides) ────────────────
    // App.jsx reads these on every view change to update <title>,
    // <meta name="description">, og:title, og:description, og:image.
    // Empty fields fall back to og.default; if og.default fields are also
    // empty, the static <head> values from index.html stay in place.
    og: {
      default: {
        image: '',
        title_ko: '', title_en: '',
        desc_ko: '', desc_en: '',
      },
      pages: {
        home:         { image: '', title_ko: '', title_en: '', desc_ko: '', desc_en: '' },
        about:        { image: '', title_ko: '', title_en: '', desc_ko: '', desc_en: '' },
        programs:     { image: '', title_ko: '', title_en: '', desc_ko: '', desc_en: '' },
        scholarships: { image: '', title_ko: '', title_en: '', desc_ko: '', desc_en: '' },
        apply:        { image: '', title_ko: '', title_en: '', desc_ko: '', desc_en: '' },
        partners:     { image: '', title_ko: '', title_en: '', desc_ko: '', desc_en: '' },
        stories:      { image: '', title_ko: '', title_en: '', desc_ko: '', desc_en: '' },
        news:         { image: '', title_ko: '', title_en: '', desc_ko: '', desc_en: '' },
        contact:      { image: '', title_ko: '', title_en: '', desc_ko: '', desc_en: '' },
        team:         { image: '', title_ko: '', title_en: '', desc_ko: '', desc_en: '' },
      },
    },
    // ─── About page ────────────────────────────────────────────────────
    about: {
      // === Executive Summary structure (the layout the public /about page actually renders).
      // Each piece is editable from admin → Pages → About 페이지. Legacy mission/team
      // fields below are kept for backward compatibility with old KV blobs but
      // no longer rendered by About.jsx.
      exec: {
        hero: {
          kicker_ko: '프로젝트 소개 · Executive Summary',
          kicker_en: 'ABOUT · EXECUTIVE SUMMARY',
          title_ko: 'Dream Path는 한국어 교육 접근성을\n넓히기 위해 설계된 구조적 국제교육 이니셔티브입니다.',
          title_en: 'A structured international education initiative\ndesigned to expand access to Korean language education.',
          body_ko: 'Dream Path는 한국어 교육에 대한 접근성을 확대하고, 글로벌 차원의 참여를 강화하기 위해 설계된 구조적 국제교육 이니셔티브입니다.',
          body_en: 'Dream Path is a structured international education initiative designed to expand access to Korean language education and enhance global engagement.',
        },
        blocks: [
          {
            kicker_ko: '정책 정합성', kicker_en: 'POLICY ALIGNMENT',
            heading_ko: '국가 교육 정책과의 정합성', heading_en: 'Aligned with national education policy',
            items_ko: [
              '한국 교육의 국제화를 지원',
              '한국어 학습의 글로벌 확산',
              'K-컬처를 통한 소프트파워 기여',
              '평생학습 및 디지털 교육 정책과 정합',
            ],
            items_en: [
              'Supports internationalization of Korean education',
              'Expands Korean language learning globally',
              'Contributes to soft power through K-culture',
              'Aligns with lifelong learning and digital education policies',
            ],
          },
          {
            kicker_ko: '핵심 특징', kicker_en: 'KEY FEATURES',
            heading_ko: '운영 원칙', heading_en: 'Operating principles',
            items_ko: [
              '정부가 인정하는 학술 파트너',
              '구조화된 마이크로 디그리 시스템',
              '투명한 커뮤니케이션 (보장 표현 사용 금지)',
              '학습자 보호 프레임워크',
            ],
            items_en: [
              'Government-recognized academic partner',
              'Structured micro-degree system',
              'Transparent communication (no guarantee claims)',
              'Learner protection framework',
            ],
          },
          {
            kicker_ko: '기대 효과', kicker_en: 'EXPECTED IMPACT',
            heading_ko: '장기적 임팩트', heading_en: 'Long-term impact',
            items_ko: [
              '글로벌 한국어 학습자 확대',
              '한국 연계 교육 생태계 강화',
              '국제 학생 파이프라인 확장',
              '인력 이동성에 대한 장기적 기여',
            ],
            items_en: [
              'Increased global Korean language adoption',
              'Strengthened Korea-linked education ecosystem',
              'Expanded international student pipeline',
              'Long-term contribution to workforce mobility',
            ],
          },
          {
            kicker_ko: '컴플라이언스 접근', kicker_en: 'COMPLIANCE APPROACH',
            heading_ko: '경계의 명확화', heading_en: 'Clear boundaries',
            items_ko: [
              '비자/취업 보장과의 명확한 분리',
              '공식 채널과의 정합 (EPS, Study in Korea)',
              '투명한 학습자 커뮤니케이션',
            ],
            items_en: [
              'Clear separation from visa/employment guarantees',
              'Alignment with official channels (EPS, Study in Korea)',
              'Transparent learner communication',
            ],
          },
        ],
        closing: {
          kicker_ko: '전략적 가치', kicker_en: 'STRATEGIC VALUE',
          title_ko: 'Dream Path는 글로벌 학습자가\n한국과 만나는 준비된 생태계입니다.',
          title_en: 'Dream Path is a preparatory ecosystem\nfor global learners to engage with Korea.',
          body_ko: 'Dream Path는 글로벌 학습자가 구조화된 교육 경로를 통해 한국과 연결될 수 있도록 돕는 준비 생태계(preparatory ecosystem) 역할을 수행합니다.',
          body_en: 'Dream Path serves as a preparatory ecosystem that enables global learners to engage with Korea through structured educational pathways.',
        },
      },
      // === Legacy fields (no longer rendered, kept for KV migration safety) ===
      hero: {
        ko: { kicker: '프로젝트 소개', title_l1: '교육 접근성은, 이미', title_l2: '존재하는 네트워크 위에서.',
              sub: 'Dream Path는 전 세계 청소년 리더 네트워크를 학습자 파이프라인으로 전환하는 독립적인 평생 교육 이니셔티브입니다. 파트너 교육기관과 독립된 조직으로, 향후 복수 교육기관과 확장 가능한 파트너 모델을 지향합니다.' },
        en: { kicker: 'ABOUT THE PROJECT', title_l1: 'Access to education, built on', title_l2: 'a network that already exists.',
              sub: 'Dream Path is an independent lifelong-education initiative that turns the global youth-leader network into a learner pipeline. We operate independently from our partner institutions and aim to expand across multiple institutions.' },
      },
      mission: {
        ko: { kicker: '미션', title_l1: '170개국에 이미 연결된 청년 리더들.', title_l2: '같은 길에 학습을 올려놓습니다.',
              body: '전 세계 170여 개국의 청년 교육 파트너 네트워크는 교육 접근성에 관심 있는 청년과 지도자들이 이미 연결된 거대한 커뮤니티입니다. Dream Path는 이 기존 네트워크를 학습자 파이프라인으로 전환해, 온라인·마이크로디그리 형태로 한국 고등교육에 접근할 수 있도록 설계된 청소년 평생 교육 이니셔티브입니다.' },
        en: { kicker: 'MISSION', title_l1: 'Young leaders already connected across 170 countries.', title_l2: 'We lay learning on the same path.',
              body: 'Youth-education partner organizations across 170+ countries form a global network of young people and mentors already invested in education access. Dream Path turns this existing network into a learner pipeline for Korean higher education — delivered online, through micro-degrees and full online degrees.' },
      },
      team: {
        ko: { kicker: '팀', title_l1: '교육·재무·실무.', title_l2: '', sub: 'DreamPath TF는 세 영역으로 나뉘어 운영됩니다.' },
        en: { kicker: 'TEAM', title_l1: 'Education · Finance · Operations.', title_l2: '', sub: 'DreamPath TF is organized across three functional areas.' },
        cards: [
          { role_ko: '교육', role_en: 'EDUCATION',
            name_ko: '프로그램 설계', name_en: 'Program Design',
            desc_ko: '파트너 대학과 커리큘럼을 조율하고 학습 경로를 설계합니다.',
            desc_en: 'Coordinates curriculum with partner universities and designs learning paths.' },
          { role_ko: '재무', role_en: 'FINANCE',
            name_ko: '자원·장학', name_en: 'Resources · Scholarship',
            desc_ko: '장학 지원 구조와 파트너 기여 모델을 운영합니다.',
            desc_en: 'Manages the scholarship structure and partner contribution model.' },
          { role_ko: '실무 총괄', role_en: 'OPERATIONS',
            name_ko: '파트너십·모집', name_en: 'Partnerships · Recruitment',
            desc_ko: '모집 채널 설계, 파트너 커뮤니케이션, 운영 문서 체계를 구축합니다.',
            desc_en: 'Designs recruitment channels, partner communications, and operational documentation.' },
        ],
      },
    },
    // ─── Project team page (footer link) ─────────────────────────────────
    project_team: {
      hero: {
        ko: { kicker: '프로젝트 팀', title_l1: '함께 만드는', title_l2: 'KoreaDreamPath.', sub: '교육·재무·실무·디자인 4개 영역에서 사람들이 모여 운영합니다.' },
        en: { kicker: 'PROJECT TEAM', title_l1: 'The people behind', title_l2: 'KoreaDreamPath.', sub: 'A team of four functional areas: education, finance, operations, and design.' },
      },
      // Coordinator — the always-on "Message our coordinator" CTA target on
      // /team. Logged-out visitors are prompted to sign up; members' messages
      // land in the admin Inquiries inbox as a 'team' message (v01.072).
      coordinator: {
        name: '프로그램 코디네이터', name_en: 'Program Coordinator',
        role_ko: '지원·문의 총괄', role_en: 'Applicant support & inquiries',
        image: '/assets/placeholder-student.svg',
      },
      // Editable copy for the always-on message band at the top of /team
      // (admin → Project team → "상단 메시지 밴드"). v01.078.06.
      coord_cta: {
        kicker_ko: '궁금한 점이 있나요?', kicker_en: 'HAVE A QUESTION?',
        title_ko: 'CEO에게 물어보세요', title_en: 'Meet our CEO',
        sub_ko: '궁금한 이야기가 있다면 무엇이든 들려주세요. 우리 CEO가 직접 듣고, 가장 적절한 답을 드릴 수 있는 사람을 연결해 드립니다.',
        sub_en: 'Have something on your mind? Share it — our CEO will personally read it and connect you with the right person to give you the best answer.',
      },
      // Two functional groups by default — HQ and GLOBAL TEAM. Each section's
      // kicker renders as the group title on /team. Operators can add/remove
      // sections and members from admin → Project team. Member photos are 1:1
      // (square) JPG/PNG, auto-cropped on upload (v01.072).
      sections: [
        {
          kicker_ko: 'HQ', kicker_en: 'HQ',
          members: [
            { name: '운영 디렉터', name_en: 'Operations Director', role_ko: '총괄 · 파트너십', role_en: 'Operations · Partnerships',
              bio_ko: '국제 청년 교육 및 청소년 리더십 운영 경험을 바탕으로 프로젝트 전반을 조율합니다.',
              bio_en: 'Coordinates the project across partners, drawing on international youth-education and young-leader operations experience.',
              image: '/assets/placeholder-student.svg' },
            { name: '교육 설계자', name_en: 'Curriculum Designer', role_ko: '커리큘럼 · 학사 연계', role_en: 'Curriculum · Academic liaison',
              bio_ko: '파트너 대학과 마이크로디그리 커리큘럼을 함께 설계합니다.', bio_en: 'Designs micro-degree curricula with partner universities.',
              image: '/assets/placeholder-student.svg' },
            { name: '재무 매니저', name_en: 'Finance Manager', role_ko: '장학 · 후원 운영', role_en: 'Scholarship · Sponsorship',
              bio_ko: '장학 구조 설계와 파트너 기여 모델을 운영합니다.', bio_en: 'Manages scholarship structure and partner contributions.',
              image: '/assets/placeholder-student.svg' },
          ],
        },
        {
          kicker_ko: 'GLOBAL TEAM', kicker_en: 'GLOBAL TEAM',
          members: [
            { name: '커뮤니티 매니저', name_en: 'Community Manager', role_ko: '청년 교육 파트너 커뮤니케이션', role_en: 'Youth-partner communications',
              bio_ko: '국가별 청년 교육 파트너 기관과의 정기 커뮤니케이션을 담당합니다.', bio_en: 'Maintains regular communication with national youth-education partner organizations.',
              image: '/assets/placeholder-student.svg' },
            { name: '학습자 지원 매니저', name_en: 'Learner Success', role_ko: '코호트 · 멘토링', role_en: 'Cohorts · Mentoring',
              bio_ko: '학습자 진척과 멘토 매칭을 운영합니다.', bio_en: 'Runs learner progress tracking and mentor matching.',
              image: '/assets/placeholder-student.svg' },
          ],
        },
      ],
      cta: {
        ko: { kicker: '함께하실래요?', title: '프로젝트 팀에 합류하기', sub: '교육·운영·디자인·기술 영역에서 함께할 분을 찾고 있습니다.', button: '지원 / 문의', email: 'info@koreadreampath.com' },
        en: { kicker: 'Want to join us?', title: 'Join the project team', sub: "We're looking for collaborators in education, operations, design, and engineering.", button: 'Reach out', email: 'info@koreadreampath.com' },
      },
    },
    // ─── Scholarships page — admin-posted scholarship board ─────────────
    // v01.090: the board posts live in D1 (scholarship_posts via
    // /api/scholarships), created/edited on the public /scholarships page by
    // admins. This KV block only holds the optional intro note shown above the
    // board (the hero lives in page_heros.scholarships). EN-only (public front).
    scholarships: {
      intro: {
        en: 'Scholarship opportunities for international students, curated by KoreaDreamPath. Open each listing for the details and the official application link.',
      },
    },
    // ─── Page heros (Partners / Stories / News / Contact / Programs) ────
    page_heros: {
      partners: {
        ko: { kicker: 'PARTNERS', title_l1: '신뢰받는', title_l2: '네트워크 위에서.',
              sub: 'Dream Path는 파트너 교육기관, 글로벌 청년 교육 파트너 네트워크, 후원 기관과 함께 운영됩니다.' },
        en: { kicker: 'PARTNERS', title_l1: 'Built on a', title_l2: 'trusted network.',
              sub: 'Dream Path operates with partner universities, a global youth-education partner network, and supporting institutions.' },
      },
      stories: {
        ko: { kicker: 'STORIES', title_l1: '먼저 걸어간 사람들.', title_l2: '',
              sub: '첫 코호트의 학습자들이 전하는 이야기.' },
        en: { kicker: 'STORIES', title_l1: 'People who walked', title_l2: 'the path first.',
              sub: 'Voices from our first cohort of learners.' },
      },
      news: {
        ko: { kicker: 'NEWS', title_l1: '프로젝트 소식.', title_l2: '',
              sub: '파트너십, 운영 업데이트, 커뮤니티 이벤트.' },
        en: { kicker: 'NEWS', title_l1: 'Project news.', title_l2: '',
              sub: 'Partnerships, operating updates, and community events.' },
      },
      contact: {
        ko: { kicker: 'CONTACT · FAQ', title_l1: '궁금한 건 먼저 FAQ.', title_l2: '',
              sub: '답이 없으면 언제든 info@koreadreampath.com 로 연락주세요.' },
        en: { kicker: 'CONTACT · FAQ', title_l1: 'Start with the FAQ.', title_l2: '',
              sub: "If you don't see the answer, reach us at info@koreadreampath.com." },
      },
      programs: {
        ko: { kicker: 'PROGRAMS', title_l1: '5개의 마이크로디그리.', title_l2: '모두 온라인.',
              sub: '글로벌 학습자를 위한 5개 마이크로디그리 중에서 다음 스텝을 선택하세요.' },
        en: { kicker: 'PROGRAMS', title_l1: 'Five micro-degrees.', title_l2: 'All online.',
              sub: 'Choose your next step from five micro-degree tracks designed for global learners.' },
      },
      apply: {
        ko: { kicker: '지원하기', title_l1: '5단계. 온라인으로 완료.', title_l2: '',
              sub: '동의 · 개인정보 · 서류 · 에세이 · 결제. 약 20분 소요됩니다.' },
        en: { kicker: 'HOW TO APPLY', title_l1: 'Five steps. All online.', title_l2: '',
              sub: 'Consent · personal · documents · essay · payment. About 20 minutes.' },
      },
      apply_done: {
        ko: { kicker: '신청 완료', title_l1: '지원이 접수되었습니다.', title_l2: '', sub: '' },
        en: { kicker: 'APPLICATION COMPLETE', title_l1: 'Your application is in.', title_l2: '', sub: '' },
      },
      member: {
        ko: { kicker: '회원 전용', title_l1: '로그인이 필요합니다.', title_l2: '',
              sub: '회원 페이지를 이용하려면 로그인하거나 회원가입을 진행해주세요.' },
        en: { kicker: 'MEMBERS ONLY', title_l1: 'Please log in.', title_l2: '',
              sub: 'Log in or create an account to access member features.' },
      },
      mypage: {
        ko: { kicker: '내 페이지', title_l1: '안녕하세요,', title_l2: '',
              sub: '지원 · 커리어 등록 · 맞춤형 프로그램 추천을 한 곳에서 관리하세요.' },
        en: { kicker: 'MY PAGE', title_l1: 'Hello,', title_l2: '',
              sub: 'Apply, manage your career profile, and get personalized recommendations.' },
      },
      scholarships: {
        ko: { kicker: 'SCHOLARSHIPS', title_l1: 'Scholarships to explore.', title_l2: '', sub: 'External scholarship opportunities for international students — curated for your reference.' },
        en: { kicker: 'SCHOLARSHIPS', title_l1: 'Scholarships to explore.', title_l2: '', sub: 'External scholarship opportunities for international students — curated for your reference.' },
      },
    },
    // ─── Contact page extras ───────────────────────────────────────────
    partner_cta: {
      ko: { kicker: '파트너 기관', title: '파트너십을 제안하고 싶으신가요?',
            sub: '교육기관, NSO, 후원기관의 문의를 환영합니다.', cta: 'info@koreadreampath.com →' },
      en: { kicker: 'For partner institutions', title: 'Interested in partnering with us?',
            sub: 'We welcome inquiries from universities, NSOs, and supporting institutions.', cta: 'info@koreadreampath.com →' },
    },
    // ─── Program detail page (shared copy across all programs) ─────────
    program_detail: {
      ko: {
        back_link: '모든 프로그램',
        overview_h: '프로그램 개요',
        overview_body: '이 프로그램은 파트너 교육기관이 설계한 온라인 커리큘럼을 기반으로, 청년 교육 파트너 네트워크에서 추천받은 학습자에게 제공됩니다. 주간 라이브 세션, 과제 기반 학습, 그리고 멘토 매칭을 포함합니다.',
        learn_h: '배우는 내용',
        learn_items: ['주제별 핵심 프레임워크와 사례', '실무 중심의 주간 과제', '한국 학생·전문가와의 네트워킹', '수료 후 포트폴리오 산출물'],
        eligibility_h: '지원 자격',
        eligibility_body: '소속 국가의 청년 교육 파트너 기관에서 활동 중이거나 추천받은 청소년·청년. 18세 이상 권장. 기본 영어 또는 한국어 가능.',
        info_kicker: '프로그램 정보',
        label_length: '기간', label_format: '방식', label_language: '언어', label_status: '상태',
        apply_cta: '지금 지원하기',
      },
      en: {
        back_link: 'All programs',
        overview_h: 'Overview',
        overview_body: 'This program is built on an online curriculum designed by our partner institution and delivered to learners nominated by their national youth-education partner. It includes weekly live sessions, project-based learning, and mentor matching.',
        learn_h: 'What you will learn',
        learn_items: ['Core frameworks and case studies', 'Weekly practical assignments', 'Networking with Korean students & practitioners', 'A portfolio outcome after completion'],
        eligibility_h: 'Who should apply',
        eligibility_body: 'Youth active in, or nominated by, a national youth-education partner organization. 18+ recommended. Basic English or Korean.',
        info_kicker: 'Program info',
        label_length: 'Length', label_format: 'Format', label_language: 'Language', label_status: 'Status',
        apply_cta: 'Apply now',
      },
    },
    // ─── Footer ────────────────────────────────────────────────────────
    footer: {
      ko: { rights: '© 2025 KoreaDreamPath. 모든 권리 보유.' },
      en: { rights: '© 2025 KoreaDreamPath. All rights reserved.' },
      // Footer columns. Add/remove/reorder via admin Setup → Footer.
      // item.kind: 'view' (SPA route via go), 'url' (external href), 'email' (mailto:).
      // item.icon: any Lucide icon name; renders next to the label.
      // Default order: 소개 → 프로그램 → 문의 → 법률/약관 (matches the
       // operator-requested footer layout). Footer.jsx also sorts by id at
       // render time so older KV blobs end up in the same order.
      columns: [
        {
          id: 'about',
          title_ko: '소개', title_en: 'About',
          items: [
            { label_ko: '프로젝트',         label_en: 'The project',     icon: 'info',           kind: 'view', target: 'about' },
            { label_ko: '프로젝트 팀 소개', label_en: 'Project team',    icon: 'users',          kind: 'view', target: 'team' },
            { label_ko: '파트너십',         label_en: 'Partnerships',    icon: 'handshake',      kind: 'view', target: 'partners' },
            { label_ko: '프로그램 후기',    label_en: 'Program reviews', icon: 'message-circle', kind: 'view', target: 'stories' },
            { label_ko: '프로그램 소식',    label_en: 'Program news',    icon: 'newspaper',      kind: 'view', target: 'news' },
          ],
        },
        {
          id: 'programs',
          title_ko: '프로그램', title_en: 'Programs',
          items: [
            { label_ko: '전체 프로그램', label_en: 'All programs', icon: 'list',  kind: 'view', target: 'programs' },
            { label_ko: '지원 방법',   label_en: 'How to apply',  icon: 'send',  kind: 'view', target: 'apply' },
          ],
        },
        {
          id: 'contact',
          title_ko: '문의', title_en: 'Contact',
          items: [
            { label_ko: 'info@koreadreampath.com', label_en: 'info@koreadreampath.com', icon: 'mail',         kind: 'email', target: 'info@koreadreampath.com' },
            { label_ko: 'FAQ',                     label_en: 'FAQ',                     icon: 'circle-help',  kind: 'view',  target: 'contact' },
            { label_ko: '파트너십 문의',           label_en: 'For partners',            icon: 'handshake',    kind: 'email', target: 'info@koreadreampath.com' },
          ],
        },
        {
          id: 'legal',
          title_ko: '법률 / 약관', title_en: 'Legal',
          items: [
            // kind:'legal' opens c.legal[target] in a modal — no navigation.
            { label_ko: '서비스 이용약관',     label_en: 'Terms of Service',          icon: 'file-text',  kind: 'legal', target: 'tos' },
            { label_ko: '개인정보 처리방침',   label_en: 'Privacy (signup)',          icon: 'shield',     kind: 'legal', target: 'privacy_signup' },
            { label_ko: '지원시 개인정보 동의', label_en: 'Privacy (apply)',          icon: 'shield',     kind: 'legal', target: 'privacy_apply' },
            { label_ko: '제3자 제공 동의',     label_en: 'Third-party data sharing',  icon: 'share-2',    kind: 'legal', target: 'third_party' },
            { label_ko: '분석 / 추적 동의',    label_en: 'Analytics / tracking',      icon: 'chart-column', kind: 'legal', target: 'analytics_cookies' },
          ],
        },
      ],
    },
  };

  // Synchronous load — returns immediately with cached or default content.
  // The async fetch from /api/content runs in background and dispatches
  // 'dp-content-changed' when fresh data arrives.
  function load() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return dpClone(DEFAULT_CONTENT);
      const saved = JSON.parse(raw);
      return deepMerge(dpClone(DEFAULT_CONTENT), saved);
    } catch { return dpClone(DEFAULT_CONTENT); }
  }

  async function fetchRemote() {
    try {
      const res = await fetch(API_URL, { cache: 'no-store' });
      if (!res.ok) return null;
      const remote = await res.json();
      if (!remote || typeof remote !== 'object') return null;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
      window.dispatchEvent(new CustomEvent('dp-content-changed'));
      return remote;
    } catch { return null; }
  }

  // Throttled refetch — runs on tab visibility / focus / network-online,
  // and when another tab broadcasts a save via the CHANGE_BROADCAST_KEY
  // localStorage marker. Throttle prevents hammering /api/content if the
  // user is alt-tabbing rapidly.
  let lastFetchAt = 0;
  function maybeRefetch() {
    const now = Date.now();
    if (now - lastFetchAt < 4000) return;
    lastFetchAt = now;
    fetchRemote();
  }
  const CHANGE_BROADCAST_KEY = 'dp_content_changed_at';

  // Admin save — requires token in localStorage (set via login on admin page).
  async function save(obj) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error('admin token missing');
    const res = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + token,
      },
      body: JSON.stringify(obj),
    });
    if (!res.ok) {
      const msg = res.status === 401 ? 'unauthorized' : ('http_' + res.status);
      throw new Error(msg);
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    // Cross-tab signal — localStorage write fires `storage` event in
    // OTHER tabs, prompting them to refetch from /api/content. Value is
    // a timestamp so each save is a distinct event.
    try { localStorage.setItem(CHANGE_BROADCAST_KEY, String(Date.now())); } catch {}
    window.dispatchEvent(new CustomEvent('dp-content-changed'));
    return true;
  }

  async function reset() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error('admin token missing');
    const res = await fetch(API_URL, {
      method: 'DELETE',
      headers: { 'authorization': 'Bearer ' + token },
    });
    if (!res.ok) throw new Error('http_' + res.status);
    sessionStorage.removeItem(STORAGE_KEY);
    try { localStorage.setItem(CHANGE_BROADCAST_KEY, String(Date.now())); } catch {}
    window.dispatchEvent(new CustomEvent('dp-content-changed'));
    return true;
  }
  function deepMerge(base, over) {
    if (Array.isArray(over)) return over; // arrays replace, not merge
    if (over && typeof over === 'object') {
      const out = { ...base };
      for (const k of Object.keys(over)) out[k] = deepMerge(base ? base[k] : undefined, over[k]);
      return out;
    }
    return over !== undefined ? over : base;
  }

  // Cross-tab sync — when another tab calls save()/reset() it writes a
  // timestamp to CHANGE_BROADCAST_KEY in localStorage; that fires a
  // `storage` event in THIS tab (storage events do not fire in the tab
  // that did the write). We refetch from /api/content so this tab's
  // sessionStorage cache catches up. The legacy STORAGE_KEY branch is
  // kept for backward compat in case any path still writes there.
  window.addEventListener('storage', e => {
    if (!e) return;
    if (e.key === CHANGE_BROADCAST_KEY) { maybeRefetch(); return; }
    if (e.key === STORAGE_KEY) window.dispatchEvent(new CustomEvent('dp-content-changed'));
  });

  // ── Preview mode ────────────────────────────────────────────────────────
  // The admin renders an iframe with `?preview=1` and pushes the editor's
  // unsaved draft over postMessage. In preview mode we:
  //   1. skip the background fetchRemote — otherwise it would race the parent's
  //      pushes and overwrite the live draft;
  //   2. accept `dp-preview-content` messages and apply them as the new content;
  //   3. broadcast `dp-preview-ready` once, so the parent knows when to send
  //      its initial state (the iframe could still be loading when the user
  //      first edits).
  const PREVIEW_MODE = (() => {
    try { return new URLSearchParams(location.search).get('preview') === '1'; }
    catch { return false; }
  })();

  if (PREVIEW_MODE) {
    window.addEventListener('message', (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type !== 'dp-preview-content' || !e.data.content) return;
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(e.data.content)); } catch {}
      window.dispatchEvent(new CustomEvent('dp-content-changed'));
    });
    // Tell the parent we're ready to receive content — covers the case where
    // the parent already had a draft before the iframe finished loading.
    function ping() {
      try { window.parent && window.parent.postMessage({ type: 'dp-preview-ready' }, '*'); } catch {}
    }
    ping();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ping, { once: true });
      window.addEventListener('load', ping, { once: true });
    } else if (document.readyState !== 'complete') {
      window.addEventListener('load', ping, { once: true });
    }
  }

  // dpList (v01.097) — safe accessor for the top-level content arrays that
  // screens iterate over (programs / partners / stories / faq).
  //
  // Screens used to write `(c && c.programs) || window.PROGRAMS`. window.PROGRAMS
  // is defined in no file anywhere, so that fallback silently produced
  // `undefined` and the next `.map()` / `.find()` threw — blanking the page.
  // It mattered because deepMerge() passes `null` straight through
  // (`over !== undefined ? over : base`), so a null array in the KV blob
  // reached the screen intact.
  //
  // Falls back to the shipped DEFAULT_CONTENT, then to an empty array so a
  // screen renders empty rather than crashing.
  function dpList(value, key) {
    if (Array.isArray(value)) return value;
    const def = DEFAULT_CONTENT[key];
    return Array.isArray(def) ? def : [];
  }
  window.dpList = dpList;

  window.DreamPathContent = {
    DEFAULT: DEFAULT_CONTENT,
    dpList,
    load, save, reset, fetchRemote,
    STORAGE_KEY, TOKEN_KEY,
    API_URL,
    PREVIEW_MODE,
  };

  // Kick off remote fetch on page load so site shows latest server content.
  // Skip in preview mode — we want the parent's draft, not the saved server copy.
  if (!PREVIEW_MODE) {
    fetchRemote();
    // Re-fetch when the user returns to this tab (covers the case where
    // they edited content in admin in another tab while this one was in
    // the background). Also on focus + online — matches VersionWatcher's
    // pattern so content + version refresh share the same triggers.
    window.addEventListener('focus', maybeRefetch);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') maybeRefetch();
    });
    window.addEventListener('online', maybeRefetch);
  }
})();
