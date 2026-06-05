// KoreaDreamPath Worker — handles /api/*, friendly URL rewrites,
// and falls through to static assets for everything else.

const CONTENT_KEY = 'dp_content_v1';
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const CURRENT_PROGRAMS = [
  {
    id: 'ai-language',
    kicker: 'MICRO-DEGREE · CUFS',
    title_ko: 'AI와 언어교육',
    title_en: 'AI & Language',
    sub_ko: 'AI 기반 영어교육, 언어학, 커뮤니케이션, 빅데이터를 연결하는 1년형 마이크로디그리입니다.',
    sub_en: 'A one-year micro-degree connecting AI-powered language education, linguistics, communication, and big data.',
    meta: ['~1 year', '100% online', 'EN / KO support'],
    level: 'Intermediate',
    status: 'open',
    color: '#1565C0',
    accent: '#42A5F5',
    icon: 'languages',
  },
  {
    id: 'media-content-storytelling',
    kicker: 'MICRO-DEGREE · CUFS',
    title_ko: '미디어 콘텐츠 스토리텔링',
    title_en: 'Media Content Storytelling',
    sub_ko: '역사, 리더십, 커뮤니케이션, 스피치를 통해 글로벌 무대용 스토리텔링 역량을 키웁니다.',
    sub_en: 'Build storytelling power for global stages through history, leadership, communication, and speech.',
    meta: ['~1 year', '100% online', 'EN / KO support'],
    level: 'All Levels',
    status: 'open',
    color: '#7B1FA2',
    accent: '#CE93D8',
    icon: 'mic',
  },
  {
    id: 'youtube-master',
    kicker: 'MICRO-DEGREE · CUFS',
    title_ko: '유튜브 마스터',
    title_en: 'YouTube Master',
    sub_ko: '채널 기획부터 촬영, 편집, 수익화까지 실제 유튜브 채널을 만드는 과정입니다.',
    sub_en: 'Go from channel strategy to shooting, editing, and monetization while building a live YouTube channel.',
    meta: ['~1 year', '100% online', 'EN / KO support'],
    level: 'Beginner',
    status: 'open',
    color: '#C62828',
    accent: '#EF5350',
    icon: 'video',
  },
  {
    id: 'k-beauty-styling',
    kicker: 'MICRO-DEGREE · CUFS',
    title_ko: '기초 K-뷰티 스타일링',
    title_en: 'Basic K-Beauty Styling',
    sub_ko: '색채, 네일, 피부관리, 메이크업을 한 번에 배우는 K-뷰티 입문 트랙입니다.',
    sub_en: 'An entry-level K-beauty track covering color, nails, skincare, and makeup in one program.',
    meta: ['~1 year', '100% online', 'EN / KO support'],
    level: 'Beginner',
    status: 'open',
    color: '#AD1457',
    accent: '#F06292',
    icon: 'sparkles',
  },
  {
    id: 'business-korean',
    kicker: 'MICRO-DEGREE · CUFS',
    title_ko: '비즈니스 한국어',
    title_en: 'Business Korean',
    sub_ko: '입문부터 발표·협상까지, 한국 기업 환경에 맞춘 실전 한국어를 집중적으로 익힙니다.',
    sub_en: 'Move from beginner foundations to presentations and negotiations in Korean business contexts.',
    meta: ['~1 year', '100% online', 'EN / KO support'],
    level: 'Beginner',
    status: 'open',
    color: '#00695C',
    accent: '#4DB6AC',
    icon: 'briefcase',
  },
];
const CURRENT_PROGRAM_COPY = {
  programs_section: {
    ko: {
      title: '5개의 CUFS 마이크로디그리. 모두 온라인.',
      sub: 'AI, 스토리텔링, 유튜브, K-뷰티, 비즈니스 한국어까지 글로벌 학습자를 위한 5개 과정을 확인하세요.',
    },
    en: {
      title: 'Five CUFS micro-degrees. All online.',
      sub: 'Explore five tracks for global learners in AI, storytelling, YouTube, K-beauty, and business Korean.',
    },
  },
  page_heros: {
    programs: {
      ko: {
        title_l1: '5개의 CUFS 마이크로디그리.',
        title_l2: '모두 온라인.',
        sub: '글로벌 학습자를 위한 5개 마이크로디그리 중에서 다음 스텝을 선택하세요.',
      },
      en: {
        title_l1: 'Five CUFS micro-degrees.',
        title_l2: 'All online.',
        sub: 'Choose your next step from five micro-degree tracks designed for global learners.',
      },
    },
  },
};
const DEFAULT_PROGRAM_DETAILS = {
  'ai-language': {
    overview_ko: `<p><strong>영어학과 · CUFS</strong></p><p>AI &amp; Language는 AI를 단순한 호기심이 아니라 <strong>전문 도구로 활용하는 법</strong>을 배우는 마이크로디그리입니다. 참고 문서의 원래 기획 의도처럼, 영어교육이 AI로 가장 빠르게 재편되는 현장에서 학습자가 뒤처지지 않도록 설계된 트랙입니다.</p><p>영어교육, 영어학, 커뮤니케이션, 데이터 분석을 함께 익히며 글로벌 현장에서 "AI + Human" 역량을 갖춘 인재로 성장하도록 돕습니다. 영어교육과 언어 데이터를 함께 다루기 때문에 에듀테크, AI 번역, 국제 커뮤니케이션, 데이터 기반 교육 기획까지 연결되는 토대를 만듭니다.</p>`,
    overview_en: `<p><strong>English Department · CUFS</strong></p><p>AI &amp; Language is a micro-degree built to help learners use AI as a <strong>professional tool</strong>, not just a curiosity. As framed in the original CUFS document, the track responds to the fact that language education is one of the first industries being rewritten by AI.</p><p>It combines English education, linguistics, communication, and data analysis so students can graduate with the kind of "AI + Human" capability that stands out in the global market. Because the program links language learning with data literacy, it creates a strong foundation for EdTech, AI translation, international communication, and analytics-informed education work.</p>`,
    curriculum_ko: `<ul><li><span class="pd-course-chip">Semester 2</span><strong>AI와 영어교육</strong><em class="pd-course-meta">Prof. Hong Ji-ye (홍지예) · English Dept. · AI &amp; Linguistics Specialist</em>AI가 영어교육을 어떻게 바꾸는지 다룹니다. 자동 피드백, 맞춤형 학습 경로, AI 튜터링 시스템을 직접 이해하고 실습합니다.<a href="https://youtu.be/soW_ah-zWcg" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 2</span><strong>영어학개론</strong><em class="pd-course-meta">English Department Faculty · Core foundation course</em>음성학, 통사론, 의미론, 화용론을 통해 영어 구조를 탄탄히 이해합니다. AI 기반 언어 활용의 기초가 되는 과목입니다.</li><li><span class="pd-course-chip">Semester 2</span><strong>AI와 영어 커뮤니케이션</strong><em class="pd-course-meta">Prof. Ahn Ji-eun (안지은) · TESOL / AI &amp; Big Data</em>번역, AI 글쓰기 보조, 음성인식, 챗봇 기반 실시간 회화를 다루며 실제 소통 장면에 AI를 연결합니다.<a href="https://youtu.be/RzC4dxVX-P0" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 1</span><strong>AI와 빅데이터</strong><em class="pd-course-meta">Prof. Ahn Ji-eun (안지은) · Big Data Analysis</em>데이터 수집, 처리, 시각화, 의사결정을 언어교육과 글로벌 비즈니스 사례에 적용합니다.<a href="https://youtu.be/Wpe8g8Itug8" target="_blank" rel="noopener">Watch lecture preview</a></li></ul>`,
    curriculum_en: `<ul><li><span class="pd-course-chip">Semester 2</span><strong>AI and English Education</strong><em class="pd-course-meta">Prof. Hong Ji-ye · English Dept. · AI &amp; Linguistics Specialist</em>Explore how AI is reshaping English teaching through automated feedback, personalized learning pathways, and AI tutoring systems.<a href="https://youtu.be/soW_ah-zWcg" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 2</span><strong>Introduction to English Linguistics</strong><em class="pd-course-meta">English Department Faculty · Core foundation course</em>Build foundations in phonetics, syntax, semantics, and pragmatics so language structure becomes clear and usable.</li><li><span class="pd-course-chip">Semester 2</span><strong>AI and English Communication</strong><em class="pd-course-meta">Prof. Ahn Ji-eun · TESOL / AI &amp; Big Data</em>Practice translation, AI writing support, voice recognition, and chatbot-based conversation for real communication tasks.<a href="https://youtu.be/RzC4dxVX-P0" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 1</span><strong>AI and Big Data</strong><em class="pd-course-meta">Prof. Ahn Ji-eun · Big Data Analysis</em>Apply data collection, processing, visualization, and decision-making to language learning and global business contexts.<a href="https://youtu.be/Wpe8g8Itug8" target="_blank" rel="noopener">Watch lecture preview</a></li></ul>`,
    outcomes_ko: `<ul><li>정부 인정 CUFS 마이크로디그리 수료증</li><li>ChatGPT, NLP, 데이터 분석 등 실전형 AI 활용 역량</li><li>AI로 강화된 전문 영어 커뮤니케이션 능력</li><li>교육과 비즈니스 의사결정에 필요한 빅데이터 기초 소양</li><li>에듀테크, AI 번역, 데이터 전략 분야로 이어지는 커리어 기반</li></ul>`,
    outcomes_en: `<ul><li>A government-recognized CUFS micro-degree certificate</li><li>Practical AI tool proficiency across ChatGPT, NLP, and analytics workflows</li><li>Professional English communication enhanced by AI</li><li>Big data literacy for education and business decision-making</li><li>A career foundation for EdTech, AI translation, and data strategy roles</li></ul>`,
    prerequisites_ko: `<p>영어 기반 수업을 따라갈 수 있는 기본 의사소통 능력이 있으면 좋습니다. AI 경험은 필수가 아니며, 언어교육·커뮤니케이션·데이터 활용에 관심 있는 학습자에게 적합합니다.</p>`,
    prerequisites_en: `<p>Basic English communication ability is recommended so learners can follow lectures and assignments comfortably. No prior AI background is required; the track is designed for students interested in language education, communication, and applied data work.</p>`,
    duration: '~1 year · 10 credits',
    format: '100% online',
    language_required: 'English-friendly / Korean support',
    certification: 'CUFS Micro-Degree Certificate',
    instructor_name: 'Prof. Ahn Ji-eun · Prof. Hong Ji-ye',
    instructor_title: 'English Department / AI & Linguistics Faculty',
    instructor_bio_ko: `<p>안지은 교수와 홍지예 교수를 중심으로, CUFS 영어학과와 TESOL 기반 교수진이 AI 커뮤니케이션, 언어학, 빅데이터 활용을 연결해 지도합니다.</p>`,
    instructor_bio_en: `<p>Led by Prof. Ahn Ji-eun and Prof. Hong Ji-ye, the teaching team connects CUFS expertise in TESOL, linguistics, AI communication, and big data practice.</p>`,
    courses_json: [
      {
        semester: 'Semester 2',
        title_ko: 'AI와 영어교육',
        title_en: 'AI and English Education',
        desc_ko: '자동 피드백, 맞춤형 학습 경로, AI 튜터링 시스템을 통해 영어교육이 어떻게 재편되는지 다룹니다.',
        desc_en: 'Explores how AI is reshaping English teaching through automated feedback, personalized learning paths, and AI tutoring systems.',
        faculty_name: 'Prof. Hong Ji-ye (홍지예)',
        faculty_title: 'English Dept. · AI & Linguistics Specialist · 3+ AI courses at CUFS',
        faculty_bio_ko: 'CUFS 영어학과에서 AI와 언어교육의 접점을 다뤄온 교수로, 영어교육 현장에서 AI를 어떻게 실용 도구로 적용할지에 초점을 맞춥니다.',
        faculty_bio_en: 'A CUFS English Department faculty member focused on the intersection of AI and language education, with an emphasis on practical classroom application.',
        faculty_image: '',
        preview_url: 'https://youtu.be/soW_ah-zWcg',
      },
      {
        semester: 'Semester 2',
        title_ko: '영어학개론',
        title_en: 'Introduction to English Linguistics',
        desc_ko: '음성학, 통사론, 의미론, 화용론을 통해 영어 구조를 이해하고 AI 기반 언어 활용의 기초를 다집니다.',
        desc_en: 'Builds foundations in phonetics, syntax, semantics, and pragmatics so learners understand language structure clearly.',
        faculty_name: 'English Department Faculty',
        faculty_title: 'Established 2021 · Core foundation course',
        faculty_bio_ko: '영어학과 교수진이 공동으로 운영하는 기초 과목으로, 이후 AI·커뮤니케이션 과목을 이해하는 기반을 제공합니다.',
        faculty_bio_en: 'A foundation course delivered by the English Department faculty to support later AI and communication coursework.',
        faculty_image: '',
        preview_url: '',
      },
      {
        semester: 'Semester 2',
        title_ko: 'AI와 영어 커뮤니케이션',
        title_en: 'AI and English Communication',
        desc_ko: '번역, AI 글쓰기 보조, 음성인식, 챗봇 기반 실시간 회화를 통해 실제 커뮤니케이션 장면에 AI를 연결합니다.',
        desc_en: 'Connects AI to real communication tasks through translation, AI writing support, voice recognition, and chatbot conversation practice.',
        faculty_name: 'Prof. Ahn Ji-eun (안지은)',
        faculty_title: 'TESOL Graduate School · AI/Big Data · 6+ courses',
        faculty_bio_ko: 'TESOL과 AI·빅데이터를 함께 다루며, 학습자 커뮤니케이션 역량을 기술과 연결하는 수업을 운영합니다.',
        faculty_bio_en: 'Teaches at the intersection of TESOL, AI, and big data, with a focus on communication skill-building enhanced by technology.',
        faculty_image: '',
        preview_url: 'https://youtu.be/RzC4dxVX-P0',
      },
      {
        semester: 'Semester 1',
        title_ko: 'AI와 빅데이터',
        title_en: 'AI and Big Data',
        desc_ko: '데이터 수집, 처리, 시각화, 의사결정을 언어교육과 글로벌 비즈니스 사례에 적용합니다.',
        desc_en: 'Applies data collection, processing, visualization, and decision-making to language learning and global business cases.',
        faculty_name: 'Prof. Ahn Ji-eun (안지은)',
        faculty_title: 'Big Data Analysis · Research Methodology expert',
        faculty_bio_ko: '빅데이터 분석과 연구방법론을 기반으로, 학습자가 데이터 문해력을 실제 문제 해결과 연결할 수 있도록 지도합니다.',
        faculty_bio_en: 'Brings expertise in big data analysis and research methodology, helping learners apply data literacy to practical decisions.',
        faculty_image: '',
        preview_url: 'https://youtu.be/Wpe8g8Itug8',
      },
    ],
    cost_full: 600,
    cost_currency: 'USD',
  },
  'media-content-storytelling': {
    overview_ko: `<p><strong>Athena School of Liberal Arts · CUFS</strong></p><p>Media Content Storytelling은 <strong>사람을 움직이는 이야기의 힘</strong>을 훈련하는 과정입니다. 원문 문서가 강조하듯, 콘텐츠가 넘치는 시대에는 결국 가장 좋은 이야기를 만드는 사람이 주목받습니다.</p><p>역사 속 인물 분석부터 커뮤니케이션, 영화 기반 리더십, 방송형 스피치까지 이어지며 공공 발표, 콘텐츠 제작, 조직 커뮤니케이션에 필요한 핵심 역량을 쌓습니다. 유튜버, 발표자, 기업 리더, 교육자처럼 메시지 전달력이 중요한 역할을 꿈꾸는 학습자에게 특히 잘 맞습니다.</p>`,
    overview_en: `<p><strong>Athena School of Liberal Arts · CUFS</strong></p><p>Media Content Storytelling trains learners in the <strong>power of stories that move people</strong>. As the original CUFS page framed it, in a world drowning in content, the people who tell the best stories win.</p><p>The track spans historical storytelling, communication skills, film-based leadership analysis, and broadcaster-style speech delivery. It is especially well suited to future creators, presenters, team leaders, educators, and anyone whose impact depends on clear and compelling communication.</p>`,
    curriculum_ko: `<ul><li><span class="pd-course-chip">Semester 2</span><strong>게임 체인저: 역사를 바꾼 인물 이야기</strong><em class="pd-course-meta">Liberal Arts Faculty · Athena School</em>스티브 잡스, 마리 퀴리, 세종대왕 등 변화 주도자의 서사 구조와 리더십 프레임을 읽습니다.<a href="https://youtu.be/hVUIiTY2uS0" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 2</span><strong>커뮤니케이션 스킬</strong><em class="pd-course-meta">Liberal Arts Faculty · Core soft skills course</em>설득, 적극적 경청, 갈등 해결, 문화 간 커뮤니케이션을 실제 업무 상황에 맞춰 훈련합니다.</li><li><span class="pd-course-chip">Semester 1</span><strong>영화로 공부하는 리더십</strong><em class="pd-course-meta">Liberal Arts Faculty · 2026 latest content</em>영화 속 상징적인 리더십 장면을 분석하고, 개인 브랜딩과 조직 커뮤니케이션에 적용합니다.<a href="https://www.youtube.com/watch?v=3NMcHPPKzT8&t=30s" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 1 + 2</span><strong>아나운서에게 배우는 성공 스피치</strong><em class="pd-course-meta">Professional Announcer Faculty · Broadcast industry experience</em>발성, 스크립트 구성, 즉흥 발표, 카메라 자신감까지 실제 방송 현장의 기준으로 익힙니다.<a href="https://www.youtube.com/watch?v=hO2LV9mtxeQ" target="_blank" rel="noopener">Watch lecture preview</a></li></ul>`,
    curriculum_en: `<ul><li><span class="pd-course-chip">Semester 2</span><strong>Game Changers: Historical Figures Who Changed the World</strong><em class="pd-course-meta">Liberal Arts Faculty · Athena School</em>Study visionary leaders such as Steve Jobs, Marie Curie, and King Sejong to understand narrative patterns and leadership frameworks.<a href="https://youtu.be/hVUIiTY2uS0" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 2</span><strong>Communication Skills</strong><em class="pd-course-meta">Liberal Arts Faculty · Core soft skills course</em>Build practical strength in persuasion, listening, conflict resolution, and cross-cultural communication.</li><li><span class="pd-course-chip">Semester 1</span><strong>Leadership through Film</strong><em class="pd-course-meta">Liberal Arts Faculty · 2026 latest content</em>Analyze iconic leadership styles through film and connect them to personal branding and organizational leadership.<a href="https://www.youtube.com/watch?v=3NMcHPPKzT8&t=30s" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 1 + 2</span><strong>Successful Speech by Professional Announcers</strong><em class="pd-course-meta">Professional Announcer Faculty · Real broadcast experience</em>Practice projection, script writing, impromptu speaking, and camera confidence with real broadcaster-style delivery.<a href="https://www.youtube.com/watch?v=hO2LV9mtxeQ" target="_blank" rel="noopener">Watch lecture preview</a></li></ul>`,
    outcomes_ko: `<ul><li>CUFS 마이크로디그리 수료증</li><li>공개 발표와 프레젠테이션 전달력</li><li>무대, 영상, 글 어디에나 적용 가능한 스토리텔링 프레임워크</li><li>방송형 카메라 전달력과 스피치 자신감</li><li>글로벌 조직에서 통하는 문화 간 커뮤니케이션 감각</li></ul>`,
    outcomes_en: `<ul><li>A CUFS micro-degree certificate</li><li>Professional public speaking and presentation skills</li><li>A storytelling framework usable across stage, video, and writing</li><li>Broadcast-style on-camera confidence</li><li>Cross-cultural communication for global workplaces</li></ul>`,
    prerequisites_ko: `<p>특별한 선수지식은 필요하지 않습니다. 콘텐츠 제작, 발표, 리더십, 커뮤니케이션 역량을 키우고 싶은 모든 학습자에게 열려 있습니다.</p>`,
    prerequisites_en: `<p>No specific academic background is required. The program is open to learners who want to strengthen content creation, presentation, leadership, and communication skills.</p>`,
    duration: '~1 year · 10 credits',
    format: '100% online',
    language_required: 'English-friendly / Korean support',
    certification: 'CUFS Micro-Degree Certificate',
    instructor_name: 'Athena School Faculty · Professional Announcer Faculty',
    instructor_title: 'Liberal Arts / Broadcast Communication',
    instructor_bio_ko: `<p>아테나 교양학부와 실무형 아나운서 교수진이 함께 참여해 스토리텔링, 리더십, 현장감 있는 스피치 훈련을 제공합니다.</p>`,
    instructor_bio_en: `<p>The track is delivered by Athena School faculty together with professional announcer instructors, blending liberal arts perspective with real broadcast delivery practice.</p>`,
    courses_json: [
      {
        semester: 'Semester 2',
        title_ko: '게임 체인저: 역사를 바꾼 인물 이야기',
        title_en: 'Game Changers: Historical Figures Who Changed the World',
        desc_ko: '스티브 잡스, 마리 퀴리, 세종대왕 같은 인물의 서사 구조와 리더십 프레임을 읽습니다.',
        desc_en: 'Studies how figures like Steve Jobs, Marie Curie, and King Sejong reshaped the world through leadership and story.',
        faculty_name: 'Liberal Arts Faculty',
        faculty_title: 'Athena School · Open to all years',
        faculty_bio_ko: '아테나 교양학부 교수진이 역사와 인문 서사를 바탕으로 스토리 구조를 읽는 법을 지도합니다.',
        faculty_bio_en: 'Athena School faculty guide learners through narrative structure using history and liberal arts perspectives.',
        faculty_image: '',
        preview_url: 'https://youtu.be/hVUIiTY2uS0',
      },
      {
        semester: 'Semester 2',
        title_ko: '커뮤니케이션 스킬',
        title_en: 'Communication Skills',
        desc_ko: '설득, 적극적 경청, 갈등 해결, 문화 간 커뮤니케이션을 글로벌 환경에 맞춰 훈련합니다.',
        desc_en: 'Builds practical strength in persuasion, active listening, conflict resolution, and cross-cultural communication.',
        faculty_name: 'Liberal Arts Faculty',
        faculty_title: 'Established 2022 · Core soft skills course',
        faculty_bio_ko: '교양학부 교수진이 실무형 소프트스킬을 글로벌 커뮤니케이션 관점에서 다룹니다.',
        faculty_bio_en: 'Liberal Arts faculty teach the course through a practical soft-skills lens for global settings.',
        faculty_image: '',
        preview_url: '',
      },
      {
        semester: 'Semester 1',
        title_ko: '영화로 공부하는 리더십',
        title_en: 'Leadership through Film',
        desc_ko: '영화 속 상징적인 리더십 장면을 분석하고 개인 브랜딩과 조직 커뮤니케이션에 연결합니다.',
        desc_en: 'Analyzes leadership through film and connects cinematic storytelling to branding and organizational communication.',
        faculty_name: 'Liberal Arts Faculty',
        faculty_title: '2026 new production · Latest content',
        faculty_bio_ko: '최신 제작 콘텐츠를 바탕으로 영화 텍스트를 리더십 학습 도구로 풀어내는 교수진입니다.',
        faculty_bio_en: 'Uses newly produced course material to turn film into a practical leadership-learning tool.',
        faculty_image: '',
        preview_url: 'https://www.youtube.com/watch?v=3NMcHPPKzT8&t=30s',
      },
      {
        semester: 'Semester 1 + 2',
        title_ko: '아나운서에게 배우는 성공 스피치',
        title_en: 'Successful Speech by Professional Announcers',
        desc_ko: '발성, 대본 구성, 즉흥 발표, 카메라 자신감까지 방송 현장의 기준으로 훈련합니다.',
        desc_en: 'Covers voice projection, script writing, impromptu speaking, and camera confidence through broadcast-style training.',
        faculty_name: 'Professional Announcer Faculty',
        faculty_title: 'Industry expert · Real broadcast experience',
        faculty_bio_ko: '실제 방송 경험을 가진 아나운서 출신 교수진이 전달력과 현장감을 동시에 훈련합니다.',
        faculty_bio_en: 'Broadcast professionals train learners in delivery, presence, and real on-camera confidence.',
        faculty_image: '',
        preview_url: 'https://www.youtube.com/watch?v=hO2LV9mtxeQ',
      },
    ],
    cost_full: 600,
    cost_currency: 'USD',
  },
  'youtube-master': {
    overview_ko: `<p><strong>School of Business Administration · CUFS</strong></p><p>YouTube Master는 유튜브를 취미가 아니라 <strong>실제 수익화 가능한 커리어 플랫폼</strong>으로 다루는 과정입니다. 원문 문서에서 말하듯, 이 과정의 포트폴리오는 단순 이력서가 아니라 학습 중 직접 만드는 실제 채널입니다.</p><p>기획, 브랜딩, 촬영, 편집, 마케팅을 단계적으로 익히며 과정 안에서 직접 채널 포트폴리오를 만듭니다. 개인 크리에이터, 브랜드 마케터, 영상 기반 창업을 꿈꾸는 학습자에게 적합합니다.</p>`,
    overview_en: `<p><strong>School of Business Administration · CUFS</strong></p><p>YouTube Master treats YouTube not as a hobby, but as a <strong>real career platform</strong>. As described in the source document, the portfolio here is not a resume, but a live channel built during the program itself.</p><p>Learners move step by step through strategy, branding, shooting, editing, and channel growth while building a live portfolio channel during the program. It fits aspiring creators, digital marketers, and learners who want a practical route into video-led entrepreneurship.</p>`,
    curriculum_ko: `<ul><li><span class="pd-course-chip">Semester 2</span><strong>YouTube 첫걸음</strong><em class="pd-course-meta">Prof. Park In-young (박인영) · Digital Marketing &amp; YouTube specialist</em>채널 세팅, 콘텐츠 기획, 썸네일, SEO, 알고리즘 이해를 바탕으로 첫 영상을 실제로 올리는 것을 목표로 합니다.<a href="https://youtu.be/ou7BK6qnOpA" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 1</span><strong>YouTube 기획과 마케팅</strong><em class="pd-course-meta">Prof. Park In-young (박인영) · Marketing Management</em>니치 선정, 콘텐츠 캘린더, 브랜드 협업, 수익화, 데이터 기반 성장 전략을 설계합니다.<a href="https://youtu.be/8eUZlFjhV0Q" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 2</span><strong>YouTube 영상촬영과 편집</strong><em class="pd-course-meta">Prof. Lee Su-ji (이수지) · Professional video production instructor</em>카메라, 조명, 오디오, Premiere Pro / DaVinci 기반 편집, 색보정, 멀티플랫폼 출력까지 다룹니다.<a href="https://youtu.be/KdEzvfysGFo" target="_blank" rel="noopener">Watch lecture preview</a></li></ul>`,
    curriculum_en: `<ul><li><span class="pd-course-chip">Semester 2</span><strong>YouTube Basics</strong><em class="pd-course-meta">Prof. Park In-young · Digital Marketing &amp; YouTube specialist</em>Cover channel setup, planning, thumbnails, SEO, and the YouTube algorithm with the goal of publishing a first live video.<a href="https://youtu.be/ou7BK6qnOpA" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 1</span><strong>YouTube Planning &amp; Marketing</strong><em class="pd-course-meta">Prof. Park In-young · Marketing Management</em>Learn niche strategy, content calendars, brand collaboration, monetization, and analytics-driven growth.<a href="https://youtu.be/8eUZlFjhV0Q" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 2</span><strong>YouTube Video Shooting &amp; Editing</strong><em class="pd-course-meta">Prof. Lee Su-ji · Professional video production instructor</em>Practice camera work, lighting, audio, editing workflows in Premiere Pro / DaVinci, color grading, and multi-platform exports.<a href="https://youtu.be/KdEzvfysGFo" target="_blank" rel="noopener">Watch lecture preview</a></li></ul>`,
    outcomes_ko: `<ul><li>CUFS 마이크로디그리 수료증</li><li>실제 운영 가능한 유튜브 채널 포트폴리오</li><li>전문 수준의 촬영 및 편집 역량</li><li>콘텐츠 마케팅과 수익화 이해</li><li>YouTube, TikTok, Reels로 확장 가능한 플랫폼 공통 역량</li></ul>`,
    outcomes_en: `<ul><li>A CUFS micro-degree certificate</li><li>A live YouTube channel that works as a portfolio</li><li>Professional-level shooting and editing skills</li><li>Content marketing and monetization knowledge</li><li>Transferable platform skills for YouTube, TikTok, and Reels</li></ul>`,
    prerequisites_ko: `<p>영상 제작 경험이 없어도 시작할 수 있습니다. 콘텐츠 아이디어를 실제 채널로 발전시키고 싶은 입문자에게 적합합니다.</p>`,
    prerequisites_en: `<p>No prior production background is required. The program is designed for beginners who want to turn content ideas into a real creator channel.</p>`,
    duration: '~1 year · 9 credits',
    format: '100% online',
    language_required: 'English-friendly / Korean support',
    certification: 'CUFS Micro-Degree Certificate',
    instructor_name: 'Prof. Park In-young · Prof. Lee Su-ji',
    instructor_title: 'Digital Marketing / Video Production Faculty',
    instructor_bio_ko: `<p>박인영 교수와 이수지 교수를 중심으로, 디지털 마케팅과 영상 제작 실무를 연결한 커리큘럼을 운영합니다.</p>`,
    instructor_bio_en: `<p>Prof. Park In-young and Prof. Lee Su-ji lead the track, combining digital marketing strategy with hands-on video production practice.</p>`,
    courses_json: [
      {
        semester: 'Semester 2',
        title_ko: 'YouTube 첫걸음',
        title_en: 'YouTube Basics',
        desc_ko: '채널 세팅, 콘텐츠 기획, 썸네일, SEO, 알고리즘 이해를 바탕으로 첫 영상을 실제로 올립니다.',
        desc_en: 'Covers channel setup, planning, thumbnails, SEO, and the algorithm with the goal of publishing a first live video.',
        faculty_name: 'Prof. Park In-young (박인영)',
        faculty_title: 'Business Dept. · Digital Marketing & YouTube specialist',
        faculty_bio_ko: '디지털 마케팅과 유튜브 성장 전략을 전문으로 하며, 채널 기획과 초기 운영 설계에 강점을 가진 교수입니다.',
        faculty_bio_en: 'Specializes in digital marketing and YouTube growth strategy, with a focus on channel planning and launch execution.',
        faculty_image: '',
        preview_url: 'https://youtu.be/ou7BK6qnOpA',
      },
      {
        semester: 'Semester 1',
        title_ko: 'YouTube 기획과 마케팅',
        title_en: 'YouTube Planning & Marketing',
        desc_ko: '니치 선정, 콘텐츠 캘린더, 브랜드 협업, 수익화, 데이터 기반 성장 전략을 설계합니다.',
        desc_en: 'Focuses on niche strategy, content calendars, brand collaborations, monetization, and analytics-driven growth.',
        faculty_name: 'Prof. Park In-young (박인영)',
        faculty_title: 'Marketing Management · AI Digital Content expert',
        faculty_bio_ko: '브랜드와 채널을 동시에 성장시키는 콘텐츠 전략을 다루며, 데이터 기반 마케팅 설계에 강합니다.',
        faculty_bio_en: 'Teaches content strategy that grows both brand and channel, with strength in analytics-based marketing design.',
        faculty_image: '',
        preview_url: 'https://youtu.be/8eUZlFjhV0Q',
      },
      {
        semester: 'Semester 2',
        title_ko: 'YouTube 영상촬영과 편집',
        title_en: 'YouTube Video Shooting & Editing',
        desc_ko: '카메라, 조명, 오디오, Premiere Pro / DaVinci 기반 편집, 색보정, 멀티플랫폼 출력까지 다룹니다.',
        desc_en: 'Covers camera work, lighting, audio, editing workflows in Premiere Pro / DaVinci, color grading, and multi-platform export.',
        faculty_name: 'Prof. Lee Su-ji (이수지)',
        faculty_title: 'Business Dept. · Professional video production instructor',
        faculty_bio_ko: '영상 제작 실무 중심으로 촬영과 편집 전 과정을 가르치며, 유튜브 외 숏폼 플랫폼 확장까지 다룹니다.',
        faculty_bio_en: 'Teaches practical end-to-end production skills across shooting, editing, and multi-platform short-form delivery.',
        faculty_image: '',
        preview_url: 'https://youtu.be/KdEzvfysGFo',
      },
    ],
    cost_full: 540,
    cost_currency: 'USD',
  },
  'k-beauty-styling': {
    overview_ko: `<p><strong>K-Beauty Department · CUFS</strong></p><p>Basic K-Beauty Styling은 빠르게 성장하는 글로벌 K-뷰티 시장에 맞춰 <strong>색채, 네일, 피부, 메이크업의 4대 기초 역량</strong>을 한 번에 익히는 과정입니다. 참고 문서가 강조한 것처럼, 온라인으로 시작하지만 창업과 실무 연결을 목표로 한 구조입니다.</p><p>뷰티 아티스트, 콘텐츠 크리에이터, 살롱 창업을 꿈꾸는 학습자에게 특히 적합하며, 한국 뷰티 트렌드를 실무 감각과 함께 익힐 수 있도록 구성되었습니다.</p>`,
    overview_en: `<p><strong>K-Beauty Department · CUFS</strong></p><p>Basic K-Beauty Styling is designed for learners who want the <strong>four core foundations of K-beauty</strong> in one path: color, nails, skincare, and makeup. As emphasized in the reference document, the goal is not only online learning but a path that can grow into real practice and entrepreneurship.</p><p>It is a strong fit for aspiring beauty artists, creators, and future salon founders who want direct exposure to Korean beauty trends and practical skill-building.</p>`,
    curriculum_ko: `<ul><li><span class="pd-course-chip">Semester 1</span><strong>미용색채학</strong><em class="pd-course-meta">K-Beauty Department Faculty · 1st year foundation</em>퍼스널 컬러, 색 조화, 다양한 피부 톤을 위한 팔레트 구성, 트렌드 예측까지 K-뷰티 색채의 과학을 배웁니다.<a href="https://www.youtube.com/watch?v=0s5sPZYuX9k&t=115s" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 1</span><strong>기초네일케어</strong><em class="pd-course-meta">Prof. Han Song-i (한송이) · Nail art specialist</em>매니큐어, 페디큐어, 젤 네일, 위생 기준, 도구 관리까지 살롱 기본기를 익힙니다.<a href="https://youtu.be/pTvt4ruBGrw" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 1</span><strong>기초피부관리 실습</strong><em class="pd-course-meta">Prof. Kim Ji-young (김지영) · Skin care &amp; body therapy specialist</em>피부 타입 분석, 클렌징, 마사지, 마스크, 10-step 루틴과 성분 이해를 함께 다룹니다.<a href="https://youtu.be/_JKTA5dyHis" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 2</span><strong>기초메이크업실습</strong><em class="pd-course-meta">Prof. Jeong Hyun-hyung (정현형) · Makeup practice specialist</em>베이스, 컨투어링, 아이·립 메이크업, 글래스 스킨과 그라데이션 립 같은 대표 K-뷰티 룩을 실습합니다.<a href="https://youtu.be/HiJdCKb9tw4" target="_blank" rel="noopener">Watch lecture preview</a></li></ul>`,
    curriculum_en: `<ul><li><span class="pd-course-chip">Semester 1</span><strong>Beauty Color Theory</strong><em class="pd-course-meta">K-Beauty Department Faculty · 1st year foundation</em>Learn personal color analysis, harmony, palette creation for diverse skin tones, and trend forecasting.<a href="https://www.youtube.com/watch?v=0s5sPZYuX9k&t=115s" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 1</span><strong>Basic Nail Care</strong><em class="pd-course-meta">Prof. Han Song-i · Nail art specialist</em>Cover manicure and pedicure basics, gel nails, hygiene standards, and salon tool management.<a href="https://youtu.be/pTvt4ruBGrw" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 1</span><strong>Basic Skin Care Practice</strong><em class="pd-course-meta">Prof. Kim Ji-young · Skin care &amp; body therapy specialist</em>Study skin analysis, cleansing, massage, mask routines, ingredient science, and Korean skincare structure.<a href="https://youtu.be/_JKTA5dyHis" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 2</span><strong>Basic Makeup Practice</strong><em class="pd-course-meta">Prof. Jeong Hyun-hyung · Makeup practice specialist</em>Practice base work, contouring, eye and lip design, and signature K-beauty looks such as glass skin and gradient lips.<a href="https://youtu.be/HiJdCKb9tw4" target="_blank" rel="noopener">Watch lecture preview</a></li></ul>`,
    outcomes_ko: `<ul><li>CUFS 마이크로디그리 수료증</li><li>컬러, 네일, 피부관리, 메이크업의 4개 기초 스킬셋</li><li>K-뷰티 살롱 창업을 위한 기본 토대</li><li>뷰티 콘텐츠 제작과 트렌드 해석 역량</li><li>글로벌 K-뷰티 시장에 진입할 수 있는 실무 감각</li></ul>`,
    outcomes_en: `<ul><li>A CUFS micro-degree certificate</li><li>Four practical beauty skill sets across color, nails, skincare, and makeup</li><li>A foundation for future K-beauty salon or freelance work</li><li>Beauty content creation and trend-reading ability</li><li>Practical access to the global K-beauty market</li></ul>`,
    prerequisites_ko: `<p>초보자도 지원할 수 있습니다. 뷰티 실습에 대한 관심과 기본적인 자기주도 학습 태도가 있으면 충분합니다.</p>`,
    prerequisites_en: `<p>Beginners are welcome. Curiosity about beauty practice and the discipline to learn hands-on techniques online are the main expectations.</p>`,
    duration: '~1 year · 10 credits',
    format: '100% online',
    language_required: 'English-friendly / Korean support',
    certification: 'CUFS Micro-Degree Certificate',
    instructor_name: 'Prof. Han Song-i · Prof. Kim Ji-young · Prof. Jeong Hyun-hyung',
    instructor_title: 'K-Beauty Department Faculty',
    instructor_bio_ko: `<p>한송이, 김지영, 정현형 교수 등 K-Beauty 학과 교수진이 네일, 피부, 메이크업, 색채 실습을 분야별로 지도합니다.</p>`,
    instructor_bio_en: `<p>The K-Beauty Department faculty, including Prof. Han Song-i, Prof. Kim Ji-young, and Prof. Jeong Hyun-hyung, guide the track across nails, skincare, makeup, and color practice.</p>`,
    courses_json: [
      {
        semester: 'Semester 1',
        title_ko: '미용색채학',
        title_en: 'Beauty Color Theory',
        desc_ko: '퍼스널 컬러, 색 조화, 다양한 피부 톤을 위한 팔레트 구성, 트렌드 예측까지 K-뷰티 색채의 과학을 배웁니다.',
        desc_en: 'Teaches personal color analysis, harmony, palette creation for diverse skin tones, and trend forecasting.',
        faculty_name: 'K-Beauty Department Faculty',
        faculty_title: '1st year foundation · 2024 production',
        faculty_bio_ko: 'K-Beauty 학과 기초 교수진이 색채 이론과 트렌드 감각을 실무 기반으로 설명합니다.',
        faculty_bio_en: 'The K-Beauty foundation faculty teach color theory and trend awareness as practical beauty tools.',
        faculty_image: '',
        preview_url: 'https://www.youtube.com/watch?v=0s5sPZYuX9k&t=115s',
      },
      {
        semester: 'Semester 1',
        title_ko: '기초네일케어',
        title_en: 'Basic Nail Care',
        desc_ko: '매니큐어, 페디큐어, 젤 네일, 위생 기준, 도구 관리까지 살롱 기본기를 익힙니다.',
        desc_en: 'Covers manicure and pedicure basics, gel nails, hygiene standards, and salon tool management.',
        faculty_name: 'Prof. Han Song-i (한송이)',
        faculty_title: 'K-Beauty Dept. · Nail art specialist',
        faculty_bio_ko: '네일 아트 실무 중심의 교수로, 위생과 디자인을 함께 갖춘 기본기를 강조합니다.',
        faculty_bio_en: 'A nail art specialist who teaches practical salon fundamentals with equal attention to hygiene and design.',
        faculty_image: '',
        preview_url: 'https://youtu.be/pTvt4ruBGrw',
      },
      {
        semester: 'Semester 1',
        title_ko: '기초피부관리 실습',
        title_en: 'Basic Skin Care Practice',
        desc_ko: '피부 타입 분석, 클렌징, 마사지, 마스크, 10-step 루틴과 성분 이해를 함께 다룹니다.',
        desc_en: 'Covers skin analysis, cleansing, massage, mask routines, ingredient science, and Korean skincare structure.',
        faculty_name: 'Prof. Kim Ji-young (김지영)',
        faculty_title: 'K-Beauty Dept. · Skin care & body therapy specialist',
        faculty_bio_ko: '피부관리와 바디 테라피를 전문으로 하며, K-뷰티 스킨케어 프로토콜을 실습 중심으로 지도합니다.',
        faculty_bio_en: 'Specializes in skincare and body therapy, guiding learners through Korean skincare practice with hands-on focus.',
        faculty_image: '',
        preview_url: 'https://youtu.be/_JKTA5dyHis',
      },
      {
        semester: 'Semester 2',
        title_ko: '기초메이크업실습',
        title_en: 'Basic Makeup Practice',
        desc_ko: '베이스, 컨투어링, 아이·립 메이크업, 글래스 스킨과 그라데이션 립 같은 대표 K-뷰티 룩을 실습합니다.',
        desc_en: 'Covers base work, contouring, eye and lip design, and signature K-beauty looks such as glass skin and gradient lips.',
        faculty_name: 'Prof. Jeong Hyun-hyung (정현형)',
        faculty_title: 'K-Beauty Dept. · Makeup practice specialist',
        faculty_bio_ko: '메이크업 실습 중심의 교수로, 글로벌 시장에서 통하는 K-뷰티 표현법을 단계적으로 가르칩니다.',
        faculty_bio_en: 'Focuses on hands-on makeup practice and teaches step-by-step K-beauty looks with global appeal.',
        faculty_image: '',
        preview_url: 'https://youtu.be/HiJdCKb9tw4',
      },
    ],
    cost_full: 600,
    cost_currency: 'USD',
  },
  'business-korean': {
    overview_ko: `<p><strong>Korean Language Department · CUFS</strong></p><p>Business Korean은 한국 기업 환경에서 바로 쓰이는 한국어를 집중적으로 훈련하는 과정입니다. 참고 문서의 핵심 메시지처럼, 한국 기업과 함께 일하려면 단순 회화가 아니라 이메일, 문서, 회의, 발표, 협상까지 가능한 언어가 필요합니다.</p><p>이 과정을 통해 <strong>TOPIK 3~4 수준의 실전형 비즈니스 한국어</strong>를 목표로 하며, 한국 취업 또는 한국 기업과의 협업을 준비하는 글로벌 학습자에게 가장 직접적인 트랙이 됩니다.</p>`,
    overview_en: `<p><strong>Korean Language Department · CUFS</strong></p><p>Business Korean is a targeted track for learners who want Korean they can actually use in professional settings. As the source document emphasizes, professional work with Korean companies requires more than casual conversation: it requires email, documents, meetings, presentations, and negotiations.</p><p>The curriculum aims for <strong>TOPIK 3~4 level business-ready fluency</strong> and is the most direct route for global learners preparing for Korean employment or collaboration with Korean companies.</p>`,
    curriculum_ko: `<ul><li><span class="pd-course-chip">Semester 2</span><strong>비즈니스 한국어 입문</strong><em class="pd-course-meta">Prof. Song Eun-jung (송은정) · Korean teaching methods expert</em>인사, 자기소개, 사무실 어휘, 이메일, 전화 예절 등 기업문화에 맞는 기본기를 다집니다.<a href="https://youtu.be/rzVLDPoO6vs" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 2</span><strong>실전비즈니스 읽기쓰기</strong><em class="pd-course-meta">Prof. Ahn Jung-min (안정민) · Business Korean specialist</em>계약서, 보고서, 메모를 읽고 존댓말을 포함한 실무 문서를 작성합니다.<a href="https://youtu.be/98BW_tuOt5Y" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 1</span><strong>실전비즈니스 말하기듣기</strong><em class="pd-course-meta">Korean Department Faculty · Latest curriculum</em>회의, 협상, 고객 통화, 직장 내 대화를 실제 비즈니스 시나리오 롤플레잉으로 훈련합니다.</li><li><span class="pd-course-chip">Semester 1</span><strong>비즈니스 한국어 프레젠테이션</strong><em class="pd-course-meta">Korean Department Faculty · Presentation mastery</em>슬라이드 디자인, 데이터 스토리텔링, 질의응답, 격식 있는 발표 매너를 익힙니다.</li></ul>`,
    curriculum_en: `<ul><li><span class="pd-course-chip">Semester 2</span><strong>Introduction to Business Korean</strong><em class="pd-course-meta">Prof. Song Eun-jung · Korean teaching methods expert</em>Start with greetings, self-introductions, office vocabulary, email writing, and phone etiquette in Korean corporate culture.<a href="https://youtu.be/rzVLDPoO6vs" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 2</span><strong>Practical Business Reading &amp; Writing</strong><em class="pd-course-meta">Prof. Ahn Jung-min · Business Korean specialist</em>Read contracts, reports, and memos while writing professional correspondence with proper honorifics.<a href="https://youtu.be/98BW_tuOt5Y" target="_blank" rel="noopener">Watch lecture preview</a></li><li><span class="pd-course-chip">Semester 1</span><strong>Practical Business Speaking &amp; Listening</strong><em class="pd-course-meta">Korean Department Faculty · Latest curriculum</em>Role-play meetings, negotiations, client calls, and workplace conversation with realistic business scenarios.</li><li><span class="pd-course-chip">Semester 1</span><strong>Business Korean Presentation</strong><em class="pd-course-meta">Korean Department Faculty · Presentation mastery</em>Build slide design, data storytelling, persuasive delivery, Q&amp;A handling, and formal presentation etiquette.</li></ul>`,
    outcomes_ko: `<ul><li>CUFS 마이크로디그리 수료증</li><li>TOPIK 3~4 수준의 비즈니스 한국어 역량</li><li>이메일, 문서, 발표, 협상 등 실전 업무 표현</li><li>한국 기업 취업과 협업으로 이어지는 언어 기반</li><li>K-Point +10과 연결되는 한국 취업 비자 경로 이해</li></ul>`,
    outcomes_en: `<ul><li>A CUFS micro-degree certificate</li><li>TOPIK 3~4 level business Korean proficiency</li><li>Professional email, document, presentation, and negotiation language</li><li>A language bridge into Korean companies and cross-border work</li><li>Clear understanding of the K-Point +10 employment-visa pathway</li></ul>`,
    prerequisites_ko: `<p>초급 학습자도 시작할 수 있지만, 꾸준히 한국어를 연습할 의지가 중요합니다. 한국 취업, 현지 파트너십, 비즈니스 커뮤니케이션에 관심 있는 학습자에게 적합합니다.</p>`,
    prerequisites_en: `<p>Beginners can start here, but steady commitment to Korean practice is important. The track is ideal for learners interested in Korean employment, partnerships, or business communication.</p>`,
    duration: '~1 year · 10 credits',
    format: '100% online',
    language_required: 'English-friendly / Korean immersion',
    certification: 'CUFS Micro-Degree Certificate',
    instructor_name: 'Prof. Song Eun-jung · Prof. Ahn Jung-min',
    instructor_title: 'Korean Language Department Faculty',
    instructor_bio_ko: `<p>송은정 교수와 안정민 교수를 중심으로, 한국어교육과 비즈니스 커뮤니케이션 전문성이 결합된 교수진이 과정을 운영합니다.</p>`,
    instructor_bio_en: `<p>Led by Prof. Song Eun-jung and Prof. Ahn Jung-min, the track combines Korean-language pedagogy with practical business communication training.</p>`,
    courses_json: [
      {
        semester: 'Semester 2',
        title_ko: '비즈니스 한국어 입문',
        title_en: 'Introduction to Business Korean',
        desc_ko: '인사, 자기소개, 사무실 어휘, 이메일, 전화 예절 등 기업문화에 맞는 기본기를 다집니다.',
        desc_en: 'Builds core language foundations for Korean corporate culture including greetings, self-introductions, emails, and phone etiquette.',
        faculty_name: 'Prof. Song Eun-jung (송은정)',
        faculty_title: 'Korean Dept. & Graduate School · Korean teaching methods expert',
        faculty_bio_ko: '한국어교육 방법론을 전문으로 하며, 초급 학습자가 업무 장면으로 자연스럽게 넘어가도록 설계하는 교수입니다.',
        faculty_bio_en: 'Specializes in Korean teaching methodology and helps beginners move smoothly into workplace communication.',
        faculty_image: '',
        preview_url: 'https://youtu.be/rzVLDPoO6vs',
      },
      {
        semester: 'Semester 2',
        title_ko: '실전비즈니스 읽기쓰기',
        title_en: 'Practical Business Reading & Writing',
        desc_ko: '계약서, 보고서, 메모를 읽고 존댓말을 포함한 실무 문서를 작성합니다.',
        desc_en: 'Trains learners to read contracts, reports, and memos while writing professional Korean business correspondence.',
        faculty_name: 'Prof. Ahn Jung-min (안정민)',
        faculty_title: 'Korean Dept. · Business Korean specialist',
        faculty_bio_ko: '비즈니스 한국어를 전문으로 하며, 실전 문서와 읽기쓰기 훈련을 통해 업무 표현을 체계화합니다.',
        faculty_bio_en: 'A business Korean specialist focused on practical documents and structured reading-writing training.',
        faculty_image: '',
        preview_url: 'https://youtu.be/98BW_tuOt5Y',
      },
      {
        semester: 'Semester 1',
        title_ko: '실전비즈니스 말하기듣기',
        title_en: 'Practical Business Speaking & Listening',
        desc_ko: '회의, 협상, 고객 통화, 직장 내 대화를 실제 비즈니스 시나리오 롤플레잉으로 훈련합니다.',
        desc_en: 'Uses realistic business scenarios to train meetings, negotiations, client calls, and workplace conversation.',
        faculty_name: 'Korean Department Faculty',
        faculty_title: '2026 new production · Latest curriculum',
        faculty_bio_ko: '최신 커리큘럼을 반영해 듣기와 말하기를 현장형 롤플레이로 가르치는 교수진입니다.',
        faculty_bio_en: 'Teaches listening and speaking through workplace role-play using the latest curriculum design.',
        faculty_image: '',
        preview_url: '',
      },
      {
        semester: 'Semester 1',
        title_ko: '비즈니스 한국어 프레젠테이션',
        title_en: 'Business Korean Presentation',
        desc_ko: '슬라이드 디자인, 데이터 스토리텔링, 질의응답, 격식 있는 발표 매너를 익힙니다.',
        desc_en: 'Covers slide design, data storytelling, Q&A handling, and formal presentation etiquette.',
        faculty_name: 'Korean Department Faculty',
        faculty_title: '4th year advanced · Presentation mastery',
        faculty_bio_ko: '고급 발표 역량과 비즈니스 전달력을 중심으로 프레젠테이션 완성도를 높이는 교수진입니다.',
        faculty_bio_en: 'Focuses on advanced presentation fluency and polished business delivery in Korean.',
        faculty_image: '',
        preview_url: '',
      },
    ],
    cost_full: 600,
    cost_currency: 'USD',
  },
};

const SITE_INDEX  = '/ui_kits/website/index.html';
const SITE_ADMIN  = '/ui_kits/website/admin.html';

// Friendly URLs that should serve the public SPA shell.
// The SPA reads location.pathname on boot and shows the matching view.
const SPA_PATHS = new Set([
  '/', '/index.html',
  '/about', '/programs', '/apply',
  '/partners', '/stories', '/news', '/contact',
  '/team', '/scholarships', '/member', '/receipt',
  '/verify', '/reset-password', '/activate',
  '/401', '/403', '/404', '/500', '/503', '/offline',
]);

// Friendly URLs for the admin shell.
const ADMIN_PATHS = new Set(['/admin', '/admin/', '/admin.html']);

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

async function readContentFromKv(env) {
  const raw = await env.CONTENT_KV.get(CONTENT_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getDefaultProgramDetail(id) {
  const row = DEFAULT_PROGRAM_DETAILS[id];
  if (!row) return null;
  return { program_id: id, ...deepClone(row) };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const isHead = request.method.toUpperCase() === 'HEAD';
    const headStrip = (resp) => isHead ? new Response(null, { status: resp.status, headers: resp.headers }) : resp;

    if (url.pathname.startsWith('/api/')) {
      try {
        return withSecurityHeaders(headStrip(await handleApi(request, env, url, ctx)));
      } catch (err) {
        // Log every uncaught server error to D1 for the admin error console
        ctx.waitUntil(logError(env, {
          level: 'error', source: 'server',
          message: String(err && err.message || err),
          stack: err && err.stack ? String(err.stack).slice(0, 4000) : null,
          path: url.pathname, method: request.method,
          status: 500,
          ip: request.headers.get('cf-connecting-ip') || '',
          user_agent: (request.headers.get('user-agent') || '').slice(0, 500),
        }));
        // P0-5 — never echo the raw exception message back to the
        // caller. Stack traces / SQL errors / table names are useful to
        // an attacker and useless to the legitimate user.
        return withSecurityHeaders(json({ error: 'internal' }, 500));
      }
    }

    // SEO endpoints
    if (url.pathname === '/sitemap.xml')  return withSecurityHeaders(headStrip(await sitemapXml(env, url)));
    if (url.pathname === '/robots.txt')   return withSecurityHeaders(headStrip(await robotsTxt(url)));

    // Friendly URL → real asset path. Use the same Request (preserves headers,
    // method) but with a rewritten URL. ASSETS binding handles HEAD natively.
    if (ADMIN_PATHS.has(url.pathname)) {
      return withSecurityHeaders(await env.ASSETS.fetch(rewriteRequest(request, SITE_ADMIN)));
    }
    if (SPA_PATHS.has(url.pathname)
        || url.pathname.startsWith('/program/')
        || url.pathname.startsWith('/news/')
        || url.pathname.startsWith('/stories/')) {
      return withSecurityHeaders(await env.ASSETS.fetch(rewriteRequest(request, SITE_INDEX)));
    }

    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },

  // Cloudflare Email Workers entry point. Triggered by an Email Routing rule
  // pointing at this worker (configured in the dashboard, NOT in code). The
  // operator must enable Email Routing for koreadreampath.com and add a rule
  // per managed address (hello@, partner@, info@ → "Send to a Worker" →
  // dream-path). Without those rules this handler simply never runs.
  async email(message, env, ctx) {
    try {
      const subject    = decodeRFC2047(message.headers.get('subject') || '');
      const messageId  = message.headers.get('message-id') || '';
      const inReplyTo  = message.headers.get('in-reply-to') || '';
      const fromName   = parseDisplayName(message.from || '');
      const fromAddr   = parseEmailAddress(message.from || '');
      // Read the raw RFC 822 message into memory. CF caps email size at
      // ~25 MB so this is safe.
      const raw = await readEmailRaw(message.raw);
      const { text, html, attachments } = extractParts(raw);
      // P1-1: inbound HTML comes from arbitrary external senders. Sanitize
      // hard before persisting — admin views these via dangerouslySetInnerHTML
      // (or an iframe), and the inbox is the most adversarial channel we
      // have. Plain-text body stays untouched.
      const safeHtml = html ? await sanitizeHtml(html) : '';
      const ts = new Date().toISOString();
      // v01.067 (Phase 3): encrypt subject / body_text / body_html when key
      // is set. Plaintext columns are NULLed so a DB dump carries only one
      // copy. Inbound is the most adversarial PII channel — external senders
      // routinely include national IDs, family situation, finances, health.
      const subjectRaw  = subject || '(no subject)';
      const bodyTextRaw = text || '';
      const subjectEnc  = await encryptPii(env, subjectRaw);
      const bodyTextEnc = bodyTextRaw ? await encryptPii(env, bodyTextRaw) : null;
      const bodyHtmlEnc = safeHtml    ? await encryptPii(env, safeHtml)    : null;
      const subjectPlain  = subjectEnc  ? null : subjectRaw;
      const bodyTextPlain = bodyTextEnc ? null : bodyTextRaw;
      const bodyHtmlPlain = bodyHtmlEnc ? null : safeHtml;
      const ins = await env.DB.prepare(
        'INSERT INTO inbound_emails (ts, to_addr, from_addr, from_name, subject, subject_enc, body_text, body_text_enc, body_html, body_html_enc, raw_size, message_id, in_reply_to, sanitized_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        ts, message.to, fromAddr, fromName,
        subjectPlain, subjectEnc,
        bodyTextPlain, bodyTextEnc,
        bodyHtmlPlain, bodyHtmlEnc,
        message.rawSize || raw.length,
        messageId, inReplyTo, ts
      ).run();
      const emailId = ins.meta?.last_row_id;
      // Upload attachments to R2. Per-attachment failures are logged (not
      // swallowed) so the operator can diagnose binding/permission issues.
      // 50MB / 10-files cap; oversize truncates rather than bouncing.
      let stored = 0;
      const attErrors = [];
      if (emailId && attachments.length) {
        if (!env.ATTACHMENTS) {
          attErrors.push('R2 binding ATTACHMENTS missing — redeploy needed');
        } else {
          const MAX_FILES = 10, MAX_TOTAL = 50 * 1024 * 1024;
          let total = 0;
          const accepted = [];
          for (const a of attachments) {
            if (accepted.length >= MAX_FILES) { attErrors.push(`skipped ${a.filename}: file cap`); break; }
            if (total + a.bytes.byteLength > MAX_TOTAL) { attErrors.push(`skipped ${a.filename}: 50MB cap`); break; }
            accepted.push(a); total += a.bytes.byteLength;
          }
          for (let i = 0; i < accepted.length; i++) {
            const a = accepted[i];
            const safe = String(a.filename || ('attachment-' + (i + 1))).replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 200);
            const key = `attachments/inbound/${emailId}/${i}-${safe}`;
            try {
              // v01.068 (Phase 4): envelope-encrypt the file bytes before
              // R2 put when the operator key is set. The DB column
              // r2_encrypted marks the encoding so the read side knows
              // whether to unwrap. Content-Type stays as the original mime
              // (R2 returns the wrapped bytes — type is for the eventual
              // download response, not for R2 to interpret the body).
              const wrapped = await encryptR2Bytes(env, a.bytes);
              await env.ATTACHMENTS.put(key, wrapped.bytes, { httpMetadata: { contentType: a.mime || 'application/octet-stream' } });
              await env.DB.prepare(
                'INSERT INTO email_attachments (email_id, side, ts, filename, mime, size, r2_key, r2_encrypted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
              ).bind(emailId, 'inbound', ts, a.filename, a.mime || 'application/octet-stream', a.bytes.byteLength, key, wrapped.encrypted ? 1 : 0).run();
              stored++;
            } catch (e) {
              attErrors.push(`${a.filename}: ${e && e.message || e}`);
            }
          }
        }
      }
      // Always emit a parse summary so we can spot silent failures from the
      // admin → 오류 로그 tab without needing wrangler tail.
      ctx.waitUntil(logError(env, {
        level: attErrors.length ? 'warn' : 'info', source: 'email_worker',
        message: `inbound stored id=${emailId} from=${fromAddr} to=${message.to} att_detected=${attachments.length} att_stored=${stored}` +
                 (attErrors.length ? ' errors=' + attErrors.join(' | ') : ''),
        path: 'email/' + (message.to || 'unknown'), method: 'EMAIL', status: 200,
      }));
    } catch (err) {
      // Don't reject the message — that bounces it back to the sender.
      // Log instead so we can debug.
      ctx.waitUntil(logError(env, {
        level: 'error', source: 'email_worker',
        message: 'inbound email parse/store failed: ' + (err && err.message || err),
        stack: err && err.stack ? String(err.stack).slice(0, 4000) : null,
        path: 'email/' + (message.to || 'unknown'),
        method: 'EMAIL', status: 0,
      }));
    }
  },

  // Hourly cron — wired via wrangler.jsonc triggers.crons. Two jobs:
  //   1. Send activation reminders to pending signups whose code is still
  //      valid but who haven't acted on the original email in ≥24h.
  //   2. Hard-delete pending signups whose 72h activation window expired.
  // Designed to be cheap: a single SELECT per job + bounded UPDATE/DELETE.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(activationCron(env));
    ctx.waitUntil(applyDraftCron(env));   // v01.031 — purge drafts older than 72h
    ctx.waitUntil(piiBackfillCron(env));  // v01.043 — encrypt legacy plaintext phone rows
    ctx.waitUntil(inboundSanitizeCron(env)); // v01.043 — re-sanitize legacy inbound HTML
    ctx.waitUntil(piiRetentionCron(env));    // v01.070 — hard-delete past retention window
  },
};

// ── Email parsing helpers (no npm deps; raw MIME → text/html bodies) ─────
async function readEmailRaw(stream) {
  const chunks = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  let total = 0; chunks.forEach(c => total += c.length);
  const all = new Uint8Array(total); let off = 0;
  for (const c of chunks) { all.set(c, off); off += c.length; }
  return new TextDecoder('utf-8').decode(all);
}
// "John Doe <john@example.com>" → "John Doe"; bare addresses → ''.
function parseDisplayName(addr) {
  const m = addr.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/);
  return m ? m[1].trim() : '';
}
function parseEmailAddress(addr) {
  const m = addr.match(/<([^>]+)>/);
  return (m ? m[1] : addr).trim().toLowerCase();
}
// Decode RFC 2047 encoded-words (=?charset?B?...?= or =?charset?Q?...?=).
// Subject lines from non-ASCII senders are usually wrapped this way.
function decodeRFC2047(s) {
  if (!s) return s;
  return s.replace(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi, (_, charset, enc, encoded) => {
    try {
      let bytes;
      if (enc.toUpperCase() === 'B') {
        const bin = atob(encoded);
        bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      } else {
        const out = [];
        for (let i = 0; i < encoded.length; i++) {
          const c = encoded[i];
          if (c === '=' && i + 2 < encoded.length) {
            out.push(parseInt(encoded.substr(i+1, 2), 16)); i += 2;
          } else if (c === '_') out.push(0x20);
          else out.push(encoded.charCodeAt(i));
        }
        bytes = new Uint8Array(out);
      }
      return new TextDecoder(charset).decode(bytes);
    } catch { return _; }
  }).replace(/\?=\s+=\?/g, '?==?');  // join adjacent encoded-words
}
// Decode a single part's body to a Uint8Array based on Content-Transfer-Encoding.
function decodePartBytes(body, cte) {
  const enc = (cte || '7bit').toLowerCase().trim();
  try {
    if (enc === 'base64') {
      const bin = atob(body.replace(/\s/g, ''));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    if (enc === 'quoted-printable') {
      const collapsed = body.replace(/=\r?\n/g, '');
      const arr = [];
      for (let i = 0; i < collapsed.length; i++) {
        if (collapsed[i] === '=' && i + 2 < collapsed.length) {
          arr.push(parseInt(collapsed.substr(i+1, 2), 16)); i += 2;
        } else arr.push(collapsed.charCodeAt(i));
      }
      return new Uint8Array(arr);
    }
  } catch {}
  // 7bit / 8bit / binary: assume text; encode as UTF-8 bytes.
  return new TextEncoder().encode(body);
}

// Extract { text, html, attachments[] } from a full RFC 822 message.
// Walks multipart/* recursively. Parts with Content-Disposition: attachment
// (or any inline part with a filename / Content-Type name= parameter)
// are collected as attachments; the first text/plain and text/html parts
// without an attachment marker become the body.
function extractParts(raw) {
  // Normalize bare-LF line endings to CRLF so the rest of the parser can
  // assume \r\n consistently. Some senders (and forwarders) emit LF-only.
  raw = raw.replace(/\r?\n/g, '\r\n');
  const out = { texts: [], htmls: [], attachments: [] };
  function walk(part) {
    const sep = part.indexOf('\r\n\r\n');
    if (sep < 0) return;
    const headers = part.slice(0, sep);
    const body    = part.slice(sep + 4);
    const unfold  = s => s ? s.replace(/\r\n[ \t]/g, ' ').trim() : '';
    const ctMatch = headers.match(/^Content-Type:\s*([^\r\n]+(?:\r\n[ \t][^\r\n]+)*)/im);
    const ct = ctMatch ? unfold(ctMatch[1]) : 'text/plain';
    const ctLower = ct.toLowerCase();
    if (ctLower.startsWith('multipart/')) {
      const bMatch = ct.match(/boundary="?([^";\s]+)"?/i);
      if (!bMatch) return;
      const parts = body.split('--' + bMatch[1]);
      for (const p of parts) {
        const trimmed = p.replace(/^\r?\n/, '');
        if (!trimmed || trimmed.startsWith('--')) continue;
        walk(trimmed);
      }
      return;
    }
    const cteH = headers.match(/^Content-Transfer-Encoding:\s*([^\r\n]+(?:\r\n[ \t][^\r\n]+)*)/im)?.[1];
    const cte  = unfold(cteH);
    const cdH  = headers.match(/^Content-Disposition:\s*([^\r\n]+(?:\r\n[ \t][^\r\n]+)*)/im)?.[1];
    const cd   = unfold(cdH);
    const cdLow = cd.toLowerCase();
    const filenameMatch = cd.match(/filename\*?="?([^";]+)"?/i)
                       || ct.match(/name\*?="?([^";]+)"?/i);
    const looksLikeAttachment =
         cdLow.startsWith('attachment')
      || cdLow.startsWith('inline')           // gmail inline images = attachments to us
      || (!!filenameMatch && !ctLower.startsWith('text/') && !ctLower.startsWith('multipart/'));
    if (looksLikeAttachment) {
      const filename = decodeRFC2047(filenameMatch ? filenameMatch[1] : 'attachment.bin');
      // Strip the trailing CRLF that always sits before the next --boundary.
      const cleanBody = body.replace(/\r\n$/, '');
      const bytes = decodePartBytes(cleanBody, cte);
      out.attachments.push({ filename, mime: ctLower.split(';')[0].trim(), bytes });
      return;
    }
    const bytes = decodePartBytes(body, cte);
    let decoded;
    try { decoded = new TextDecoder('utf-8').decode(bytes); }
    catch { decoded = ''; }
    if (ctLower.startsWith('text/html')) out.htmls.push(decoded.trim());
    else                                 out.texts.push(decoded.trim());
  }
  walk(raw);
  return {
    text: out.texts[0] || '',
    html: out.htmls[0] || '',
    attachments: out.attachments,
  };
}

function rewriteRequest(request, newPath) {
  const u = new URL(request.url);
  u.pathname = newPath;
  return new Request(u.toString(), request);
}

// P1-5 helper — append one row to admin_audit. Always called via
// ctx.waitUntil so a logging failure (transient DB) cannot block the
// admin's real action. Caller passes the request + env + a small
// payload describing what changed.
async function writeAdminAudit(env, request, payload) {
  try {
    const user = await currentUser(request, env).catch(() => null);
    const hasAdminToken = (() => {
      const auth = request.headers.get('authorization') || '';
      if (!auth.startsWith('Bearer ')) return false;
      const provided = auth.slice(7);
      const m1 = env.ADMIN_TOKEN      && safeEqual(provided, env.ADMIN_TOKEN);
      const m2 = env.ADMIN_TOKEN_NEXT && safeEqual(provided, env.ADMIN_TOKEN_NEXT);
      return m1 || m2;
    })();
    await env.DB.prepare(
      'INSERT INTO admin_audit (ts, actor_user_id, via_admin_token, action, target_type, target_id, detail, ip, user_agent) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      new Date().toISOString(),
      user ? user.id : null,
      hasAdminToken ? 1 : 0,
      String(payload.action || '').slice(0, 64),
      payload.target_type ? String(payload.target_type).slice(0, 32) : null,
      payload.target_id ? String(payload.target_id).slice(0, 128) : null,
      payload.detail ? JSON.stringify(payload.detail).slice(0, 4000) : null,
      request.headers.get('cf-connecting-ip') || '',
      (request.headers.get('user-agent') || '').slice(0, 500),
    ).run();
  } catch {
    // Best-effort. The audit table is for forensics; it should not
    // bring the request down if it momentarily can't be written.
  }
}

// P1-6 helper — one row per successful login. Failures live on the
// users row (failed_login_attempts column) so we don't store them
// twice. Called via ctx.waitUntil from login().
async function writeLoginActivity(env, request, user) {
  try {
    await env.DB.prepare(
      'INSERT INTO login_activity (ts, user_id, email, ip, user_agent) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      new Date().toISOString(),
      user.id,
      user.email,
      request.headers.get('cf-connecting-ip') || '',
      (request.headers.get('user-agent') || '').slice(0, 500),
    ).run();
  } catch {}
}

// ── PII at-rest encryption (P2-5) ────────────────────────────────────────
// AES-GCM with a random 12-byte IV per row. The encryption key is
// derived from env.PII_ENCRYPTION_KEY (Workers secret) via SHA-256 so
// the operator can set any-length passphrase and we always end up with
// a 256-bit key. When the env var is unset the helpers no-op
// (encryptPii returns null, decryptPii passes through plaintext-ish
// strings) so the system can run without encryption during the
// transition window before the operator sets the key.
//
// Storage format: base64(iv || ciphertext_with_tag). 12 + N + 16 bytes
// per encrypted value. Stored in a separate *_enc column; reads prefer
// the encrypted column and fall back to the legacy plaintext column.
//
// Why a separate column and not in-place: lets us roll out gradually
// + provides a recovery path if a future decrypt fails (the original
// plaintext is still on the row until the operator backfills + drops
// the plaintext column).
let _piiKeyPromise = null;
function loadPiiKey(env) {
  if (!env.PII_ENCRYPTION_KEY) return null;
  if (_piiKeyPromise) return _piiKeyPromise;
  _piiKeyPromise = (async () => {
    const raw = new TextEncoder().encode(String(env.PII_ENCRYPTION_KEY));
    const hashed = await crypto.subtle.digest('SHA-256', raw);
    return crypto.subtle.importKey('raw', hashed, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  })();
  return _piiKeyPromise;
}
async function encryptPii(env, plaintext) {
  if (plaintext == null || plaintext === '') return null;
  const keyPromise = loadPiiKey(env);
  if (!keyPromise) return null;          // No key set → caller falls back to plaintext column.
  try {
    const key = await keyPromise;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(String(plaintext)));
    const buf = new Uint8Array(iv.length + ct.byteLength);
    buf.set(iv, 0);
    buf.set(new Uint8Array(ct), iv.length);
    // base64 encode without using btoa() on a large string (safe for short PII fields anyway)
    let s = '';
    for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
    return btoa(s);
  } catch {
    return null;
  }
}
async function decryptPii(env, ciphertextB64) {
  if (!ciphertextB64) return null;
  const keyPromise = loadPiiKey(env);
  if (!keyPromise) return null;
  try {
    const key = await keyPromise;
    const s = atob(ciphertextB64);
    const buf = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) buf[i] = s.charCodeAt(i);
    if (buf.length < 13) return null;
    const iv = buf.slice(0, 12);
    const ct = buf.slice(12);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}

// v01.046 / v01.065 — deterministic HMAC for searchable PII. The HMAC
// key is bound to PII_ENCRYPTION_KEY via a domain-separated SHA-256
// derivation so rotating the encryption secret invalidates the
// lookup table at the same time (which is the desired behaviour:
// the HMAC column is just a derived index over the encrypted data,
// not a separate trust boundary).
//
// v01.065: generalized over a `domain` string so each searchable PII
// field gets its own sub-key (phone-hmac, email-hmac, ...). Same secret,
// different sub-keys — knowing one digest reveals nothing about the
// others. Default domain stays 'phone-hmac' for backward-compat.
const _piiHmacKeys = new Map();
function loadPiiHmacKey(env, domain = 'phone-hmac') {
  if (!env.PII_ENCRYPTION_KEY) return null;
  if (_piiHmacKeys.has(domain)) return _piiHmacKeys.get(domain);
  const p = (async () => {
    const raw = new TextEncoder().encode(String(env.PII_ENCRYPTION_KEY) + ':' + domain);
    const hashed = await crypto.subtle.digest('SHA-256', raw);
    return crypto.subtle.importKey('raw', hashed, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  })();
  _piiHmacKeys.set(domain, p);
  return p;
}
// Normalize a value into the canonical form we HMAC against. Domain-aware
// so callers don't have to remember the rules: phone is digits-only, email
// is trim+lowercase. Keeping the rules here means search-side and write-side
// can never drift.
function normalizePiiForHmac(value, domain) {
  if (value == null) return '';
  const s = String(value);
  if (domain === 'email-hmac') return s.trim().toLowerCase();
  // 'phone-hmac' (default): strip everything that isn't a digit so
  // "+82-10-1234-5678" and "010 1234 5678" hash to the same value.
  return s.replace(/\D/g, '');
}
async function computePiiHmac(env, value, domain = 'phone-hmac') {
  if (value == null || value === '') return null;
  const keyPromise = loadPiiHmacKey(env, domain);
  if (!keyPromise) return null;
  try {
    const key = await keyPromise;
    const norm = normalizePiiForHmac(value, domain);
    if (!norm) return null;
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(norm));
    return Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}
function normalizeEmail(e) { return String(e || '').trim().toLowerCase(); }

// v01.068 (Phase 4) — envelope encryption for R2 attachments.
//
// R2 already encrypts at rest with a Cloudflare-held key. This adds a
// second wrapper using PII_ENCRYPTION_KEY (operator-held), so an R2
// access-token leak alone isn't enough to read attachments. The two
// keys must both be compromised — that's the "envelope" benefit.
//
// Storage format inside R2: 12-byte random IV || ciphertext || 16-byte tag.
// Same AES-GCM primitive as encryptPii(), but a different sub-key
// (domain-separated by ':r2-file') so a hypothetical leak of one key
// doesn't help the attacker on the other domain.
//
// When PII_ENCRYPTION_KEY is unset the helpers no-op — they return the
// original bytes and a marker that says encryption didn't happen, so the
// caller can store r2_encrypted = 0 and the read-side serves raw bytes.
let _r2KeyPromise = null;
function loadR2Key(env) {
  if (!env.PII_ENCRYPTION_KEY) return null;
  if (_r2KeyPromise) return _r2KeyPromise;
  _r2KeyPromise = (async () => {
    const raw = new TextEncoder().encode(String(env.PII_ENCRYPTION_KEY) + ':r2-file');
    const hashed = await crypto.subtle.digest('SHA-256', raw);
    return crypto.subtle.importKey('raw', hashed, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  })();
  return _r2KeyPromise;
}

// Wraps a Uint8Array / ArrayBuffer of file bytes for R2 storage.
// Returns { bytes, encrypted }. When encrypted=true the bytes carry the
// envelope (IV prefix + GCM tag suffix); when false they're unchanged.
async function encryptR2Bytes(env, plain) {
  const keyPromise = loadR2Key(env);
  if (!keyPromise) return { bytes: plain, encrypted: false };
  try {
    const key = await keyPromise;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
    const buf = new Uint8Array(iv.length + ct.byteLength);
    buf.set(iv, 0);
    buf.set(new Uint8Array(ct), iv.length);
    return { bytes: buf, encrypted: true };
  } catch {
    // Fail-open: if encryption misfires for any reason we still store the
    // file (R2 server-side encryption keeps it covered) and mark the row
    // as unencrypted so the read side doesn't try to unwrap it.
    return { bytes: plain, encrypted: false };
  }
}

// Inverse of encryptR2Bytes. Takes the R2 object body (ArrayBuffer) +
// the row's r2_encrypted flag and returns plaintext bytes ready to ship.
// On the legacy path (r2_encrypted = 0) returns the buffer unchanged.
async function decryptR2Bytes(env, wrapped, isEncrypted) {
  if (!isEncrypted) return wrapped;
  const keyPromise = loadR2Key(env);
  if (!keyPromise) {
    // Encrypted blob with no key = unrecoverable. Surface as null so the
    // caller can return 503 rather than serving ciphertext.
    return null;
  }
  try {
    const key = await keyPromise;
    const buf = new Uint8Array(wrapped);
    if (buf.length < 13) return null;
    const iv = buf.slice(0, 12);
    const ct = buf.slice(12);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new Uint8Array(pt);
  } catch {
    return null;
  }
}

// ── HTML sanitizer (P1-1) ────────────────────────────────────────────────
// HTMLRewriter-backed allowlist sanitizer for rich-text fields that get
// stored and later rendered via dangerouslySetInnerHTML. Strips every
// element/attribute not on the allowlist; for URL-bearing attrs
// (href/src) it also vets the scheme so javascript:, data:, and
// vbscript: URLs can't sneak through.
//
// Why allowlist: blocklists are a losing game — every new HTML feature
// adds another injection vector. Allowlist gives a stable, predictable
// surface.
//
// Why HTMLRewriter: it's a Cloudflare-native streaming HTML parser, well
// hardened against mXSS / parser-confusion attacks. Writing a regex
// sanitizer for arbitrary attacker HTML (inbound email!) would be
// strictly worse.
const SANITIZE_ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'div', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'u', 's', 'b', 'i',
  'ul', 'ol', 'li',
  'a',
  'blockquote', 'code', 'pre',
  'img',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'details', 'summary',
]);
// Elements that must be removed with their content (executable / framing
// surface). Anything else not in the allowlist gets removeAndKeepContent.
const SANITIZE_DROP_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'form',
  'input', 'button', 'select', 'option', 'textarea', 'link', 'meta',
  'svg', 'math', 'base', 'frame', 'frameset', 'applet',
]);
const SANITIZE_ATTRS_BY_TAG = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
};
function sanitizeUrlOk(value) {
  // Empty or relative paths are fine.
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  // Allow same-doc anchors, relative paths, and explicit http(s) / mailto.
  if (v.startsWith('#') || v.startsWith('/') || v.startsWith('./') || v.startsWith('../')) return true;
  // Block everything that isn't http(s) / mailto / tel.
  const lower = v.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://')) return true;
  if (lower.startsWith('mailto:') || lower.startsWith('tel:')) return true;
  // Special case: data: URIs — only allow image MIME types (for inline images
  // pasted into TipTap). Everything else (data:text/html etc.) gets blocked.
  if (lower.startsWith('data:image/')) return true;
  return false;
}

async function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  try {
    const rewriter = new HTMLRewriter().on('*', {
      element(el) {
        const tag = el.tagName.toLowerCase();
        if (SANITIZE_DROP_TAGS.has(tag)) { el.remove(); return; }
        if (!SANITIZE_ALLOWED_TAGS.has(tag)) { el.removeAndKeepContent(); return; }
        const allowed = SANITIZE_ATTRS_BY_TAG[tag] || [];
        // Snapshot attributes first — el.attributes is a live iterator and
        // we mutate during the loop.
        const attrs = [];
        for (const a of el.attributes) attrs.push(a);
        for (const [name, value] of attrs) {
          if (!allowed.includes(name)) {
            el.removeAttribute(name);
            continue;
          }
          if ((name === 'href' || name === 'src') && !sanitizeUrlOk(value)) {
            el.removeAttribute(name);
          }
        }
      },
    });
    const resp = rewriter.transform(new Response(html));
    return await resp.text();
  } catch {
    // Fail closed — if the parser blows up on a pathological input, return
    // empty rather than passing potentially-dangerous markup through.
    return '';
  }
}

// Content KV payloads are mostly plain strings, but legal document bodies
// render via dangerouslySetInnerHTML on the public site. Sanitize only those
// rich HTML fields so we preserve ordinary copy text while blocking stored XSS.
async function sanitizeContentPayload(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const out = structuredClone(raw);
  const legal = out.legal;
  if (!legal || typeof legal !== 'object') return out;
  for (const doc of Object.values(legal)) {
    if (!doc || typeof doc !== 'object') continue;
    for (const langKey of ['ko', 'en']) {
      if (!doc[langKey] || typeof doc[langKey] !== 'object') continue;
      if (typeof doc[langKey].body === 'string') {
        doc[langKey].body = await sanitizeHtml(doc[langKey].body);
      }
    }
  }
  return out;
}

// Origin / Referer same-origin guard. Returns true when:
//   - Neither header is present (curl / server-to-server / mobile native) OR
//   - Origin (or its Referer fallback) parses to the same origin as the URL
// Returns false when the request has no provenance OR has a provenance
// that doesn't match our origin. v01.065 P0-2: changed to fail-CLOSED
// on missing Origin AND missing Referer. Browser-initiated POST/PUT/DELETE
// always carries at least one of these (Fetch spec); a request with
// neither header is a non-browser caller (curl / automation / bot), which
// should opt in explicitly by adding -H "Origin: https://koreadreampath.com".
// Closes the CSRF bypass vector flagged in the v01.064 self-audit.
function sameOriginOrEmpty(request, url) {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  if (!origin && !referer) return false;
  try {
    const expected = url.origin;
    if (origin) return origin === expected;
    return new URL(referer).origin === expected;
  } catch {
    return false;
  }
}

// Security headers attached to every response served from the edge. CSP
// is the loosest piece — Babel-in-browser needs 'unsafe-eval' to evaluate
// JSX it transpiles at runtime, and inline style={{}} props all over the
// React tree require 'unsafe-inline' for styles. The strict pieces
// (HSTS / nosniff / frame-ancestors / connect-src / form-action /
// Referrer-Policy / Permissions-Policy) still block the most common
// attack classes (clickjacking, MIME-sniff XSS, exfiltration to
// untrusted hosts, form hijack, sensor APIs).
const CSP = [
  "default-src 'self'",
  // Babel-standalone transpiles JSX at runtime and the resulting code
  // runs via Function/eval — hence 'unsafe-eval'. 'unsafe-inline' covers
  // the babel-transformed script blocks that have no nonce/hash.
  "script-src 'self' https://unpkg.com 'unsafe-inline' 'unsafe-eval'",
  // Inline style={{}} attributes everywhere need 'unsafe-inline'. Once
  // we move to a build step we can drop this.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  // API + asset calls are all same-origin. wss/ws too in case future
  // realtime endpoints attach.
  "connect-src 'self'",
  // 'self' (not 'none') so the admin's Live Preview iframe — which is
  // same-origin — can embed the public SPA. Cross-origin clickjacking is
  // still blocked because only same-origin frames are allowed.
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

function withSecurityHeaders(resp) {
  // Don't mutate the original headers object — clone into a new Response
  // so cached / immutable responses stay intact.
  const h = new Headers(resp.headers);
  // Set / overwrite the canonical security headers.
  h.set('Content-Security-Policy', CSP);
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  h.set('X-Content-Type-Options', 'nosniff');
  // SAMEORIGIN (not DENY) so the admin can iframe the public SPA for the
  // Live Preview. Cross-origin embedding remains blocked.
  h.set('X-Frame-Options', 'SAMEORIGIN');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()');
  h.set('Cross-Origin-Opener-Policy', 'same-origin');
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
}

// ── SEO: sitemap.xml + robots.txt ─────────────────────────────────────────
async function sitemapXml(env, url) {
  const origin = url.origin;
  const today = new Date().toISOString().slice(0, 10);

  // Static SPA paths (high-priority public pages)
  const STATIC = [
    { path: '/',          priority: 1.0, change: 'weekly' },
    { path: '/about',     priority: 0.8, change: 'monthly' },
    { path: '/programs',  priority: 0.9, change: 'weekly' },
    { path: '/news',      priority: 0.8, change: 'weekly' },
    { path: '/stories',   priority: 0.7, change: 'monthly' },
    { path: '/partners',  priority: 0.6, change: 'monthly' },
    { path: '/contact',   priority: 0.6, change: 'monthly' },
    { path: '/team',      priority: 0.5, change: 'monthly' },
    { path: '/apply',     priority: 0.9, change: 'monthly' },
  ];

  // Dynamic: each program detail page from KV content
  let programPaths = [];
  try {
    const c = await readContentFromKv(env);
    const programs = Array.isArray(c.programs) && c.programs.length ? c.programs : CURRENT_PROGRAMS;
    programPaths = programs
      .filter(p => p && p.id)
      .map(p => ({ path: '/program/' + encodeURIComponent(p.id), priority: 0.7, change: 'monthly' }));
  } catch {}

  // Dynamic: each news post → /news/:id
  let newsPaths = [];
  try {
    const { results } = await env.DB.prepare('SELECT id, date FROM news_posts ORDER BY date DESC LIMIT 200').all();
    newsPaths = (results || [])
      .filter(n => n && n.id)
      .map(n => ({ path: '/news/' + encodeURIComponent(n.id), priority: 0.6, change: 'monthly' }));
  } catch {}

  // Dynamic: each story → /stories/:id (stories live in c.stories[])
  let storyPaths = [];
  try {
    const raw = await env.CONTENT_KV.get('dp_content_v1');
    if (raw) {
      const c = JSON.parse(raw);
      if (Array.isArray(c.stories)) {
        storyPaths = c.stories
          .map((s, i) => ({ id: s && (s.id || s.slug) || ('s' + (i + 1)) }))
          .map(s => ({ path: '/stories/' + encodeURIComponent(s.id), priority: 0.5, change: 'monthly' }));
      }
    }
  } catch {}

  const all = [...STATIC, ...programPaths, ...newsPaths, ...storyPaths];

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    all.map(u =>
      '  <url>\n' +
      '    <loc>' + origin + u.path + '</loc>\n' +
      '    <lastmod>' + today + '</lastmod>\n' +
      '    <changefreq>' + u.change + '</changefreq>\n' +
      '    <priority>' + u.priority.toFixed(1) + '</priority>\n' +
      '  </url>'
    ).join('\n') +
    '\n</urlset>\n';

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}

function robotsTxt(url) {
  const origin = url.origin;
  const body =
    'User-agent: *\n' +
    'Allow: /\n' +
    'Disallow: /admin\n' +
    'Disallow: /api/\n' +
    'Disallow: /receipt\n' +
    'Disallow: /member\n' +
    '\n' +
    'Sitemap: ' + origin + '/sitemap.xml\n';
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}

async function handleApi(request, env, url, ctx) {
  const path = url.pathname;
  let method = request.method.toUpperCase();

  // HEAD === GET with no body (RFC 9110 §9.3.2). Treat HEAD as GET while
  // routing, then strip the body in the entry-point wrapper. Without this
  // we 404/405 health monitors, link checkers, and `curl -I`.
  if (method === 'HEAD') method = 'GET';

  // Permissive OPTIONS preflight on every /api/* path so external pages can
  // hit our public endpoints from the browser. The /api/public/* handlers
  // further down keep their own returns as a defensive belt-and-braces.
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-max-age': '86400',
      },
    });
  }

  // P1-3 — CSRF guard for /api/admin/* write methods. Today the worker
  // authenticates admins via Bearer header (Authorization: Bearer ...)
  // which the browser does NOT auto-attach cross-origin, so CSRF is
  // structurally improbable. But this is cheap defence-in-depth — if
  // we ever swap to HttpOnly cookies (P2-1) the check is already there.
  // Origin is preferred; Referer is a fallback (older clients). If the
  // browser sent neither, we allow (curl / server-to-server). If it sent
  // one and it points off-site, we reject.
  if (path.startsWith('/api/admin/') && method !== 'GET') {
    if (!sameOriginOrEmpty(request, url)) {
      return json({ error: 'origin_blocked' }, 403);
    }
  }

  // ── Version ──────────────────────────────────────────────────────────────
  // Returns the currently-deployed site version. The client polls this
  // every minute and compares against window.DREAMPATH_VERSION (snapshot
  // at page load). When they differ, the user is prompted to hard-reload.
  // Source of truth is /ui_kits/website/version.js — we parse it once per
  // request (tiny file, served from ASSETS edge cache).
  if (path === '/api/version') {
    if (method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
    let version = '00.000.00';
    try {
      const assetUrl = new URL('/ui_kits/website/version.js', url.origin);
      const r = await env.ASSETS.fetch(new Request(assetUrl.toString()));
      if (r.ok) {
        const txt = await r.text();
        const m = txt.match(/DREAMPATH_VERSION\s*=\s*['"]([\d.]+)['"]/);
        if (m) version = m[1];
      }
    } catch {}
    return new Response(JSON.stringify({ version }), {
      headers: { ...JSON_HEADERS, 'cache-control': 'no-store, max-age=0' },
    });
  }

  // ── Content ──────────────────────────────────────────────────────────────
  if (path === '/api/content') {
    if (method === 'GET') {
      const normalized = await readContentFromKv(env);
      return new Response(JSON.stringify(normalized), { headers: JSON_HEADERS });
    }
    if (method === 'PUT' || method === 'POST') {
      if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
      const body = await request.text();
      let parsed;
      try { parsed = JSON.parse(body); } catch { return json({ error: 'invalid_json' }, 400); }
      const sanitized = await sanitizeContentPayload(parsed);
      await env.CONTENT_KV.put(CONTENT_KEY, JSON.stringify(sanitized));
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
      await env.CONTENT_KV.delete(CONTENT_KEY);
      return json({ ok: true });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── Applications ─────────────────────────────────────────────────────────
  if (path === '/api/applications') {
    if (method === 'POST') {
      // Anonymous applies (visitor without an account) are still allowed,
      // matching the existing public Apply form. Authenticated applies are
      // gated by the role's pages.apply.apply permission so the operator can
      // shut off applications for a role without taking the public form down.
      const u = await currentUser(request, env);
      if (u) {
        const allowed = await canRole(env, u.role, 'apply', 'apply');
        if (!allowed) return json({ error: 'forbidden', detail: `${u.role} is not allowed to apply` }, 403);
      }
      return submitApplication(request, env);
    }
    if (method === 'GET') {
      if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
      return listApplications(env, url);
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── Application file uploads ────────────────────────────────────────────
  // POST /api/applications/upload — public endpoint, accepts a single file
  // (PDF / image) base64-encoded and stores it in R2. Returns { id, r2_key,
  // filename, size }. The Apply form bundles these refs into the application
  // payload on submit so the file is linked once the row is committed.
  // Cap: 10 MB per file, 20 files / hour per cf-connecting-ip via KV.
  if (path === '/api/applications/upload' && method === 'POST') {
    if (!env.ATTACHMENTS) return json({ error: 'r2_not_bound' }, 503);
    const ip = request.headers.get('cf-connecting-ip') || '';
    if (ip) {
      const rl = await rateLimit(env, 'rl:upload:' + ip, 20, 3600);
      if (!rl.allowed) return json({ error: 'rate_limited' }, 429);
    }
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'invalid_json' }, 400);
    const application_id = String(body.application_id || '').slice(0, 64);
    const kind = String(body.kind || '').toLowerCase();
    // 'transcript' kept as a legacy alias for the original single-file
    // upload (pre-v01.028); new applications use the three split slots.
    const allowedKinds = [
      'transcript',
      'transcript_graduation',
      'transcript_recognition',
      'transcript_translation',
      'recommendation',
      'portfolio',
      'id_doc',
    ];
    if (!allowedKinds.includes(kind)) return json({ error: 'invalid_kind' }, 400);
    // Ownership guard: when application_id targets an existing row, only the
    // owner (or an admin) may attach more files. Form-time uploads
    // (application_id === '') are still allowed unauthenticated, but the new
    // row carries an upload_token + uploader_user_id so adoption at submit
    // can prove the submitter is the original uploader — see comment in
    // submitApplication and migrations/0030_*.sql.
    const uploaderUser = await currentUser(request, env);
    if (application_id) {
      const owner = await env.DB.prepare(
        'SELECT user_id FROM applications WHERE id = ?'
      ).bind(application_id).first();
      if (owner) {
        const isOwner = uploaderUser && owner.user_id && owner.user_id === uploaderUser.id;
        const adminAuth = await isAdmin(request, env);
        if (!isOwner && !adminAuth) return json({ error: 'forbidden' }, 403);
      }
    }
    const recommender_idx = body.recommender_idx != null ? Math.max(0, Math.min(20, parseInt(body.recommender_idx, 10) || 0)) : null;
    const filename = String(body.filename || 'upload.pdf').slice(0, 200);
    const mime     = String(body.mime || 'application/pdf').slice(0, 100);
    const b64      = String(body.content_base64 || '').replace(/\s/g, '');
    if (!b64) return json({ error: 'empty_file' }, 400);
    // Restrict to PDF + common image types — guards against random uploads.
    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!allowedMimes.includes(mime)) return json({ error: 'unsupported_mime', allowed: allowedMimes }, 415);
    let bytes;
    try { const bin = atob(b64); bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); }
    catch { return json({ error: 'invalid_base64' }, 400); }
    const MAX = 10 * 1024 * 1024;
    if (bytes.byteLength > MAX) return json({ error: 'file_too_large', max_bytes: MAX }, 413);
    // R2 key — use a temp folder when application_id missing (form-time
    // upload before the application row exists). The Apply submit flow
    // hands us the real id and we link via DB row.
    const safe = filename.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 200);
    const folder = application_id || ('drafts/' + new Date().toISOString().slice(0, 10));
    // P2-2 — random prefix (64 bits) instead of Date.now(). Even if a key
    // path leaks through one channel, adjacent files in the same folder
    // can't be guessed by incrementing the prefix. Existing files are
    // unaffected because reads always use the r2_key stored in the DB.
    const key = `apps/${folder}/${kind}${recommender_idx != null ? '-' + recommender_idx : ''}/${randomHex(8)}-${safe}`;
    // v01.068 (Phase 4): envelope-encrypt before R2 put.
    const wrapped = await encryptR2Bytes(env, bytes);
    try {
      await env.ATTACHMENTS.put(key, wrapped.bytes, { httpMetadata: { contentType: mime } });
    } catch (e) {
      // Log full detail to the error console; never echo to the caller.
      ctx && ctx.waitUntil && ctx.waitUntil(logError(env, {
        level: 'error', source: 'server',
        message: 'r2_put_failed: ' + String(e && e.message || e),
        path: '/api/applications/upload', method: 'POST', status: 500,
        ip, user_agent: (request.headers.get('user-agent') || '').slice(0, 500),
      }));
      return json({ error: 'upload_failed' }, 500);
    }
    const ts = new Date().toISOString();
    // 128-bit upload token — caller must echo it back at submit to adopt the
    // row (closes the orphan-IDOR window; see migrations/0030_*.sql).
    // We deliberately do NOT return the row id or the r2 key to the caller:
    // the token is the only handle they need, and exposing the sequential
    // id leaks DB activity / lets external observers fingerprint internal
    // state.
    const upload_token = randomHex(16);
    const uploader_user_id = uploaderUser ? uploaderUser.id : null;
    await env.DB.prepare(
      'INSERT INTO application_files (application_id, uploaded_at, kind, recommender_idx, filename, mime, size, r2_key, upload_token, uploader_user_id, r2_encrypted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(application_id || '', ts, kind, recommender_idx, filename, mime, bytes.byteLength, key, upload_token, uploader_user_id, wrapped.encrypted ? 1 : 0).run();
    return json({ ok: true, upload_token, filename, mime, size: bytes.byteLength });
  }
  // GET admin: list files attached to an application.
  const appFilesM = path.match(/^\/api\/admin\/applications\/([A-Z0-9_-]+)\/files$/);
  if (appFilesM && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const aid = appFilesM[1];
    const { results } = await env.DB.prepare(
      'SELECT id, uploaded_at, kind, recommender_idx, filename, mime, size, r2_key FROM application_files WHERE application_id = ? ORDER BY id ASC'
    ).bind(aid).all();
    return json({ items: results || [] });
  }
  // Download proxy — gates R2 fetch behind admin auth.
  const appFileDLM = path.match(/^\/api\/admin\/application-files\/(\d+)\/download$/);
  if (appFileDLM && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    if (!env.ATTACHMENTS) return json({ error: 'r2_not_bound' }, 503);
    const f = await env.DB.prepare('SELECT * FROM application_files WHERE id = ?').bind(parseInt(appFileDLM[1], 10)).first();
    if (!f) return json({ error: 'not_found' }, 404);
    const obj = await env.ATTACHMENTS.get(f.r2_key);
    if (!obj) return json({ error: 'gone' }, 410);
    // v01.068 (Phase 4): unwrap if r2_encrypted, else stream as-is.
    let bodyOut;
    if (f.r2_encrypted) {
      const wrapped = await obj.arrayBuffer();
      const plain = await decryptR2Bytes(env, wrapped, true);
      if (plain == null) return json({ error: 'decrypt_failed' }, 503);
      bodyOut = plain;
    } else {
      bodyOut = obj.body;
    }
    // v01.068 + v01.065 P0-3: read-audit every application file download.
    ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
      action: 'read_pii', target_type: 'application_file', target_id: String(f.id),
      detail: { filename: f.filename, size: f.size, mime: f.mime, kind: f.kind },
    }));
    return new Response(bodyOut, {
      headers: {
        'content-type': f.mime || 'application/octet-stream',
        'content-disposition': `attachment; filename="${encodeURIComponent(f.filename || 'file')}"`,
        'content-length': String(f.size || 0),
      },
    });
  }

  // Bulk operations on applications. Body: { ids: [...], op: 'delete' | 'status', status?: '...' }
  // Replaces having to PATCH/DELETE one row at a time when triaging dozens.
  if (path === '/api/applications/bulk' && method === 'POST') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.ids) || !body.ids.length) return json({ error: 'no_ids' }, 400);
    const ids = body.ids.filter(x => typeof x === 'string').slice(0, 500);
    if (body.op === 'delete') {
      const placeholders = ids.map(() => '?').join(',');
      await env.DB.prepare('DELETE FROM applications WHERE id IN (' + placeholders + ')').bind(...ids).run();
      ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
        action: 'application_bulk_delete', detail: { count: ids.length, ids: ids.slice(0, 20) },
      }));
      return json({ ok: true, op: 'delete', count: ids.length });
    }
    if (body.op === 'status' && typeof body.status === 'string') {
      const placeholders = ids.map(() => '?').join(',');
      await env.DB.prepare('UPDATE applications SET status = ? WHERE id IN (' + placeholders + ')').bind(body.status, ...ids).run();
      ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
        action: 'application_bulk_status', detail: { count: ids.length, status: body.status },
      }));
      return json({ ok: true, op: 'status', status: body.status, count: ids.length });
    }
    return json({ error: 'bad_op' }, 400);
  }

  const m = path.match(/^\/api\/applications\/([A-Za-z0-9_-]+)$/);
  if (m) {
    const id = m[1];
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM applications WHERE id = ?').bind(id).run();
      ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
        action: 'application_delete', target_type: 'application', target_id: id,
      }));
      return json({ ok: true });
    }
    if (method === 'PATCH') {
      // Single-row status edit for the apps detail modal.
      const body = await request.json().catch(() => ({}));
      if (typeof body.status === 'string') {
        await env.DB.prepare('UPDATE applications SET status = ? WHERE id = ?').bind(body.status, id).run();
      }
      return json({ ok: true });
    }
    if (method === 'GET') {
      const row = await env.DB.prepare('SELECT * FROM applications WHERE id = ?').bind(id).first();
      if (!row) return json({ error: 'not_found' }, 404);
      // v01.066 (Phase 2): full PII decrypt — birthdate + name + email +
      // essays + recommender fields. Strips ciphertext + HMAC columns from
      // the response so they never reach the admin UI.
      await decryptApplicationRow(env, row);
      // v01.065 P0-3: read-audit one row per admin viewing of a single
      // application. Single-record reads are the high-signal events for
      // forensics — they're either targeted lookups or scripted enumeration.
      ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
        action: 'read_pii', target_type: 'application', target_id: id,
      }));
      return json(row);
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  if (path === '/api/auth/signup' && method === 'POST') return signup(request, env, ctx);
  if (path === '/api/auth/activate' && method === 'POST') return activateAccount(request, env);
  if (path === '/api/auth/resend-activation' && method === 'POST') return resendActivation(request, env, ctx);
  // Email verification — token consumed by the public /verify view.
  // Mints on signup; client requests a fresh one via POST /api/auth/verify-email.
  // ── Mailbox v2 — folders + soft-delete + attachments + export ──────────
  // Folders are derived from columns: starred=1, spam=1, trashed_at NOT NULL.
  // Per-account unread counters. Drives the sidebar anomaly badges so the
  // operator can see which managed inbox has new mail without opening it.
  // Returns { by_account: { 'info@...': N, ... }, total: N }.
  if (path === '/api/admin/mail/unread-by-account' && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const { results } = await env.DB.prepare(
      "SELECT to_addr, COUNT(*) AS n FROM inbound_emails " +
      "WHERE read_at IS NULL AND trashed_at IS NULL AND spam = 0 " +
      "GROUP BY to_addr"
    ).all();
    const by_account = {};
    let total = 0;
    for (const r of results || []) {
      const k = String(r.to_addr || '').toLowerCase();
      const n = Number(r.n || 0);
      by_account[k] = n;
      total += n;
    }
    return json({ by_account, total });
  }
  // Inbox = active mail not flagged as spam/trash.
  // Mode comes from ?mode=inbox|starred|spam|trash. Default 'inbox'.
  if (path === '/api/admin/inbox' && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '50',  10) || 50,  500);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0',   10) || 0,   0);
    const to     = url.searchParams.get('to') || '';
    const q      = (url.searchParams.get('q') || '').trim().toLowerCase();
    const onlyUnread = url.searchParams.get('unread') === '1';
    const mode   = url.searchParams.get('mode') || 'inbox';
    const where = []; const binds = [];
    if (to) { where.push('to_addr = ?'); binds.push(to.toLowerCase()); }
    if (q)  { where.push('(LOWER(subject) LIKE ? OR LOWER(from_addr) LIKE ? OR LOWER(from_name) LIKE ? OR LOWER(body_text) LIKE ?)'); const pat = '%' + q + '%'; binds.push(pat, pat, pat, pat); }
    if (onlyUnread) where.push('read_at IS NULL');
    if (mode === 'trash')   where.push('trashed_at IS NOT NULL');
    else                    where.push('trashed_at IS NULL');
    if (mode === 'starred') where.push('starred = 1');
    if (mode === 'spam')    where.push('spam = 1');
    if (mode === 'inbox')   where.push('spam = 0');
    const whereSql = 'WHERE ' + where.join(' AND ');
    const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM inbound_emails ' + whereSql).bind(...binds).first();
    // v01.067 (Phase 3): subject/body are encrypted on new rows. The SQL
    // LIKE filter above only matches legacy plaintext rows + the
    // SUBSTR-derived preview is empty on new rows. To preserve the inbox
    // list view we now select the ciphertext columns alongside, decrypt
    // them in app code, then build the preview from the decrypted text.
    const { results } = await env.DB.prepare(
      'SELECT id, ts, to_addr, from_addr, from_name, ' +
      '       subject, subject_enc, ' +
      '       body_text, body_text_enc, body_html, body_html_enc, ' +
      '       read_at, starred, spam, trashed_at, message_id, in_reply_to ' +
      'FROM inbound_emails ' + whereSql + ' ORDER BY ts DESC LIMIT ? OFFSET ?'
    ).bind(...binds, limit, offset).all();
    // Decrypt + build preview, then strip the raw body fields from the
    // payload (the list view only needs the 240-char preview).
    const decResults = [];
    for (const r of results || []) {
      await decryptEmailRow(env, r);
      const src = r.body_text || r.body_html || '';
      r.preview = String(src).slice(0, 240);
      delete r.body_text;
      delete r.body_html;
      decResults.push(r);
    }
    // Sidebar counters — single shot so the UI doesn't fan out.
    const countsRow = await env.DB.prepare(
      "SELECT " +
      "  COALESCE(SUM(CASE WHEN trashed_at IS NULL AND spam = 0 THEN 1 ELSE 0 END), 0) AS inbox," +
      "  COALESCE(SUM(CASE WHEN trashed_at IS NULL AND spam = 0 AND read_at IS NULL THEN 1 ELSE 0 END), 0) AS unread," +
      "  COALESCE(SUM(CASE WHEN trashed_at IS NULL AND starred = 1 THEN 1 ELSE 0 END), 0) AS starred," +
      "  COALESCE(SUM(CASE WHEN trashed_at IS NULL AND spam = 1 THEN 1 ELSE 0 END), 0) AS spam," +
      "  COALESCE(SUM(CASE WHEN trashed_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS trash " +
      "FROM inbound_emails"
    ).first();
    return json({ items: decResults, total: total?.n || 0, limit, offset, counts: countsRow || {} });
  }
  const inboxItemM = path.match(/^\/api\/admin\/inbox\/(\d+)$/);
  if (inboxItemM) {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const id = parseInt(inboxItemM[1], 10);
    if (method === 'GET') {
      const row = await env.DB.prepare('SELECT * FROM inbound_emails WHERE id = ?').bind(id).first();
      if (!row) return json({ error: 'not_found' }, 404);
      if (!row.read_at) {
        const now = new Date().toISOString();
        await env.DB.prepare('UPDATE inbound_emails SET read_at = ? WHERE id = ?').bind(now, id).run();
        row.read_at = now;
      }
      // v01.067 (Phase 3): decrypt subject + body_text + body_html.
      await decryptEmailRow(env, row);
      // v01.067 + v01.065 P0-3: read-audit one row per single inbound view.
      // The mailbox is one of the highest-PII surfaces — single-record
      // reads are high-signal forensic events.
      ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
        action: 'read_pii', target_type: 'inbound_email', target_id: String(id),
      }));
      // Attach metadata for the email's R2 attachments. The download URL is
      // /api/admin/attachment/:id/download — the R2 fetch happens server-side.
      const { results: atts } = await env.DB.prepare(
        'SELECT id, filename, mime, size FROM email_attachments WHERE side = ? AND email_id = ? ORDER BY id ASC'
      ).bind('inbound', id).all();
      row.attachments = atts || [];
      return json(row);
    }
    if (method === 'PATCH') {
      const body = await request.json().catch(() => ({}));
      const sets = []; const binds = [];
      if (typeof body.read === 'boolean')    { sets.push('read_at = ?');  binds.push(body.read ? new Date().toISOString() : null); }
      if (typeof body.starred === 'boolean') { sets.push('starred = ?'); binds.push(body.starred ? 1 : 0); }
      if (typeof body.spam === 'boolean')    { sets.push('spam = ?');    binds.push(body.spam ? 1 : 0); }
      if (!sets.length) return json({ ok: true, changed: 0 });
      binds.push(id);
      await env.DB.prepare('UPDATE inbound_emails SET ' + sets.join(', ') + ' WHERE id = ?').bind(...binds).run();
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      // Soft delete → 휴지통. Use ?permanent=1 to actually purge (admin only).
      const permanent = url.searchParams.get('permanent') === '1';
      if (permanent) {
        // Drop R2 objects first (best-effort) then row + attachments.
        const { results: atts } = await env.DB.prepare('SELECT r2_key FROM email_attachments WHERE side = ? AND email_id = ?').bind('inbound', id).all();
        if (env.ATTACHMENTS) for (const a of atts || []) { try { await env.ATTACHMENTS.delete(a.r2_key); } catch {} }
        await env.DB.prepare('DELETE FROM email_attachments WHERE side = ? AND email_id = ?').bind('inbound', id).run();
        await env.DB.prepare('DELETE FROM inbound_emails WHERE id = ?').bind(id).run();
        ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
          action: 'email_purge', target_type: 'inbound_email', target_id: String(id),
          detail: { attachments_purged: (atts || []).length },
        }));
        return json({ ok: true, purged: true });
      }
      await env.DB.prepare('UPDATE inbound_emails SET trashed_at = ? WHERE id = ?').bind(new Date().toISOString(), id).run();
      ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
        action: 'email_trash', target_type: 'inbound_email', target_id: String(id),
      }));
      return json({ ok: true, trashed: true });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }
  const inboxRestoreM = path.match(/^\/api\/admin\/inbox\/(\d+)\/restore$/);
  if (inboxRestoreM && method === 'POST') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    await env.DB.prepare('UPDATE inbound_emails SET trashed_at = NULL WHERE id = ?').bind(parseInt(inboxRestoreM[1], 10)).run();
    return json({ ok: true });
  }
  // Empty-trash: hard-delete every trashed inbound + outbound + their R2.
  if (path === '/api/admin/inbox/empty-trash' && method === 'POST') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const { results: trashed } = await env.DB.prepare('SELECT id FROM inbound_emails WHERE trashed_at IS NOT NULL').all();
    let purged = 0;
    for (const t of trashed || []) {
      const { results: atts } = await env.DB.prepare('SELECT r2_key FROM email_attachments WHERE side = ? AND email_id = ?').bind('inbound', t.id).all();
      if (env.ATTACHMENTS) for (const a of atts || []) { try { await env.ATTACHMENTS.delete(a.r2_key); } catch {} }
      await env.DB.prepare('DELETE FROM email_attachments WHERE side = ? AND email_id = ?').bind('inbound', t.id).run();
      await env.DB.prepare('DELETE FROM inbound_emails WHERE id = ?').bind(t.id).run();
      purged++;
    }
    ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
      action: 'email_empty_trash', detail: { purged_count: purged },
    }));
    return json({ ok: true, purged });
  }
  // Export inbox — CSV (default) or JSON.
  if (path === '/api/admin/inbox/export' && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const fmt = url.searchParams.get('format') || 'csv';
    const mode = url.searchParams.get('mode') || 'all';
    let where = ''; const binds = [];
    if (mode === 'inbox')   { where = 'WHERE trashed_at IS NULL AND spam = 0'; }
    else if (mode === 'starred') { where = 'WHERE trashed_at IS NULL AND starred = 1'; }
    else if (mode === 'spam')    { where = 'WHERE trashed_at IS NULL AND spam = 1'; }
    else if (mode === 'trash')   { where = 'WHERE trashed_at IS NOT NULL'; }
    const { results } = await env.DB.prepare(
      'SELECT id, ts, to_addr, from_addr, from_name, subject, subject_enc, body_text, body_text_enc, body_html, body_html_enc, message_id, in_reply_to, read_at, starred, spam, trashed_at FROM inbound_emails ' + where + ' ORDER BY ts DESC LIMIT 5000'
    ).bind(...binds).all();
    // v01.067 (Phase 3): decrypt subject + body for the export. The
    // operator explicitly asked for these — surface plaintext just as they
    // would see in the admin UI.
    const decResults = [];
    for (const r of results || []) decResults.push(await decryptEmailRow(env, r));
    const stamp = new Date().toISOString().slice(0, 10);
    if (fmt === 'json') {
      return new Response(JSON.stringify({ exported_at: new Date().toISOString(), count: decResults.length, items: decResults }, null, 2), {
        headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="dreampath-inbox-${stamp}.json"` },
      });
    }
    // CSV — RFC 4180-ish; no embedded newlines or quotes are common in
    // headers but we escape defensively.
    const cols = ['id','ts','to_addr','from_addr','from_name','subject','body_text','message_id','in_reply_to','read_at','starred','spam','trashed_at'];
    const esc = v => { const s = (v == null) ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; };
    const rows = [cols.join(',')].concat(decResults.map(r => cols.map(k => esc(r[k])).join(',')));
    return new Response(rows.join('\n'), {
      headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="dreampath-inbox-${stamp}.csv"` },
    });
  }

  // Sent folder — same pattern as inbox.
  if (path === '/api/admin/sent' && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '50', 10) || 50, 500);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0',  10) || 0,  0);
    const from   = url.searchParams.get('from') || '';
    const mode   = url.searchParams.get('mode') || 'sent';
    const where = []; const binds = [];
    if (from) { where.push('from_addr = ?'); binds.push(from.toLowerCase()); }
    if (mode === 'trash') where.push('trashed_at IS NOT NULL');
    else                  where.push('trashed_at IS NULL');
    const whereSql = 'WHERE ' + where.join(' AND ');
    const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM outbound_emails ' + whereSql).bind(...binds).first();
    // v01.067 (Phase 3): outbound body is now encrypted. Pull ciphertext
    // columns too, decrypt in app code, build a 240-char preview from
    // the plaintext result.
    const { results } = await env.DB.prepare(
      'SELECT id, ts, from_addr, to_addr, ' +
      '       subject, subject_enc, body_text, body_text_enc, body_html, body_html_enc, ' +
      '       status, in_reply_to, resend_id, trashed_at ' +
      'FROM outbound_emails ' + whereSql + ' ORDER BY ts DESC LIMIT ? OFFSET ?'
    ).bind(...binds, limit, offset).all();
    const decResults = [];
    for (const r of results || []) {
      await decryptEmailRow(env, r);
      r.preview = String(r.body_text || r.body_html || '').slice(0, 240);
      delete r.body_text;
      delete r.body_html;
      decResults.push(r);
    }
    return json({ items: decResults, total: total?.n || 0, limit, offset });
  }
  const sentItemM = path.match(/^\/api\/admin\/sent\/(\d+)$/);
  if (sentItemM && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const sentId = parseInt(sentItemM[1], 10);
    const row = await env.DB.prepare('SELECT * FROM outbound_emails WHERE id = ?').bind(sentId).first();
    if (!row) return json({ error: 'not_found' }, 404);
    // v01.067 (Phase 3): decrypt subject + body.
    await decryptEmailRow(env, row);
    const { results: atts } = await env.DB.prepare(
      'SELECT id, filename, mime, size FROM email_attachments WHERE side = ? AND email_id = ? ORDER BY id ASC'
    ).bind('outbound', sentId).all();
    row.attachments = atts || [];
    // v01.067 + v01.065 P0-3: read-audit single sent-mail view.
    ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
      action: 'read_pii', target_type: 'outbound_email', target_id: String(sentId),
    }));
    return json(row);
  }
  if (sentItemM && method === 'DELETE') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const id = parseInt(sentItemM[1], 10);
    const permanent = url.searchParams.get('permanent') === '1';
    if (permanent) {
      const { results: atts } = await env.DB.prepare('SELECT r2_key FROM email_attachments WHERE side = ? AND email_id = ?').bind('outbound', id).all();
      if (env.ATTACHMENTS) for (const a of atts || []) { try { await env.ATTACHMENTS.delete(a.r2_key); } catch {} }
      await env.DB.prepare('DELETE FROM email_attachments WHERE side = ? AND email_id = ?').bind('outbound', id).run();
      await env.DB.prepare('DELETE FROM outbound_emails WHERE id = ?').bind(id).run();
      return json({ ok: true, purged: true });
    }
    await env.DB.prepare('UPDATE outbound_emails SET trashed_at = ? WHERE id = ?').bind(new Date().toISOString(), id).run();
    return json({ ok: true, trashed: true });
  }
  const sentRestoreM = path.match(/^\/api\/admin\/sent\/(\d+)\/restore$/);
  if (sentRestoreM && method === 'POST') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    await env.DB.prepare('UPDATE outbound_emails SET trashed_at = NULL WHERE id = ?').bind(parseInt(sentRestoreM[1], 10)).run();
    return json({ ok: true });
  }
  // Attachment download — proxy R2 object so the admin token gates access.
  const attDownloadM = path.match(/^\/api\/admin\/attachment\/(\d+)\/download$/);
  if (attDownloadM && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    if (!env.ATTACHMENTS) return json({ error: 'r2_not_bound' }, 503);
    const attId = parseInt(attDownloadM[1], 10);
    const att = await env.DB.prepare('SELECT * FROM email_attachments WHERE id = ?').bind(attId).first();
    if (!att) return json({ error: 'not_found' }, 404);
    const obj = await env.ATTACHMENTS.get(att.r2_key);
    if (!obj) return json({ error: 'gone' }, 410);
    // v01.068 (Phase 4): unwrap envelope if r2_encrypted = 1.
    let bodyOut;
    if (att.r2_encrypted) {
      const wrapped = await obj.arrayBuffer();
      const plain = await decryptR2Bytes(env, wrapped, true);
      if (plain == null) return json({ error: 'decrypt_failed' }, 503);
      bodyOut = plain;
    } else {
      bodyOut = obj.body;
    }
    // v01.065 P0-3: read-audit every attachment download. Attachments
    // typically contain ID scans / transcripts / personal docs — the
    // highest-PII surface in the system, deserves its own trail.
    ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
      action: 'read_pii', target_type: 'attachment', target_id: String(attId),
      detail: { filename: att.filename, size: att.size, mime: att.mime, side: att.side, email_id: att.email_id },
    }));
    return new Response(bodyOut, {
      headers: {
        'content-type': att.mime || 'application/octet-stream',
        'content-disposition': `attachment; filename="${encodeURIComponent(att.filename || 'attachment')}"`,
        'content-length': String(att.size || 0),
      },
    });
  }
  // Compose / reply send. Body shape:
  //   { from, to, cc?, bcc?, subject, body_html, body_text?, in_reply_to?,
  //     attachments?: [{ filename, mime, content_base64 }] }   // ≤10 files, 50 MB total
  // Legacy callers may still send { body } (plain text); we treat it as text.
  if (path === '/api/admin/mail/send' && method === 'POST') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'invalid_json' }, 400);
    const fromAddr = String(body.from || '').trim().toLowerCase();
    const toAddr   = String(body.to   || '').trim().toLowerCase();
    const subject  = String(body.subject || '').trim();
    // body_html (rich, from TipTap) takes priority. body_text is derived from
    // it for plain-text fallback. Legacy { body } is treated as plain text.
    // P1-1: sanitize the HTML before we either send it or persist it. Admin
    // is trusted to write copy but not trusted to bypass the allowlist;
    // also covers the case where a copy-paste from a malicious source
    // brings in <script> / on* attributes.
    const bodyHtml = body.body_html ? await sanitizeHtml(String(body.body_html)) : '';
    const bodyText = body.body_text != null ? String(body.body_text)
                   : bodyHtml ? htmlToPlainText(bodyHtml)
                   : String(body.body || '');
    const ccList   = splitEmailList(body.cc);
    const bccList  = splitEmailList(body.bcc);
    const inReplyTo = body.in_reply_to ? String(body.in_reply_to) : null;
    if (!isEmail(fromAddr)) return json({ error: 'invalid_from' }, 400);
    if (!isEmail(toAddr))   return json({ error: 'invalid_to' }, 400);
    for (const e of ccList)  if (!isEmail(e)) return json({ error: 'invalid_cc',  addr: e }, 400);
    for (const e of bccList) if (!isEmail(e)) return json({ error: 'invalid_bcc', addr: e }, 400);
    if (!subject)           return json({ error: 'subject_required' }, 400);
    if (!bodyText && !bodyHtml) return json({ error: 'body_required' }, 400);

    // Attachments: cap 10 files / 50 MB total raw. Resend allows ≤40 MB
    // total per email so we additionally fail if the outbound payload would
    // exceed 40 MB.
    const ATT_MAX_FILES = 10, ATT_MAX_TOTAL_RAW = 50 * 1024 * 1024, RESEND_MAX_TOTAL = 40 * 1024 * 1024;
    const incoming = Array.isArray(body.attachments) ? body.attachments : [];
    if (incoming.length > ATT_MAX_FILES) return json({ error: 'too_many_attachments', max: ATT_MAX_FILES }, 413);
    const decoded = [];
    let totalRaw = 0;
    for (const a of incoming) {
      const filename = String(a.filename || 'attachment').slice(0, 200);
      const mime     = String(a.mime || 'application/octet-stream').slice(0, 100);
      const b64      = String(a.content_base64 || '').replace(/\s/g, '');
      if (!b64) return json({ error: 'empty_attachment', filename }, 400);
      let bytes;
      try { const bin = atob(b64); bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); }
      catch { return json({ error: 'invalid_base64', filename }, 400); }
      totalRaw += bytes.byteLength;
      if (totalRaw > ATT_MAX_TOTAL_RAW) return json({ error: 'attachments_too_large', max_bytes: ATT_MAX_TOTAL_RAW }, 413);
      decoded.push({ filename, mime, bytes, b64 });
    }
    if (totalRaw > RESEND_MAX_TOTAL) return json({ error: 'resend_payload_too_large', detail: 'Resend caps each email at 40 MB total including attachments.', max_bytes: RESEND_MAX_TOTAL }, 413);

    const ts = new Date().toISOString();
    let sendResult = { sent: false, reason: 'no_key' };
    let resendId = null, error = null, status = 'queued';
    const htmlForSend = bodyHtml || textToHtml(bodyText);
    const textForSend = bodyText || htmlToPlainText(bodyHtml);
    if (env.RESEND_API_KEY) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'authorization': 'Bearer ' + env.RESEND_API_KEY,
            'content-type':  'application/json',
          },
          body: JSON.stringify({
            from: fromAddr,
            to: [toAddr],
            ...(ccList.length  ? { cc:  ccList  } : {}),
            ...(bccList.length ? { bcc: bccList } : {}),
            subject,
            text: textForSend,
            html: htmlForSend,
            ...(inReplyTo ? { headers: { 'In-Reply-To': inReplyTo, 'References': inReplyTo } } : {}),
            ...(decoded.length ? { attachments: decoded.map(a => ({ filename: a.filename, content: a.b64, content_type: a.mime })) } : {}),
          }),
        });
        if (r.ok) {
          const d = await r.json().catch(() => ({}));
          resendId = d.id || null;
          status = 'sent';
          sendResult = { sent: true };
        } else {
          status = 'failed';
          error = ('http_' + r.status + ': ' + (await r.text().catch(() => ''))).slice(0, 500);
          sendResult = { sent: false, reason: 'http_' + r.status, err: error };
        }
      } catch (e) {
        status = 'failed';
        error = String(e.message || e).slice(0, 500);
        sendResult = { sent: false, reason: 'exception', err: error };
      }
    } else {
      status = 'queued';
      error = 'RESEND_API_KEY not configured — message stored as queued.';
    }
    // v01.067 (Phase 3): encrypt subject / body_text / body_html when the
    // PII_ENCRYPTION_KEY is set. Plaintext columns are NULLed so a DB dump
    // carries only one copy. Outbound mail contains user names + admission
    // decisions + replies that quote inbound personal content.
    const obSubjEnc  = await encryptPii(env, subject || '');
    const obTextEnc  = textForSend ? await encryptPii(env, textForSend) : null;
    const obHtmlEnc  = htmlForSend ? await encryptPii(env, htmlForSend) : null;
    const obSubjPlain = obSubjEnc ? null : (subject || null);
    const obTextPlain = obTextEnc ? null : (textForSend || null);
    const obHtmlPlain = obHtmlEnc ? null : (htmlForSend || null);
    const ins = await env.DB.prepare(
      'INSERT INTO outbound_emails (ts, from_addr, to_addr, cc, bcc, subject, subject_enc, body_text, body_text_enc, body_html, body_html_enc, in_reply_to, resend_id, status, error, actor_user) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      ts, fromAddr, toAddr,
      ccList.length ? ccList.join(', ') : null,
      bccList.length ? bccList.join(', ') : null,
      obSubjPlain, obSubjEnc,
      obTextPlain, obTextEnc,
      obHtmlPlain, obHtmlEnc,
      inReplyTo, resendId, status, error, 'admin'
    ).run();
    const emailId = ins.meta?.last_row_id;
    // Persist attachments to R2 + metadata regardless of send outcome so the
    // operator can see what they tried to send + retry.
    if (emailId && env.ATTACHMENTS && decoded.length) {
      for (let i = 0; i < decoded.length; i++) {
        const a = decoded[i];
        const safe = a.filename.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 200);
        const key = `attachments/outbound/${emailId}/${i}-${safe}`;
        try {
          // v01.068 (Phase 4): envelope-encrypt before R2 put.
          const wrapped = await encryptR2Bytes(env, a.bytes);
          await env.ATTACHMENTS.put(key, wrapped.bytes, { httpMetadata: { contentType: a.mime } });
          await env.DB.prepare(
            'INSERT INTO email_attachments (email_id, side, ts, filename, mime, size, r2_key, r2_encrypted) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(emailId, 'outbound', ts, a.filename, a.mime, a.bytes.byteLength, key, wrapped.encrypted ? 1 : 0).run();
        } catch {}
      }
    }
    return json({ ok: sendResult.sent, status, resend_id: resendId, error, attachments: decoded.length });
  }

  // ── Notifications (admin → specific users, visible only on My Page) ─────
  // Each call creates a campaign row + N notification rows (one per
  // recipient). Body shape:
  //   { user_ids?: [], group_ids?: [], sender, subject_ko/en, body_ko/en }
  // user_ids and group_ids are merged + deduped; either or both may be set.
  if (path === '/api/admin/notifications' && method === 'POST') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'invalid_json' }, 400);
    const directIds = Array.isArray(body.user_ids) ? body.user_ids.filter(x => typeof x === 'string') : [];
    const groupIds  = Array.isArray(body.group_ids) ? body.group_ids.filter(x => typeof x === 'string') : [];
    // Expand group ids → user ids and dedupe with the explicit list.
    const recipients = new Set(directIds);
    let primaryGroup = null;
    if (groupIds.length) {
      primaryGroup = groupIds[0];
      const placeholders = groupIds.map(() => '?').join(',');
      const { results } = await env.DB.prepare(
        'SELECT user_id FROM member_group_members WHERE group_id IN (' + placeholders + ')'
      ).bind(...groupIds).all();
      for (const r of results || []) recipients.add(r.user_id);
    }
    const ids = [...recipients];
    if (!ids.length) return json({ error: 'no_recipients' }, 400);
    if (!body.subject_ko && !body.subject_en) return json({ error: 'subject_required' }, 400);
    if (!body.body_ko && !body.body_en) return json({ error: 'body_required' }, 400);
    const ts = new Date().toISOString();
    const sender = String(body.sender || 'admin').slice(0, 80);
    const actor  = (await currentUser(request, env))?.email || 'admin';

    // Campaign row first so notifications can back-reference it.
    const campaignId = 'NTC-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4);
    await env.DB.prepare(
      'INSERT INTO notification_campaigns (id, ts, sender, subject_ko, subject_en, body_ko, body_en, recipient_count, group_id, actor_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(campaignId, ts, sender,
      body.subject_ko ? String(body.subject_ko) : null,
      body.subject_en ? String(body.subject_en) : null,
      body.body_ko    ? String(body.body_ko)    : null,
      body.body_en    ? String(body.body_en)    : null,
      ids.length, primaryGroup, actor,
    ).run();

    let written = 0;
    for (const uid of ids.slice(0, 1000)) {
      const id = 'NTF-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4);
      try {
        await env.DB.prepare(
          'INSERT INTO notifications (id, user_id, ts, sender, subject_ko, subject_en, body_ko, body_en, campaign_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, uid, ts, sender,
                body.subject_ko ? String(body.subject_ko) : null,
                body.subject_en ? String(body.subject_en) : null,
                body.body_ko    ? String(body.body_ko)    : null,
                body.body_en    ? String(body.body_en)    : null,
                campaignId).run();
        written++;
      } catch {}
    }
    // Update the actual delivered count (in case some inserts failed).
    if (written !== ids.length) {
      await env.DB.prepare('UPDATE notification_campaigns SET recipient_count = ? WHERE id = ?')
        .bind(written, campaignId).run();
    }
    return json({ ok: true, sent_to: written, campaign_id: campaignId });
  }

  // Campaign list — paged, latest first. Each row carries read counts so
  // the operator can see open rates without expanding the row.
  if (path === '/api/admin/notification-campaigns' && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '50', 10) || 50, 200);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0',  10) || 0,  0);
    const { results } = await env.DB.prepare(
      "SELECT c.id, c.ts, c.sender, c.subject_ko, c.subject_en, c.recipient_count, " +
      "       c.group_id, c.actor_user, " +
      "       (SELECT COUNT(*) FROM notifications n WHERE n.campaign_id = c.id AND n.read_at IS NOT NULL) AS read_count " +
      "FROM notification_campaigns c ORDER BY c.ts DESC LIMIT ? OFFSET ?"
    ).bind(limit, offset).all();
    const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM notification_campaigns').first();
    return json({ items: results || [], total: total?.n || 0, limit, offset });
  }
  // Campaign detail — full body + per-recipient read state.
  const campaignDetailM = path.match(/^\/api\/admin\/notification-campaigns\/([A-Z0-9_-]+)$/);
  if (campaignDetailM && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const cid = campaignDetailM[1];
    const camp = await env.DB.prepare('SELECT * FROM notification_campaigns WHERE id = ?').bind(cid).first();
    if (!camp) return json({ error: 'not_found' }, 404);
    const { results: recs } = await env.DB.prepare(
      "SELECT n.id, n.user_id, n.read_at, u.email, u.name " +
      "FROM notifications n LEFT JOIN users u ON u.id = n.user_id " +
      "WHERE n.campaign_id = ? ORDER BY n.id"
    ).bind(cid).all();
    return json({ campaign: camp, recipients: recs || [] });
  }
  // Campaign delete — cascades through notifications rows so recipients
  // also lose their copy. Use sparingly (operator audit trail goes too).
  if (campaignDetailM && method === 'DELETE') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const cid = campaignDetailM[1];
    await env.DB.prepare('DELETE FROM notifications WHERE campaign_id = ?').bind(cid).run();
    await env.DB.prepare('DELETE FROM notification_campaigns WHERE id = ?').bind(cid).run();
    return json({ ok: true });
  }

  // ── Member groups CRUD ───────────────────────────────────────────────────
  // Saved selections of users so a campaign can reuse them. Members are
  // a many-to-many join (member_group_members).
  if (path === '/api/admin/groups' && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const { results } = await env.DB.prepare(
      "SELECT g.*, (SELECT COUNT(*) FROM member_group_members m WHERE m.group_id = g.id) AS member_count " +
      "FROM member_groups g ORDER BY g.created_at DESC"
    ).all();
    return json({ items: results || [] });
  }
  if (path === '/api/admin/groups' && method === 'POST') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const body = await request.json().catch(() => null);
    if (!body || !String(body.name_ko || '').trim()) return json({ error: 'name_required' }, 400);
    const id = 'MG-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4);
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO member_groups (id, name_ko, name_en, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, String(body.name_ko).trim(), body.name_en || null, body.description || null, body.color || null, now, now).run();
    // Optional initial member list
    if (Array.isArray(body.user_ids)) {
      for (const uid of body.user_ids.slice(0, 5000)) {
        if (typeof uid !== 'string') continue;
        try { await env.DB.prepare('INSERT OR IGNORE INTO member_group_members (group_id, user_id, added_at) VALUES (?, ?, ?)').bind(id, uid, now).run(); } catch {}
      }
    }
    return json({ ok: true, id });
  }
  const groupItemM = path.match(/^\/api\/admin\/groups\/([A-Z0-9_-]+)$/);
  if (groupItemM) {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const gid = groupItemM[1];
    if (method === 'GET') {
      const g = await env.DB.prepare('SELECT * FROM member_groups WHERE id = ?').bind(gid).first();
      if (!g) return json({ error: 'not_found' }, 404);
      const { results: mem } = await env.DB.prepare(
        "SELECT m.user_id, m.added_at, u.email, u.name, u.role " +
        "FROM member_group_members m LEFT JOIN users u ON u.id = m.user_id " +
        "WHERE m.group_id = ? ORDER BY u.name COLLATE NOCASE"
      ).bind(gid).all();
      return json({ group: g, members: mem || [] });
    }
    if (method === 'PATCH') {
      const body = await request.json().catch(() => null);
      if (!body) return json({ error: 'invalid_json' }, 400);
      const sets = []; const binds = [];
      for (const k of ['name_ko', 'name_en', 'description', 'color']) {
        if (body[k] !== undefined) { sets.push(k + ' = ?'); binds.push(body[k] == null ? null : String(body[k])); }
      }
      if (!sets.length) return json({ ok: true, changed: 0 });
      sets.push('updated_at = ?'); binds.push(new Date().toISOString());
      binds.push(gid);
      await env.DB.prepare('UPDATE member_groups SET ' + sets.join(', ') + ' WHERE id = ?').bind(...binds).run();
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      // FK cascade drops join rows automatically.
      await env.DB.prepare('DELETE FROM member_groups WHERE id = ?').bind(gid).run();
      return json({ ok: true });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }
  // Membership add / remove. Body: { user_ids: [] }.
  const groupMembersM = path.match(/^\/api\/admin\/groups\/([A-Z0-9_-]+)\/members$/);
  if (groupMembersM) {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const gid = groupMembersM[1];
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'invalid_json' }, 400);
    const ids = Array.isArray(body.user_ids) ? body.user_ids.filter(x => typeof x === 'string') : [];
    const now = new Date().toISOString();
    if (method === 'POST') {
      let added = 0;
      for (const uid of ids.slice(0, 5000)) {
        try {
          const r = await env.DB.prepare('INSERT OR IGNORE INTO member_group_members (group_id, user_id, added_at) VALUES (?, ?, ?)').bind(gid, uid, now).run();
          if (r.meta?.changes) added++;
        } catch {}
      }
      await env.DB.prepare('UPDATE member_groups SET updated_at = ? WHERE id = ?').bind(now, gid).run();
      return json({ ok: true, added });
    }
    if (method === 'DELETE') {
      let removed = 0;
      for (const uid of ids.slice(0, 5000)) {
        try {
          const r = await env.DB.prepare('DELETE FROM member_group_members WHERE group_id = ? AND user_id = ?').bind(gid, uid).run();
          if (r.meta?.changes) removed++;
        } catch {}
      }
      await env.DB.prepare('UPDATE member_groups SET updated_at = ? WHERE id = ?').bind(now, gid).run();
      return json({ ok: true, removed });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── My notifications ─────────────────────────────────────────────────────
  if (path === '/api/me/notifications') {
    const u = await currentUser(request, env);
    if (!u) return json({ error: 'unauthorized' }, 401);
    if (method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, ts, sender, subject_ko, subject_en, body_ko, body_en, read_at FROM notifications WHERE user_id = ? ORDER BY ts DESC LIMIT 200'
      ).bind(u.id).all();
      const items = results || [];
      const unread = items.filter(n => !n.read_at).length;
      return json({ items, unread });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }
  // Single notification — GET returns + (optionally) marks read; PATCH lets
  // the user toggle read; DELETE removes their copy.
  const myNotifM = path.match(/^\/api\/me\/notifications\/([A-Z0-9_-]+)$/);
  if (myNotifM) {
    const u = await currentUser(request, env);
    if (!u) return json({ error: 'unauthorized' }, 401);
    const id = myNotifM[1];
    if (method === 'GET') {
      const row = await env.DB.prepare(
        'SELECT * FROM notifications WHERE id = ? AND user_id = ?'
      ).bind(id, u.id).first();
      if (!row) return json({ error: 'not_found' }, 404);
      // Auto-mark-read on first GET — matches "open the post" gesture.
      if (!row.read_at) {
        const now = new Date().toISOString();
        await env.DB.prepare('UPDATE notifications SET read_at = ? WHERE id = ?').bind(now, id).run();
        row.read_at = now;
      }
      return json(row);
    }
    if (method === 'PATCH') {
      const body = await request.json().catch(() => ({}));
      const next = body.read === false ? null : new Date().toISOString();
      await env.DB.prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?').bind(next, id, u.id).run();
      return json({ ok: true, read_at: next });
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').bind(id, u.id).run();
      return json({ ok: true });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── Integrations: status of every known external secret ─────────────────
  // ── Admin global search ──────────────────────────────────────────────────
  // Real-time cross-table search the operator uses from the sidebar input.
  // Hits members / applications / inquiries / inbound + outbound emails
  // and walks the wiki + KV content blob. Per-section cap so a vague query
  // doesn't dump tens of thousands of rows. q is trimmed and capped at
  // 100 chars; empty q returns an empty result set instead of everything.
  if (path === '/api/admin/search' && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const qRaw = (url.searchParams.get('q') || '').trim();
    if (!qRaw) {
      return json({ q: '', users: [], applications: [], inquiries: [], inbound_emails: [], outbound_emails: [], wiki: [], content: [] });
    }
    const q = qRaw.slice(0, 100);
    const like = '%' + q + '%';
    const PER = 10;
    const qLow = q.toLowerCase();

    // D1 lookups run in parallel — six small queries. Each one .all()
    // returns { results: [...] } so we wrap in catch-fallbacks to keep
    // a single slow table from blocking the rest of the response.
    const safeAll = async (sql, ...binds) => {
      try { const r = await env.DB.prepare(sql).bind(...binds).all(); return r.results || []; } catch { return []; }
    };
    const [users, applications, inquiries, inEmails, outEmails] = await Promise.all([
      // v01.046: phone exact match restored via HMAC column when q
      // looks like phone digits. Phone-fragment / LIKE still impossible
      // by design — the HMAC is a digest of the full number.
      (async () => {
        const digitsOnly = q.replace(/\D/g, '');
        const isPhoneish = digitsOnly.length >= 4 && /^\+?\d+/.test(q.trim().replace(/[\s-]/g, ''));
        const phoneH = isPhoneish ? await computePiiHmac(env, digitsOnly) : null;
        if (phoneH) {
          return safeAll(
            'SELECT id, email, name, role, created_at FROM users ' +
            'WHERE email LIKE ? OR name LIKE ? OR id LIKE ? OR phone_national_h = ? ' +
            'ORDER BY created_at DESC LIMIT ?',
            like, like, like, phoneH, PER
          );
        }
        return safeAll(
          'SELECT id, email, name, role, created_at FROM users ' +
          'WHERE email LIKE ? OR name LIKE ? OR id LIKE ? ' +
          'ORDER BY created_at DESC LIMIT ?',
          like, like, like, PER
        );
      })(),
      // v01.066 Phase 2: applications name/email are now encrypted. SQL
      // LIKE matches the legacy plaintext columns (NULL/empty on new rows).
      // For new rows we recover exact-email lookup via email_h HMAC; id
      // LIKE always works. Fragment search on encrypted name/essay/etc.
      // is impossible by design — operators use id or exact email.
      (async () => {
        const emailH = isEmail(qLow) ? await computePiiHmac(env, qLow, 'email-hmac') : null;
        const rows = await safeAll(
          'SELECT id, email, email_enc, name, name_enc, status, created_at FROM applications ' +
          'WHERE id LIKE ? OR email LIKE ? OR name LIKE ?' +
          (emailH ? ' OR email_h = ?' : '') +
          ' ORDER BY created_at DESC LIMIT ?',
          ...(emailH ? [like, like, like, emailH, PER] : [like, like, like, PER])
        );
        const out = [];
        for (const r of rows) {
          // Inline decrypt only the two fields the admin UI shows in the
          // search result list — name + email. Avoids hauling the entire
          // encrypted row through for no display benefit.
          if (r.name_enc)  { const d = await decryptPii(env, r.name_enc);  if (d != null) r.name  = d; }
          if (r.email_enc) { const d = await decryptPii(env, r.email_enc); if (d != null) r.email = d; }
          delete r.name_enc; delete r.email_enc;
          out.push(r);
        }
        return out;
      })(),
      // v01.065 P0-4: inquiries name/email/subject/body are now encrypted.
      // SQL LIKE matches only the legacy plaintext columns (NULL on new
      // rows). For new rows, exact-email search is supported via email_h
      // HMAC; id LIKE always works. Body/name/subject fragment search on
      // encrypted rows is impossible by design and is dropped from this
      // surface — operators looking for a specific inquiry now go through
      // id or exact email.
      (async () => {
        const emailH = isEmail(qLow) ? await computePiiHmac(env, qLow, 'email-hmac') : null;
        const rows = await safeAll(
          'SELECT id, name, name_enc, email, email_enc, subject, subject_enc, body, body_enc, ' +
          '       created_at, status FROM inquiries ' +
          'WHERE id LIKE ? OR email LIKE ? OR name LIKE ? OR subject LIKE ? OR body LIKE ?' +
          (emailH ? ' OR email_h = ?' : '') +
          ' ORDER BY created_at DESC LIMIT ?',
          ...(emailH
            ? [like, like, like, like, like, emailH, PER]
            : [like, like, like, like, like, PER])
        );
        const dec = await Promise.all(rows.map((r) => decryptInquiryRow(env, r)));
        // Reshape into the existing { id, email, name, subject, preview, ... }
        // contract that the admin search UI expects.
        return dec.map((r) => ({
          id: r.id, email: r.email, name: r.name, subject: r.subject,
          preview: r.body ? String(r.body).slice(0, 200) : '',
          created_at: r.created_at, status: r.status,
        }));
      })(),
      // v01.067 (Phase 3): inbound + outbound subject/body are encrypted on
      // new rows. SQL LIKE only hits the address columns (still plaintext)
      // and any legacy plaintext bodies. Decrypt the selected rows and
      // rebuild preview from the decrypted body.
      (async () => {
        const rows = await safeAll(
          'SELECT id, ts, from_addr, to_addr, subject, subject_enc, body_text, body_text_enc, body_html, body_html_enc ' +
          'FROM inbound_emails ' +
          'WHERE from_addr LIKE ? OR to_addr LIKE ? OR subject LIKE ? OR body_text LIKE ? OR body_html LIKE ? ' +
          'ORDER BY ts DESC LIMIT ?',
          like, like, like, like, like, PER
        );
        const out = [];
        for (const r of rows) {
          await decryptEmailRow(env, r);
          out.push({
            id: r.id, ts: r.ts, from_addr: r.from_addr, to_addr: r.to_addr,
            subject: r.subject,
            preview: String(r.body_text || r.body_html || '').slice(0, 200),
          });
        }
        return out;
      })(),
      (async () => {
        const rows = await safeAll(
          'SELECT id, ts, to_addr, subject, subject_enc, body_text, body_text_enc, body_html, body_html_enc ' +
          'FROM outbound_emails ' +
          'WHERE to_addr LIKE ? OR subject LIKE ? OR body_text LIKE ? OR body_html LIKE ? ' +
          'ORDER BY ts DESC LIMIT ?',
          like, like, like, like, PER
        );
        const out = [];
        for (const r of rows) {
          await decryptEmailRow(env, r);
          out.push({
            id: r.id, ts: r.ts, to_addr: r.to_addr,
            subject: r.subject,
            preview: String(r.body_text || r.body_html || '').slice(0, 200),
          });
        }
        return out;
      })(),
    ]);

    // Wiki search — walks all known wiki slugs and looks for the query
    // in page title or body. Excerpts a window around the first match.
    const wikiHits = [];
    const slugs = ['kms', 'design', 'color', 'versions'];
    for (const slug of slugs) {
      if (wikiHits.length >= PER * 2) break;
      try {
        const raw = await env.CONTENT_KV.get('wiki:' + slug);
        if (!raw) continue;
        const data = JSON.parse(raw);
        for (const p of (data.pages || [])) {
          const title = String(p.title || '');
          const body  = String(p.body  || '');
          const idxT = title.toLowerCase().indexOf(qLow);
          const idxB = body.toLowerCase().indexOf(qLow);
          if (idxT < 0 && idxB < 0) continue;
          let excerpt;
          if (idxB >= 0) {
            // Strip HTML tags from the excerpt window so the operator
            // sees prose, not markup.
            const start = Math.max(0, idxB - 80);
            const slice = body.slice(start, idxB + 120).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            excerpt = (start > 0 ? '… ' : '') + slice;
          } else {
            excerpt = title;
          }
          wikiHits.push({ slug, page_id: p.id, title, excerpt: excerpt.slice(0, 240) });
          if (wikiHits.length >= PER * 2) break;
        }
      } catch {}
    }

    // CONTENT_KEY (dp_content_v1) search — walks the JSON tree and emits
    // every string value containing q. Useful for finding which content
    // field a piece of public-site copy lives in.
    const contentHits = [];
    try {
      const raw = await env.CONTENT_KV.get(CONTENT_KEY);
      if (raw) {
        const c = JSON.parse(raw);
        const walk = (obj, p) => {
          if (contentHits.length >= PER) return;
          if (typeof obj === 'string') {
            if (obj.toLowerCase().includes(qLow)) {
              contentHits.push({ path: p.replace(/^\./, ''), value: obj.slice(0, 200) });
            }
            return;
          }
          if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) { walk(obj[i], p + '[' + i + ']'); if (contentHits.length >= PER) return; }
            return;
          }
          if (obj && typeof obj === 'object') {
            for (const k of Object.keys(obj)) { walk(obj[k], p + '.' + k); if (contentHits.length >= PER) return; }
          }
        };
        walk(c, '');
      }
    } catch {}

    // v01.065 P0-3: read-audit admin global search. Log a digest of the
    // query rather than the query itself — the query may be an email or
    // phone fragment which is already PII; we don't want to mirror it
    // into the audit trail in plaintext.
    const qHash = await (async () => {
      try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(q));
        return Array.from(new Uint8Array(buf).slice(0, 8), b => b.toString(16).padStart(2, '0')).join('');
      } catch { return ''; }
    })();
    ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
      action: 'admin_search',
      detail: {
        q_len: q.length, q_sha8: qHash,
        hits: {
          users: users.length, applications: applications.length, inquiries: inquiries.length,
          inbound: inEmails.length, outbound: outEmails.length, wiki: wikiHits.length, content: contentHits.length,
        },
      },
    }));
    return json({
      q,
      users, applications, inquiries,
      inbound_emails: inEmails, outbound_emails: outEmails,
      wiki: wikiHits,
      content: contentHits,
    });
  }

  // Reports whether each Workers-secret env var is set, WITHOUT ever
  // returning the value. The admin UI uses this to render
  // "Configured / Not configured" pills. Secrets stay where they belong
  // (env), the UI just confirms they're plugged in.
  if (path === '/api/admin/integrations/status' && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const known = [
      { id: 'RESEND_API_KEY',      label: 'Resend (transactional email)',     critical: true },
      { id: 'STRIPE_SECRET_KEY',   label: 'Stripe (payments)',                critical: false },
      { id: 'TOSS_SECRET_KEY',     label: 'Toss Payments (payments, KR)',     critical: false },
      { id: 'KAKAOPAY_SECRET_KEY', label: 'KakaoPay (payments, KR)',          critical: false },
      { id: 'PORTONE_API_KEY',     label: 'PortOne / aimport (payments, KR)', critical: false },
      { id: 'CF_API_TOKEN',        label: 'Cloudflare API token (automation)',critical: false },
      { id: 'GOOGLE_OAUTH_SECRET', label: 'Google OAuth client secret',       critical: false },
      { id: 'KAKAO_OAUTH_SECRET',  label: 'Kakao OAuth client secret',        critical: false },
      { id: 'APPLE_OAUTH_SECRET',  label: 'Apple OAuth client secret',        critical: false },
    ];
    // P0-6 — only report whether the secret is set. Returning the
    // length narrowed brute-force search space for any attacker who
    // managed to grab partial bits of a secret through another vector.
    // Operators can verify a secret works by exercising the integration
    // (e.g. /api/admin/email/test).
    const status = known.map(s => ({
      ...s,
      configured: !!env[s.id],
    }));
    status.unshift({
      id: 'ADMIN_TOKEN',
      label: 'Admin Bearer token (this console)',
      critical: true,
      configured: !!env.ADMIN_TOKEN,
    });
    // Surface ADMIN_TOKEN_NEXT only when it's set so the operator can see
    // a rotation is in progress. When unset it stays hidden to avoid
    // confusing the dashboard.
    if (env.ADMIN_TOKEN_NEXT) {
      status.splice(1, 0, {
        id: 'ADMIN_TOKEN_NEXT',
        label: 'Admin Bearer token (rotation candidate)',
        critical: false,
        configured: true,
      });
    }
    return json({ items: status });
  }

  // Admin test-send: trigger a template against an arbitrary email so the
  // operator can verify Resend keys + DNS without doing a real signup.
  if (path === '/api/admin/email/test' && method === 'POST') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const body = await request.json().catch(() => ({}));
    const to = String(body.to || '').trim().toLowerCase();
    const slug = String(body.slug || '').trim();
    if (!isEmail(to) || !slug) return json({ error: 'invalid_request' }, 400);
    const lang = body.lang === 'en' ? 'en' : 'ko';
    // Plug in plausible vars so {{}} placeholders render something.
    const vars = {
      name: body.name || 'Test User',
      verify_url: baseUrl(request) + '/verify?token=test-token',
      reset_url:  baseUrl(request) + '/reset-password?token=test-token',
      application_id: 'A-TEST-0001',
      inquiry_id:     'INQ-TEST-0001',
    };
    const send = await sendEmail(env, { to, slug, lang, vars });
    return json(send);
  }

  if (path === '/api/auth/verify-email' && method === 'POST') {
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'invalid_json' }, 400);
    if (body.token) {
      // Confirm step: token → mark email_verified.
      const row = await env.DB.prepare('SELECT * FROM email_verifications WHERE token = ?').bind(body.token).first();
      if (!row) return json({ error: 'invalid_token' }, 400);
      if (row.consumed_at) return json({ error: 'already_used' }, 400);
      if (new Date(row.expires_at) < new Date()) return json({ error: 'expired' }, 400);
      const now = new Date().toISOString();
      await env.DB.prepare('UPDATE email_verifications SET consumed_at = ? WHERE token = ?').bind(now, body.token).run();
      await env.DB.prepare('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?').bind(now, row.user_id).run();
      return json({ ok: true });
    }
    // Mint step: caller is logged in and asks for a new verify token.
    const u = await currentUser(request, env);
    if (!u) return json({ error: 'unauthorized' }, 401);
    const token = randomHex(24);
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    await env.DB.prepare(
      'INSERT INTO email_verifications (token, user_id, email, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(token, u.id, u.email, now, expires).run();
    const verifyUrl = baseUrl(request) + '/verify?token=' + encodeURIComponent(token);
    const send = await sendEmail(env, {
      to: u.email, slug: 'verify_signup', lang: 'ko',
      vars: { name: u.name || u.email, verify_url: verifyUrl },
    });
    return json({
      ok: true, email_sent: send.sent,
      ...(send.sent ? {} : { token, expires_at: expires, dev_note: 'RESEND_API_KEY not set — token returned for manual verification.' }),
    });
  }
  // Password reset — request + confirm.
  // The request endpoint always returns { ok: true } 200 after a constant
  // baseline (PWRESET_MIN_MS). Whether the email exists, whether the
  // per-IP / per-email rate-limit fired, and whether the mail provider
  // accepted the message are all hidden from the caller. Dev-fallback
  // that returned the reset token in the response body when Resend
  // wasn't configured is gone — tokens travel via email only.
  if (path === '/api/auth/request-password-reset' && method === 'POST') {
    const startedAt = Date.now();
    const ALWAYS_OK = async () => {
      await padTiming(startedAt, PWRESET_MIN_MS);
      return json({ ok: true });
    };

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!isEmail(email)) return ALWAYS_OK();

    const ip = request.headers.get('cf-connecting-ip') || '';
    if (ip) {
      const rl = await rateLimit(env, 'rl:pwreset_ip:' + ip, PWRESET_IP_MAX_PER_HOUR, 3600);
      if (!rl.allowed) return ALWAYS_OK();
    }
    // Per-email cap so an attacker rotating IPs can't mailbomb a single
    // user. Tracked in KV so it's eventually consistent across regions.
    const rlEmail = await rateLimit(env, 'rl:pwreset_email:' + email, PWRESET_EMAIL_MAX_PER_HOUR, 3600);
    if (!rlEmail.allowed) return ALWAYS_OK();

    const u = await env.DB.prepare('SELECT id, email, name FROM users WHERE email = ?').bind(email).first();
    if (!u) return ALWAYS_OK();

    const token = randomHex(24);
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 3600 * 1000).toISOString();   // 1 hour
    await env.DB.prepare(
      'INSERT INTO password_resets (token, user_id, created_at, expires_at, ip) VALUES (?, ?, ?, ?, ?)'
    ).bind(token, u.id, now, expires, ip).run();
    const resetUrl = baseUrl(request) + '/reset-password?token=' + encodeURIComponent(token);
    const lang = (body.lang === 'en') ? 'en' : 'ko';
    // Background the Resend API call via ctx.waitUntil so the response
    // returns before the email round-trip completes. Without this, the
    // existing-email branch is ~400ms slower than the no-row branch and
    // the padTiming floor cannot hide it — the attacker would see the
    // timing diff and infer account existence.
    ctx.waitUntil(sendEmail(env, {
      to: u.email, slug: 'reset_password', lang,
      vars: { name: u.name || u.email, reset_url: resetUrl },
    }));
    return ALWAYS_OK();
  }
  // confirm-password-reset: token validity is the actual auth check here,
  // so all failure modes (no row, consumed, expired) collapse to one
  // opaque 401 with a baseline timing pad. Format errors on the payload
  // shape itself stay distinct because they don't depend on backend state.
  if (path === '/api/auth/confirm-password-reset' && method === 'POST') {
    const startedAt = Date.now();
    const FAIL = async () => {
      await padTiming(startedAt, PWRESET_MIN_MS);
      return json({ error: 'invalid_request' }, 401);
    };

    const body = await request.json().catch(() => null);
    if (!body || !body.token || typeof body.password !== 'string') return json({ error: 'invalid_request' }, 400);
    if (body.password.length < 8) return json({ error: 'password_too_short' }, 400);
    const row = await env.DB.prepare('SELECT * FROM password_resets WHERE token = ?').bind(body.token).first();
    if (!row) return FAIL();
    if (row.consumed_at) return FAIL();
    if (new Date(row.expires_at) < new Date()) return FAIL();
    const salt = randomHex(16);
    const hash = await hashPassword(body.password, salt);
    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE id = ?').bind(hash, salt, now, row.user_id).run();
    await env.DB.prepare('UPDATE password_resets SET consumed_at = ? WHERE token = ?').bind(now, body.token).run();
    // Invalidate every session for the user — force re-login with new pw.
    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.user_id).run();
    await padTiming(startedAt, PWRESET_MIN_MS);
    return json({ ok: true });
  }
  // Apply draft sync — single-row-per-user blob in D1, so a user halfway
  // through Apply on phone can pick up on laptop. The client also keeps
  // a sessionStorage copy for fast restore; the server copy is the source
  // of truth for cross-device portability.
  if (path === '/api/me/apply-draft') {
    const u = await currentUser(request, env);
    if (!u) return json({ error: 'unauthorized' }, 401);
    if (method === 'GET') {
      const row = await env.DB.prepare('SELECT body, updated_at FROM apply_drafts WHERE user_id = ?').bind(u.id).first();
      if (!row) return json({ body: null });
      try { return json({ body: JSON.parse(row.body), updated_at: row.updated_at }); }
      catch { return json({ body: null }); }
    }
    if (method === 'PUT' || method === 'POST') {
      const body = await request.text();
      try { JSON.parse(body); } catch { return json({ error: 'invalid_json' }, 400); }
      const now = new Date().toISOString();
      await env.DB.prepare(
        'INSERT INTO apply_drafts (user_id, body, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at'
      ).bind(u.id, body, now).run();
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM apply_drafts WHERE user_id = ?').bind(u.id).run();
      return json({ ok: true });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }
  if (path === '/api/auth/login'  && method === 'POST') return login(request, env, ctx);
  if (path === '/api/auth/logout' && method === 'POST') return logout(request, env);
  if (path === '/api/auth/me'     && method === 'GET')  return me(request, env);

  // ── Member profile ───────────────────────────────────────────────────────
  if (path === '/api/me/profile') {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    if (method === 'GET') {
      const row = await env.DB.prepare('SELECT * FROM member_profiles WHERE user_id = ?').bind(user.id).first();
      return json(row || {});
    }
    if (method === 'PUT' || method === 'POST') {
      // Edit-own gate. The operator can revoke profile editing for a role
      // without changing any UI by clearing pages.member.edit_own.
      const allowed = await canRole(env, user.role, 'member', 'edit_own');
      if (!allowed) return json({ error: 'forbidden', detail: `${user.role} is not allowed to edit own profile` }, 403);
      const body = await request.json().catch(() => ({}));
      return saveProfile(env, user.id, body);
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── My applications (logged-in members) ──────────────────────────────────
  if (path === '/api/me/applications' && method === 'GET') {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    const { results } = await env.DB.prepare(
      'SELECT id, submitted_at, status, amount, currency, track, program, paid_at, receipt_token FROM applications WHERE user_id = ? ORDER BY submitted_at DESC'
    ).bind(user.id).all();
    return json({ items: results || [] });
  }

  // ── Apply form draft (server-side persistence) ───────────────────────────
  // One draft per logged-in user, mirrored from the client every ~5s and
  // on every step change. The client falls back to sessionStorage when
  // logged out, but logged-in members always get the durable copy too —
  // this is how a user can resume the application from a different device
  // or after clearing browser storage. Cap: 256 KB JSON to prevent abuse.
  if (path === '/api/me/apply-draft') {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    const TTL_MS = 72 * 60 * 60 * 1000;   // 72 hours
    if (method === 'GET') {
      const row = await env.DB.prepare(
        'SELECT form_json, step, updated_at FROM apply_drafts WHERE user_id = ?'
      ).bind(user.id).first();
      if (!row) return json({ exists: false, ttl_hours: 72 });
      // Hard expiry: if the draft is older than 72 hours, drop it eagerly
      // and tell the client to start fresh. The hourly cron also sweeps
      // expired drafts, but checking on read closes the race window.
      const updatedTs = Date.parse(row.updated_at || '') || 0;
      const ageMs = Date.now() - updatedTs;
      if (updatedTs && ageMs > TTL_MS) {
        try { await env.DB.prepare('DELETE FROM apply_drafts WHERE user_id = ?').bind(user.id).run(); } catch {}
        return json({ exists: false, expired: true, ttl_hours: 72 });
      }
      let form = null;
      try { form = JSON.parse(row.form_json); }
      catch { return json({ exists: false, error: 'corrupt_draft', ttl_hours: 72 }); }
      const expires_at = new Date(updatedTs + TTL_MS).toISOString();
      return json({ exists: true, form, step: row.step || 0, updated_at: row.updated_at, expires_at, ttl_hours: 72 });
    }
    if (method === 'PUT') {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') return json({ error: 'invalid_json' }, 400);
      const form = body.form;
      const step = Math.max(0, Math.min(20, parseInt(body.step, 10) || 0));
      if (!form || typeof form !== 'object') return json({ error: 'invalid_form' }, 400);
      // PCI backstop: strip card_exp + card_cvc before persisting. The
      // client also strips them, but the server defends-in-depth so a
      // malformed/older client never lands them in our DB.
      if ('card_exp' in form) delete form.card_exp;
      if ('card_cvc' in form) delete form.card_cvc;
      let formJson;
      try { formJson = JSON.stringify(form); }
      catch { return json({ error: 'invalid_form' }, 400); }
      const MAX = 256 * 1024;
      if (formJson.length > MAX) return json({ error: 'draft_too_large', max_bytes: MAX, got: formJson.length }, 413);
      const ts = new Date().toISOString();
      await env.DB.prepare(
        'INSERT INTO apply_drafts (user_id, form_json, step, updated_at, size_bytes) VALUES (?, ?, ?, ?, ?) ' +
        'ON CONFLICT(user_id) DO UPDATE SET form_json = excluded.form_json, step = excluded.step, updated_at = excluded.updated_at, size_bytes = excluded.size_bytes'
      ).bind(user.id, formJson, step, ts, formJson.length).run();
      const expires_at = new Date(Date.now() + TTL_MS).toISOString();
      return json({ ok: true, updated_at: ts, size_bytes: formJson.length, expires_at, ttl_hours: 72 });
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM apply_drafts WHERE user_id = ?').bind(user.id).run();
      return json({ ok: true });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── Member-side application files ────────────────────────────────────────
  // List, download, and delete files for one of the caller's own applications.
  // GET  /api/me/applications/:id/files     → list metadata
  // GET  /api/me/application-files/:id/download
  // DELETE /api/me/application-files/:id
  // Re-upload uses the existing POST /api/applications/upload with the same
  // application_id; the ownership guard up there restricts it to the owner.
  // For all three of these we collapse "row exists but you don't own it"
  // (403) into "row doesn't exist" (404) so a logged-in attacker can't
  // probe the integer file id space to learn which ids belong to other
  // members. The 401 case (no session) stays distinct because that's
  // about the caller, not about the resource.
  const meAppFilesM = path.match(/^\/api\/me\/applications\/([A-Za-z0-9_-]+)\/files$/);
  if (meAppFilesM && method === 'GET') {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    const aid = meAppFilesM[1];
    const owner = await env.DB.prepare('SELECT user_id FROM applications WHERE id = ?').bind(aid).first();
    if (!owner || owner.user_id !== user.id) return json({ error: 'not_found' }, 404);
    const { results } = await env.DB.prepare(
      'SELECT id, uploaded_at, kind, recommender_idx, filename, mime, size FROM application_files WHERE application_id = ? ORDER BY id ASC'
    ).bind(aid).all();
    return json({ items: results || [] });
  }
  const meAppFileDLM = path.match(/^\/api\/me\/application-files\/(\d+)\/download$/);
  if (meAppFileDLM && method === 'GET') {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    if (!env.ATTACHMENTS) return json({ error: 'unavailable' }, 503);
    const fid = parseInt(meAppFileDLM[1], 10);
    const f = await env.DB.prepare('SELECT * FROM application_files WHERE id = ?').bind(fid).first();
    if (!f) return json({ error: 'not_found' }, 404);
    // Ownership check via the parent application row — collapsed to 404
    // on mismatch (see comment above).
    const owner = await env.DB.prepare('SELECT user_id FROM applications WHERE id = ?').bind(f.application_id).first();
    if (!owner || owner.user_id !== user.id) return json({ error: 'not_found' }, 404);
    const obj = await env.ATTACHMENTS.get(f.r2_key);
    if (!obj) return json({ error: 'not_found' }, 404);
    // v01.068 (Phase 4): unwrap envelope for the data subject's own
    // download — they're entitled to plaintext.
    let bodyOut;
    if (f.r2_encrypted) {
      const wrapped = await obj.arrayBuffer();
      const plain = await decryptR2Bytes(env, wrapped, true);
      if (plain == null) return json({ error: 'decrypt_failed' }, 503);
      bodyOut = plain;
    } else {
      bodyOut = obj.body;
    }
    return new Response(bodyOut, {
      headers: {
        'content-type': f.mime || 'application/octet-stream',
        'content-disposition': `attachment; filename="${encodeURIComponent(f.filename || 'file')}"`,
        'content-length': String(f.size || 0),
      },
    });
  }
  const meAppFileM = path.match(/^\/api\/me\/application-files\/(\d+)$/);
  if (meAppFileM && method === 'DELETE') {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    const fid = parseInt(meAppFileM[1], 10);
    const f = await env.DB.prepare('SELECT * FROM application_files WHERE id = ?').bind(fid).first();
    if (!f) return json({ error: 'not_found' }, 404);
    const owner = await env.DB.prepare('SELECT user_id FROM applications WHERE id = ?').bind(f.application_id).first();
    if (!owner || owner.user_id !== user.id) return json({ error: 'not_found' }, 404);
    // Best-effort R2 delete — if R2 is unbound or the object is missing we
    // still drop the DB row so the user's UI updates.
    try { if (env.ATTACHMENTS && f.r2_key) await env.ATTACHMENTS.delete(f.r2_key); } catch {}
    await env.DB.prepare('DELETE FROM application_files WHERE id = ?').bind(fid).run();
    return json({ ok: true });
  }

  // ── Receipt lookup (paid applications) ───────────────────────────────────
  // Auth: either (a) admin token, (b) owner is logged in, or (c) URL has matching ?token=
  const receiptM = path.match(/^\/api\/applications\/([A-Za-z0-9_-]+)\/receipt$/);
  if (receiptM && method === 'GET') {
    const id = receiptM[1];
    const row = await env.DB.prepare('SELECT * FROM applications WHERE id = ?').bind(id).first();
    if (!row) return json({ error: 'not_found' }, 404);
    if (row.status !== 'paid') return json({ error: 'not_paid' }, 400);

    const tokenParam = url.searchParams.get('token') || '';
    const isAdminAuth = await isAdmin(request, env);
    const u = await currentUser(request, env);
    const isOwner = u && row.user_id && row.user_id === u.id;
    const tokenMatch = row.receipt_token && safeEqual(tokenParam, row.receipt_token);
    if (!isAdminAuth && !isOwner && !tokenMatch) return json({ error: 'unauthorized' }, 401);

    // v01.066 (Phase 2): the response below reads row.name / row.email
    // for the payer block. Both columns hold a ciphertext-only row on
    // new submissions (plaintext is '' tombstone), so we must decrypt
    // here before serializing. Authorization above already gated who
    // can see the receipt.
    await decryptApplicationRow(env, row);

    return json({
      id: row.id,
      issuer: { name: 'KoreaDreamPath', email: 'info@koreadreampath.com' },
      paid_at: row.paid_at,
      currency: row.currency || 'USD',
      amount: row.amount,
      track: row.track,
      program: row.program,
      payer: { name: row.name, email: row.email, country: row.country },
      payment: { method: row.payment_method || 'card', card_last4: row.card_last4 || null },
    });
  }

  // ── Recommendations (stub) ───────────────────────────────────────────────
  if (path === '/api/me/recommendations' && method === 'GET') {
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    return json({ items: stubRecommendations(env), generated_at: new Date().toISOString() });
  }

  // ── News (server-side now) ───────────────────────────────────────────────
  if (path === '/api/news') {
    if (method === 'GET') return listNews(env);
    if (method === 'POST') {
      const user = await currentUser(request, env);
      if (!user) return json({ error: 'unauthorized' }, 401);
      return createNews(request, env, user);
    }
    return json({ error: 'method_not_allowed' }, 405);
  }
  const newsM = path.match(/^\/api\/news\/([A-Za-z0-9_-]+)$/);
  if (newsM) {
    // Public GET — used by /news/:id detail page on the SPA. CORS-friendly.
    if (method === 'GET') {
      const row = await env.DB.prepare(
        'SELECT id, tag, tag_color, date, title_ko, title_en, body_ko, body_en, created_at, updated_at FROM news_posts WHERE id = ?'
      ).bind(newsM[1]).first();
      if (!row) return json({ error: 'not_found' }, 404);
      return cors(json(row));
    }
    const user = await currentUser(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    if (method === 'PUT')    return updateNews(request, env, user, newsM[1]);
    if (method === 'DELETE') return deleteNews(env, user, newsM[1]);
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── Public read-only APIs (for external integrations) ───────────────────
  // CORS is intentionally permissive on these GETs only. Anything writable
  // remains restricted (admin token / session token).
  if (path === '/api/public/programs' && method === 'GET') {
    const c = await readContentFromKv(env);
    const programs = Array.isArray(c.programs) && c.programs.length ? c.programs : CURRENT_PROGRAMS;
    return cors(json({ items: programs }));
  }
  if (path === '/api/public/categories' && method === 'GET') {
    let cats = [];
    try {
      const c = await readContentFromKv(env);
      const programs = Array.isArray(c.programs) && c.programs.length ? c.programs : CURRENT_PROGRAMS;
      const seen = new Set();
      programs.forEach(p => {
        const c = p.category || (p.kicker ? p.kicker.split('·')[0].trim() : '');
        if (c && !seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); cats.push(c); }
      });
    } catch {}
    return cors(json({ items: cats }));
  }
  if (path === '/api/public/news' && method === 'GET') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 100);
    const { results } = await env.DB.prepare(
      'SELECT id, tag, tag_color, date, title_ko, title_en, body_ko, body_en, created_at FROM news_posts ORDER BY date DESC, created_at DESC LIMIT ?'
    ).bind(limit).all();
    return cors(json({ items: results || [] }));
  }
  if (path === '/api/public/partners' && method === 'GET') {
    const raw = await env.CONTENT_KV.get(CONTENT_KEY);
    let partners = [];
    try { partners = (raw ? JSON.parse(raw).partners : []) || []; } catch {}
    return cors(json({ items: partners }));
  }
  if (path === '/api/public/stories' && method === 'GET') {
    const raw = await env.CONTENT_KV.get(CONTENT_KEY);
    let stories = [];
    try { stories = (raw ? JSON.parse(raw).stories : []) || []; } catch {}
    return cors(json({ items: stories }));
  }
  if (path === '/api/public/programs' && method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
  if (path.startsWith('/api/public/') && method === 'OPTIONS') return cors(new Response(null, { status: 204 }));

  // ── Consents (GDPR audit trail) ──────────────────────────────────────────
  if (path === '/api/consents' && method === 'POST') return recordConsent(request, env);
  if (path === '/api/consents' && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10) || 30, 365);
    const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
    const userId = url.searchParams.get('user_id');
    const email  = url.searchParams.get('email');
    let q, binds;
    if (userId) { q = 'SELECT * FROM consents WHERE user_id = ? ORDER BY ts DESC LIMIT 200'; binds = [userId]; }
    else if (email) { q = 'SELECT * FROM consents WHERE email = ? ORDER BY ts DESC LIMIT 200'; binds = [email]; }
    else { q = 'SELECT * FROM consents WHERE ts >= ? ORDER BY ts DESC LIMIT 500'; binds = [since]; }
    const { results } = await env.DB.prepare(q).bind(...binds).all();
    return json({ items: results || [] });
  }

  // ── Admin: member directory ──────────────────────────────────────────────
  // Lists every registered user with last-login (latest session.created_at) and
  // application count. Used by the admin Members → Member directory tab.
  if (path === '/api/admin/users' && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const limit  = Math.min(Math.max(parseInt(url.searchParams.get('limit')  || '20', 10) || 20, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const role = (url.searchParams.get('role') || '').trim();
    const where = [];
    const binds = [];
    if (q)    { where.push('(LOWER(u.email) LIKE ? OR LOWER(COALESCE(u.name,\'\')) LIKE ?)'); binds.push('%' + q + '%', '%' + q + '%'); }
    if (role) { where.push('u.role = ?'); binds.push(role); }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const total = await env.DB.prepare('SELECT COUNT(*) AS n FROM users u ' + whereSql).bind(...binds).first();
    const sql =
      'SELECT u.id, u.email, u.name, u.role, u.created_at, u.updated_at,' +
      '       (SELECT MAX(s.created_at) FROM sessions s WHERE s.user_id = u.id) AS last_login,' +
      '       (SELECT COUNT(*) FROM applications a WHERE a.user_id = u.id) AS app_count ' +
      'FROM users u ' + whereSql + ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    const { results } = await env.DB.prepare(sql).bind(...binds, limit, offset).all();
    return json({ items: results || [], total: total?.n || 0, limit, offset });
  }
  // Admin: create a new member directly. Bypasses the public signup form so
  // the operator can pre-provision accounts (e.g. for a new admin teammate).
  if (path === '/api/admin/users' && method === 'POST') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'invalid_json' }, 400);
    const email    = String(body.email || '').trim().toLowerCase();
    const name     = String(body.name || '').trim();
    const role     = ['member','admin'].includes(body.role) ? body.role : 'member';
    const password = String(body.password || '');
    const note     = body.note ? String(body.note).slice(0, 500) : null;
    if (!isEmail(email)) return json({ error: 'invalid_email' }, 400);
    if (password.length < 8) return json({ error: 'password_too_short' }, 400);
    const dupe = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (dupe) return json({ error: 'email_taken' }, 409);
    const id   = 'U-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4);
    const salt = randomHex(16);
    const hash = await hashPassword(password, salt);
    const now  = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, password_salt, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, email, hash, salt, name || null, role, now, now).run();
    await env.DB.prepare(
      'INSERT INTO member_audits (user_id, ts, actor, action, field, old_value, new_value, note) VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?)'
    ).bind(id, now, 'admin', 'create', note).run();
    return json({ user: { id, email, name: name || null, role, created_at: now, updated_at: now } });
  }
  // Single member detail (basic profile + recent consents + audit log)
  const memM = path.match(/^\/api\/admin\/users\/([A-Za-z0-9_-]+)$/);
  if (memM && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const id = memM[1];
    // P2-5: pull the encrypted phone columns too so we can decrypt on read.
    const user = await env.DB.prepare(
      'SELECT id, email, name, role, created_at, updated_at, ' +
      'phone_country, phone_national, phone_country_enc, phone_national_enc ' +
      'FROM users WHERE id = ?'
    ).bind(id).first();
    if (!user) return json({ error: 'not_found' }, 404);
    // Prefer encrypted columns. Fall back to plaintext for legacy rows
    // written before PII_ENCRYPTION_KEY was set (or before the migration).
    const phoneCountry  = user.phone_country_enc  ? await decryptPii(env, user.phone_country_enc)  : (user.phone_country  || null);
    const phoneNational = user.phone_national_enc ? await decryptPii(env, user.phone_national_enc) : (user.phone_national || null);
    delete user.phone_country_enc;
    delete user.phone_national_enc;
    user.phone_country = phoneCountry;
    user.phone_national = phoneNational;
    const lastLogin = await env.DB.prepare(
      'SELECT MAX(created_at) AS last_login FROM sessions WHERE user_id = ?'
    ).bind(id).first();
    const profile = await env.DB.prepare('SELECT * FROM member_profiles WHERE user_id = ?').bind(id).first().catch(() => null);
    const { results: consents } = await env.DB.prepare(
      'SELECT * FROM consents WHERE user_id = ? OR email = ? ORDER BY ts DESC LIMIT 100'
    ).bind(id, user.email).all();
    const { results: audits } = await env.DB.prepare(
      'SELECT * FROM member_audits WHERE user_id = ? ORDER BY ts DESC LIMIT 200'
    ).bind(id).all().catch(() => ({ results: [] }));
    // v01.065 P0-3: read-audit one row per single-member detail view.
    ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
      action: 'read_pii', target_type: 'user', target_id: id,
    }));
    return json({
      user: { ...user, last_login: lastLogin?.last_login || null },
      profile: profile || null,
      consents: consents || [],
      audits: audits || [],
    });
  }
  // PATCH /api/admin/users/:id — update name / role / email; optional password reset.
  // Each changed column writes one member_audits row for the trail.
  if (memM && method === 'PATCH') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const id = memM[1];
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'invalid_json' }, 400);
    const cur = await env.DB.prepare('SELECT id, email, name, role FROM users WHERE id = ?').bind(id).first();
    if (!cur) return json({ error: 'not_found' }, 404);
    const now = new Date().toISOString();
    const note = body.note ? String(body.note).slice(0, 500) : null;
    const sets = [];
    const binds = [];
    const audits = [];  // [{ field, old, new }]
    if (typeof body.name === 'string' && body.name !== (cur.name || '')) {
      const v = body.name.trim() || null;
      sets.push('name = ?'); binds.push(v);
      audits.push({ field: 'name', old: cur.name, new: v });
    }
    if (typeof body.role === 'string' && ['member','admin'].includes(body.role) && body.role !== cur.role) {
      sets.push('role = ?'); binds.push(body.role);
      audits.push({ field: 'role', old: cur.role, new: body.role });
    }
    if (typeof body.email === 'string') {
      const e = body.email.trim().toLowerCase();
      if (e && e !== cur.email) {
        if (!isEmail(e)) return json({ error: 'invalid_email' }, 400);
        const dupe = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(e, id).first();
        if (dupe) return json({ error: 'email_taken' }, 409);
        sets.push('email = ?'); binds.push(e);
        audits.push({ field: 'email', old: cur.email, new: e });
      }
    }
    let passwordReset = false;
    if (typeof body.password === 'string' && body.password) {
      if (body.password.length < 8) return json({ error: 'password_too_short' }, 400);
      const salt = randomHex(16);
      const hash = await hashPassword(body.password, salt);
      sets.push('password_hash = ?', 'password_salt = ?'); binds.push(hash, salt);
      passwordReset = true;
    }
    if (!sets.length && !passwordReset) return json({ ok: true, changed: 0 });
    sets.push('updated_at = ?'); binds.push(now);
    binds.push(id);
    await env.DB.prepare('UPDATE users SET ' + sets.join(', ') + ' WHERE id = ?').bind(...binds).run();
    for (const a of audits) {
      await env.DB.prepare(
        'INSERT INTO member_audits (user_id, ts, actor, action, field, old_value, new_value, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(id, now, 'admin', 'update', a.field, a.old || null, a.new || null, note).run();
    }
    // P2-3 — invalidate sessions when role or email changes too. Password
    // change already does this below. Role/email change is privilege- or
    // identity-affecting: a compromised account being demoted/relabeled
    // should not keep its old sessions alive.
    const roleOrEmailChanged = audits.some(a => a.field === 'role' || a.field === 'email');
    if (passwordReset) {
      await env.DB.prepare(
        'INSERT INTO member_audits (user_id, ts, actor, action, field, old_value, new_value, note) VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?)'
      ).bind(id, now, 'admin', 'password_reset', note).run();
      // Invalidate every session for this user so the new password takes effect immediately.
      await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
    } else if (roleOrEmailChanged) {
      await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run();
    }
    ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
      action: 'user_update', target_type: 'user', target_id: id,
      detail: { fields: audits.map(a => a.field), password_reset: passwordReset, sessions_revoked: passwordReset || roleOrEmailChanged },
    }));
    return json({ ok: true, changed: audits.length + (passwordReset ? 1 : 0) });
  }
  if (memM && method === 'DELETE') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const id = memM[1];
    const cur = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(id).first();
    if (!cur) return json({ error: 'not_found' }, 404);
    const now = new Date().toISOString();
    // Audit FIRST while user_id still references a real row, then delete.
    await env.DB.prepare(
      'INSERT INTO member_audits (user_id, ts, actor, action, field, old_value, new_value, note) VALUES (?, ?, ?, ?, NULL, ?, NULL, NULL)'
    ).bind(id, now, 'admin', 'delete', cur.email).run();
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    // P2-3: revoke any active sessions for the deleted user too (defensive — most
    // delete flows will have already gone through soft-delete which clears these).
    ctx && ctx.waitUntil && ctx.waitUntil(env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run());
    ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
      action: 'user_delete', target_type: 'user', target_id: id, detail: { email: cur.email },
    }));
    return json({ ok: true });
  }

  // ── Errors (client report + admin list) ──────────────────────────────────
  if (path === '/api/errors') {
    if (method === 'POST') return reportClientError(request, env);
    if (method === 'GET') {
      if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 1000);
      const level    = url.searchParams.get('level');
      const source   = url.searchParams.get('source');
      const resolved = url.searchParams.get('resolved');  // '0' | '1' | '' (all)
      let sql = 'SELECT * FROM error_logs WHERE 1=1';
      const binds = [];
      if (level)    { sql += ' AND level = ?';    binds.push(level); }
      if (source)   { sql += ' AND source = ?';   binds.push(source); }
      if (resolved === '0') sql += ' AND COALESCE(resolved, 0) = 0';
      if (resolved === '1') sql += ' AND COALESCE(resolved, 0) = 1';
      sql += ' ORDER BY ts DESC LIMIT ?';
      binds.push(limit);
      const { results } = await env.DB.prepare(sql).bind(...binds).all();
      return json({ items: results || [] });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }
  if (path === '/api/errors/clear' && method === 'POST') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    await env.DB.prepare('DELETE FROM error_logs').run();
    return json({ ok: true });
  }
  // PATCH /api/errors/:id — toggle resolved + optional note. Body shape:
  //   { resolved: true|false, note?: string }
  // Used by the admin Errors → Error logs tab to mark fixes without leaving
  // the dashboard. Resolved rows still appear unless filtered out.
  const errResM = path.match(/^\/api\/errors\/(\d+)$/);
  if (errResM && method === 'PATCH') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const id = parseInt(errResM[1], 10);
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: 'invalid_json' }, 400);
    const resolved = body.resolved ? 1 : 0;
    const now = resolved ? new Date().toISOString() : null;
    const note = body.note ? String(body.note).slice(0, 500) : null;
    await env.DB.prepare(
      'UPDATE error_logs SET resolved = ?, resolved_at = ?, resolved_note = ? WHERE id = ?'
    ).bind(resolved, now, note, id).run();
    return json({ ok: true });
  }

  // ── GDPR self-service (logged-in user) ───────────────────────────────────
  if (path === '/api/me' && method === 'DELETE') return deleteMyAccount(request, env, ctx);
  if (path === '/api/me/export' && method === 'GET') return exportMyData(request, env, ctx);

  // ── Analytics ────────────────────────────────────────────────────────────
  if (path === '/api/analytics' && method === 'POST') {
    return ingestEvents(request, env);
  }
  if (path === '/api/analytics/summary' && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    return analyticsSummary(env, url);
  }
  if (path === '/api/analytics/journeys' && method === 'GET') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    return analyticsJourneys(env, url);
  }

  // ── Program details (long-form body per program) ────────────────────────
  const pdM = path.match(/^\/api\/programs\/([A-Za-z0-9_-]+)\/details$/);
  if (pdM) {
    const id = pdM[1];
    if (method === 'GET') {
      const row = await env.DB.prepare('SELECT * FROM program_details WHERE program_id = ?').bind(id).first();
      const picked = row || getDefaultProgramDetail(id) || { program_id: id };
      if (picked && typeof picked.courses_json === 'string') {
        try { picked.courses_json = JSON.parse(picked.courses_json); } catch { picked.courses_json = []; }
      }
      return json(picked);
    }
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    if (method === 'PUT' || method === 'POST') {
      const body = await request.json().catch(() => null);
      if (!body) return json({ error: 'invalid_json' }, 400);
      // P1-1: rich-text fields go through the allowlist sanitizer. Plain
      // string fields (duration, format, …) are not HTML and stay as-is.
      const rich = await Promise.all([
        sanitizeHtml(str(body.overview_ko) || ''),
        sanitizeHtml(str(body.overview_en) || ''),
        sanitizeHtml(str(body.curriculum_ko) || ''),
        sanitizeHtml(str(body.curriculum_en) || ''),
        sanitizeHtml(str(body.outcomes_ko) || ''),
        sanitizeHtml(str(body.outcomes_en) || ''),
        sanitizeHtml(str(body.prerequisites_ko) || ''),
        sanitizeHtml(str(body.prerequisites_en) || ''),
        sanitizeHtml(str(body.instructor_bio_ko) || ''),
        sanitizeHtml(str(body.instructor_bio_en) || ''),
      ]);
      const cols = ['program_id','overview_ko','overview_en','curriculum_ko','curriculum_en',
                    'outcomes_ko','outcomes_en','prerequisites_ko','prerequisites_en',
                    'courses_json',
                    'duration','format','language_required','start_date','cohort_size',
                    'certification','instructor_name','instructor_title',
                    'instructor_bio_ko','instructor_bio_en',
                    'cost_full','cost_currency','updated_at','updated_by'];
      const values = [id,
                      rich[0] || null, rich[1] || null,
                      rich[2] || null, rich[3] || null,
                      rich[4] || null, rich[5] || null,
                      rich[6] || null, rich[7] || null,
                      JSON.stringify(Array.isArray(body.courses_json) ? body.courses_json : []),
                      str(body.duration), str(body.format), str(body.language_required),
                      str(body.start_date), body.cohort_size != null ? Number(body.cohort_size) : null,
                      str(body.certification), str(body.instructor_name), str(body.instructor_title),
                      rich[8] || null, rich[9] || null,
                      body.cost_full != null ? Number(body.cost_full) : null,
                      str(body.cost_currency || 'USD'),
                      new Date().toISOString(), null];
      const placeholders = cols.map(() => '?').join(',');
      const updateSet = cols.slice(1).map(k => `${k} = excluded.${k}`).join(', ');
      const sql = `INSERT INTO program_details (${cols.join(',')}) VALUES (${placeholders})
                   ON CONFLICT(program_id) DO UPDATE SET ${updateSet}`;
      await env.DB.prepare(sql).bind(...values).run();
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM program_details WHERE program_id = ?').bind(id).run();
      return json({ ok: true });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── Inquiries ────────────────────────────────────────────────────────────
  if (path === '/api/inquiries') {
    if (method === 'POST') return submitInquiry(request, env);
    if (method === 'GET') {
      if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
      const { results } = await env.DB.prepare(
        'SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 500'
      ).all();
      // v01.065 P0-4: decrypt PII columns where present, strip ciphertext
      // + HMAC digests from the payload.
      const items = await Promise.all((results || []).map((r) => decryptInquiryRow(env, r)));
      // v01.065 P0-3: read-audit (fire-and-forget). One row per admin
      // viewing of the inquiry list — gives forensics a trail of who
      // bulk-loaded the inquiry mailbox without slowing the request.
      ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
        action: 'read_pii', target_type: 'inquiry', detail: { route: 'list', count: items.length },
      }));
      return json({ items });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }
  // Bulk inquiries — same shape as /api/applications/bulk.
  if (path === '/api/inquiries/bulk' && method === 'POST') {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.ids) || !body.ids.length) return json({ error: 'no_ids' }, 400);
    const ids = body.ids.filter(x => typeof x === 'string').slice(0, 500);
    if (body.op === 'delete') {
      const placeholders = ids.map(() => '?').join(',');
      await env.DB.prepare('DELETE FROM inquiries WHERE id IN (' + placeholders + ')').bind(...ids).run();
      ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
        action: 'inquiry_bulk_delete', detail: { count: ids.length, ids: ids.slice(0, 20) },
      }));
      return json({ ok: true, op: 'delete', count: ids.length });
    }
    if (body.op === 'status' && typeof body.status === 'string') {
      const placeholders = ids.map(() => '?').join(',');
      await env.DB.prepare('UPDATE inquiries SET status = ? WHERE id IN (' + placeholders + ')').bind(body.status, ...ids).run();
      return json({ ok: true, op: 'status', status: body.status, count: ids.length });
    }
    return json({ error: 'bad_op' }, 400);
  }
  const inqM = path.match(/^\/api\/inquiries\/([A-Za-z0-9_-]+)$/);
  if (inqM) {
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    if (method === 'PATCH') {
      const body = await request.json().catch(() => ({}));
      if (body.status) {
        await env.DB.prepare('UPDATE inquiries SET status = ? WHERE id = ?').bind(String(body.status), inqM[1]).run();
      }
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM inquiries WHERE id = ?').bind(inqM[1]).run();
      ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
        action: 'inquiry_delete', target_type: 'inquiry', target_id: inqM[1],
      }));
      return json({ ok: true });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  // ── Member → team member message (v01.072) ───────────────────────────────
  // Logged-in members can message a team member from the public /team page.
  // The message lands in the same admin inbox as contact-form inquiries,
  // tagged category='team', with the sender's name/email pulled from their
  // account (never typed) so the operator always knows who wrote in.
  if (path === '/api/team/message' && method === 'POST') {
    return submitTeamMessage(request, env);
  }

  // ── Wiki (admin-only) — slugs: 'kms', 'design' ───────────────────────────
  // P1-4 — PUT validates that the body parses as JSON, sits under a
  // hard size cap, and is shaped { pages: [{ id, title, ... }, ...] }.
  // Without these guards an admin (or admin-token holder) could write
  // arbitrarily-large or malformed blobs into KV and crash every client
  // that reads them.
  const WIKI_MAX_BYTES = 512 * 1024;          // 512 KB
  const WIKI_MAX_PAGES = 200;
  const wikiM = path.match(/^\/api\/wiki\/([a-z0-9_-]{1,32})$/);
  if (wikiM) {
    const slug = wikiM[1];
    const key = 'wiki:' + slug;
    if (method === 'GET') {
      const raw = await env.CONTENT_KV.get(key);
      return new Response(raw || '{}', { headers: JSON_HEADERS });
    }
    if (!(await isAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
    if (method === 'PUT' || method === 'POST') {
      const body = await request.text();
      if (body.length > WIKI_MAX_BYTES) return json({ error: 'wiki_too_large', max_bytes: WIKI_MAX_BYTES }, 413);
      let parsed;
      try { parsed = JSON.parse(body); } catch { return json({ error: 'invalid_json' }, 400); }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return json({ error: 'invalid_shape' }, 400);
      }
      if (!Array.isArray(parsed.pages)) return json({ error: 'invalid_shape' }, 400);
      if (parsed.pages.length > WIKI_MAX_PAGES) return json({ error: 'too_many_pages', max: WIKI_MAX_PAGES }, 413);
      for (const p of parsed.pages) {
        if (!p || typeof p !== 'object') return json({ error: 'invalid_page' }, 400);
        if (typeof p.id !== 'string' || p.id.length === 0 || p.id.length > 64) return json({ error: 'invalid_page_id' }, 400);
        if (typeof p.title !== 'string' || p.title.length > 200) return json({ error: 'invalid_page_title' }, 400);
        if (p.body && typeof p.body !== 'string') return json({ error: 'invalid_page_body' }, 400);
      }
      // P1-1: sanitize every page body before persisting so a malicious
      // admin (or admin-token holder) can't drop <script> / event handlers
      // into the wiki KV.
      for (const p of parsed.pages) {
        if (p.body) p.body = await sanitizeHtml(p.body);
      }
      const sanitizedBody = JSON.stringify(parsed);
      await env.CONTENT_KV.put(key, sanitizedBody);
      return json({ ok: true });
    }
    return json({ error: 'method_not_allowed' }, 405);
  }

  if (path === '/api/health') return json({ ok: true, ts: Date.now() });

  return json({ error: 'not_found' }, 404);
}

// ── Auth (members) ─────────────────────────────────────────────────────────
const SESSION_TTL_DAYS = 30;

// Password complexity gate enforced server-side as the source of truth.
// The signup form mirrors the same checks for live feedback.
//   • length ≥ 10
//   • upper + lower + digit + symbol (≥1 of each)
function passwordPolicyError(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'password_too_short';
  if (!/[A-Z]/.test(pw)) return 'password_missing_uppercase';
  if (!/[a-z]/.test(pw)) return 'password_missing_lowercase';
  if (!/[0-9]/.test(pw)) return 'password_missing_digit';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'password_missing_symbol';
  return null;
}
function generateActivationCode() {
  // Six-digit zero-padded numeric — easiest format for users to type from a
  // mobile mail client. Uses crypto.getRandomValues so the code is not
  // predictable; Math.random() is seeded and not safe for security tokens.
  // Modulo bias on 2^32 / 1_000_000 is negligible (< 0.0000232%) so we
  // accept it instead of rejection-sampling for code clarity.
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, '0');
}
const ACTIVATION_TTL_MS = 72 * 3600 * 1000;

// Constant-time response padding for auth endpoints. The point isn't a
// universally fixed wall-clock — it's that an attacker measuring response
// time can't tell which branch ran (no row vs wrong code vs locked vs
// expired etc.). We hold the response open until at least minMs have
// elapsed since the route started, then add up to JITTER_MS of random
// jitter on top so adjacent calls don't share an identical signature.
// Pair this with always-running the DB lookup + hash/safeEqual on every
// branch so the dominant work isn't conditional.
// Auth floor is set so it exceeds the slowest real path (KV cold reads +
// D1 INSERT can hit ~1.5s under load). Floor + jitter together give a
// target window of [PWRESET_MIN_MS, PWRESET_MIN_MS + AUTH_JITTER_MS] —
// anything that finishes faster waits, and the jitter randomises the
// exact landing point so adjacent calls don't share a fingerprint.
// Cost: every auth round-trip takes ~1.5–2s. Trade-off accepted to keep
// timing channels closed.
const AUTH_JITTER_MS = 500;
async function padTiming(startedAt, minMs) {
  const elapsed = Date.now() - startedAt;
  const jitter = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] % AUTH_JITTER_MS);
  const target = minMs + jitter;
  const remain = target - elapsed;
  if (remain > 0) await new Promise(r => setTimeout(r, remain));
}

// Fixed dummy salt + a constant 64-char dummy hash so login can call
// hashPassword and safeEqual on every branch — including the "no such
// email" branch — and produce identical timing to the real path. The
// dummy hash will never legitimately match any real password+salt
// combination.
const TIMING_DUMMY_SALT = 'kdp-timing-dummy-salt-not-secret';
const TIMING_DUMMY_HASH = '0'.repeat(64);
const TIMING_DUMMY_CODE = '999999';

// Fixed-window per-IP rate limit, backed by CONTENT_KV. The KV record
// stores { count, startedAt } and is set with expirationTtl so KV
// auto-purges it when the window rolls over. Eventually-consistent across
// regions — an attacker fanning out across many edges can still exceed
// the cap globally, so this is a defence-in-depth layer; the throttles
// on the user row remain the primary cap. Failure mode: if KV read/write
// errors, we fail OPEN (allow the request) rather than locking everyone
// out on a transient KV blip.
async function rateLimit(env, key, max, windowSec) {
  try {
    const raw = await env.CONTENT_KV.get(key);
    let count = 0;
    let startedAt = Date.now();
    if (raw) {
      try {
        const o = JSON.parse(raw);
        if (typeof o.count === 'number') count = o.count;
        if (typeof o.startedAt === 'number') startedAt = o.startedAt;
      } catch {}
    }
    const newCount = count + 1;
    await env.CONTENT_KV.put(
      key,
      JSON.stringify({ count: newCount, startedAt }),
      { expirationTtl: windowSec },
    );
    return { allowed: newCount <= max, count: newCount };
  } catch {
    return { allowed: true, count: 0 };
  }
}

// Signup: state-dependent failures (email already taken, IP rate-limited)
// MUST NOT be distinguishable from a real signup, or the endpoint becomes
// a free account-enumeration oracle. Format errors (invalid_email, weak
// password, bad phone) are not state-dependent, so they keep their
// distinct messages — an attacker who submits "x" learns nothing about
// who is registered.
//
// IP rate-limit: 5 signups per hour per cf-connecting-ip via KV.
// Exceeding the cap silently returns the same fake-success body and
// commits nothing. Same for "email already taken (still active or in its
// pending window)".
//
// Dev-fallback that previously returned the 6-digit code in the JSON body
// when RESEND_API_KEY was unset is gone — codes only travel via email.
const SIGNUP_MIN_MS = 1500;
const SIGNUP_IP_MAX_PER_HOUR = 5;
const PWRESET_MIN_MS = 1500;
const PWRESET_IP_MAX_PER_HOUR = 10;
const PWRESET_EMAIL_MAX_PER_HOUR = 3;
async function signup(request, env, ctx) {
  const startedAt = Date.now();

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid_json' }, 400);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const passwordConfirm = body.password_confirm != null ? String(body.password_confirm) : password;
  const name = String(body.name || '').trim().slice(0, 80);
  const phoneCountry  = String(body.phone_country  || '').trim();   // e.g. "+82"
  const phoneNational = String(body.phone_national || '').replace(/\D/g, '');
  // Format validation: pure syntactic checks, no DB state, safe to
  // distinguish — an attacker submitting "foo" learns only that "foo"
  // isn't a valid email, which they already knew.
  if (!isEmail(email)) return json({ error: 'invalid_email' }, 400);
  if (password !== passwordConfirm) return json({ error: 'password_mismatch' }, 400);
  const pwErr = passwordPolicyError(password);
  if (pwErr) return json({ error: pwErr }, 400);
  if (phoneCountry && !/^\+\d{1,4}$/.test(phoneCountry)) return json({ error: 'invalid_phone_country' }, 400);
  if (phoneNational && phoneNational.length < 4)        return json({ error: 'invalid_phone_national' }, 400);

  // A response shape that looks indistinguishable from a successful signup
  // requiring activation. Used for the silent-throttle and silent-taken
  // branches. The fake id matches the real id format so a client that
  // round-trips it can't detect the difference. We also burn one PBKDF2
  // here to match the cost of the real-insert path; without that, the
  // throttled/taken branches were ~50ms faster than a real signup.
  const fakeId = 'U-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4);
  const PRETEND_OK = async () => {
    await hashPassword(password, TIMING_DUMMY_SALT);
    await padTiming(startedAt, SIGNUP_MIN_MS);
    return json({
      user: { id: fakeId, email, name, role: 'member', activated: false },
      activation_required: true,
      activation_expires_at: new Date(Date.now() + ACTIVATION_TTL_MS).toISOString(),
      email_sent: true,
    });
  };

  // IP rate-limit — fail silently into PRETEND_OK so probing doesn't
  // reveal the throttle fired. Skip when cf-connecting-ip is missing
  // (local dev or tunneled requests).
  const ip = request.headers.get('cf-connecting-ip') || '';
  if (ip) {
    const rl = await rateLimit(env, 'rl:signup:' + ip, SIGNUP_IP_MAX_PER_HOUR, 3600);
    if (!rl.allowed) return PRETEND_OK();
  }

  // Squat-free signup: if an unactivated row already exists for this email
  // and its 72h window expired, recycle the address. Active or in-window
  // rows pretend success silently — the legit owner of the email already
  // has an account (or a pending one) and will resolve via the normal
  // login / activation flows.
  const existing = await env.DB.prepare('SELECT id, activated_at, activation_expires_at FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    const isActive = !!existing.activated_at;
    const expired  = existing.activation_expires_at && new Date(existing.activation_expires_at).getTime() < Date.now();
    if (isActive || !expired) return PRETEND_OK();
    // Expired pending account → wipe and let signup recreate.
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(existing.id).run();
  }

  const id = fakeId;
  const salt = randomHex(16);
  const hash = await hashPassword(password, salt);
  const now = new Date().toISOString();
  const role = (email === ALWAYS_ADMIN_EMAIL) ? 'admin' : 'member';
  // The always-admin operator email skips the activation gate so we can't
  // accidentally lock ourselves out of the admin console during deploys.
  const skipActivation = (email === ALWAYS_ADMIN_EMAIL);
  const code = skipActivation ? null : generateActivationCode();
  const expires = skipActivation ? null : new Date(Date.now() + ACTIVATION_TTL_MS).toISOString();
  const activatedAt = skipActivation ? now : null;

  // P2-5: encrypt phone fields if PII_ENCRYPTION_KEY is set. When the
  // key is set we write to the *_enc columns and store NULL in the
  // legacy plaintext columns so a DB dump no longer leaks phone numbers.
  // v01.046: also compute a deterministic HMAC of the national phone
  // so the admin search can equality-match by digits even after
  // encryption hides the plaintext.
  const phoneCountryEnc  = phoneCountry  ? await encryptPii(env, phoneCountry)  : null;
  const phoneNationalEnc = phoneNational ? await encryptPii(env, phoneNational) : null;
  const phoneNationalH   = phoneNational ? await computePiiHmac(env, phoneNational) : null;
  const phoneCountryPlain  = phoneCountryEnc  ? null : (phoneCountry  || null);
  const phoneNationalPlain = phoneNationalEnc ? null : (phoneNational || null);
  await env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, password_salt, name, role, ' +
    'created_at, updated_at, phone_country, phone_national, phone_country_enc, phone_national_enc, phone_national_h, ' +
    'activated_at, activation_code, activation_expires_at, activation_sent_at) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, email, hash, salt, name || null, role, now, now,
    phoneCountryPlain, phoneNationalPlain, phoneCountryEnc, phoneNationalEnc, phoneNationalH,
    activatedAt, code, expires, code ? now : null,
  ).run();

  const lang = (body.lang === 'en') ? 'en' : 'ko';
  if (!skipActivation) {
    const link = baseUrl(request) + '/activate?email=' + encodeURIComponent(email) + '&code=' + code;
    // Background the Resend call. Without ctx.waitUntil the wall-clock
    // diff between the real-INSERT branch and the PRETEND_OK branch is
    // big enough (~1500ms+) that padTiming can't hide it.
    ctx.waitUntil(sendEmail(env, {
      to: email, slug: 'activate_account', lang,
      vars: {
        name: name || email,
        code,
        activation_url: link,
        expires_hours: '72',
      },
    }));
  }

  if (skipActivation) {
    const session = await createSession(env, id);
    await padTiming(startedAt, SIGNUP_MIN_MS);
    return withSessionCookie(
      json({
        user: { id, email, name, role, activated: true },
        token: session.token,
        expires_at: session.expires_at,
        email_sent: true,
        activation_required: false,
      }),
      session.token, session.expires_at,
    );
  }
  await padTiming(startedAt, SIGNUP_MIN_MS);
  return json({
    user: { id, email, name, role, activated: false },
    activation_required: true,
    activation_expires_at: expires,
    email_sent: true,
  });
}

// Public origin for the request, used to build verify / reset URLs.
function baseUrl(request) {
  try {
    const u = new URL(request.url);
    return u.origin;
  } catch { return 'https://koreadreampath.com'; }
}

// Login: every failure mode returns the SAME 401 / `invalid_credentials`
// response and the SAME wall-clock duration (≥ LOGIN_MIN_MS). That includes
// "no such email", "wrong password", "account not activated", and "too many
// attempts" — an attacker watching status codes or timing cannot tell which
// branch fired. The hash is always computed (against a dummy when the row
// is missing) so PBKDF2 cost is paid on every request. Throttling still
// happens (failed_login_attempts column from migration 0023) but the lock
// state is never reported back to the caller; the only visible effect is
// that wrong passwords keep returning the same generic 401.
const LOGIN_MIN_MS = 1500;
async function login(request, env, ctx) {
  const startedAt = Date.now();
  const FAIL = async () => {
    await padTiming(startedAt, LOGIN_MIN_MS);
    return json({ error: 'invalid_credentials' }, 401);
  };

  const body = await request.json().catch(() => null);
  const email = body ? String(body.email || '').trim().toLowerCase() : '';
  const password = body ? String(body.password || '') : '';

  const u = email
    ? await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    : null;

  // Always run PBKDF2 — same cost whether the row exists or not. The dummy
  // salt + dummy hash mean safeEqual still runs on equal-length strings.
  const salt = (u && u.password_salt) ? u.password_salt : TIMING_DUMMY_SALT;
  const realHash = (u && u.password_hash) ? String(u.password_hash) : TIMING_DUMMY_HASH;
  const candidateHash = await hashPassword(password, salt);
  const passwordOK = safeEqual(candidateHash, realHash);

  if (!u) return FAIL();

  const now = Date.now();
  const lockedUntilMs = u.failed_login_locked_until ? new Date(u.failed_login_locked_until).getTime() : 0;
  if (lockedUntilMs > now) return FAIL();

  if (!passwordOK) {
    const attempts = (u.failed_login_attempts || 0) + 1;
    const lockSeconds = attempts >= 3 ? 60 * Math.pow(2, attempts - 3) : 0;
    const lockedUntil = lockSeconds ? new Date(now + lockSeconds * 1000).toISOString() : null;
    await env.DB.prepare(
      'UPDATE users SET failed_login_attempts = ?, failed_login_locked_until = ?, updated_at = ? WHERE id = ?'
    ).bind(attempts, lockedUntil, new Date().toISOString(), u.id).run();
    return FAIL();
  }

  // Activation gate — quietly fold into the same generic failure so
  // attackers can't distinguish "registered but not activated" from
  // "wrong password". Legit users recover via the /activate page (which
  // has its own resend flow).
  if (!u.activated_at && u.email !== ALWAYS_ADMIN_EMAIL) return FAIL();

  if (u.failed_login_attempts || u.failed_login_locked_until) {
    await env.DB.prepare(
      'UPDATE users SET failed_login_attempts = 0, failed_login_locked_until = NULL, updated_at = ? WHERE id = ?'
    ).bind(new Date().toISOString(), u.id).run();
  }
  // Self-heal the always-admin role on every login — covers legacy accounts
  // that signed up before this rule existed and ones that were demoted by
  // mistake.
  if (email === ALWAYS_ADMIN_EMAIL && u.role !== 'admin') {
    await env.DB.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').bind('admin', new Date().toISOString(), u.id).run();
    u.role = 'admin';
  }
  const session = await createSession(env, u.id);
  // P1-6 — record successful login for breach-response forensics.
  // Fire-and-forget; never block the auth round-trip on the audit write.
  ctx && ctx.waitUntil && ctx.waitUntil(writeLoginActivity(env, request, u));
  await padTiming(startedAt, LOGIN_MIN_MS);
  // P2-1: also set the HttpOnly session cookie alongside the body
  // token. Legacy clients keep reading the body token; new clients can
  // rely on the cookie alone (auto-sent on same-origin fetches).
  return withSessionCookie(
    json({ user: { id: u.id, email: u.email, name: u.name, role: u.role, email_verified: u.email_verified || 0 }, token: session.token, expires_at: session.expires_at }),
    session.token, session.expires_at,
  );
}

// Activate: same response-equivalence rules as login(). Every failure mode
// (no such email, no pending activation, expired, wrong code, locked,
// already activated) returns the same 401 / `invalid_request` body and the
// same wall-clock duration. The throttle tracks failed attempts on the
// user row (failed_activation_*) — 3+ failures triggers the same
// exponential lockout login uses (60 · 2^(n-3) seconds).
const ACTIVATE_MIN_MS = 1500;
async function activateAccount(request, env) {
  const startedAt = Date.now();
  const FAIL = async () => {
    await padTiming(startedAt, ACTIVATE_MIN_MS);
    return json({ error: 'invalid_request' }, 401);
  };

  const body = await request.json().catch(() => null);
  const email = body ? String(body.email || '').trim().toLowerCase() : '';
  const code  = body ? String(body.code || '').replace(/\D/g, '') : '';

  // Always do the lookup so the no-row branch costs the same as the
  // row-present branch.
  const u = email
    ? await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
    : null;

  // Always run safeEqual on equal-length strings (6 digits vs 6 digits).
  // Candidate is padded to 6 digits even when the request was malformed so
  // the comparison cost is constant.
  const realCode = (u && u.activation_code) ? String(u.activation_code) : TIMING_DUMMY_CODE;
  const candidate = /^\d{6}$/.test(code) ? code : TIMING_DUMMY_CODE;
  const codeMatches = safeEqual(candidate, realCode);

  if (!u) return FAIL();

  // Lockout — opaque failure.
  const now = Date.now();
  const lockedUntilMs = u.failed_activation_locked_until ? new Date(u.failed_activation_locked_until).getTime() : 0;
  if (lockedUntilMs > now) return FAIL();

  // No pending row, already activated, or expired — all map to the same
  // generic failure. Legit users who clicked an old link will see the same
  // error as an attacker; they can request a new code from /activate.
  if (u.activated_at) return FAIL();
  if (!u.activation_code || !u.activation_expires_at) return FAIL();
  if (new Date(u.activation_expires_at).getTime() < now) return FAIL();

  if (!codeMatches) {
    const attempts = (u.failed_activation_attempts || 0) + 1;
    const lockSeconds = attempts >= 3 ? 60 * Math.pow(2, attempts - 3) : 0;
    const lockedUntil = lockSeconds ? new Date(now + lockSeconds * 1000).toISOString() : null;
    await env.DB.prepare(
      'UPDATE users SET failed_activation_attempts = ?, failed_activation_locked_until = ?, updated_at = ? WHERE id = ?'
    ).bind(attempts, lockedUntil, new Date().toISOString(), u.id).run();
    return FAIL();
  }

  const nowIso = new Date().toISOString();
  await env.DB.prepare(
    'UPDATE users SET activated_at = ?, activation_code = NULL, activation_expires_at = NULL, ' +
    'failed_activation_attempts = 0, failed_activation_locked_until = NULL, updated_at = ? WHERE id = ?'
  ).bind(nowIso, nowIso, u.id).run();
  // Issue a session so the user can proceed straight into the app — saves
  // the friction of a second login immediately after activation.
  const session = await createSession(env, u.id);
  await padTiming(startedAt, ACTIVATE_MIN_MS);
  return withSessionCookie(
    json({
      ok: true,
      user: { id: u.id, email: u.email, name: u.name, role: u.role, activated: true },
      token: session.token,
      expires_at: session.expires_at,
    }),
    session.token, session.expires_at,
  );
}

// Hourly purge of Apply form drafts that haven't been touched in 72h. The
// /api/me/apply-draft GET handler also enforces the same cutoff so a user
// resuming on a stale row gets a clean slate; this cron just keeps the
// table from growing unbounded with abandoned drafts.
async function applyDraftCron(env) {
  try {
    const cutoff = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
    await env.DB.prepare('DELETE FROM apply_drafts WHERE updated_at < ?').bind(cutoff).run();
  } catch {}
}

// P2-5 backfill (v01.043) — when the operator sets PII_ENCRYPTION_KEY,
// new rows are immediately written encrypted, but rows that pre-date the
// rotation still hold plaintext in phone_country / phone_national /
// inquiries.phone. This cron sweeps a bounded batch each tick: pulls
// rows with plaintext + empty _enc, encrypts them, NULLs the plaintext
// column. Bounded so we don't blow the cron budget; runs every hour
// so a backlog of ~200 rows clears within a day. No-op when the key
// is unset (encryptPii returns null → we skip rather than wiping
// plaintext into nothing).
async function piiBackfillCron(env) {
  if (!env.PII_ENCRYPTION_KEY) return; // No key → can't encrypt; skip.
  const BATCH = 100;
  try {
    // users.phone_country
    const { results: usersWithCountry } = await env.DB.prepare(
      'SELECT id, phone_country FROM users ' +
      'WHERE phone_country IS NOT NULL AND phone_country_enc IS NULL ' +
      'LIMIT ?'
    ).bind(BATCH).all();
    for (const u of usersWithCountry || []) {
      const enc = await encryptPii(env, u.phone_country);
      if (!enc) continue;
      await env.DB.prepare(
        'UPDATE users SET phone_country_enc = ?, phone_country = NULL, updated_at = ? WHERE id = ?'
      ).bind(enc, new Date().toISOString(), u.id).run();
    }
    // users.phone_national
    const { results: usersWithNational } = await env.DB.prepare(
      'SELECT id, phone_national FROM users ' +
      'WHERE phone_national IS NOT NULL AND phone_national_enc IS NULL ' +
      'LIMIT ?'
    ).bind(BATCH).all();
    for (const u of usersWithNational || []) {
      const enc = await encryptPii(env, u.phone_national);
      if (!enc) continue;
      await env.DB.prepare(
        'UPDATE users SET phone_national_enc = ?, phone_national = NULL, updated_at = ? WHERE id = ?'
      ).bind(enc, new Date().toISOString(), u.id).run();
    }
    // inquiries.phone
    const { results: inqs } = await env.DB.prepare(
      'SELECT id, phone FROM inquiries ' +
      'WHERE phone IS NOT NULL AND phone_enc IS NULL ' +
      'LIMIT ?'
    ).bind(BATCH).all();
    for (const iq of inqs || []) {
      const enc = await encryptPii(env, iq.phone);
      if (!enc) continue;
      await env.DB.prepare(
        'UPDATE inquiries SET phone_enc = ?, phone = NULL WHERE id = ?'
      ).bind(enc, iq.id).run();
    }
    // applications.birthdate (v01.045)
    const { results: apps } = await env.DB.prepare(
      'SELECT id, birthdate FROM applications ' +
      'WHERE birthdate IS NOT NULL AND birthdate_enc IS NULL ' +
      'LIMIT ?'
    ).bind(BATCH).all();
    for (const a of apps || []) {
      const enc = await encryptPii(env, a.birthdate);
      if (!enc) continue;
      await env.DB.prepare(
        'UPDATE applications SET birthdate_enc = ?, birthdate = NULL WHERE id = ?'
      ).bind(enc, a.id).run();
    }

    // v01.066 Phase 2 — applications PII backfill (9 fields + email_h +
    // recommender_email_h). Encrypt legacy plaintext rows in 50-batch
    // ticks. The table is currently empty on production, so this is
    // primarily defensive — if a row is ever created in plaintext (e.g.
    // operator submits with key unset), the next cron tick rotates it.
    const { results: appLegacy } = await env.DB.prepare(
      'SELECT id, name, email, essay_body, essay_body_2, essays_json, ' +
      '       recommender_name, recommender_email, recommender_letter, recommenders_json ' +
      'FROM applications ' +
      'WHERE (name IS NOT NULL AND name != \'\' AND name_enc IS NULL) ' +
      '   OR (email IS NOT NULL AND email != \'\' AND email_enc IS NULL) ' +
      '   OR (essay_body IS NOT NULL AND essay_body_enc IS NULL) ' +
      '   OR (essay_body_2 IS NOT NULL AND essay_body_2_enc IS NULL) ' +
      '   OR (essays_json IS NOT NULL AND essays_json_enc IS NULL) ' +
      '   OR (recommender_name IS NOT NULL AND recommender_name_enc IS NULL) ' +
      '   OR (recommender_email IS NOT NULL AND recommender_email_enc IS NULL) ' +
      '   OR (recommender_letter IS NOT NULL AND recommender_letter_enc IS NULL) ' +
      '   OR (recommenders_json IS NOT NULL AND recommenders_json_enc IS NULL) ' +
      'LIMIT ?'
    ).bind(BATCH).all();
    for (const a of appLegacy || []) {
      const emailNorm = a.email ? normalizeEmail(a.email) : '';
      const recEmail  = a.recommender_email ? normalizeEmail(a.recommender_email) : '';
      const enc = {
        name:    a.name              ? await encryptPii(env, a.name) : null,
        email:   emailNorm           ? await encryptPii(env, emailNorm) : null,
        emailH:  emailNorm           ? await computePiiHmac(env, emailNorm, 'email-hmac') : null,
        body:    a.essay_body        ? await encryptPii(env, a.essay_body) : null,
        body2:   a.essay_body_2      ? await encryptPii(env, a.essay_body_2) : null,
        json:    a.essays_json       ? await encryptPii(env, a.essays_json) : null,
        recName: a.recommender_name  ? await encryptPii(env, a.recommender_name) : null,
        recEm:   recEmail            ? await encryptPii(env, recEmail) : null,
        recEmH:  recEmail            ? await computePiiHmac(env, recEmail, 'email-hmac') : null,
        recLet:  a.recommender_letter? await encryptPii(env, a.recommender_letter) : null,
        recJson: a.recommenders_json ? await encryptPii(env, a.recommenders_json) : null,
      };
      // Only proceed when at least one ciphertext actually came back (i.e.
      // the key is set). Otherwise leave the row in plaintext for next pass.
      if (!Object.values(enc).some(Boolean)) continue;
      await env.DB.prepare(
        // v01.071 (Phase 7b): NOT NULL on name/email dropped via 0036 →
        // uniform NULL tombstone across all encrypted fields.
        'UPDATE applications SET ' +
        '  name = CASE WHEN ? IS NOT NULL THEN NULL ELSE name END, ' +
        '  name_enc = COALESCE(?, name_enc), ' +
        '  email = CASE WHEN ? IS NOT NULL THEN NULL ELSE email END, ' +
        '  email_enc = COALESCE(?, email_enc), ' +
        '  email_h = COALESCE(?, email_h), ' +
        '  essay_body = CASE WHEN ? IS NOT NULL THEN NULL ELSE essay_body END, ' +
        '  essay_body_enc = COALESCE(?, essay_body_enc), ' +
        '  essay_body_2 = CASE WHEN ? IS NOT NULL THEN NULL ELSE essay_body_2 END, ' +
        '  essay_body_2_enc = COALESCE(?, essay_body_2_enc), ' +
        '  essays_json = CASE WHEN ? IS NOT NULL THEN NULL ELSE essays_json END, ' +
        '  essays_json_enc = COALESCE(?, essays_json_enc), ' +
        '  recommender_name = CASE WHEN ? IS NOT NULL THEN NULL ELSE recommender_name END, ' +
        '  recommender_name_enc = COALESCE(?, recommender_name_enc), ' +
        '  recommender_email = CASE WHEN ? IS NOT NULL THEN NULL ELSE recommender_email END, ' +
        '  recommender_email_enc = COALESCE(?, recommender_email_enc), ' +
        '  recommender_email_h = COALESCE(?, recommender_email_h), ' +
        '  recommender_letter = CASE WHEN ? IS NOT NULL THEN NULL ELSE recommender_letter END, ' +
        '  recommender_letter_enc = COALESCE(?, recommender_letter_enc), ' +
        '  recommenders_json = CASE WHEN ? IS NOT NULL THEN NULL ELSE recommenders_json END, ' +
        '  recommenders_json_enc = COALESCE(?, recommenders_json_enc) ' +
        'WHERE id = ?'
      ).bind(
        enc.name, enc.name,
        enc.email, enc.email, enc.emailH,
        enc.body, enc.body,
        enc.body2, enc.body2,
        enc.json, enc.json,
        enc.recName, enc.recName,
        enc.recEm, enc.recEm, enc.recEmH,
        enc.recLet, enc.recLet,
        enc.recJson, enc.recJson,
        a.id
      ).run();
    }

    // v01.046 — HMAC recovery for rows that already went through
    // encryption but predate the HMAC column. We can rebuild the digest
    // from the decrypted plaintext, but only the operator (env with
    // PII_ENCRYPTION_KEY set) is positioned to do it. Bounded per-tick
    // to keep cron cheap.
    const { results: usersHmacRecover } = await env.DB.prepare(
      'SELECT id, phone_national_enc FROM users ' +
      'WHERE phone_national_enc IS NOT NULL AND phone_national_h IS NULL ' +
      'LIMIT ?'
    ).bind(BATCH).all();
    for (const u of usersHmacRecover || []) {
      const plain = await decryptPii(env, u.phone_national_enc);
      if (!plain) continue;
      const h = await computePiiHmac(env, plain);
      if (!h) continue;
      await env.DB.prepare(
        'UPDATE users SET phone_national_h = ?, updated_at = ? WHERE id = ?'
      ).bind(h, new Date().toISOString(), u.id).run();
    }
    const { results: inqHmacRecover } = await env.DB.prepare(
      'SELECT id, phone_enc FROM inquiries ' +
      'WHERE phone_enc IS NOT NULL AND phone_h IS NULL ' +
      'LIMIT ?'
    ).bind(BATCH).all();
    for (const iq of inqHmacRecover || []) {
      const plain = await decryptPii(env, iq.phone_enc);
      if (!plain) continue;
      const h = await computePiiHmac(env, plain);
      if (!h) continue;
      await env.DB.prepare(
        'UPDATE inquiries SET phone_h = ? WHERE id = ?'
      ).bind(h, iq.id).run();
    }

    // v01.067 (Phase 3) — inbound + outbound emails backfill. Rotate the
    // three plaintext content fields (subject / body_text / body_html)
    // into ciphertext columns. Addresses stay plaintext for operational
    // grouping (see migration 0034 comment for the trade-off).
    const { results: inLegacy } = await env.DB.prepare(
      'SELECT id, subject, body_text, body_html FROM inbound_emails ' +
      'WHERE (subject    IS NOT NULL AND subject_enc    IS NULL) ' +
      '   OR (body_text  IS NOT NULL AND body_text_enc  IS NULL) ' +
      '   OR (body_html  IS NOT NULL AND body_html_enc  IS NULL) ' +
      'LIMIT ?'
    ).bind(BATCH).all();
    for (const e of inLegacy || []) {
      const sEnc = e.subject   ? await encryptPii(env, e.subject)   : null;
      const tEnc = e.body_text ? await encryptPii(env, e.body_text) : null;
      const hEnc = e.body_html ? await encryptPii(env, e.body_html) : null;
      if (!(sEnc || tEnc || hEnc)) continue;
      await env.DB.prepare(
        'UPDATE inbound_emails SET ' +
        '  subject   = CASE WHEN ? IS NOT NULL THEN NULL ELSE subject END, ' +
        '  subject_enc   = COALESCE(?, subject_enc), ' +
        '  body_text = CASE WHEN ? IS NOT NULL THEN NULL ELSE body_text END, ' +
        '  body_text_enc = COALESCE(?, body_text_enc), ' +
        '  body_html = CASE WHEN ? IS NOT NULL THEN NULL ELSE body_html END, ' +
        '  body_html_enc = COALESCE(?, body_html_enc) ' +
        'WHERE id = ?'
      ).bind(sEnc, sEnc, tEnc, tEnc, hEnc, hEnc, e.id).run();
    }
    const { results: outLegacy } = await env.DB.prepare(
      'SELECT id, subject, body_text, body_html FROM outbound_emails ' +
      'WHERE (subject    IS NOT NULL AND subject_enc    IS NULL) ' +
      '   OR (body_text  IS NOT NULL AND body_text_enc  IS NULL) ' +
      '   OR (body_html  IS NOT NULL AND body_html_enc  IS NULL) ' +
      'LIMIT ?'
    ).bind(BATCH).all();
    for (const e of outLegacy || []) {
      const sEnc = e.subject   ? await encryptPii(env, e.subject)   : null;
      const tEnc = e.body_text ? await encryptPii(env, e.body_text) : null;
      const hEnc = e.body_html ? await encryptPii(env, e.body_html) : null;
      if (!(sEnc || tEnc || hEnc)) continue;
      await env.DB.prepare(
        'UPDATE outbound_emails SET ' +
        '  subject   = CASE WHEN ? IS NOT NULL THEN NULL ELSE subject END, ' +
        '  subject_enc   = COALESCE(?, subject_enc), ' +
        '  body_text = CASE WHEN ? IS NOT NULL THEN NULL ELSE body_text END, ' +
        '  body_text_enc = COALESCE(?, body_text_enc), ' +
        '  body_html = CASE WHEN ? IS NOT NULL THEN NULL ELSE body_html END, ' +
        '  body_html_enc = COALESCE(?, body_html_enc) ' +
        'WHERE id = ?'
      ).bind(sEnc, sEnc, tEnc, tEnc, hEnc, hEnc, e.id).run();
    }

    // v01.065 P0-4 — inquiries name/email/subject/body backfill. Legacy
    // rows have plaintext columns populated and *_enc NULL; rotate them
    // into ciphertext + (for email) HMAC. Cron self-terminates once every
    // legacy row is processed (SELECT returns zero).
    const { results: inqLegacy } = await env.DB.prepare(
      'SELECT id, name, email, subject, body FROM inquiries ' +
      'WHERE (name IS NOT NULL AND name_enc IS NULL) ' +
      '   OR (email IS NOT NULL AND email_enc IS NULL) ' +
      '   OR (subject IS NOT NULL AND subject_enc IS NULL) ' +
      '   OR (body IS NOT NULL AND body_enc IS NULL) ' +
      'LIMIT ?'
    ).bind(BATCH).all();
    for (const iq of inqLegacy || []) {
      const emailNorm  = iq.email ? normalizeEmail(iq.email) : null;
      const nameEnc    = iq.name    ? await encryptPii(env, iq.name)    : null;
      const emailEnc   = emailNorm  ? await encryptPii(env, emailNorm)  : null;
      const subjectEnc = iq.subject ? await encryptPii(env, iq.subject) : null;
      const bodyEnc    = iq.body    ? await encryptPii(env, iq.body)    : null;
      const emailH     = emailNorm  ? await computePiiHmac(env, emailNorm, 'email-hmac') : null;
      // Only proceed when encryption actually produced output (i.e. key
      // is set). Otherwise leave the row in plaintext for the next pass.
      if (!(nameEnc || emailEnc || subjectEnc || bodyEnc)) continue;
      await env.DB.prepare(
        // v01.071 (Phase 7b): NOT NULL constraint dropped → store proper
        // NULL instead of '' tombstone. Existing legacy rows with ''
        // remain valid (read path treats both the same).
        'UPDATE inquiries SET ' +
        '  name = NULL, name_enc = COALESCE(?, name_enc), ' +
        '  email = NULL, email_enc = COALESCE(?, email_enc), email_h = COALESCE(?, email_h), ' +
        '  subject = NULL, subject_enc = COALESCE(?, subject_enc), ' +
        '  body = NULL, body_enc = COALESCE(?, body_enc) ' +
        'WHERE id = ?'
      ).bind(nameEnc, emailEnc, emailH, subjectEnc, bodyEnc, iq.id).run();
    }
  } catch {}
}

// P1-1 backfill (v01.043) — inbound_emails rows persisted before v01.040
// still carry un-sanitized HTML. Cron re-runs sanitizeHtml() over each
// row that hasn't been marked sanitized_at, then sets the marker. Once
// every legacy row is processed the cron becomes a fast no-op (just a
// SELECT returning zero rows).
async function inboundSanitizeCron(env) {
  const BATCH = 50;
  try {
    // v01.067 (Phase 3): only operate on legacy rows where body_html is
    // still plaintext. Encrypted rows (body_html_enc IS NOT NULL, body_html
    // IS NULL) have been sanitized at write time and don't need re-running.
    const { results } = await env.DB.prepare(
      'SELECT id, body_html FROM inbound_emails ' +
      'WHERE sanitized_at IS NULL AND body_html IS NOT NULL AND body_html_enc IS NULL ' +
      'ORDER BY id ASC LIMIT ?'
    ).bind(BATCH).all();
    const now = new Date().toISOString();
    for (const r of results || []) {
      const safe = r.body_html ? await sanitizeHtml(String(r.body_html)) : '';
      await env.DB.prepare(
        'UPDATE inbound_emails SET body_html = ?, sanitized_at = ? WHERE id = ?'
      ).bind(safe, now, r.id).run();
    }
  } catch {}
}

// v01.070 (Phase 7) — retention auto-purge. The site has been collecting
// PII since launch with no automatic deletion window; this cron enforces
// the boundaries the privacy policy promises:
//
//   * users.deleted_at older than 30 days  → hard-delete row + drop
//                                            ciphertext columns
//   * applications.user_id IS NULL older   → hard-delete row + R2 files
//     than 365 days (detached on
//     self-delete; aligns with consent
//     retention window)
//   * inquiries older than 180 days        → hard-delete row
//   * inbound/outbound_emails older than   → hard-delete row + R2
//     365 days (or trashed > 30 days)        attachments
//   * orphaned application_files (no       → hard-delete row + R2
//     application_id) older than 30 days
//
// Each pass is bounded to a small batch (50) so a cron tick stays well
// under the Workers CPU budget even on a giant backlog. The cron is
// idempotent — running it twice in a row on a clean DB is a no-op.
async function piiRetentionCron(env) {
  const BATCH = 50;
  const now = Date.now();
  const isoBefore = (ms) => new Date(now - ms).toISOString();
  const D30  = isoBefore(30  * 86400 * 1000);
  const D180 = isoBefore(180 * 86400 * 1000);
  const D365 = isoBefore(365 * 86400 * 1000);

  try {
    // 1) Hard-delete soft-deleted users past the 30-day grace window.
    const { results: deadUsers } = await env.DB.prepare(
      'SELECT id FROM users WHERE deleted_at IS NOT NULL AND deleted_at < ? LIMIT ?'
    ).bind(D30, BATCH).all().catch(() => ({ results: [] }));
    for (const u of deadUsers || []) {
      try {
        await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id).run();
        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(u.id).run();
      } catch {}
    }

    // 2) Hard-delete detached applications past 365 days + R2 files.
    const { results: deadApps } = await env.DB.prepare(
      "SELECT id FROM applications WHERE user_id IS NULL AND submitted_at < ? LIMIT ?"
    ).bind(D365, BATCH).all().catch(() => ({ results: [] }));
    for (const a of deadApps || []) {
      try {
        const { results: files } = await env.DB.prepare(
          'SELECT r2_key FROM application_files WHERE application_id = ?'
        ).bind(a.id).all();
        if (env.ATTACHMENTS) {
          for (const f of files || []) { try { await env.ATTACHMENTS.delete(f.r2_key); } catch {} }
        }
        await env.DB.prepare('DELETE FROM application_files WHERE application_id = ?').bind(a.id).run();
        await env.DB.prepare('DELETE FROM applications WHERE id = ?').bind(a.id).run();
      } catch {}
    }

    // 3) Hard-delete inquiries past 180 days.
    await env.DB.prepare(
      'DELETE FROM inquiries WHERE created_at < ?'
    ).bind(D180).run().catch(() => {});

    // 4) Hard-delete inbound/outbound emails. Two windows:
    //    a) trashed_at > 30 days ago — operator already chose to discard.
    //    b) ts > 365 days ago — long-tail retention boundary.
    // Per pass we cap the read so R2 cleanup work is bounded.
    const purgeEmails = async (table, side) => {
      const { results: drops } = await env.DB.prepare(
        `SELECT id FROM ${table} WHERE (trashed_at IS NOT NULL AND trashed_at < ?) OR ts < ? LIMIT ?`
      ).bind(D30, D365, BATCH).all().catch(() => ({ results: [] }));
      for (const e of drops || []) {
        try {
          const { results: atts } = await env.DB.prepare(
            'SELECT r2_key FROM email_attachments WHERE side = ? AND email_id = ?'
          ).bind(side, e.id).all();
          if (env.ATTACHMENTS) {
            for (const a of atts || []) { try { await env.ATTACHMENTS.delete(a.r2_key); } catch {} }
          }
          await env.DB.prepare('DELETE FROM email_attachments WHERE side = ? AND email_id = ?').bind(side, e.id).run();
          await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(e.id).run();
        } catch {}
      }
    };
    await purgeEmails('inbound_emails',  'inbound');
    await purgeEmails('outbound_emails', 'outbound');

    // 5) Orphaned application_files — uploaded via the public upload
    // endpoint, then never adopted into an application (token never
    // echoed back at submit). 30-day grace window.
    const { results: orphans } = await env.DB.prepare(
      "SELECT id, r2_key FROM application_files WHERE (application_id IS NULL OR application_id = '') AND uploaded_at < ? LIMIT ?"
    ).bind(D30, BATCH).all().catch(() => ({ results: [] }));
    for (const f of orphans || []) {
      try {
        if (env.ATTACHMENTS && f.r2_key) { try { await env.ATTACHMENTS.delete(f.r2_key); } catch {} }
        await env.DB.prepare('DELETE FROM application_files WHERE id = ?').bind(f.id).run();
      } catch {}
    }
  } catch {}
}

// Hourly cron job — purge expired pending signups + send a one-shot reminder
// to anyone whose 72h window is still open but who hasn't acted in ≥24h.
// Reminder cap: at most one per pending account per cron tick (we bump
// activation_sent_at so the next tick skips it).
async function activationCron(env) {
  const now = Date.now();
  // 1) Purge expired pending signups.
  const expired = await env.DB.prepare(
    "SELECT id, email FROM users WHERE activated_at IS NULL AND activation_expires_at IS NOT NULL AND activation_expires_at < ?"
  ).bind(new Date(now).toISOString()).all();
  for (const u of (expired.results || [])) {
    try { await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(u.id).run(); } catch {}
  }
  // 2) Reminder: still pending + sent ≥ 24h ago + ≥ 6h still on the clock.
  const remindBefore = new Date(now - 24 * 3600 * 1000).toISOString();
  const minRemaining = new Date(now + 6 * 3600 * 1000).toISOString();
  const pending = await env.DB.prepare(
    "SELECT id, email, name, activation_code FROM users " +
    "WHERE activated_at IS NULL AND activation_code IS NOT NULL " +
    "AND activation_sent_at IS NOT NULL AND activation_sent_at < ? " +
    "AND activation_expires_at IS NOT NULL AND activation_expires_at > ? " +
    "LIMIT 100"
  ).bind(remindBefore, minRemaining).all();
  for (const u of (pending.results || [])) {
    try {
      const link = 'https://koreadreampath.com/activate?email=' + encodeURIComponent(u.email) + '&code=' + u.activation_code;
      await sendEmail(env, {
        to: u.email, slug: 'activate_reminder', lang: 'ko',
        vars: { name: u.name || u.email, code: u.activation_code, activation_url: link, expires_hours: '72' },
      });
      await env.DB.prepare('UPDATE users SET activation_sent_at = ? WHERE id = ?').bind(new Date().toISOString(), u.id).run();
    } catch {}
  }
  return { purged: (expired.results || []).length, reminded: (pending.results || []).length };
}

// resendActivation: always returns { ok: true } 200 after a constant
// baseline regardless of whether the email exists, is already activated,
// is rate-limited, or invalid. Rate-limit (one send per 60s per row) is
// enforced silently — attacker can't probe state by alternating valid /
// invalid emails. Dev-fallback path that leaked the activation code in
// the JSON is gone; codes only ever travel via email now.
const RESEND_ACTIVATION_MIN_MS = 1500;
async function resendActivation(request, env, ctx) {
  const startedAt = Date.now();
  const ALWAYS_OK = async () => {
    await padTiming(startedAt, RESEND_ACTIVATION_MIN_MS);
    return json({ ok: true });
  };

  const body = await request.json().catch(() => null);
  const email = body ? String(body.email || '').trim().toLowerCase() : '';
  if (!isEmail(email)) return ALWAYS_OK();

  const u = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!u || u.activated_at) return ALWAYS_OK();
  // Silent rate-limit — one send per 60s. Attacker calling repeatedly
  // sees only ok:true and can't tell from response whether the throttle
  // fired or the email simply doesn't exist.
  if (u.activation_sent_at && (Date.now() - new Date(u.activation_sent_at).getTime()) < 60_000) {
    return ALWAYS_OK();
  }

  const code = generateActivationCode();
  const expires = new Date(Date.now() + ACTIVATION_TTL_MS).toISOString();
  const now = new Date().toISOString();
  await env.DB.prepare(
    'UPDATE users SET activation_code = ?, activation_expires_at = ?, activation_sent_at = ?, updated_at = ? WHERE id = ?'
  ).bind(code, expires, now, now, u.id).run();
  const lang = (body.lang === 'en') ? 'en' : 'ko';
  const link = baseUrl(request) + '/activate?email=' + encodeURIComponent(email) + '&code=' + code;
  // Background the Resend call so the response timing doesn't reveal
  // that this email exists + has a pending activation row.
  ctx.waitUntil(sendEmail(env, {
    to: email, slug: 'activate_account', lang,
    vars: { name: u.name || email, code, activation_url: link, expires_hours: '72' },
  }));
  return ALWAYS_OK();
}

async function logout(request, env) {
  const token = bearerToken(request);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  // P2-1: also clear the HttpOnly session cookie so subsequent requests
  // from the same browser don't carry a now-invalid token.
  return clearSessionCookie(json({ ok: true }));
}

async function me(request, env) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'unauthorized' }, 401);
  return json({ user });
}

async function currentUser(request, env) {
  const token = bearerToken(request);
  if (!token) return null;
  const row = await env.DB.prepare(`
    SELECT u.id, u.email, u.name, u.role, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).bind(token).first();
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

// Reads the caller's session token from either:
//   - Authorization: Bearer <tok>  (legacy clients, admin token, curl)
//   - Cookie: dp_session=<tok>     (P2-1, HttpOnly cookie set on login)
// The header wins when both are present so explicit caller intent
// (curl with a bearer token) doesn't get overridden by a stale cookie.
function bearerToken(request) {
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const cookieH = request.headers.get('cookie') || '';
  if (!cookieH) return null;
  const m = cookieH.match(/(?:^|;\s*)dp_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// P2-1 — append a Set-Cookie header to a Response so the browser can
// store the session token outside JS reach. HttpOnly closes the XSS
// exfiltration path (an XSS payload reading document.cookie won't see
// this cookie). SameSite=Lax keeps the session usable when the user
// follows an external link to the site (common case: clicking a link
// in an email), while still blocking cross-site POST CSRF. The Origin
// guard from v01.036 stays as a belt-and-braces second layer.
const SESSION_COOKIE_NAME = 'dp_session';
function withSessionCookie(resp, token, expiresAtIso) {
  const maxAge = Math.max(0, Math.floor((new Date(expiresAtIso).getTime() - Date.now()) / 1000));
  const h = new Headers(resp.headers);
  const cookie = SESSION_COOKIE_NAME + '=' + encodeURIComponent(token)
    + '; HttpOnly; Secure; SameSite=Lax; Path=/'
    + '; Max-Age=' + maxAge;
  h.append('set-cookie', cookie);
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
}
function clearSessionCookie(resp) {
  const h = new Headers(resp.headers);
  h.append('set-cookie', SESSION_COOKIE_NAME + '=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
}

async function createSession(env, userId) {
  const token = randomHex(32);
  const now = Date.now();
  const expires = new Date(now + SESSION_TTL_DAYS * 86400 * 1000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(token, userId, new Date(now).toISOString(), expires).run();
  return { token, expires_at: expires };
}

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    key, 256
  );
  return Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytes) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

// ── Email (Resend) ─────────────────────────────────────────────────────────
// Single send helper used by signup / verify / password-reset / apply /
// inquiry endpoints. Reads templates from c.email_templates in KV; the
// admin authors them at admin → Setup → Email templates. If RESEND_API_KEY
// is not configured (local dev or pre-launch), the helper logs and returns
// {sent:false} but does NOT throw — call sites still mint tokens and let
// the dev-mode token-in-response path keep working.
//
// Template keys live in c.email_templates.items[<slug>] with subject_ko/en
// and body_ko/en. {{var}} placeholders are replaced with `vars`.
async function loadEmailTemplate(env, slug) {
  try {
    const raw = await env.CONTENT_KV.get(CONTENT_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    const items = c && c.email_templates && c.email_templates.items;
    return (items && items[slug]) || null;
  } catch { return null; }
}
async function loadEmailMeta(env) {
  try {
    const raw = await env.CONTENT_KV.get(CONTENT_KEY);
    if (!raw) return {};
    const c = JSON.parse(raw);
    return (c && c.email_templates) || {};
  } catch { return {}; }
}
function renderTpl(s, vars) {
  if (typeof s !== 'string') return '';
  return s.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : ''));
}
// Convert plain-text body into a minimal HTML email so Gmail / Outlook
// don't strip line breaks. Wraps each line in <p>; preserves the URL
// placeholders as <a> tags.
function textToHtml(text) {
  const escaped = String(text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Linkify https URLs (not perfect but covers verify/reset URLs we generate).
  const linked = escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#6B2DBE">$1</a>');
  const paragraphs = linked.split(/\n\n+/).map(p => '<p style="margin:0 0 12px;line-height:1.6">' + p.replace(/\n/g, '<br>') + '</p>').join('');
  return '<div style="font-family:-apple-system,Segoe UI,sans-serif;color:#15131A;max-width:600px;margin:0 auto;padding:24px">' + paragraphs + '</div>';
}
async function sendEmail(env, { to, slug, lang, vars }) {
  const tpl  = await loadEmailTemplate(env, slug);
  const meta = await loadEmailMeta(env);
  if (!tpl) return { sent: false, reason: 'no_template' };
  const useKo = (lang === 'ko') || !tpl.subject_en;
  const subject = renderTpl(useKo ? (tpl.subject_ko || tpl.subject_en) : (tpl.subject_en || tpl.subject_ko), vars);
  const text    = renderTpl(useKo ? (tpl.body_ko || tpl.body_en)       : (tpl.body_en || tpl.body_ko), vars);
  const html    = textToHtml(text);
  const fromName  = meta.from_name  || 'KoreaDreamPath';
  const fromEmail = meta.from_email || 'info@koreadreampath.com';
  if (!env.RESEND_API_KEY) return { sent: false, reason: 'no_key', preview: { subject, text } };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer ' + env.RESEND_API_KEY,
        'content-type':  'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html,
        text,
      }),
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      return { sent: false, reason: 'http_' + r.status, err: errText.slice(0, 500) };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: 'exception', err: String(e.message || e) };
  }
}

// ── Member profile ─────────────────────────────────────────────────────────
const PROFILE_FIELDS = ['country','birthdate','current_school','current_major','goal','interests','korean_level','english_level','career_summary'];

// 2 MB raw image cap → ~2.7 MB base64. Reject anything larger so a single
// huge upload can't blow up the row size.
const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const PROFILE_PHOTO_DATA_MAX_LENGTH = Math.ceil(PROFILE_PHOTO_MAX_BYTES * 4 / 3) + 200;  // base64 + small data: prefix slack

async function saveProfile(env, userId, body) {
  const now = new Date().toISOString();
  // Validate the photo payload (data URL) if present. Empty / null clears it.
  let photo = body.photo;
  let photoSize = null;
  if (photo === null || photo === '' || photo === undefined) {
    photo = null;
  } else {
    if (typeof photo !== 'string' || !photo.startsWith('data:image/')) {
      return json({ error: 'invalid_photo' }, 400);
    }
    if (photo.length > PROFILE_PHOTO_DATA_MAX_LENGTH) {
      return json({ error: 'photo_too_large', max_bytes: PROFILE_PHOTO_MAX_BYTES }, 413);
    }
    // Approximate the raw size from the base64 portion length.
    const b64 = photo.split(',')[1] || '';
    photoSize = Math.floor(b64.length * 3 / 4);
  }
  const cols = ['user_id', ...PROFILE_FIELDS, 'photo', 'photo_size', 'updated_at'];
  const values = [userId, ...PROFILE_FIELDS.map(k => str(body[k])), photo, photoSize, now];
  const placeholders = cols.map(() => '?').join(',');
  const updateSet = [...PROFILE_FIELDS, 'photo', 'photo_size', 'updated_at'].map(k => `${k} = excluded.${k}`).join(', ');
  const sql = `INSERT INTO member_profiles (${cols.join(',')}) VALUES (${placeholders})
               ON CONFLICT(user_id) DO UPDATE SET ${updateSet}`;
  await env.DB.prepare(sql).bind(...values).run();
  const row = await env.DB.prepare('SELECT * FROM member_profiles WHERE user_id = ?').bind(userId).first();
  return json(row);
}

// ── Errors / consents / GDPR helpers ───────────────────────────────────────
function cors(res) {
  const h = new Headers(res.headers);
  h.set('access-control-allow-origin', '*');
  h.set('access-control-allow-methods', 'GET, OPTIONS');
  h.set('access-control-allow-headers', 'content-type');
  h.set('cache-control', 'public, max-age=60');
  return new Response(res.body, { status: res.status, headers: h });
}

async function logError(env, e) {
  try {
    await env.DB.prepare(
      `INSERT INTO error_logs (ts, level, source, message, stack, path, method, status, user_id, session_id, ip, user_agent, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      new Date().toISOString(),
      str(e.level) || 'error',
      str(e.source) || 'server',
      String(e.message || '').slice(0, 2000),
      e.stack ? String(e.stack).slice(0, 4000) : null,
      str(e.path), str(e.method),
      e.status != null ? Number(e.status) : null,
      str(e.user_id), str(e.session_id),
      str(e.ip), str(e.user_agent),
      e.meta ? JSON.stringify(e.meta).slice(0, 4000) : null,
    ).run();
  } catch {} // never let logging itself crash a request
}

async function reportClientError(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid_json' }, 400);
  const ip = request.headers.get('cf-connecting-ip') || '';
  const ua = (request.headers.get('user-agent') || '').slice(0, 500);
  const u = await currentUser(request, env);
  await logError(env, {
    level: body.level || 'error',
    source: body.source || 'client',
    message: body.message || '',
    stack: body.stack || null,
    path: body.path || '',
    method: 'GET',
    status: null,
    user_id: u ? u.id : null,
    session_id: body.session_id || null,
    ip, user_agent: ua,
    meta: body.meta || null,
  });
  return json({ ok: true });
}

async function recordConsent(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !body.consent_type) return json({ error: 'invalid_body' }, 400);
  const u = await currentUser(request, env);
  const ip = request.headers.get('cf-connecting-ip') || '';
  const ua = (request.headers.get('user-agent') || '').slice(0, 500);

  const consents = Array.isArray(body.consents) ? body.consents : [body];
  const stmt = env.DB.prepare(
    `INSERT INTO consents (ts, user_id, application_id, email, consent_type, version, granted, ip, user_agent, lang)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const ts = new Date().toISOString();
  const ops = consents.map(c => stmt.bind(
    ts, u ? u.id : null, str(c.application_id),
    str(c.email || (u && u.email)),
    String(c.consent_type), String(c.version || '1.0'),
    c.granted === false ? 0 : 1,
    ip, ua, str(c.lang)
  ));
  if (ops.length) await env.DB.batch(ops);
  return json({ ok: true, recorded: ops.length });
}

async function exportMyData(request, env, ctx) {
  const u = await currentUser(request, env);
  if (!u) return json({ error: 'unauthorized' }, 401);
  // v01.069 (Phase 6): broaden the GDPR Art. 15 / PIPA Art. 35 self-export
  // to cover every PII surface where this user has a footprint — including
  // the audit metadata they're entitled to (login history, application
  // file attachment metadata, notifications received). Bodies are decrypted
  // because the data subject is entitled to plaintext.
  const [user, profile, apps, inquiries, consentsR, loginActR, notifR] = await Promise.all([
    env.DB.prepare('SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?').bind(u.id).first(),
    env.DB.prepare('SELECT * FROM member_profiles WHERE user_id = ?').bind(u.id).first(),
    env.DB.prepare('SELECT * FROM applications WHERE user_id = ?').bind(u.id).all(),
    env.DB.prepare('SELECT * FROM inquiries WHERE user_id = ?').bind(u.id).all(),
    env.DB.prepare('SELECT * FROM consents WHERE user_id = ?').bind(u.id).all(),
    env.DB.prepare('SELECT ts, ip, user_agent FROM login_activity WHERE user_id = ? ORDER BY ts DESC LIMIT 100').bind(u.id).all().catch(() => ({ results: [] })),
    env.DB.prepare('SELECT id, kind, title, body, created_at, read_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 200').bind(u.id).all().catch(() => ({ results: [] })),
  ]);

  // Decrypt application + inquiry PII for the data subject.
  const appsDec = [];
  for (const r of apps.results || []) appsDec.push(await decryptApplicationRow(env, r));
  const inqDec  = [];
  for (const r of inquiries.results || []) inqDec.push(await decryptInquiryRow(env, r));

  // For each application, attach the file metadata (filename / mime / size).
  // We deliberately don't ship the file bytes inside the JSON — the export
  // would balloon and base64-inflate by 33%. Instead surface a download URL
  // that the same authenticated session can use to pull each file.
  const appIds = appsDec.map(a => a.id).filter(Boolean);
  let files = [];
  if (appIds.length) {
    const placeholders = appIds.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      'SELECT id, application_id, uploaded_at, kind, recommender_idx, filename, mime, size FROM application_files WHERE application_id IN (' + placeholders + ')'
    ).bind(...appIds).all();
    files = (results || []).map(f => ({
      ...f,
      download_url: '/api/me/application-files/' + f.id + '/download',
    }));
  }

  const out = {
    exported_at: new Date().toISOString(),
    note: 'Per GDPR Art. 15 / PIPA Art. 35. Contains all personal data we hold about you.',
    user, profile,
    applications: appsDec,
    application_files: files,
    inquiries: inqDec,
    consents: consentsR.results || [],
    login_history: loginActR.results || [],
    notifications: notifR.results || [],
  };

  // v01.069 + v01.065 P0-3: log that the data subject exported their own
  // data. Helps prove subject-access compliance + provides a forensic
  // trail if the export is later weaponized.
  ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
    action: 'self_export', target_type: 'user', target_id: u.id,
    detail: {
      applications: appsDec.length, files: files.length,
      inquiries: inqDec.length, consents: (consentsR.results || []).length,
      logins: (loginActR.results || []).length, notifs: (notifR.results || []).length,
    },
  }));

  return new Response(JSON.stringify(out, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': 'attachment; filename="koreadreampath-my-data-' + u.id + '.json"',
    },
  });
}

async function deleteMyAccount(request, env, ctx) {
  const u = await currentUser(request, env);
  if (!u) return json({ error: 'unauthorized' }, 401);

  // v01.069 (Phase 6) — expanded GDPR Art. 17 / PIPA Art. 21 "right to
  // erasure" flow. The plain user-facing UI promises "personal data is
  // anonymized and fully removed within 30 days". This handler does the
  // immediate-anonymization half; the per-table hard-delete cron in
  // Phase 7 covers the 30-day fully-removed window.
  //
  // Soft-delete: anonymize PII on the users row but keep the row so
  // applications + analytics counters don't break referential integrity.
  // Other PII-bearing tables get more aggressive cleanup right now —
  // there's no business reason to keep notifications / drafts / consent
  // logs around once the data subject has asked to be forgotten.
  const now = new Date().toISOString();
  const anonEmail = 'deleted-' + u.id + '@invalid.local';
  await env.DB.prepare(
    `UPDATE users SET email = ?, name = NULL, password_hash = '', password_salt = '', deleted_at = ?, updated_at = ? WHERE id = ?`
  ).bind(anonEmail, now, now, u.id).run();
  // Also blow away any encrypted PII columns on the user row — they're
  // no longer reachable through the (now-anonymized) plaintext columns,
  // but a backup leak shouldn't surface them either.
  await env.DB.prepare(
    `UPDATE users SET phone_country_enc = NULL, phone_national_enc = NULL, phone_national_h = NULL WHERE id = ?`
  ).bind(u.id).run();

  // Drop any active sessions — log the user out everywhere immediately.
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id).run();
  // Hard-delete the member profile + apply drafts + notifications + active
  // consents. None of these has a retention reason once the user has
  // asked to be forgotten.
  await env.DB.prepare('DELETE FROM member_profiles WHERE user_id = ?').bind(u.id).run();
  await env.DB.prepare('DELETE FROM apply_drafts     WHERE user_id = ?').bind(u.id).run().catch(() => {});
  await env.DB.prepare('DELETE FROM notifications    WHERE user_id = ?').bind(u.id).run().catch(() => {});
  // Detach applications from the user but keep the application record
  // (the school still needs the admission decision, but it shouldn't be
  // linkable back to this user post-deletion).
  await env.DB.prepare('UPDATE applications SET user_id = NULL WHERE user_id = ?').bind(u.id).run();

  // v01.069 + v01.065 P0-3: audit the self-delete. fire-and-forget.
  ctx && ctx.waitUntil && ctx.waitUntil(writeAdminAudit(env, request, {
    action: 'self_delete', target_type: 'user', target_id: u.id,
  }));

  return json({ ok: true, deleted_at: now });
}

// ── Analytics ──────────────────────────────────────────────────────────────
// Public ingest: client posts a small batch of events. Worker enriches with
// IP / country / UA / source classification and inserts into D1.
async function ingestEvents(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.events)) return json({ error: 'invalid_body' }, 400);

  const ip = request.headers.get('cf-connecting-ip') || '';
  const country = request.headers.get('cf-ipcountry') || '';
  const ua = (request.headers.get('user-agent') || '').slice(0, 500);
  const referer = request.headers.get('referer') || '';

  const user = await currentUser(request, env);
  const user_id = user ? user.id : null;

  const stmt = env.DB.prepare(
    `INSERT INTO analytics_events
      (ts, day, session_id, user_id, type, view, path, target,
       referrer, source, utm_source, utm_medium, utm_campaign,
       lang, country, device, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const ops = [];

  for (const e of body.events.slice(0, 50)) { // hard cap per request
    const ts = e.ts ? new Date(e.ts).toISOString() : now.toISOString();
    const day = ts.slice(0, 10);
    const ev_referrer = e.referrer || referer || '';
    const source = classifySource(e.path || '/', ev_referrer, e.utm_source);
    const device = classifyDevice(ua);

    ops.push(stmt.bind(
      ts, day,
      String(e.session_id || ''), user_id,
      String(e.type || 'event'), str(e.view), String(e.path || '/'), str(e.target),
      ev_referrer, source, str(e.utm_source), str(e.utm_medium), str(e.utm_campaign),
      str(e.lang), country, device, ip, ua
    ));
  }
  if (ops.length === 0) return json({ ok: true, inserted: 0 });

  await env.DB.batch(ops);
  return json({ ok: true, inserted: ops.length });
}

function classifySource(path, referrer, utm) {
  if (utm) return 'campaign';
  if (!referrer) return 'direct';
  try {
    const u = new URL(referrer);
    const host = u.hostname.toLowerCase();
    if (host.endsWith('koreadreampath.com')) return 'internal';
    if (/google\.|naver\.|bing\.|yahoo\.|duckduckgo\.|baidu\./.test(host)) return 'search';
    if (/facebook\.|twitter\.|x\.com|instagram\.|linkedin\.|reddit\.|kakao\.|threads\./.test(host)) return 'social';
    return 'external';
  } catch {
    return 'external';
  }
}
function classifyDevice(ua) {
  const u = (ua || '').toLowerCase();
  if (/iphone|android.*mobile|windows phone/.test(u)) return 'mobile';
  if (/ipad|tablet/.test(u)) return 'tablet';
  return 'desktop';
}

async function analyticsSummary(env, url) {
  // Range: ?days=N (default 30)
  const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10) || 30, 365);
  const since = new Date(Date.now() - days * 86400 * 1000).toISOString().slice(0, 10);

  // Totals
  const totals = await env.DB.prepare(
    `SELECT
       COUNT(*) FILTER (WHERE type='pageview') AS pageviews,
       COUNT(DISTINCT session_id) AS sessions,
       COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS users
     FROM analytics_events WHERE day >= ?`
  ).bind(since).first();

  // Daily series (pageviews + sessions)
  const { results: daily } = await env.DB.prepare(
    `SELECT day,
       COUNT(*) FILTER (WHERE type='pageview') AS pageviews,
       COUNT(DISTINCT session_id) AS sessions
     FROM analytics_events
     WHERE day >= ?
     GROUP BY day ORDER BY day ASC`
  ).bind(since).all();

  // Top paths
  const { results: top_paths } = await env.DB.prepare(
    `SELECT path, COUNT(*) AS hits, COUNT(DISTINCT session_id) AS sessions
     FROM analytics_events
     WHERE day >= ? AND type='pageview'
     GROUP BY path ORDER BY hits DESC LIMIT 25`
  ).bind(since).all();

  // Sources (direct / search / social / etc.)
  const { results: sources } = await env.DB.prepare(
    `SELECT COALESCE(source,'direct') AS source, COUNT(*) AS hits, COUNT(DISTINCT session_id) AS sessions
     FROM analytics_events
     WHERE day >= ? AND type='pageview'
     GROUP BY source ORDER BY hits DESC`
  ).bind(since).all();

  // Top referrers (excluding internal/empty)
  const { results: referrers } = await env.DB.prepare(
    `SELECT referrer, COUNT(*) AS hits
     FROM analytics_events
     WHERE day >= ? AND type='pageview' AND referrer != '' AND source != 'internal'
     GROUP BY referrer ORDER BY hits DESC LIMIT 20`
  ).bind(since).all();

  // Devices
  const { results: devices } = await env.DB.prepare(
    `SELECT device, COUNT(*) AS hits FROM analytics_events
     WHERE day >= ? AND type='pageview'
     GROUP BY device ORDER BY hits DESC`
  ).bind(since).all();

  // Top click targets
  const { results: clicks } = await env.DB.prepare(
    `SELECT target, COUNT(*) AS hits FROM analytics_events
     WHERE day >= ? AND type='click' AND target != ''
     GROUP BY target ORDER BY hits DESC LIMIT 25`
  ).bind(since).all();

  return json({
    range: { days, since },
    totals,
    daily: daily || [],
    top_paths: top_paths || [],
    sources: sources || [],
    referrers: referrers || [],
    devices: devices || [],
    clicks: clicks || [],
  });
}

async function analyticsJourneys(env, url) {
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 100);
  // Recent sessions with their event sequence
  const { results: recent } = await env.DB.prepare(
    `SELECT session_id, MIN(ts) AS started, MAX(ts) AS ended,
            COUNT(*) AS events, COUNT(DISTINCT path) AS pages
     FROM analytics_events
     GROUP BY session_id ORDER BY started DESC LIMIT ?`
  ).bind(limit).all();

  const journeys = [];
  for (const s of (recent || [])) {
    const { results: trail } = await env.DB.prepare(
      `SELECT ts, type, path, target, source, country, device, lang
       FROM analytics_events
       WHERE session_id = ? ORDER BY ts ASC LIMIT 50`
    ).bind(s.session_id).all();
    journeys.push({ ...s, trail: trail || [] });
  }
  return json({ items: journeys });
}

// ── Inquiries (public submission) ──────────────────────────────────────────
// v01.065 P0-1: rate-limited (5/h/IP + 3/h/email) with PRETEND_OK so the
// limiter doesn't reveal itself to a bot. Inquiry submissions carry PII
// (name/email/phone/free-text body), making the inbox an attractive
// flooding target. Pattern mirrors signup() / requestPasswordReset().
//
// v01.065 P0-4: name/email/subject/body now also encrypted at rest when
// PII_ENCRYPTION_KEY is set, with email_h as the deterministic HMAC so
// admin search can still exact-match by address.
const INQUIRY_IP_MAX_PER_HOUR    = 5;
const INQUIRY_EMAIL_MAX_PER_HOUR = 3;

async function submitInquiry(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid_json' }, 400);
  const errs = [];
  if (!nonEmpty(body.name))    errs.push('name');
  if (!isEmail(body.email))    errs.push('email');
  if (!nonEmpty(body.subject)) errs.push('subject');
  if (!nonEmpty(body.body) || String(body.body).length < 10) errs.push('body');
  if (errs.length) return json({ error: 'validation', fields: errs }, 400);

  const ip = request.headers.get('cf-connecting-ip') || '';
  const ua = (request.headers.get('user-agent') || '').slice(0, 500);
  const emailNorm = normalizeEmail(body.email);

  // Silent rate-limit response. Same shape as a real submit so a flooder
  // can't distinguish accept from drop — they keep getting fresh-looking
  // ids back while the inbox stays clean.
  const PRETEND_OK = () => json({
    id: 'INQ-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4),
    created_at: new Date().toISOString(),
  });
  const rlIp = await rateLimit(env, 'rl:inq_ip:' + ip, INQUIRY_IP_MAX_PER_HOUR, 3600);
  if (!rlIp.allowed) return PRETEND_OK();
  const rlEmail = await rateLimit(env, 'rl:inq_email:' + emailNorm, INQUIRY_EMAIL_MAX_PER_HOUR, 3600);
  if (!rlEmail.allowed) return PRETEND_OK();

  const user = await currentUser(request, env);
  const id = 'INQ-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4);
  const created_at = new Date().toISOString();

  // Phone (v01.042 + v01.046).
  const phonePlainRaw = str(body.phone);
  const phoneEnc = phonePlainRaw ? await encryptPii(env, phonePlainRaw) : null;
  const phoneH   = phonePlainRaw ? await computePiiHmac(env, phonePlainRaw, 'phone-hmac') : null;
  const phonePlain = phoneEnc ? null : phonePlainRaw;

  // Name / email / subject / body (v01.065 P0-4).
  const nameRaw    = str(body.name);
  const subjectRaw = str(body.subject);
  const bodyRaw    = str(body.body);
  const nameEnc    = await encryptPii(env, nameRaw);
  const emailEnc   = await encryptPii(env, emailNorm);
  const subjectEnc = await encryptPii(env, subjectRaw);
  const bodyEnc    = await encryptPii(env, bodyRaw);
  const emailH     = await computePiiHmac(env, emailNorm, 'email-hmac');
  // When the operator has set PII_ENCRYPTION_KEY, encryptPii() returns a
  // ciphertext and we NULL the plaintext column. v01.071 (Phase 7b)
  // dropped the legacy NOT NULL constraint via migration 0036, so we can
  // store proper NULL now instead of the '' tombstone we used in Phase 1.
  const namePlain    = nameEnc    ? null : nameRaw;
  const emailPlain   = emailEnc   ? null : emailNorm;
  const subjectPlain = subjectEnc ? null : subjectRaw;
  const bodyPlain    = bodyEnc    ? null : bodyRaw;

  await env.DB.prepare(
    `INSERT INTO inquiries (
       id, created_at, status,
       name, name_enc,
       email, email_enc, email_h,
       phone, phone_enc, phone_h,
       category,
       subject, subject_enc,
       body, body_enc,
       lang, user_id, ip, user_agent
     ) VALUES (?, ?, 'new',  ?, ?,  ?, ?, ?,  ?, ?, ?,  ?,  ?, ?,  ?, ?,  ?, ?, ?, ?)`
  ).bind(
    id, created_at,
    namePlain, nameEnc,
    emailPlain, emailEnc, emailH,
    phonePlain, phoneEnc, phoneH,
    str(body.category),
    subjectPlain, subjectEnc,
    bodyPlain, bodyEnc,
    str(body.lang), user ? user.id : null, ip, ua
  ).run();

  // Best-effort confirmation email. Non-blocking — swallow failures so the
  // submitter still sees the success state.
  try {
    await sendEmail(env, {
      to: emailNorm, slug: 'inquiry_received',
      lang: body.lang === 'en' ? 'en' : 'ko',
      vars: { name: nameRaw, inquiry_id: id },
    });
  } catch {}

  return json({ id, created_at });
}

// v01.072 — a logged-in member sends a message to a team member from the
// public /team page. Reuses the inquiries table + admin inbox so the
// operator reads team messages in one place. Differences vs submitInquiry:
//   - login required (sender identity comes from the session, not the form)
//   - name/email are taken from the user's account, never user-supplied
//   - category is forced to 'team' and the recipient label is recorded in
//     the subject so the operator sees who the message was for
async function submitTeamMessage(request, env) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: 'login_required' }, 401);

  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid_json' }, 400);

  const errs = [];
  const subjectIn = str(body.subject);
  const bodyIn    = str(body.body);
  const toLabel   = str(body.to).slice(0, 120);   // recipient display label
  if (!nonEmpty(subjectIn)) errs.push('subject');
  if (!nonEmpty(bodyIn) || bodyIn.length < 10) errs.push('body');
  if (errs.length) return json({ error: 'validation', fields: errs }, 400);

  // Per-member rate-limit so one account can't blast the inbox. Silent
  // PRETEND_OK on trip — same shape as success.
  const PRETEND_OK = () => json({
    id: 'INQ-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4),
    created_at: new Date().toISOString(),
  });
  const rl = await rateLimit(env, 'rl:team_msg:' + user.id, 10, 3600);
  if (!rl.allowed) return PRETEND_OK();

  const ip = request.headers.get('cf-connecting-ip') || '';
  const ua = (request.headers.get('user-agent') || '').slice(0, 500);
  const id = 'INQ-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4);
  const created_at = new Date().toISOString();

  // Sender identity from the account (not the form).
  const emailNorm = normalizeEmail(user.email || '');
  const nameRaw   = str(user.name) || emailNorm || 'Member';
  // Prefix the subject with the recipient so the operator can see at a
  // glance who the member wanted to reach.
  const subjectRaw = toLabel ? `[→ ${toLabel}] ${subjectIn}` : subjectIn;

  const nameEnc    = await encryptPii(env, nameRaw);
  const emailEnc   = emailNorm ? await encryptPii(env, emailNorm) : null;
  const subjectEnc = await encryptPii(env, subjectRaw);
  const bodyEnc    = await encryptPii(env, bodyIn);
  const emailH     = emailNorm ? await computePiiHmac(env, emailNorm, 'email-hmac') : null;
  const namePlain    = nameEnc    ? null : nameRaw;
  const emailPlain   = emailEnc   ? null : (emailNorm || null);
  const subjectPlain = subjectEnc ? null : subjectRaw;
  const bodyPlain    = bodyEnc    ? null : bodyIn;

  await env.DB.prepare(
    `INSERT INTO inquiries (
       id, created_at, status,
       name, name_enc,
       email, email_enc, email_h,
       phone, phone_enc, phone_h,
       category,
       subject, subject_enc,
       body, body_enc,
       lang, user_id, ip, user_agent
     ) VALUES (?, ?, 'new',  ?, ?,  ?, ?, ?,  ?, ?, ?,  ?,  ?, ?,  ?, ?,  ?, ?, ?, ?)`
  ).bind(
    id, created_at,
    namePlain, nameEnc,
    emailPlain, emailEnc, emailH,
    null, null, null,
    'team',
    subjectPlain, subjectEnc,
    bodyPlain, bodyEnc,
    str(body.lang), user.id, ip, ua
  ).run();

  // Best-effort confirmation to the member. Non-blocking.
  if (emailNorm) {
    try {
      await sendEmail(env, {
        to: emailNorm, slug: 'inquiry_received',
        lang: body.lang === 'en' ? 'en' : 'ko',
        vars: { name: nameRaw, inquiry_id: id },
      });
    } catch {}
  }

  return json({ id, created_at });
}

// v01.065 P0-4 — convert an inquiry row from the DB shape (with *_enc
// + *_h columns) into the shape the admin UI expects (plaintext fields).
// Tolerant of legacy rows that still carry plaintext; ciphertext takes
// precedence when both are present.
async function decryptInquiryRow(env, row) {
  if (!row) return row;
  if (row.name_enc)    { const d = await decryptPii(env, row.name_enc);    if (d != null) row.name = d; }
  if (row.email_enc)   { const d = await decryptPii(env, row.email_enc);   if (d != null) row.email = d; }
  if (row.subject_enc) { const d = await decryptPii(env, row.subject_enc); if (d != null) row.subject = d; }
  if (row.body_enc)    { const d = await decryptPii(env, row.body_enc);    if (d != null) row.body = d; }
  if (row.phone_enc)   { const d = await decryptPii(env, row.phone_enc);   if (d != null) row.phone = d; }
  // Never expose ciphertext or HMAC digests to clients — they're storage
  // implementation details. Strip them from the response payload.
  delete row.name_enc;
  delete row.email_enc;
  delete row.email_h;
  delete row.subject_enc;
  delete row.body_enc;
  delete row.phone_enc;
  delete row.phone_h;
  return row;
}

// ── Recommendations stub ───────────────────────────────────────────────────
function stubRecommendations() {
  // TODO: real matching engine. For now, returns a fixed placeholder list.
  return [
    { program_id: 'ai-language', match: 0.82, reason_ko: 'AI와 언어 역량을 함께 키우고 싶다면 가장 잘 맞는 트랙입니다.', reason_en: 'A strong fit if you want to build both AI and language capability.' },
    { program_id: 'business-korean', match: 0.64, reason_ko: '한국 취업이나 기업 커뮤니케이션 목표와 잘 맞습니다.', reason_en: 'Matches goals tied to Korean employment and business communication.' },
    { program_id: 'youtube-master',  match: 0.41, reason_ko: '콘텐츠 제작과 디지털 브랜딩 관심이 있다면 추천됩니다.', reason_en: 'Recommended if you are interested in content creation and digital branding.' },
  ];
}

// ── News (server-side, member-editable) ────────────────────────────────────
async function listNews(env) {
  // Explicit column list — `SELECT *` was leaking `author_id` to anonymous
  // readers, which lets an external observer correlate posts to internal
  // user ids without any auth. The detail endpoint already uses the same
  // narrow projection; this brings the list in line.
  const { results } = await env.DB.prepare(
    'SELECT id, tag, tag_color, date, title_ko, title_en, body_ko, body_en, created_at, updated_at FROM news_posts ORDER BY date DESC, created_at DESC LIMIT 200'
  ).all();
  return json({ items: results || [] });
}

async function createNews(request, env, user) {
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid_json' }, 400);
  const id = 'N-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4);
  const now = new Date().toISOString();
  // Bodies render via dangerouslySetInnerHTML on the public /news/:id detail
  // page (Pages.jsx). canEdit covers members, so without sanitization any
  // member could publish stored XSS to every visitor.
  const safeBodyKo = await sanitizeHtml(str(body.body_ko));
  const safeBodyEn = await sanitizeHtml(str(body.body_en));
  await env.DB.prepare(
    `INSERT INTO news_posts (id, tag, tag_color, date, title_ko, title_en, body_ko, body_en, author_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, str(body.tag), str(body.tag_color), str(body.date), str(body.title_ko), str(body.title_en),
         safeBodyKo, safeBodyEn, user.id, now, now).run();
  const row = await env.DB.prepare('SELECT * FROM news_posts WHERE id = ?').bind(id).first();
  return json(row);
}

async function updateNews(request, env, user, id) {
  const existing = await env.DB.prepare('SELECT author_id FROM news_posts WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: 'not_found' }, 404);
  if (user.role !== 'admin' && existing.author_id !== user.id) return json({ error: 'forbidden' }, 403);
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'invalid_json' }, 400);
  const now = new Date().toISOString();
  const safeBodyKo = await sanitizeHtml(str(body.body_ko));
  const safeBodyEn = await sanitizeHtml(str(body.body_en));
  await env.DB.prepare(
    `UPDATE news_posts
     SET tag=?, tag_color=?, date=?, title_ko=?, title_en=?, body_ko=?, body_en=?, updated_at=?
     WHERE id=?`
  ).bind(str(body.tag), str(body.tag_color), str(body.date), str(body.title_ko), str(body.title_en),
         safeBodyKo, safeBodyEn, now, id).run();
  const row = await env.DB.prepare('SELECT * FROM news_posts WHERE id = ?').bind(id).first();
  return json(row);
}

async function deleteNews(env, user, id) {
  const existing = await env.DB.prepare('SELECT author_id FROM news_posts WHERE id = ?').bind(id).first();
  if (!existing) return json({ error: 'not_found' }, 404);
  if (user.role !== 'admin' && existing.author_id !== user.id) return json({ error: 'forbidden' }, 403);
  await env.DB.prepare('DELETE FROM news_posts WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

// ── Auth ───────────────────────────────────────────────────────────────────
// Hardcoded super-admin: this email is always treated as admin regardless
// of the role column in users (covers the case where they sign up before
// we provision admin accounts, and prevents accidental demotion).
const ALWAYS_ADMIN_EMAIL = 'scoutkorea@kakao.com';

function userIsAdmin(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.email && String(user.email).toLowerCase() === ALWAYS_ADMIN_EMAIL) return true;
  return false;
}

// Async admin check. The bearer can be either:
//   (A) the legacy ADMIN_TOKEN secret (for ops / external automation), or
//   (A') ADMIN_TOKEN_NEXT — a second valid secret accepted during a
//        rotation window so the operator can swap tokens with zero
//        downtime. Procedure: set ADMIN_TOKEN_NEXT to the new strong
//        64-char value, switch clients, then promote it to ADMIN_TOKEN
//        and delete ADMIN_TOKEN_NEXT.
//   (B) a session token belonging to an admin-role user.
// Always check BOTH secrets (constant-time) before the role lookup so
// timing can't tell an attacker which secret matched.
async function isAdmin(request, env) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return false;
  const provided = auth.slice(7);
  // safeEqual short-circuits on length mismatch; that's an early-exit
  // optimisation, not a leak — an attacker only learns "your token isn't
  // length N" which is true of an infinite number of strings.
  const matchesPrimary = env.ADMIN_TOKEN && safeEqual(provided, env.ADMIN_TOKEN);
  const matchesNext    = env.ADMIN_TOKEN_NEXT && safeEqual(provided, env.ADMIN_TOKEN_NEXT);
  if (matchesPrimary || matchesNext) return true;
  const user = await currentUser(request, env);
  return userIsAdmin(user);
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ── Role-based access control ────────────────────────────────────────────
// Reads c.member_roles from the KV content blob and answers
//   canRole(env, roleId, pageId, action) → boolean
// admin Bearer token bypasses all checks (can do anything). Roles that
// aren't defined in c.member_roles fail closed (deny). The matrix is
// authored under admin → Members → Roles & permissions.
//
// Cached at module scope per worker instance so the hot path doesn't
// re-fetch KV on every request — 60s TTL is fine for policy edits.
let _roleCache = { ts: 0, roles: null };
async function loadRoles(env) {
  const fresh = Date.now() - _roleCache.ts < 60_000;
  if (fresh && _roleCache.roles) return _roleCache.roles;
  try {
    const raw = await env.CONTENT_KV.get(CONTENT_KEY);
    const c = raw ? JSON.parse(raw) : {};
    const roles = (c && c.member_roles && Array.isArray(c.member_roles.roles)) ? c.member_roles.roles : [];
    _roleCache = { ts: Date.now(), roles };
    return roles;
  } catch { return []; }
}
async function canRole(env, roleId, pageId, action) {
  if (!roleId) return false;
  const roles = await loadRoles(env);
  const r = roles.find(x => x && x.id === roleId);
  if (!r || !r.pages) return false;
  const page = r.pages[pageId];
  if (!page) return false;
  return page[action] === true;
}
// Convenience: gate an HTTP handler. Returns null on allow, or a 403 Response on deny.
// Admin token always allows.
async function requireRole(request, env, pageId, action) {
  if (await isAdmin(request, env)) return null;
  const u = await currentUser(request, env);
  if (!u) return json({ error: 'unauthorized' }, 401);
  const ok = await canRole(env, u.role, pageId, action);
  if (!ok) return json({ error: 'forbidden', detail: `${u.role} is not allowed to '${action}' on '${pageId}'` }, 403);
  return null;
}

// ── Applications ───────────────────────────────────────────────────────────
const APP_FIELDS = [
  // Step 1
  'name','email','birthdate','admission_referrer_code',
  // Step 2
  'country','prior_school','prior_major','prior_gpa','transcript_note',
  // Step 3 — essays + recommender list (JSON)
  'essay_title','essay_body','essay_title_2','essay_body_2',
  'essays_json',          // v01.031 — full essays array (admin-editable count)
  'recommenders_json',
  // Legacy single-recommender columns (kept for backward compat)
  'nso','recommender_name','recommender_email','recommender_role','recommender_letter',
  'scout_member_country','scout_training_level','recommendation_letter_filename',
  // Step 4
  'track','partial_tier','program','payment_method','card_last4',
  // PCI: card_exp / card_cvc are *intentionally* NOT in this list. They are
  // collected only for the (future) gateway round-trip and must never land
  // in our DB. Only card_last4 is persisted.
  'lang'
];

async function submitApplication(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'invalid_json' }, 400); }

  const errors = validateApplication(body);
  if (errors.length) return json({ error: 'validation', fields: errors }, 400);

  const id = 'DP-' + Date.now().toString(36).toUpperCase() + '-' + randomSuffix(4);
  const submitted_at = new Date().toISOString();
  const status = body.track === 'general' ? 'submitted' : 'paid';
  const amount = computeAmount(body.track, body.partial_tier);
  const receipt_token = randomHex(16);
  const paid_at = status === 'paid' ? submitted_at : null;

  const user = await currentUser(request, env); // optional — anonymous OK
  const user_id = user ? user.id : null;

  const ip = request.headers.get('cf-connecting-ip') || '';
  const ua = (request.headers.get('user-agent') || '').slice(0, 500);

  // P2-5 expansion (v01.045): encrypt birthdate when key is available.
  // The encrypted value goes to applications.birthdate_enc; the legacy
  // birthdate column is NULLed so a DB dump doesn't carry both.
  const birthdateRaw = str(body.birthdate) || null;
  const birthdateEnc = birthdateRaw ? await encryptPii(env, birthdateRaw) : null;
  const birthdatePlain = birthdateEnc ? null : birthdateRaw;

  // v01.066 (P0-Phase-2): encrypt the rest of the high-PII application
  // surface — applicant name + email (NOT NULL legacy columns get an
  // empty-string tombstone like inquiries), essay bodies, the essays JSON
  // blob, and the recommender PII (single legacy fields + multi-recommender
  // JSON). email_h + recommender_email_h give admin search exact-match
  // recovery against the encrypted columns (LIKE / fragment search on
  // encrypted bodies is intentionally not possible).
  const nameRaw    = str(body.name);
  const emailNorm  = normalizeEmail(body.email);
  const essayBody  = str(body.essay_body);
  const essayBody2 = str(body.essay_body_2);
  const essaysJson = str(body.essays_json);
  const recName    = str(body.recommender_name);
  const recEmailN  = body.recommender_email ? normalizeEmail(body.recommender_email) : '';
  const recLetter  = str(body.recommender_letter);
  const recJson    = str(body.recommenders_json);

  const nameEnc       = await encryptPii(env, nameRaw);
  const emailEnc      = await encryptPii(env, emailNorm);
  const emailH        = await computePiiHmac(env, emailNorm, 'email-hmac');
  const essayBodyEnc  = essayBody  ? await encryptPii(env, essayBody)  : null;
  const essayBody2Enc = essayBody2 ? await encryptPii(env, essayBody2) : null;
  const essaysJsonEnc = essaysJson ? await encryptPii(env, essaysJson) : null;
  const recNameEnc    = recName    ? await encryptPii(env, recName)    : null;
  const recEmailEnc   = recEmailN  ? await encryptPii(env, recEmailN)  : null;
  const recEmailH     = recEmailN  ? await computePiiHmac(env, recEmailN, 'email-hmac') : null;
  const recLetterEnc  = recLetter  ? await encryptPii(env, recLetter)  : null;
  const recJsonEnc    = recJson    ? await encryptPii(env, recJson)    : null;

  // Field-by-field plaintext sentinel logic. v01.071 (Phase 7b) dropped
  // the legacy NOT NULL constraint on name/email via migration 0036, so
  // every column can NULL-tombstone uniformly when ciphertext is present.
  // Legacy plaintext is preserved whenever PII_ENCRYPTION_KEY is unset;
  // backfill cron rotates them once the operator sets the key.
  const namePlain      = nameEnc      ? null : nameRaw;
  const emailPlain     = emailEnc     ? null : emailNorm;
  const essayBodyPlain = essayBodyEnc ? null : essayBody;
  const essayBody2Plain= essayBody2Enc? null : essayBody2;
  const essaysJsonPlain= essaysJsonEnc? null : essaysJson;
  const recNamePlain   = recNameEnc   ? null : recName;
  const recEmailPlain  = recEmailEnc  ? null : recEmailN;
  const recLetterPlain = recLetterEnc ? null : recLetter;
  const recJsonPlain   = recJsonEnc   ? null : recJson;

  // Build the per-field override map; APP_FIELDS.map() below consults it
  // first, then falls back to str(body[k]) for every other field.
  const PII_OVERRIDES = {
    name: namePlain,
    email: emailPlain,
    birthdate: birthdatePlain,
    essay_body: essayBodyPlain,
    essay_body_2: essayBody2Plain,
    essays_json: essaysJsonPlain,
    recommender_name: recNamePlain,
    recommender_email: recEmailPlain,
    recommender_letter: recLetterPlain,
    recommenders_json: recJsonPlain,
  };

  const cols = [
    'id','submitted_at','status','amount','ip','user_agent','user_id','receipt_token','paid_at','currency',
    ...APP_FIELDS,
    'birthdate_enc',
    'name_enc','email_enc','email_h',
    'essay_body_enc','essay_body_2_enc','essays_json_enc',
    'recommender_name_enc','recommender_email_enc','recommender_email_h',
    'recommender_letter_enc','recommenders_json_enc',
  ];
  const values = [
    id, submitted_at, status, amount, ip, ua, user_id, receipt_token, paid_at, 'USD',
    ...APP_FIELDS.map(k => (k in PII_OVERRIDES) ? PII_OVERRIDES[k] : str(body[k])),
    birthdateEnc,
    nameEnc, emailEnc, emailH,
    essayBodyEnc, essayBody2Enc, essaysJsonEnc,
    recNameEnc, recEmailEnc, recEmailH,
    recLetterEnc, recJsonEnc,
  ];

  const placeholders = cols.map(() => '?').join(',');
  const sql = `INSERT INTO applications (${cols.join(',')}) VALUES (${placeholders})`;
  await env.DB.prepare(sql).bind(...values).run();

  // Link any pre-uploaded files (uploaded via /api/applications/upload before
  // the application row existed). The submit body carries:
  //   file_tokens: [string, ...] — upload_token (128-bit hex) returned by
  //                                the upload endpoint, one per file.
  // Adoption looks the row up by token alone — the token is globally unique
  // and unguessable, so we don't need (or want) the row id over the wire.
  // The token is cleared on adoption to prevent reuse. Rows whose token
  // doesn't match are silently ignored — the submit response shape doesn't
  // leak which tokens hit, so an external observer can't probe.
  if (Array.isArray(body.file_tokens)) {
    for (const raw of body.file_tokens.slice(0, 50)) {
      const tok = (typeof raw === 'string' && /^[0-9a-f]{32}$/.test(raw)) ? raw : null;
      if (!tok) continue;
      try {
        await env.DB.prepare(
          "UPDATE application_files SET application_id = ?, upload_token = NULL " +
          "WHERE upload_token = ? AND (application_id IS NULL OR application_id = '')"
        ).bind(id, tok).run();
      } catch {}
    }
  }

  // Drop the server-side draft on successful submit so the user doesn't
  // see a stale draft on their next visit. Logged-in users only.
  if (user_id) {
    try { await env.DB.prepare('DELETE FROM apply_drafts WHERE user_id = ?').bind(user_id).run(); }
    catch {}
  }

  // Best-effort confirmation email. Non-blocking — swallow failures so the
  // submitter still sees the success screen.
  try {
    await sendEmail(env, {
      to: String(body.email || ''), slug: 'apply_received',
      lang: body.lang === 'en' ? 'en' : 'ko',
      vars: { name: body.name || '', application_id: id },
    });
  } catch {}

  return json({ id, submitted_at, status, amount, receipt_token,
                receipt_url: status === 'paid' ? `/receipt?id=${encodeURIComponent(id)}&token=${receipt_token}` : null });
}

// v01.066 (Phase 2): inverse of submitApplication()'s encryption block.
// Decrypts every *_enc column on a row, strips ciphertext + HMAC digests
// from the payload so they never reach the client. Tolerant of legacy
// rows where plaintext columns are still populated (ciphertext takes
// precedence when both exist).
async function decryptApplicationRow(env, row) {
  if (!row) return row;
  if (row.birthdate_enc)             { const d = await decryptPii(env, row.birthdate_enc);             if (d != null) row.birthdate = d; }
  if (row.name_enc)                  { const d = await decryptPii(env, row.name_enc);                  if (d != null) row.name = d; }
  if (row.email_enc)                 { const d = await decryptPii(env, row.email_enc);                 if (d != null) row.email = d; }
  if (row.essay_body_enc)            { const d = await decryptPii(env, row.essay_body_enc);            if (d != null) row.essay_body = d; }
  if (row.essay_body_2_enc)          { const d = await decryptPii(env, row.essay_body_2_enc);          if (d != null) row.essay_body_2 = d; }
  if (row.essays_json_enc)           { const d = await decryptPii(env, row.essays_json_enc);           if (d != null) row.essays_json = d; }
  if (row.recommender_name_enc)      { const d = await decryptPii(env, row.recommender_name_enc);      if (d != null) row.recommender_name = d; }
  if (row.recommender_email_enc)    { const d = await decryptPii(env, row.recommender_email_enc);     if (d != null) row.recommender_email = d; }
  if (row.recommender_letter_enc)    { const d = await decryptPii(env, row.recommender_letter_enc);    if (d != null) row.recommender_letter = d; }
  if (row.recommenders_json_enc)     { const d = await decryptPii(env, row.recommenders_json_enc);     if (d != null) row.recommenders_json = d; }
  delete row.birthdate_enc;
  delete row.name_enc;            delete row.email_enc;            delete row.email_h;
  delete row.essay_body_enc;      delete row.essay_body_2_enc;     delete row.essays_json_enc;
  delete row.recommender_name_enc;
  delete row.recommender_email_enc; delete row.recommender_email_h;
  delete row.recommender_letter_enc;
  delete row.recommenders_json_enc;
  return row;
}

// v01.067 (Phase 3): inverse of the inbound + outbound INSERT encryption.
// Same shape on both tables (subject / body_text / body_html), so one helper
// works for either. Strips the *_enc columns from the response.
async function decryptEmailRow(env, row) {
  if (!row) return row;
  if (row.subject_enc)   { const d = await decryptPii(env, row.subject_enc);   if (d != null) row.subject = d; }
  if (row.body_text_enc) { const d = await decryptPii(env, row.body_text_enc); if (d != null) row.body_text = d; }
  if (row.body_html_enc) { const d = await decryptPii(env, row.body_html_enc); if (d != null) row.body_html = d; }
  delete row.subject_enc;
  delete row.body_text_enc;
  delete row.body_html_enc;
  return row;
}

async function listApplications(env, url) {
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 500);
  const track = url.searchParams.get('track');
  let sql = 'SELECT * FROM applications';
  const binds = [];
  if (track && track !== 'all') { sql += ' WHERE track = ?'; binds.push(track); }
  sql += ' ORDER BY submitted_at DESC LIMIT ?';
  binds.push(limit);
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  // v01.066: decrypt every *_enc column per row. The list cap (≤500) +
  // small per-field ciphertext keep this fast even sequentially; if the
  // cap grows later we can fan out via Promise.all.
  const items = [];
  for (const r of results || []) {
    items.push(await decryptApplicationRow(env, r));
  }
  return json({ items, count: items.length });
}

function validateApplication(b) {
  const e = [];
  if (!b || typeof b !== 'object') { e.push('body'); return e; }
  // Step 1
  if (!nonEmpty(b.name)) e.push('name');
  if (!isEmail(b.email)) e.push('email');
  // Step 2
  if (!nonEmpty(b.country)) e.push('country');
  if (!nonEmpty(b.prior_school)) e.push('prior_school');
  // Step 3
  if (!nonEmpty(b.essay_title)) e.push('essay_title');
  if (!nonEmpty(b.essay_body) || String(b.essay_body).length < 50) e.push('essay_body');
  if (!nonEmpty(b.essay_title_2)) e.push('essay_title_2');
  if (!nonEmpty(b.essay_body_2) || String(b.essay_body_2).length < 50) e.push('essay_body_2');
  // Recommenders: minimum 3, each with name + email + intl phone + member country + training level
  let recs = [];
  if (typeof b.recommenders_json === 'string' && b.recommenders_json.trim()) {
    try { recs = JSON.parse(b.recommenders_json); } catch { e.push('recommenders_json'); }
  } else if (Array.isArray(b.recommenders)) {
    recs = b.recommenders;
  }
  if (!Array.isArray(recs) || recs.length < 3) {
    e.push('recommenders_min_3');
  } else {
    recs.forEach((r, i) => {
      if (!r || typeof r !== 'object') { e.push('recommender_' + i); return; }
      if (!nonEmpty(r.name))                        e.push('recommender_' + i + '_name');
      if (!isEmail(r.email))                        e.push('recommender_' + i + '_email');
      if (!nonEmpty(r.phone) || !/^\+/.test(String(r.phone).trim()))
                                                    e.push('recommender_' + i + '_phone');
      if (!nonEmpty(r.member_country))              e.push('recommender_' + i + '_member_country');
      if (!nonEmpty(r.training_level))              e.push('recommender_' + i + '_training_level');
    });
  }
  // Step 4
  if (!nonEmpty(b.track) || !['full','partial','general'].includes(b.track)) e.push('track');
  if (b.track && b.track !== 'general') {
    if (!b.card_last4 || String(b.card_last4).length !== 4) e.push('card_last4');
  }
  return e;
}

function computeAmount(track, tier) {
  if (track === 'full') return 10;
  if (track === 'partial') return tier === '70' ? 7 : tier === '50' ? 5 : 3;
  return 0;
}

// ── helpers ────────────────────────────────────────────────────────────────
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
}
function str(v) { return v == null ? null : String(v); }
function nonEmpty(v) { return typeof v === 'string' && v.trim().length > 0; }
function isEmail(v) { return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
// Parse a comma/semicolon/whitespace-separated list of email addresses from a
// freeform UI input. Returns lowercased trimmed strings; empty entries dropped.
function splitEmailList(v) {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : String(v).split(/[,;\s]+/);
  return arr.map(s => String(s || '').trim().toLowerCase()).filter(Boolean);
}
// Strip HTML to a reasonable plain-text fallback for email clients that
// prefer text/plain. Not perfect — meant for short rich messages, not full
// HTML pages. Keeps line breaks at paragraph + br + heading boundaries.
function htmlToPlainText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/(p|div|h[1-6]|li|tr)\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
function randomSuffix(n) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, b => (b % 36).toString(36)).join('').toUpperCase();
}
