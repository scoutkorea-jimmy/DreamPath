# CLAUDE.md — KoreaDreamPath AI 작업 가이드 (정본)

> **이 파일이 AI 가이드의 정본이다.** 이 저장소에서 일하는 모든 AI 는 매
> 세션 이 파일부터 읽는다. 규칙은 **여기에만** 쓴다. 규칙이 굴러가며
> 쌓이는 기록(핸드오프 · 히스토리 · 인벤토리)은 [`rules/`](./rules/) 에 있다.
>
> 아래 규칙들은 전부 실제 사고에서 얻은 것이다. 무시하면 시간을 잃는다.

---

## 0. 세션 시작 — 순서대로

1. **이 파일**을 읽는다 (자동 로드).
2. `ls rules/handoff/ACTIVE-*` — **진행 중 작업이 있으면 그것부터 이어받는다.**
   새로 시작하지 않는다.
3. [`rules/06-weekly-review.md`](./rules/06-weekly-review.md) 의 "다음 점검일"이
   지났으면 본 작업 **전에 한 줄로 보고**한다 (강요하지 않고 묻기만).
4. 지시를 받으면 → **[§2 하드 룰 A](#a-지시를-받으면-핸드오프부터) 대로 핸드오프부터 만든다.**

### 언제 무엇을 읽나 (라우팅표)

| 상황 | 파일 |
|---|---|
| 작업 절차 전체 | [`rules/00-workflow.md`](./rules/00-workflow.md) |
| **새 기능·화면·API·CSS 를 만들기 전** | [`rules/01-inventory.md`](./rules/01-inventory.md) — 이미 있는지 확인 |
| 디자인·CSS·컴포넌트 | [`rules/02-design-system.md`](./rules/02-design-system.md) |
| 무엇을 어떻게 고쳤나 | [`rules/03-history-success.md`](./rules/03-history-success.md) |
| "이거 예전에 시도했나?" | [`rules/04-history-failure.md`](./rules/04-history-failure.md) |
| **하면 안 되는 것** | [`rules/05-do-not.md`](./rules/05-do-not.md) — 라운드 시작 전 필독 |
| 주간 점검 | [`rules/06-weekly-review.md`](./rules/06-weekly-review.md) |
| 배포된 버전 이력 | [`HANDOFF.md`](./HANDOFF.md) (릴리즈 로그 · 크다) |
| 남은 백로그 | [`CLAUDE_TASKS.md`](./CLAUDE_TASKS.md) (있으면) |
| 운영자용 기능 정의서 | 관리자 → 위키 → KMS (KV `wiki:kms`) |

⚠️ **이름이 비슷한 두 물건**: 진행 중 작업 추적은 `rules/handoff/ACTIVE-*.md`,
배포 버전 기록은 루트 `HANDOFF.md`. 섞지 마라.

---

## 1. 프로젝트 한눈에

- **라이브**: https://koreadreampath.com
- **스택**: Cloudflare Workers + KV + D1 + R2 + 정적 자산 (**빌드 스텝 없음**)
- **프론트**: React 18 UMD + Babel-in-browser + 순수 `.jsx`
- **자산 디렉터리**: 저장소 전체 (`.assetsignore` 로 제외)
- **워커 진입점**: `worker.js` (ESM module worker)
- **바인딩**
  - `CONTENT_KV` — 콘텐츠 블롭(`dp_content_v1`) + 위키 페이지(`wiki:*`)
  - `DB` — D1 `dreampath-db` (스키마는 `migrations/`)
  - `ATTACHMENTS` — R2 (메일 첨부 · 지원 서류 · 업로드 이미지)
  - `ASSETS` — 공개 정적 자산
  - `ADMIN_TOKEN` (시크릿) — `/admin` 및 관리자 API 베어러 토큰

---

## 2. 하드 룰

### A. 지시를 받으면 — 핸드오프부터
**코드를 건드리기 전에** `rules/handoff/ACTIVE-<날짜>-<슬러그>.md` 를 만든다
(`rules/handoff/TEMPLATE.md` 복사). 작업 중 계속 갱신하고, 특히 **"지금 여기"**
표시를 옮긴다. 세션이 끊겨도 다음 세션이 그 줄부터 재개할 수 있어야 한다.
끝나면 `rules/handoff/done/` 으로 옮긴다.

### B. 만들기 전에 — 이미 있는지 찾는다 (스파게티 방지)
새 기능·화면·API·CSS 요청을 받으면 **처음부터 새로 만들지 않는다.**
1. `python3 rules/tools/build_inventory.py` 실행 → `rules/01-inventory.md` 갱신
2. 거기서 비슷한 구현을 찾는다 (화면 23 · API 94 · 관리자 탭 50 · CSS 426 · 토큰 141)
3. `rules/02-design-system.md` · `rules/05-do-not.md` · `rules/04-history-failure.md` 확인
4. 그래도 새로 만들어야 하면, 핸드오프에 **"왜 기존 것으로 안 되는지"** 한 줄을 남긴다.
   그 한 줄을 못 쓰겠으면 새로 만들면 안 된다는 뜻이다.

### C. 🔴 위키 갱신은 최우선 (NEVER SKIP)
모든 코드/콘텐츠/스키마 변경은 **같은 라운드 안에** 아래 위키 KV 를 함께
갱신한다. 누락은 v01.046 → v01.057 누락 사건(2026-05-20)의 재발이다.
운영자가 요청하지 않아도 자동 수행:

- **`wiki:versions`** — 모든 마이너/패치 버전마다 1페이지 추가 (intro 다음,
  **newest-first**). 표준 4섹션: ① 이 버전의 주요 목적 ② 주요 업데이트 내역
  ③ 세부 업데이트 내역(비개발자 `<details open>` + 개발자 `<details>`)
  ④ KMS 위키 반영. **시맨틱 토큰만** (`var(--bg-muted)` / `var(--fg-muted)` /
  `var(--border-subtle)` / `var(--brand-text)`), 하드코딩 hex·회색 금지.
- **`wiki:kms`** — 변경된 기능/스키마가 KMS 문서에 영향이 있으면 **해당 페이지
  직접 갱신** + "99. Change log" 에 한 줄 (date · what · **why** · caveat).
- **`wiki:design` / `wiki:color` / `wiki:logo`** — 토큰·색·로고·폼/버튼 패턴이
  바뀌면 해당 페이지 갱신. 새 예외는 "Tokens-first 예외" 페이지에 등록.

**이 단계가 빠지면 그 라운드는 미완료.** `wrangler deploy` + `git push` 성공이
곧 완료가 아니다.

갱신 방법 (KV 전체 blob 을 다시 올리는 구조 — 부분 쓰기 없음):
```bash
# 1) 현재 페이지 가져오기 (전체 보존)
npx wrangler kv key get --namespace-id=e3cb3043b2694cc7aa990b639a2a982c \
  --remote "wiki:versions" > /tmp/cur.json
# 2) JSON 파싱 + 새 페이지를 intro 다음에 삽입
# 3) 덮어쓰기
npx wrangler kv key put --namespace-id=e3cb3043b2694cc7aa990b639a2a982c \
  --remote --path=/tmp/new.json "wiki:versions"
```

### D. 배포 · 커밋 자동
1. **운영 동작이 바뀌는 변경은 매번 `npx wrangler deploy`.** 요청을 기다리지 않는다.
2. **배포 직후 커밋 + 푸시** (2026-05-20 운영자 지시):
   - 변경 파일을 **명시**해서 `git add` (시크릿 혼입 방지 — `git add -A` 금지)
   - `git commit` 에 what + **why** + `Co-Authored-By` trailer
   - `git push origin main`
   - `HANDOFF.md` §1 버전, §3 라운드 요약 갱신

### E. 성공도 실패도 기록한다
| 결과 | 남길 곳 |
|---|---|
| 성공 | `rules/03-history-success.md` |
| 실패 · 보류 · 막힘 | `rules/04-history-failure.md` (**사유 + 재시도 조건 필수**) |
| 운영자가 "하지 마" 했거나 불편을 호소함 | `rules/05-do-not.md` (**왜**까지) |

**실패를 지우지 마라.** "이번엔 안 됐다"로 끝내지 말고, **무엇이 참이어야 다시
시도할 만한지**(모델 · 권한 · 절차 · 외부 서비스)를 적는다. 주간 점검이 이걸 먹고 산다.

### F. 나머지 상시 규칙
1. **관리자 토큰 우회 금지.** 관리자 API 는 전부 Bearer 인증. 공개 쓰기
   엔드포인트를 승인 없이 추가하지 않는다.
2. **시크릿 배포 금지.** `.assetsignore` 가 `worker.js` · `.git` · `migrations/` ·
   `rules/` 등을 자산 번들에서 뺀다. 민감 파일을 추가하면 **먼저** 여기에 넣는다.
3. **친절한 URL 을 깨지 않는다.** 새 SPA 경로는 `worker.js` 의 `SPA_PATHS` **와**
   `App.jsx` 의 `VIEW_TO_PATH`/뷰 스위치 양쪽에 추가.
4. **디자인 토큰만.** `colors_and_type.css` 가 단일 출처. 없는 색은 토큰을 먼저 추가.
5. **빌드 스텝 추가 금지.** Babel-in-browser 는 의도된 선택. 번들러가 필요하면 먼저 제안.
6. **한국어 + 영어.** 사용자에게 보이는 문자열은 `ko` / `en` 둘 다.
7. **조용한 기능 축소 금지.** 제거하면 변경 로그에 명시.

---

## 3. 파일 위치

```
/
├── CLAUDE.md                → AI 가이드 정본 (이 파일)
├── rules/                   → AI 작업 기록 (핸드오프·히스토리·인벤토리)
├── HANDOFF.md               → 배포 릴리즈 로그 (버전별 누적)
├── worker.js                → 워커 진입점. /api/* + URL 재작성
├── wrangler.jsonc           → 바인딩 (KV, D1, R2, ASSETS)
├── colors_and_type.css      → 디자인 토큰 (단일 출처)
├── migrations/              → D1 스키마 마이그레이션
├── .assetsignore            → 공개 자산 번들 제외 목록
├── assets/                  → SVG 로고·아이콘·플레이스홀더
└── ui_kits/website/         → 공개 사이트 + 관리자
    ├── index.html           → 공개 SPA 셸
    ├── admin.html           → 관리자 셸 (단일 인라인 React 앱)
    ├── site.css             → 공개 사이트 CSS (토큰 사용)
    ├── content-store.js     → KV 콘텐츠 스키마 + API 헬퍼
    ├── auth-store.js        → 사용자 인증 (로그인/가입/세션)
    ├── analytics-store.js   → 이벤트 배치 전송 → /api/analytics
    ├── version.js           → window.DREAMPATH_VERSION
    ├── App.jsx              → SPA 라우터 + 뷰 스위치
    └── *.jsx                → 화면 컴포넌트 (전체 목록은 rules/01-inventory.md)
```

---

## 4. 스키마 맵 (요약 — 전체는 `rules/01-inventory.md`)

**KV `dp_content_v1`**: `brand` · `nav` · `hero` · `how` · `programs_section` ·
`programs[]` · `partners_section` · `partners[]` · `stories_section` · `stories[]` ·
`cta_banner` · `faq[]` · `icons` · `about{hero,mission,team}` · `page_heros{...}` ·
`partner_cta` · `program_detail` · `footer` · `project_team{...}` · `notice` ·
`errors{401..offline}` · `entry_gate` · **`apply_gate`** · `banners` · `og` ·
`inboxes[]` · `email_templates{from_name,from_email,forward_to,items}` · …

**D1**: `users` · `sessions` · `member_profiles` · `applications`(파이프라인 상태머신) ·
`news_posts` · `inquiries` · `analytics_events` · `inbound_emails` · `outbound_emails` ·
`email_attachments` · `scholarship_posts` · `error_logs` · `messages` · …

**KV 기타**: `wiki:kms` · `wiki:versions` · `wiki:color` · `wiki:design` · `wiki:logo`

---

## 5. 친절한 URL 라우팅

| 경로 | 서빙 |
|---|---|
| `/` | SPA (home) |
| `/admin`, `/admin/`, `/admin.html` | 관리자 셸 (토큰 게이트) |
| `/about` `/programs` `/apply` `/partners` `/stories` `/news` `/contact` | SPA |
| `/team` `/member` `/receipt` `/scholarships` | SPA |
| `/program/:id` · `/scholarship/:id` · `/stories/:id` | SPA 상세 |
| `/401` `/403` `/404` `/500` `/503` `/offline` | SPA 에러 뷰 |
| `/sitemap.xml` `/robots.txt` | 워커 생성 |
| `/uploads/*` | R2 공개 이미지 |
| `/api/*` | 워커 API |
| 그 외 | 정적 자산 → 없으면 404 페이지 |

---

## 6. 코딩 컨벤션

- **`.jsx` 는 Babel-in-browser 가 파싱**한다. ESM `import` 를 쓰지 않는다
  (Babel 처리가 깨진다). TipTap 만 `editor-loader.js` 의 모듈 shim 예외.
- **전역은 의도적으로 `window` 에**: `window.Home` · `window.Nav` · `window.useAuth` …
  같은 패턴을 유지한다.
- **색·간격·반경·그림자는 CSS 변수만.** 일회성 하드코딩은 그 자리에 사유 주석.
- **정적 JSX 문자열에 raw `\n` 금지.** 줄바꿈은 실제 개행 문자로 두고 렌더 쪽에서
  `white-space: pre-line` 으로 처리.
- **버튼**: `.btn` + variant(primary/secondary/ghost/white/outline) + 선택적
  크기(`btn-sm`/`btn-lg`), 전체폭 `btn-block`. 인라인 스타일로 패딩·색 덮어쓰기 금지.
- **한글 줄바꿈은 어절 단위**: `word-break: keep-all; overflow-wrap: break-word;`
- **언어**: 컴포넌트는 `lang` prop 을 읽는다. 관리자는 `dp_admin_lang` 로 별도 관리.

---

## 7. 플레이북

### 새 페이지 추가
1. `Foo.jsx` 작성 → `window.Foo` 노출
2. `index.html` 에 `<script type="text/babel" src="/ui_kits/website/Foo.jsx">` 추가
3. `App.jsx` 의 `VIEW_TO_PATH` 에 `foo: '/foo'` + 뷰 스위치에 `case 'foo'`
4. `worker.js` 의 `SPA_PATHS` 에 `'/foo'`
5. `sitemapXml()` 에 항목 추가
6. 보이는 페이지면 nav/footer 링크
7. 변경 로그 + 위키

### 새 관리자 탭 추가
1. `admin.html` 안에 컴포넌트 작성
2. `TABS` 배열에 `{ id, group }` 추가
3. `I18N.ko.tab` / `I18N.en.tab` 에 라벨
4. `TabComp` 에 id → 컴포넌트 매핑

### 새 D1 테이블 추가
1. `migrations/000N_xxx.sql` 작성
2. `npx wrangler d1 migrations apply dreampath-db --remote`
3. `worker.js` 에 API 추가
4. UI 가 필요하면 관리자 탭 추가

### 새 콘텐츠 필드 추가
1. `content-store.js` 의 `DEFAULT_CONTENT` 에 기본값 (보이는 값이면 ko/en 둘 다)
2. 컴포넌트에서 기본값 폴백과 함께 읽기
3. 관리자 입력 필드 연결 (Text / Area / Color / IconField)
4. ⚠️ **서버도 그 값을 읽는다면**, 워커 쪽 기본값과 반드시 같이 움직인다
   (SPA 는 기본값을 병합하고 워커는 KV 원본을 읽는다 — 어긋나면 화면과 API 가 다른 말을 한다).

---

## 8. 브랜딩

- 회사명: **KoreaDreamPath** (한 단어). 워드마크는 `brand.wordmark_mark`("KoreaDream")
  + `brand.wordmark_accent`("Path", 노랑).
- 대표 메일: `info@koreadreampath.com` (2026-05-04 통합). `hello@` · `partners@` ·
  `team@` 는 레거시 별칭.
- 옛 "DreamPath" / "DreamPath TF" 표기는 **레거시** — 보이면 고치고 변경 로그에 남긴다.

---

## 9. 변경 로그 규율

의미 있는 편집마다 `wiki:kms` → "99. Change log" 에 한 항목:

```
2026-05-04 · Stats 섹션 제거 (Home.jsx, content-store.js, admin TABS)
  Why: 운영자 요청. 서사 없이 숫자만 있어 혼란스러웠음.
  Caveat: 과거 KV 블롭에는 데이터가 남아 있음. 리셋 시 소멸.
```

커밋 메시지도 같은 의도를 담는다 — **what 만 쓰고 why 를 빼지 않는다.**

---

## 10. 하지 말 것

전체 목록과 사유는 [`rules/05-do-not.md`](./rules/05-do-not.md). 핵심만:

- 요청받지 않은 **서브에이전트 · 워크플로 · 딥리서치** 사용 금지
- 공개 사이트에 **npm 패키지 임의 추가** 금지 (먼저 제안)
- **`/admin` 경로 변경** 금지 (점검 도구가 고정 경로를 씀)
- **민감정보 저장** 금지 (카드 전체번호 · 신분증 번호). 카드 뒤 4자리만
- CI 에서 **`wrangler deploy` 비활성화** 금지 (사전 합의 없이)
- **기능 플래그를 문서 없이** 추가 금지 — 여기 또는 `rules/` 에 적는다
