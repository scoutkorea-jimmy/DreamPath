// content-store.js — admin-editable content store backed by localStorage.
// All editable strings, images, and icon names live here.
// The admin page edits these values; the site reads them.

(function() {
  const STORAGE_KEY = 'dp_content_v1';

  // Default content — schema for the entire public site
  const DEFAULT_CONTENT = {
    brand: {
      name_kr: 'DreamPath',
      name_en: 'DreamPath',
      logo_mark: '../../assets/logo-dreampath-mark.svg',
      footer_tagline_ko: '월드스카우트 네트워크를 활용해 글로벌 청년을 한국의 고등교육으로 연결하는 독립 이니셔티브.',
      footer_tagline_en: 'An independent initiative connecting global scouting youth to Korean higher education through the World Scout Network.',
      email: 'hello@dreampath.org',
      partners_email: 'partners@dreampath.org',
    },
    nav: {
      ko: { programs: 'Programs', about: 'About', partners: 'Partners', stories: 'Stories', news: 'News', apply: '지원하기' },
      en: { programs: 'Programs', about: 'About', partners: 'Partners', stories: 'Stories', news: 'News', apply: 'Apply' },
    },
    hero: {
      ko: {
        kicker: '글로벌 청년 교육 이니셔티브',
        title_l1: '170개국의 스카우트,',
        title_l2: '하나의 학습 경로로.',
        sub: 'DreamPath는 전 세계 스카우트 청년을 한국의 고등교육으로 연결합니다. 온라인으로, 합리적인 비용으로, 이미 신뢰받는 네트워크 위에서.',
        cta1: '프로그램 둘러보기',
        cta2: '어떻게 작동하나요',
      },
      en: {
        kicker: 'A GLOBAL YOUTH EDUCATION INITIATIVE',
        title_l1: 'One learning path,',
        title_l2: '170 countries of scouts.',
        sub: 'DreamPath connects global scouting youth to Korean higher education — online, affordable, and built on the trust of a network that already exists.',
        cta1: 'Explore programs',
        cta2: 'How it works',
      },
      // Hero accent dots
      dots: [
        { color: '#FF8DFF', label: 'Pink' },
        { color: '#82E6DE', label: 'Teal' },
        { color: '#9FED8F', label: 'Green' },
        { color: '#FFAE80', label: 'Orange' },
      ],
    },
    stats: [
      { n: '170+', ko: '국가의 스카우트 네트워크', en: 'Countries in the scout network' },
      { n: '57M',  ko: '전 세계 스카우트 멤버',     en: 'Scout members worldwide' },
      { n: '1',    ko: '첫 파트너 기관 · CUFS',      en: 'First partner · CUFS' },
      { n: '4',    ko: '운영 중인 프로그램',        en: 'Programs live' },
    ],
    how: {
      ko: { kicker: 'HOW IT WORKS', title: '기존 네트워크를 학습자 파이프라인으로.' },
      en: { kicker: 'HOW IT WORKS', title: 'Turning an existing network into a learner pipeline.' },
      steps: [
        { n: '01', icon: 'user-check',
          t_ko: '스카우트 지도자가 학습자를 추천합니다',   t_en: 'A scout leader nominates the learner',
          d_ko: '국가별 스카우트 조직이 검증한 학습자만 지원할 수 있습니다.',
          d_en: 'Only learners vetted by their national scout organization can apply.' },
        { n: '02', icon: 'file-check',
          t_ko: '프로그램을 선택하고 지원서를 제출합니다', t_en: 'Choose a program and submit',
          d_ko: '마이크로디그리, 온라인 학위, 어학 트랙 중에서 선택할 수 있습니다.',
          d_en: 'Pick from micro-degrees, full online degrees, or language tracks.' },
        { n: '03', icon: 'graduation-cap',
          t_ko: '파트너 대학에서 학습이 시작됩니다',       t_en: 'Learning begins at the partner university',
          d_ko: '첫 파트너는 사이버한국외국어대학교(CUFS). 100% 온라인.',
          d_en: 'First partner is Cyber Hankuk University of Foreign Studies. 100% online.' },
      ],
    },
    programs_section: {
      ko: { kicker: 'PROGRAMS', title: '4개의 학습 경로. 모두 온라인.', sub: '마이크로디그리부터 정규 학위까지, 여러분의 다음 스텝에 맞는 프로그램을 선택하세요.' },
      en: { kicker: 'PROGRAMS', title: 'Four learning paths. All online.',  sub: 'From micro-degrees to full online degrees, pick the next step that fits you.' },
    },
    programs: [
      { id: 'korean-studies',  kicker: 'MICRO-DEGREE · CUFS',
        title_ko: '한국학 입문', title_en: 'Korean Studies, online',
        sub_ko: '12주 동안 한국어, 문화, 학술 글쓰기를 온라인으로 배웁니다.',
        sub_en: 'A 12-week introduction to Korean language, culture, and academic writing — fully remote.',
        meta: ['12 weeks', '100% remote', 'EN / KO'], level: 'Beginner', status: 'open',
        color: '#4D006E', accent: '#FF8DFF', icon: 'book-open' },
      { id: 'business-korea',  kicker: 'MICRO-DEGREE · CUFS',
        title_ko: '한국 비즈니스 실무', title_en: 'Doing Business in Korea',
        sub_ko: '한국 기업 환경과 실무 커뮤니케이션을 이해합니다.',
        sub_en: 'Understand the Korean corporate environment and practical communication.',
        meta: ['10 weeks', '100% remote', 'EN'], level: 'Intermediate', status: 'open',
        color: '#622599', accent: '#82E6DE', icon: 'briefcase' },
      { id: 'digital-media',   kicker: 'MICRO-DEGREE · CUFS',
        title_ko: '디지털 미디어 제작', title_en: 'Digital Media Production',
        sub_ko: '스토리텔링부터 편집까지, 디지털 미디어 기초를 배웁니다.',
        sub_en: 'From storytelling to editing — digital media fundamentals.',
        meta: ['12 weeks', '100% remote', 'EN'], level: 'Beginner', status: 'open',
        color: '#0094B4', accent: '#9FED8F', icon: 'video' },
      { id: 'online-degree',   kicker: 'BACHELOR · CUFS',
        title_ko: '온라인 학사 과정', title_en: 'Full Online Bachelor Degree',
        sub_ko: '4년제 정규 학위를 100% 온라인으로 이수합니다.',
        sub_en: 'Complete a 4-year accredited bachelor degree fully online.',
        meta: ['4 years', '100% remote', 'EN / KO'], level: 'All', status: 'opens Fall',
        color: '#248737', accent: '#FFAE80', icon: 'graduation-cap' },
    ],
    partners_section: {
      ko: { kicker: 'PARTNERS', title: '신뢰받는 네트워크 위에서.', sub: 'DreamPath는 파트너 교육기관, 글로벌 스카우트 조직, 후원 기관과 함께 운영됩니다.' },
      en: { kicker: 'PARTNERS', title: 'Built on a trusted network.',   sub: 'DreamPath operates with partner universities, global scout organizations, and supporting institutions.' },
    },
    partners: [
      { name: 'CUFS',  full: '사이버한국외국어대학교',                  role_ko: '첫 파트너 · 교육기관', role_en: 'First partner · University', color: '#4D006E' },
      { name: 'WOSM',  full: 'World Organization of the Scout Movement', role_ko: '글로벌 네트워크',       role_en: 'Global network',             color: '#622599' },
      { name: 'APR',   full: 'Asia-Pacific Region Scout',                role_ko: '지역 네트워크',         role_en: 'Regional network',           color: '#0094B4' },
      { name: 'NSOs',  full: 'National Scout Organizations',             role_ko: '국가별 추천 기관',      role_en: 'National endorsement',       color: '#248737' },
    ],
    stories_section: {
      ko: { kicker: 'STORIES', title: '먼저 걸어간 사람들.' },
      en: { kicker: 'STORIES', title: 'People who walked the path first.' },
    },
    stories: [
      { tag: 'Kenya',       tag_color: '#FF5655', name: 'Amina K.', program: 'Korean Studies',
        quote_ko: '스카우트에서 만난 멘토 덕분에 DreamPath를 알게 됐어요. 지금은 한국어로 일기를 씁니다.',
        quote_en: 'A mentor I met in scouts told me about DreamPath. Now I write my journal in Korean.' },
      { tag: 'Philippines', tag_color: '#0094B4', name: 'Jomar D.', program: 'Business in Korea',
        quote_ko: '온라인이지만 한국 학생들과 실제로 프로젝트를 했어요. 그게 제일 컸습니다.',
        quote_en: "It's online, but I worked on real projects with Korean students. That made the difference." },
      { tag: 'Peru',        tag_color: '#248737', name: 'Sofía M.', program: 'Digital Media',
        quote_ko: '처음엔 영어가 걱정이었는데, 자막이랑 멘토 덕분에 따라갈 수 있었어요.',
        quote_en: 'I was worried about my English, but captions and a mentor got me through.' },
    ],
    news: [
      { tag: 'WOSM',  tag_color: '#622599', date: '2025.03.18', title_ko: 'APR 스카우트 컨퍼런스에서 DreamPath 정식 소개', title_en: 'DreamPath presented at APR Scout Conference' },
      { tag: 'Korea', tag_color: '#FF5655', date: '2025.02.24', title_ko: 'CUFS와 첫 파트너십 MOU 체결',                   title_en: 'First partnership MOU signed with CUFS' },
      { tag: '사람들', tag_color: '#248737', date: '2025.01.30', title_ko: '첫 코호트 지원자 인터뷰: 12개국 40명',           title_en: 'First cohort interviews: 40 applicants, 12 countries' },
      { tag: 'APR',   tag_color: '#0094B4', date: '2024.12.12', title_ko: '아시아-태평양 지역 NSO 대표단 미팅',             title_en: 'Asia-Pacific NSO leadership meeting' },
    ],
    cta_banner: {
      ko: { title: '당신의 다음 학기를 여기에서.', sub: '2025년 가을 학기 지원이 열려있습니다.', cta: '지금 지원하기' },
      en: { title: 'Your next semester starts here.', sub: 'Fall 2025 applications are now open.',  cta: 'Apply now' },
    },
    faq: [
      { q_ko: '누가 지원할 수 있나요?',       q_en: 'Who can apply?',
        a_ko: '각 국가 스카우트 조직(NSO)에서 활동 중이거나 추천받은 청년이면 지원할 수 있습니다. 나이 기준은 프로그램마다 다릅니다.',
        a_en: 'Any youth active in, or nominated by, their National Scout Organization can apply. Age requirements vary by program.' },
      { q_ko: '영어를 못해도 괜찮나요?',       q_en: 'Do I need English?',
        a_ko: '일부 프로그램은 한국어 기본 과정을 포함합니다. 영어/한국어 기초 수준만 있어도 시작할 수 있습니다.',
        a_en: 'Some programs include a Korean basics track. Basic English or Korean is enough to start.' },
      { q_ko: '비용은 얼마인가요?',           q_en: 'How much does it cost?',
        a_ko: '마이크로디그리는 파트너 기관의 장학 지원이 있으며, 학생 부담은 최소화됩니다.',
        a_en: 'Micro-degrees include scholarship support from partner institutions; learner cost is minimized.' },
      { q_ko: '한국에 가야 하나요?',          q_en: 'Do I have to come to Korea?',
        a_ko: '모든 프로그램은 100% 온라인입니다. 선택적으로 단기 방문 프로그램이 있을 수 있습니다.',
        a_en: 'All programs are 100% online. Optional short-term visit programs may be offered.' },
      { q_ko: 'DreamPath와 CUFS의 관계는?',  q_en: 'What is the relationship between DreamPath and CUFS?',
        a_ko: 'DreamPath TF는 CUFS와 독립된 조직입니다. CUFS는 첫 파트너 교육기관입니다.',
        a_en: 'DreamPath TF is independent from CUFS. CUFS is our first partner institution.' },
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
      apply_success: 'check-circle-2',
      news_arrow: 'arrow-up-right',
      faq_toggle: 'plus',
    },
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_CONTENT);
      const saved = JSON.parse(raw);
      // shallow-merge so new schema keys appear after code updates
      return deepMerge(structuredClone(DEFAULT_CONTENT), saved);
    } catch { return structuredClone(DEFAULT_CONTENT); }
  }
  function save(obj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    window.dispatchEvent(new CustomEvent('dp-content-changed'));
  }
  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('dp-content-changed'));
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

  // Cross-tab sync (admin → site)
  window.addEventListener('storage', e => {
    if (e.key === STORAGE_KEY) window.dispatchEvent(new CustomEvent('dp-content-changed'));
  });

  window.DreamPathContent = {
    DEFAULT: DEFAULT_CONTENT,
    load, save, reset,
    STORAGE_KEY,
  };
})();
