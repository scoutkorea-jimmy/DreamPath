// Bilingual copy. Add a new language by adding another top-level key.
window.COPY = {
  ko: {
    nav: { programs: 'Programs', about: 'About', partners: 'Partners', stories: 'Stories', news: 'News', apply: '지원하기' },
    hero: {
      kicker: '글로벌 청년 교육 이니셔티브',
      title_l1: '170개국의 스카우트,',
      title_l2: '하나의 학습 경로로.',
      sub: 'DreamPath는 전 세계 스카우트 청년을 한국의 고등교육으로 연결합니다. 온라인으로, 합리적인 비용으로, 이미 신뢰받는 네트워크 위에서.',
      cta1: '프로그램 둘러보기',
      cta2: '어떻게 작동하나요',
    },
    stats: [
      { n: '170+', l: '국가의 스카우트 네트워크' },
      { n: '57M', l: '전 세계 스카우트 멤버' },
      { n: '1', l: '첫 파트너 기관 · CUFS' },
      { n: '4', l: '운영 중인 프로그램' },
    ],
    how: {
      kicker: 'HOW IT WORKS',
      title: '기존 네트워크를 학습자 파이프라인으로.',
      steps: [
        { n: '01', t: '스카우트 지도자가 학습자를 추천합니다', d: '국가별 스카우트 조직이 검증한 학습자만 지원할 수 있습니다.' },
        { n: '02', t: '프로그램을 선택하고 지원서를 제출합니다', d: '마이크로디그리, 온라인 학위, 어학 트랙 중에서 선택할 수 있습니다.' },
        { n: '03', t: '파트너 대학에서 학습이 시작됩니다', d: '첫 파트너는 사이버한국외국어대학교(CUFS). 100% 온라인.' },
      ],
    },
    programs: {
      kicker: 'PROGRAMS',
      title: '4개의 학습 경로. 모두 온라인.',
      sub: '마이크로디그리부터 정규 학위까지, 여러분의 다음 스텝에 맞는 프로그램을 선택하세요.',
    },
    partners: {
      kicker: 'PARTNERS',
      title: '신뢰받는 네트워크 위에서.',
      sub: 'DreamPath는 파트너 교육기관, 글로벌 스카우트 조직, 후원 기관과 함께 운영됩니다.',
    },
    stories: {
      kicker: 'STORIES',
      title: '먼저 걸어간 사람들.',
    },
    cta_banner: {
      title: '당신의 다음 학기를 여기에서.',
      sub: '2025년 가을 학기 지원이 열려있습니다.',
      cta: '지금 지원하기',
    },
  },
  en: {
    nav: { programs: 'Programs', about: 'About', partners: 'Partners', stories: 'Stories', news: 'News', apply: 'Apply' },
    hero: {
      kicker: 'A GLOBAL YOUTH EDUCATION INITIATIVE',
      title_l1: 'One learning path,',
      title_l2: '170 countries of scouts.',
      sub: 'DreamPath connects global scouting youth to Korean higher education — online, affordable, and built on the trust of a network that already exists.',
      cta1: 'Explore programs',
      cta2: 'How it works',
    },
    stats: [
      { n: '170+', l: 'Countries in the scout network' },
      { n: '57M', l: 'Scout members worldwide' },
      { n: '1', l: 'First partner · CUFS' },
      { n: '4', l: 'Programs live' },
    ],
    how: {
      kicker: 'HOW IT WORKS',
      title: 'Turning an existing network into a learner pipeline.',
      steps: [
        { n: '01', t: 'A scout leader nominates the learner', d: 'Only learners vetted by their national scout organization can apply.' },
        { n: '02', t: 'Choose a program and submit', d: 'Pick from micro-degrees, full online degrees, or language tracks.' },
        { n: '03', t: 'Learning begins at the partner university', d: 'First partner is Cyber Hankuk University of Foreign Studies. 100% online.' },
      ],
    },
    programs: {
      kicker: 'PROGRAMS',
      title: 'Four learning paths. All online.',
      sub: 'From micro-degrees to full online degrees, pick the next step that fits you.',
    },
    partners: {
      kicker: 'PARTNERS',
      title: 'Built on a trusted network.',
      sub: 'DreamPath operates with partner universities, global scout organizations, and supporting institutions.',
    },
    stories: {
      kicker: 'STORIES',
      title: 'People who walked the path first.',
    },
    cta_banner: {
      title: 'Your next semester starts here.',
      sub: 'Fall 2025 applications are now open.',
      cta: 'Apply now',
    },
  },
};

window.PROGRAMS = [
  {
    id: 'korean-studies',
    kicker: 'MICRO-DEGREE · CUFS',
    title_ko: '한국학 입문',
    title_en: 'Korean Studies, online',
    sub_ko: '12주 동안 한국어, 문화, 학술 글쓰기를 온라인으로 배웁니다.',
    sub_en: 'A 12-week introduction to Korean language, culture, and academic writing — fully remote.',
    meta: ['12 weeks', '100% remote', 'EN / KO'],
    level: 'Beginner',
    status: 'open',
    color: '#1E1654',
    accent: '#FF8DFF',
  },
  {
    id: 'business-korea',
    kicker: 'MICRO-DEGREE · CUFS',
    title_ko: '한국 비즈니스 실무',
    title_en: 'Doing Business in Korea',
    sub_ko: '한국 기업 환경과 실무 커뮤니케이션을 이해합니다.',
    sub_en: 'Understand the Korean corporate environment and practical communication.',
    meta: ['10 weeks', '100% remote', 'EN'],
    level: 'Intermediate',
    status: 'open',
    color: '#6B2DBE',
    accent: '#82E6DE',
  },
  {
    id: 'digital-media',
    kicker: 'MICRO-DEGREE · CUFS',
    title_ko: '디지털 미디어 제작',
    title_en: 'Digital Media Production',
    sub_ko: '스토리텔링부터 편집까지, 디지털 미디어 기초를 배웁니다.',
    sub_en: 'From storytelling to editing — digital media fundamentals.',
    meta: ['12 weeks', '100% remote', 'EN'],
    level: 'Beginner',
    status: 'open',
    color: '#0094B4',
    accent: '#9FED8F',
  },
  {
    id: 'online-degree',
    kicker: 'BACHELOR · CUFS',
    title_ko: '온라인 학사 과정',
    title_en: 'Full Online Bachelor Degree',
    sub_ko: '4년제 정규 학위를 100% 온라인으로 이수합니다.',
    sub_en: 'Complete a 4-year accredited bachelor degree fully online.',
    meta: ['4 years', '100% remote', 'EN / KO'],
    level: 'All',
    status: 'opens Fall',
    color: '#248737',
    accent: '#FFAE80',
  },
];

window.PARTNERS = [
  { name: 'CUFS', full: '사이버한국외국어대학교', role_ko: '첫 파트너 · 교육기관', role_en: 'First partner · University', color: '#1E1654' },
  { name: 'WOSM', full: 'World Organization of the Scout Movement', role_ko: '글로벌 네트워크', role_en: 'Global network', color: '#6B2DBE' },
  { name: 'APR', full: 'Asia-Pacific Region Scout', role_ko: '지역 네트워크', role_en: 'Regional network', color: '#0094B4' },
  { name: 'NSOs', full: 'National Scout Organizations', role_ko: '국가별 추천 기관', role_en: 'National endorsement', color: '#248737' },
];

window.STORIES = [
  { tag: 'Kenya', tag_color: '#FF5655', name: 'Amina K.', program: 'Korean Studies',
    quote_ko: '스카우트에서 만난 멘토 덕분에 DreamPath를 알게 됐어요. 지금은 한국어로 일기를 씁니다.',
    quote_en: 'A mentor I met in scouts told me about DreamPath. Now I write my journal in Korean.' },
  { tag: 'Philippines', tag_color: '#0094B4', name: 'Jomar D.', program: 'Business in Korea',
    quote_ko: '온라인이지만 한국 학생들과 실제로 프로젝트를 했어요. 그게 제일 컸습니다.',
    quote_en: "It's online, but I worked on real projects with Korean students. That made the difference." },
  { tag: 'Peru', tag_color: '#248737', name: 'Sofía M.', program: 'Digital Media',
    quote_ko: '처음엔 영어가 걱정이었는데, 자막이랑 멘토 덕분에 따라갈 수 있었어요.',
    quote_en: 'I was worried about my English, but captions and a mentor got me through.' },
];

window.NEWS = [
  { tag: 'WOSM', tag_color: '#6B2DBE', date: '2025.03.18', title_ko: 'APR 스카우트 컨퍼런스에서 DreamPath 정식 소개', title_en: 'DreamPath presented at APR Scout Conference' },
  { tag: 'Korea', tag_color: '#FF5655', date: '2025.02.24', title_ko: 'CUFS와 첫 파트너십 MOU 체결', title_en: 'First partnership MOU signed with CUFS' },
  { tag: '사람들', tag_color: '#248737', date: '2025.01.30', title_ko: '첫 코호트 지원자 인터뷰: 12개국 40명', title_en: 'First cohort interviews: 40 applicants, 12 countries' },
  { tag: 'APR', tag_color: '#0094B4', date: '2024.12.12', title_ko: '아시아-태평양 지역 NSO 대표단 미팅', title_en: 'Asia-Pacific NSO leadership meeting' },
];

window.FAQ = [
  { q_ko: '누가 지원할 수 있나요?', q_en: 'Who can apply?',
    a_ko: '각 국가 스카우트 조직(NSO)에서 활동 중이거나 추천받은 청년이면 지원할 수 있습니다. 나이 기준은 프로그램마다 다릅니다.',
    a_en: 'Any youth active in, or nominated by, their National Scout Organization can apply. Age requirements vary by program.' },
  { q_ko: '영어를 못해도 괜찮나요?', q_en: 'Do I need English?',
    a_ko: '일부 프로그램은 한국어 기본 과정을 포함합니다. 영어/한국어 기초 수준만 있어도 시작할 수 있습니다.',
    a_en: 'Some programs include a Korean basics track. Basic English or Korean is enough to start.' },
  { q_ko: '비용은 얼마인가요?', q_en: 'How much does it cost?',
    a_ko: '마이크로디그리는 파트너 기관의 장학 지원이 있으며, 학생 부담은 최소화됩니다. 프로그램별 상세 비용은 프로그램 페이지에서 확인하세요.',
    a_en: 'Micro-degrees include scholarship support from partner institutions; learner cost is minimized. See each program page for details.' },
  { q_ko: '한국에 가야 하나요?', q_en: 'Do I have to come to Korea?',
    a_ko: '모든 프로그램은 100% 온라인입니다. 선택적으로 단기 방문 프로그램이 있을 수 있습니다.',
    a_en: 'All programs are 100% online. Optional short-term visit programs may be offered.' },
  { q_ko: 'DreamPath와 CUFS의 관계는?', q_en: 'What is the relationship between DreamPath and CUFS?',
    a_ko: 'DreamPath TF는 CUFS와 독립된 조직입니다. CUFS는 첫 파트너 교육기관이며, 추후 복수 기관으로 확장할 예정입니다.',
    a_en: 'DreamPath TF is independent from CUFS. CUFS is our first partner institution; we plan to expand to multiple institutions.' },
];
