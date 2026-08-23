# HANDOFF · 홈페이지 기능 안정성 검토

- **시작**: 2026-08-22 (KST)
- **지시 원문**: "홈페이지의 기능 안정성을 검토하고, 진행해줘"
- **상태**: 진행 중
- **버전**: v01.096.00 기준 → 수정 시 bump

## 목표 (무엇을 끝내면 끝인가)
- [ ] 라이브 사이트 전 경로 · 전 API 응답 상태 확인 (죽은 링크 · 5xx · 깨진 SPA 경로 0)
- [ ] 라우팅 3중 정합 확인 (worker.js SPA_PATHS ↔ App.jsx VIEW_TO_PATH ↔ sitemapXml)
- [ ] 스크립트 배선 확인 (index.html <script> ↔ window.* 전역 ↔ App.jsx 뷰 스위치)
- [ ] 콘텐츠 기본값 정합 (content-store DEFAULT_CONTENT ↔ worker.js 서버측 기본값)
- [ ] 발견된 결함 수정 + 배포 + 위키 반영

## 사전 확인
- [ ] `rules/01-inventory.md` 확인
- [ ] `rules/05-do-not.md` 확인
- [ ] `rules/04-history-failure.md` 확인

## 진행
- [x] 핸드오프 생성 · 규칙 3종(05-do-not · 04-failure · CLAUDE.md) 확인
- [x] 1차 진단 완료 (라우팅 · API · 배선 · 실브라우저 · D1 오류로그)
- [x] **P0-1 CSP** — 배포 완료 (v01.097.00, 라이브 헤더로 확인:
      style-src 에 cdn.jsdelivr.net·rsms.me, script-src 에 esm.sh·
      static.cloudflareinsights.com 들어가 있음)
- [x] **P0-2 부트 워치독** — 배포 완료 (v01.098.04)
- [x] **P2-6 TipTap 지연 로딩** — 배포 완료 (v01.098.04)
- [ ] **← 지금 여기** P0-3 React 에러 바운더리 도입
- [ ] P1-5 가짜 폴백 5곳 제거 (Programs.jsx:11 · ProgramDetail.jsx:6 ·
      Pages.jsx:19,57,364) + deepMerge 의 null 통과 문제
- [ ] P1-4 (구 E) base64 → R2 이관, 백업 후 수행
- [ ] 남은 항목 배포 · 검증 · 위키

## 🔴 2026-08-23 사고: 반쯤 배포된 라운드

P0-2·P2-6 수정 3파일이 **8/22 → 8/23 까지 커밋도 배포도 안 된 채
작업트리에만** 있었다. 그 사이 루트 `HANDOFF.md` 는 v01.097.01 항목에서
이것을 **"v01.097.00 으로 나갔다"고 적고 있었고**, 이후 세션들이 그
기록을 믿고 v01.098.03 까지 채번했다.

**진짜 피해는 코드가 아니라 거짓 기록이다.** 라이브 확인 없이 기록만
읽으면 다음 세션이 "이미 있는 것"으로 판단하고 넘어간다.

교훈 → 기억 `core/always-commit-and-push.md` ·
`failures/2026-08-23-uncommitted-work-stranded.md` 에 등재.
이 파일의 체크박스도 **`curl` 로 라이브를 확인한 것만** 체크했다.

⚠️ **남은 확인**: v01.098.04 는 실브라우저 콘솔 확인을 하지 못했다
(세션에 브라우저 도구 없음). 다음 세션에서 공개 사이트 1회 크롤해
워치독이 정상 화면을 덮지 않는지 눈으로 확인할 것.

## 진단 결과 (실증 기반)

### 정상 확인된 것
- SPA 경로 26개 전부 200, 미존재 경로만 404 — 라우팅 3중 정합(SPA_PATHS ↔ VIEW_TO_PATH ↔ sitemapXml) 일치
- 관리자/보호 API 6종 전부 인증 없이 401 — 토큰 우회 없음
- index.html 로드 스크립트 29개 ↔ 실제 파일 29개 완전 일치
- 공개 API(content·programs·partners·stories·scholarships·news) 전부 200

### P0-1 · CSP 가 실제 기능을 차단 중 (실브라우저 콘솔 오류 24건)
- `style-src 'self'` → `colors_and_type.css` 의 @import 2건 차단
  (pretendard @ cdn.jsdelivr.net · inter @ rsms.me)
  → **사이트 전체가 지정 타이포그래피 없이 폴백 폰트로 렌더링 중**
- `script-src` 에 esm.sh 없음 → TipTap 22개 모듈 전부 차단
  → **리치 에디터(공개 뉴스 편집 · 관리자)가 죽어 있음**
- `static.cloudflareinsights.com` 차단 → 웹 분석 beacon 유실

### P0-2 · 부팅 실패 = 흰 화면, 폴백 없음 (D1 error_logs 20건+ 실증)
- `.jsx` 21개를 Babel-in-browser 가 순차 파싱. 하나라도 전송이 잘리면
  SyntaxError → 그 전역 미생성 → 사이트 전체 흰 화면.
- 실제 로그: Unterminated string constant(Nav·Auth·Team·Pages·Errors·Apply…) ·
  "Could not load About.jsx" · "window.DreamPathContent is undefined"
- 2026-05-08 ~ 2026-08-21 까지 **지속 발생 중**. 한 세션에 5개 파일이 동시에 깨진 사례 있음
- index.html 에 재시도·안내 폴백이 전혀 없어 사용자는 백지만 본다

### P0-3 · React 에러 바운더리가 하나도 없음
- `componentDidCatch`/`ErrorBoundary` 전무. 단일 컴포넌트 throw → 트리 전체 언마운트 → 흰 화면
- `safe()` 는 컴포넌트 미정의만 막을 뿐 렌더 예외는 못 막는다

### P1-4 · `/api/content` 응답이 1.5MB (모든 방문자 첫 로드)
- 원인: base64 data URI 이미지 3장이 전체의 **95%**
  - `project_team.sections[0].members[0].image` 500KB
  - `project_team.hero.bg_image` 475KB
  - `page_heros.programs.bg_image` 452KB
- v01.080 에서 R2(`/uploads/*`)로 옮기기로 했는데 **이 3장이 이관 잔여물로 남음**
- 부작용: 관리자 저장 시마다 1.5MB 왕복 · KV 값 크기 한계(25MB) 잠식

### P1-5 · 존재하지 않는 전역을 폴백으로 쓰는 코드 5곳
- `(c && c.programs) || window.PROGRAMS` 형태. `window.PROGRAMS`·`PARTNERS`·
  `STORIES`·`FAQ` 는 **어느 파일에도 정의가 없다**
- `deepMerge` 는 `null` 을 그대로 통과시키므로(`over !== undefined ? over : base`)
  KV 에 `programs: null` 이 들어가면 `list.map` 즉시 크래시
- 안전망처럼 보이지만 아무것도 막지 못하는 가짜 폴백
- 해당: Programs.jsx:11 · ProgramDetail.jsx:6 · Pages.jsx:19,57,364

### P2-6 · editor-loader 가 모든 방문자에게 즉시 실행
- 공개 사이트의 RichEditor 는 **권한 편집자용 NewsEditor 모달 안에서만** 쓰임
- 그런데 첫 로드에서 22개 esm.sh 모듈을 무조건 요청 → 일반 방문자에게 순수 낭비

### P2-7 · 서버측 D1 간헐 타임아웃
- `/api/analytics` 5건 · `/api/me/notifications` 5건. 이미 'warn' 으로 분류되어
  있어 신규 대응 불요(관측만)

## 검증
- 경로 26개 curl 상태코드 표
- `/api/content` 키별 바이트 분해 (python3)
- Playwright 실브라우저 콘솔 오류 25건 수집
- D1 `error_logs` 그룹 집계 30행

## 종료 시 할 일
- [ ] 배포 → 커밋 → 푸시
- [ ] 루트 `HANDOFF.md` + 위키(`wiki:versions`, `wiki:kms`) 갱신
- [ ] `rules/03-history-success.md` / `rules/04-history-failure.md` 기록
- [ ] 이 파일을 `rules/handoff/done/` 으로 이동
