// content-store.js — admin-editable content store backed by Cloudflare KV.
// Public site GETs /api/content. Admin saves PUT /api/content with bearer token.
// SessionStorage holds a per-visitor cache to keep first paint instant.

(function() {
  const STORAGE_KEY = 'dp_content_v1';
  const API_URL = '/api/content';
  const TOKEN_KEY = 'dp_admin_token';

  // Default content — schema for the entire public site
  const DEFAULT_CONTENT = {
    brand: {
      name_kr: 'KoreaDreamPath',
      name_en: 'KoreaDreamPath',
      // Wordmark split for two-tone display: { mark } + { accent }
      wordmark_mark: 'KoreaDream',
      wordmark_accent: 'Path',
      logo_mark: '/assets/logo-dreampath-mark.svg',
      footer_tagline_ko: '월드스카우트 네트워크를 활용해 글로벌 청년을 한국의 고등교육으로 연결하는 독립 이니셔티브.',
      footer_tagline_en: 'An independent initiative connecting global scouting youth to Korean higher education through the World Scout Network.',
      email: 'hello@koreadreampath.com',
      partners_email: 'partners@koreadreampath.com',
    },
    nav: {
      // Display order on the public site is fixed in Nav.jsx:
      //   소개 → 프로그램 → 프로그램 소식 → 프로그램 후기 → 파트너십
      ko: { about: '소개', programs: '프로그램', news: '프로그램 소식', stories: '프로그램 후기', partners: '파트너십', contact: '문의하기', apply: '지원하기' },
      en: { about: 'About', programs: 'Programs', news: 'Program news', stories: 'Program reviews', partners: 'Partnerships', contact: 'Contact', apply: 'Apply' },
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
    // ─── About page ────────────────────────────────────────────────────
    about: {
      hero: {
        ko: { kicker: '프로젝트 소개', title_l1: '교육 접근성은, 이미', title_l2: '존재하는 네트워크 위에서.',
              sub: 'DreamPath TF는 월드스카우트 네트워크를 학습자 파이프라인으로 전환하는 독립 이니셔티브입니다. CUFS와 독립된 조직으로, 향후 복수 교육기관과 확장 가능한 파트너 모델을 지향합니다.' },
        en: { kicker: 'ABOUT THE PROJECT', title_l1: 'Access to education, built on', title_l2: 'a network that already exists.',
              sub: 'DreamPath TF is an independent initiative that turns the World Scout Network into a learner pipeline. We operate independently from CUFS and aim to expand across multiple institutions.' },
      },
      mission: {
        ko: { kicker: '미션', title_l1: '170개국에 이미 연결된 청년과 지도자들.', title_l2: '같은 길에 학습을 올려놓습니다.',
              body: '전 세계 170여 개국의 스카우트 조직은 교육 접근성에 관심 있는 청년과 지도자들이 이미 연결된 거대한 네트워크입니다. DreamPath는 이 기존 네트워크를 학습자 파이프라인으로 전환해, 온라인·마이크로디그리 형태로 한국 고등교육에 접근할 수 있도록 설계된 구조입니다.' },
        en: { kicker: 'MISSION', title_l1: 'Youth and leaders already connected across 170 countries.', title_l2: 'We lay learning on the same path.',
              body: 'Scout organizations across 170+ countries form a global network of youth and leaders already invested in education access. DreamPath turns this existing network into a learner pipeline for Korean higher education — delivered online, through micro-degrees and full online degrees.' },
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
      sections: [
        {
          kicker_ko: '리드', kicker_en: 'LEAD',
          members: [
            { name: '운영 디렉터', name_en: 'Operations Director', role_ko: '총괄 · 파트너십', role_en: 'Operations · Partnerships',
              bio_ko: '국제 청년 교육 및 스카우트 운영 경험을 바탕으로 프로젝트 전반을 조율합니다.',
              bio_en: 'Coordinates the project across partners, drawing on international youth education and scouting experience.',
              image: '/assets/placeholder-student.svg' },
          ],
        },
        {
          kicker_ko: '교육 트랙', kicker_en: 'EDUCATION',
          members: [
            { name: '교육 설계자', name_en: 'Curriculum Designer', role_ko: '커리큘럼 · 학사 연계', role_en: 'Curriculum · Academic liaison',
              bio_ko: '파트너 대학과 마이크로디그리 커리큘럼을 함께 설계합니다.', bio_en: 'Designs micro-degree curricula with partner universities.',
              image: '/assets/placeholder-student.svg' },
            { name: '학습자 지원 매니저', name_en: 'Learner Success', role_ko: '코호트 · 멘토링', role_en: 'Cohorts · Mentoring',
              bio_ko: '학습자 진척과 멘토 매칭을 운영합니다.', bio_en: 'Runs learner progress tracking and mentor matching.',
              image: '/assets/placeholder-student.svg' },
          ],
        },
        {
          kicker_ko: '재무 트랙', kicker_en: 'FINANCE',
          members: [
            { name: '재무 매니저', name_en: 'Finance Manager', role_ko: '장학 · 후원 운영', role_en: 'Scholarship · Sponsorship',
              bio_ko: '장학 구조 설계와 파트너 기여 모델을 운영합니다.', bio_en: 'Manages scholarship structure and partner contributions.',
              image: '/assets/placeholder-student.svg' },
          ],
        },
        {
          kicker_ko: '운영 / 디자인', kicker_en: 'OPERATIONS / DESIGN',
          members: [
            { name: '커뮤니티 매니저', name_en: 'Community Manager', role_ko: 'NSO 커뮤니케이션', role_en: 'NSO communications',
              bio_ko: '국가별 스카우트 조직과의 정기 커뮤니케이션을 담당합니다.', bio_en: 'Maintains regular communication with national scout organizations.',
              image: '/assets/placeholder-student.svg' },
            { name: '제품 디자이너', name_en: 'Product Designer', role_ko: '브랜드 · 사이트 디자인', role_en: 'Brand · Site design',
              bio_ko: '디자인 시스템과 사이트 UI를 운영합니다.', bio_en: 'Owns the design system and the site UI.',
              image: '/assets/placeholder-student.svg' },
          ],
        },
      ],
      cta: {
        ko: { kicker: '함께하실래요?', title: '프로젝트 팀에 합류하기', sub: '교육·운영·디자인·기술 영역에서 함께할 분을 찾고 있습니다.', button: '지원 / 문의', email: 'team@koreadreampath.com' },
        en: { kicker: 'Want to join us?', title: 'Join the project team', sub: "We're looking for collaborators in education, operations, design, and engineering.", button: 'Reach out', email: 'team@koreadreampath.com' },
      },
    },
    // ─── Page heros (Partners / Stories / News / Contact / Programs) ────
    page_heros: {
      partners: {
        ko: { kicker: 'PARTNERS', title_l1: '신뢰받는', title_l2: '네트워크 위에서.',
              sub: 'DreamPath는 파트너 교육기관, 글로벌 스카우트 조직, 후원 기관과 함께 운영됩니다.' },
        en: { kicker: 'PARTNERS', title_l1: 'Built on a', title_l2: 'trusted network.',
              sub: 'DreamPath operates with partner universities, global scout organizations, and supporting institutions.' },
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
              sub: '답이 없으면 언제든 hello@dreampath.org 로 연락주세요.' },
        en: { kicker: 'CONTACT · FAQ', title_l1: 'Start with the FAQ.', title_l2: '',
              sub: "If you don't see the answer, reach us at hello@dreampath.org." },
      },
      programs: {
        ko: { kicker: 'PROGRAMS', title_l1: '4개의 학습 경로.', title_l2: '모두 온라인.',
              sub: '마이크로디그리부터 정규 학위까지. 여러분의 다음 스텝에 맞는 프로그램을 선택하세요.' },
        en: { kicker: 'PROGRAMS', title_l1: 'Four learning paths.', title_l2: 'All online.',
              sub: 'From micro-degrees to full online degrees. Choose the next step that fits you.' },
      },
    },
    // ─── Contact page extras ───────────────────────────────────────────
    partner_cta: {
      ko: { kicker: '파트너 기관', title: '파트너십을 제안하고 싶으신가요?',
            sub: '교육기관, NSO, 후원기관의 문의를 환영합니다.', cta: 'partners@dreampath.org →' },
      en: { kicker: 'For partner institutions', title: 'Interested in partnering with us?',
            sub: 'We welcome inquiries from universities, NSOs, and supporting institutions.', cta: 'partners@dreampath.org →' },
    },
    // ─── Program detail page (shared copy across all programs) ─────────
    program_detail: {
      ko: {
        back_link: '모든 프로그램',
        overview_h: '프로그램 개요',
        overview_body: '이 프로그램은 파트너 교육기관이 설계한 온라인 커리큘럼을 기반으로, 스카우트 네트워크 내 추천 학습자에게 제공됩니다. 주간 라이브 세션, 과제 기반 학습, 그리고 멘토 매칭을 포함합니다.',
        learn_h: '배우는 내용',
        learn_items: ['주제별 핵심 프레임워크와 사례', '실무 중심의 주간 과제', '한국 학생·전문가와의 네트워킹', '수료 후 포트폴리오 산출물'],
        eligibility_h: '지원 자격',
        eligibility_body: '소속 국가 스카우트 조직(NSO) 에서 활동 중이거나 추천받은 청년. 18세 이상 권장. 기본 영어 또는 한국어.',
        info_kicker: '프로그램 정보',
        label_length: '기간', label_format: '방식', label_language: '언어', label_level: '레벨', label_status: '상태',
        apply_cta: '지금 지원하기',
      },
      en: {
        back_link: 'All programs',
        overview_h: 'Overview',
        overview_body: 'This program is built on an online curriculum designed by our partner institution and delivered to learners nominated by their national scout organization. It includes weekly live sessions, project-based learning, and mentor matching.',
        learn_h: 'What you will learn',
        learn_items: ['Core frameworks and case studies', 'Weekly practical assignments', 'Networking with Korean students & practitioners', 'A portfolio outcome after completion'],
        eligibility_h: 'Who should apply',
        eligibility_body: 'Youth active in, or nominated by, a National Scout Organization. 18+ recommended. Basic English or Korean.',
        info_kicker: 'Program info',
        label_length: 'Length', label_format: 'Format', label_language: 'Language', label_level: 'Level', label_status: 'Status',
        apply_cta: 'Apply now',
      },
    },
    // ─── Footer ────────────────────────────────────────────────────────
    footer: {
      ko: {
        col_programs: '프로그램',
        col_about: '소개',
        col_contact: '문의',
        link_all: '전체 프로그램',
        link_micro: 'Micro-degrees',
        link_bachelor: 'Online Bachelor',
        link_apply: '지원 방법',
        link_project: '프로젝트',
        link_team: '프로젝트 팀 소개',
        link_partners: '파트너십',
        link_stories: '프로그램 후기',
        link_news: '프로그램 소식',
        link_faq: 'FAQ',
        link_partners_inquiry: '파트너십 문의',
        rights: '© 2025 KoreaDreamPath. 모든 권리 보유.',
      },
      en: {
        col_programs: 'Programs',
        col_about: 'About',
        col_contact: 'Contact',
        link_all: 'All programs',
        link_micro: 'Micro-degrees',
        link_bachelor: 'Online Bachelor',
        link_apply: 'How to apply',
        link_project: 'The project',
        link_team: 'Project team',
        link_partners: 'Partnerships',
        link_stories: 'Program reviews',
        link_news: 'Program news',
        link_faq: 'FAQ',
        link_partners_inquiry: 'For partners',
        rights: '© 2025 KoreaDreamPath. All rights reserved.',
      },
    },
  };

  // Synchronous load — returns immediately with cached or default content.
  // The async fetch from /api/content runs in background and dispatches
  // 'dp-content-changed' when fresh data arrives.
  function load() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_CONTENT);
      const saved = JSON.parse(raw);
      return deepMerge(structuredClone(DEFAULT_CONTENT), saved);
    } catch { return structuredClone(DEFAULT_CONTENT); }
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

  // Cross-tab sync — only fires when something else updated session cache
  window.addEventListener('storage', e => {
    if (e.key === STORAGE_KEY) window.dispatchEvent(new CustomEvent('dp-content-changed'));
  });

  window.DreamPathContent = {
    DEFAULT: DEFAULT_CONTENT,
    load, save, reset, fetchRemote,
    STORAGE_KEY, TOKEN_KEY,
    API_URL,
  };

  // Kick off remote fetch on page load so site shows latest server content.
  fetchRemote();
})();
