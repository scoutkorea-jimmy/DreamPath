# HANDOFF · KoreaDreamPath

> **현 시점 (2026-05-25) 사이트 상태 스냅샷.**
> 다음 세션에서 작업을 이어받을 때 이 파일을 먼저 읽으세요.
> 위키와 중복되는 내용은 의도적입니다 — 한 곳에 모아둔 "현재"입니다.

---

## 1. 현재 버전 / 배포

- **버전**: `v01.076.01`
- **배포 방식**: `cd ~/Desktop/VS_Code/DreamPath && npx wrangler deploy` (자동 모드)
- **마이그레이션 상태**: 0001 ~ **0037** 모두 적용됨 (remote D1 검증 완료). 0037 = messages 테이블. d1_migrations bookkeeping이 0031에서 멈춰 있던 드리프트를 0032~0037 backfill로 정합화 → `migrations apply`가 clean no-op.
- **Cron**: `0 * * * *` (매시 정각, 활성화 만료 정리 + 리마인더 + Apply draft 72h purge)

### 테스트 계정 (2026-05-19 표준화)
- **컨벤션**: email `qa+xxx@example.invalid`(RFC 6761 예약 도메인) + name `[TEST] xxx`. 최대 5개.
- **현재 시드**: `qa+basic`, `qa+apply`, `qa+paid`, `qa+admin`, `qa+spare`. admin → 회원 정보 상단 카운터 카드 + 각 행에 노란 TEST 배지로 자동 식별.
- **자세히**: KMS 위키 → `4-1. 테스트 계정 규약`.

### 버전 정책 (CLAUDE.md §1 재확인)
- `AA.bbb.cc` → AA(메이저, 운영자만) · bbb(마이너, 새 기능) · cc(패치, 버그 수정 / 카피)
- **이번 세션 누적**: v01.027.00 → **v01.046.00** (마이너 +19)
  - +01.073.00 — **회원 간 다이렉트 메시지(스레드) + 팀원 계정 연결**: /team의 "메시지 보내기"를 관리자 문의함行 → 실제 1:1 DM으로 승격. 신규 `messages` 테이블(마이그레이션 0037, subject/body AES-GCM) + `/api/me/messages` CRUD(목록·열람·답장·소프트삭제, 계정당 30/h). 마이페이지 "메시지" 탭 신설(대화 목록 → 말풍선 스레드 → 답장, 미읽음 배지). 관리자 프로젝트팀 편집에 **가입계정 연결 피커**(`/api/admin/users` 검색 → 멤버에 `user_id` + 공개용 불투명 `key`). 공개 `GET /api/content`는 비관리자에게 `user_id` 스크럽 후 `messageable`만 노출. Team.jsx는 연결된 멤버만 버튼 노출 + DM 전송(미연결 코디네이터는 문의함 fallback). 라이브 round-trip(목록·읽음·답장·역방향 미읽음·at-rest 암호화) 전수 검증 후 테스트 데이터 정리. d1_migrations 0032~0037 backfill로 마이그레이션 정합화.
  - +01.072.00 — **프로젝트팀 페이지 정비 + 회원 메시지 + 1:1 사진**: /team에 상시 “Message our coordinator” CTA(로그아웃 시 회원가입 유도, 로그인 시 제목+본문 폼·계정 정보 자동 첨부) + 멤버별 메시지 버튼. 신규 <code>POST /api/team/message</code>(로그인 필수 → 기존 inquiries 재사용 category=team, 제목에 수신자 prefix, 이름/이메일은 세션 계정, 계정당 10/h). HQ/GLOBAL TEAM 그룹 + 사진 호버 컬러(평소 흑백) + 모바일 2열. 멤버/코디네이터 사진 1:1 강제 — 비정사각 업로드는 canvas 가운데 자동 크롭(JPG·PNG). 관리자 팀 탭 영어 전용화 + 코디네이터 편집 카드. 상단 배너 mid-June(6월 중순). 보너스 보안: <code>.assetsignore</code>에 <code>.claude/</code>·CLAUDE.md·HANDOFF.md·CLAUDE_TASKS.md 추가 — 배포 중 <code>/.claude/settings.local.json</code> 200 노출 발견·차단(이후 404 확인). 라이브 KV(dp_content_v1·wiki:versions·wiki:kms) 동시 갱신.
  - +01.028 — 사이드바 14→11 그룹 통합
  - +01.029 — 마이페이지 / 지원폼 대규모 개편 + VersionWatcher + 다크 버튼
  - +01.030 — 회원 측 첨부파일 편집 + 관리자 에세이 문항 탭 + 워커 안정성 강화
  - +01.031 — Apply draft 서버 영속화 (72h TTL) + essays_json 컬럼 + PCI 카드 필드 strip
  - +01.032 — 로그인 무차별 대입 방어 (실패 카운트 + 지수 백오프 잠금)
  - +01.033 — **방어 라운드 시작**: 활성화 throttle + 인증 4경로(login/activate/resend/lockout) timing + status 균질화. crypto-secure 활성화 코드. 정보 누출 헌법: 모든 인증 응답은 status code · body · wall-clock 모두 분기 무관 동일.
  - +01.034 — **방어 라운드 P0-2/P0-3**: signup의 `email_taken` 409 enumeration 제거 (PRETEND_OK silent), pwreset 양방향 timing 균질화, KV 기반 IP rate-limit + per-email rate-limit, `ctx.waitUntil(sendEmail)` 백그라운드화, 타이밍 floor 1500ms + 500ms jitter. 6-sample 검증으로 모든 분기 1.7-2.2s window 진입 — 통계적 구분 불가.
  - +01.035 — **방어 라운드 P0-4/5/6/7**: 보안 헤더(CSP / HSTS / X-Frame / nosniff / Referrer-Policy / Permissions-Policy / COOP) 모든 응답 부착. 글로벌 500 catch handler 에러 메시지 generic화 (`{error:'internal'}`). ADMIN_TOKEN 등 시크릿 length 노출 제거. 파일 업로드에 KV rate-limit (20회/시간/IP) + R2 put 에러 메시지 generic화.
  - +01.036 — **방어 라운드 P1-2/3/4**: CDN 스크립트 SRI 해시 완비 (React production + Lucide 누락분 추가). `/api/admin/*` write 메서드에 CSRF Origin/Referer 검사 (cross-origin POST는 `403 origin_blocked`). 위키 PUT 스키마+크기 검증 (≤512KB, ≤200 pages, page shape 검증). P1-1 TipTap sanitize는 별도 라운드로 미룸 (DOMPurify 도입 여부 설계 필요).
  - +01.037 — **방어 라운드 P1-5/6 + P2-2/3 + 위키 버전탭 신설**: `admin_audit` + `login_activity` D1 테이블 + 6개 파괴적 액션 hook + 로그인 성공 활동 기록 (모두 fire-and-forget). R2 키 prefix를 `Date.now()` → `randomHex(8)`로 (기존 파일 영향 X). 세션 revoke를 role/email 변경 시까지 확장. **신규 admin → 위키 → "버전 기록" 탭** (`wiki:versions` KV에 12개 페이지 사전 입력 — v01.018~027 요약 + v01.028~037 개별).
  - +01.038 — **관리자 전체 검색 + admin VersionWatcher + 다크모드 contrast 잔여 수정**: 신규 `GET /api/admin/search?q=...` — 회원·지원·문의·받은/보낸메일·위키·콘텐츠 6+1 영역 병렬 검색, 영역당 ≤10건. 사이드바 상단 `GlobalSearch` 컴포넌트 (300ms debounce, 부동 결과 패널). admin.html이 이제 `VersionWatcher.jsx` 로드 + 마운트해서 공개 사이트와 동일한 "새 버전 배포됨" 토스트 표시. WikiTab active 페이지 라벨 + 일부 Stat 카운터 + 분석 trail 라벨이 `--midnight-purple`(다크모드 fix dark) → `--brand-text`(다크모드 자동 light flip)로 교체 — contrast 1.5 → AA 통과.
  - +01.039 — **VersionWatcher 강화 + WikiTab 페이지네이션 + 버전 위키 전면 재구조화**: 폴링 60→20초, `visibilitychange`/`online` 리스너 추가, 배너를 크게 + 슬라이드 인 + 펄스 강조. WikiTab 사이드바에 20개 단위 페이지네이션(activeId 자동 점프). `wiki:versions` 14페이지를 새 구조(① 주요 목적 ② 주요 내역 ③ 비개발자 기본 표시 + 개발자 접힘 ④ KMS 위키 반영)로 전면 재작성.
  - +01.040 — **P1-1 TipTap HTML sanitize + P2-4 ADMIN_TOKEN 이중 토큰**: HTMLRewriter 기반 allowlist sanitizer 추가. inbound 이메일(외부 발신자 → 적대적), outbound 이메일(admin TipTap), program_details 9개 리치 필드, 위키 PUT 페이지 본문 — 총 4개 write 지점에 sanitize 호출. javascript:/data:(non-image)/vbscript: URL은 href/src에서 자동 strip. `isAdmin()`이 `ADMIN_TOKEN` + `ADMIN_TOKEN_NEXT` 둘 다 허용 → 운영자 무중단 토큰 회전 가능. integrations status는 NEXT가 설정됐을 때만 노출.
  - +01.041 — **P2-1 HttpOnly 세션 쿠키 (서버 측, dual-auth)**: 로그인/활성화/skipActivation signup 성공 시 `Set-Cookie: dp_session=...; HttpOnly; Secure; SameSite=Lax; Path=/` 자동 부착. `bearerToken()`이 Authorization 헤더 OR `dp_session` 쿠키 둘 다 읽어 dual-auth. 로그아웃 시 쿠키도 즉시 만료. 클라이언트는 변경 없음(fetch 기본 `credentials: 'same-origin'`이 자동 첨부). XSS-via-localStorage 차단의 1단계 — 후속에서 client가 localStorage 의존을 끊으면 완전 차단.
  - +01.042 — **P2-5 PII at-rest 암호화 (phone)**: 마이그레이션 0026으로 `users.phone_country_enc`, `users.phone_national_enc`, `inquiries.phone_enc` 추가. AES-GCM(IV 12바이트 + ciphertext + 16바이트 tag, base64). 키는 `env.PII_ENCRYPTION_KEY`를 SHA-256으로 derive. signup + inquiry 쓰기 시 키가 있으면 `_enc`만 채우고 평문 컬럼은 NULL; 키 미설정 시 종전대로 평문. admin 회원 조회 시 `_enc` 우선 decrypt + 평문 fallback. `/api/admin/search`에서 `phone_national LIKE` 제거(암호화된 컬럼은 LIKE 매칭 불가). 운영자가 `wrangler secret put PII_ENCRYPTION_KEY` 한 뒤부터 신규 데이터 즉시 암호화. 기존 평문 row는 별도 backfill로 점진 처리.
  - +01.043 — **PII backfill cron + inbound HTML sanitize backfill cron**: 매시 cron에 `piiBackfillCron`(키 설정 시 평문 phone row 100개씩 암호화 + 평문 NULL) + `inboundSanitizeCron`(v01.040 이전 inbound 이메일 50개씩 HTML 재-sanitize) 추가. 마이그레이션 0027로 `inbound_emails.sanitized_at` 마커 컬럼. 키 미설정/legacy row 없음 시 cron 모두 no-op.
  - +01.044 — **P2-1 클라이언트 phase 2 (cookie-first)**: `auth-store.js` 전면 재작성. 신규 로그인/가입/활성화는 더 이상 `dp_user_token` localStorage 키를 작성하지 않음 → 서버가 설정한 HttpOnly `dp_session` 쿠키만 사용. legacy localStorage 토큰이 있으면 한 번 Bearer-bootstrap으로 `/api/auth/me` 호출해 세션을 인계받은 뒤 사용자가 재로그인 시 자동 폐기. `authFetch`/`signup`/`login`/`logout`이 `credentials: 'same-origin'` 명시. **XSS-via-localStorage 차단 완료** — 신규 세션은 JS로 토큰을 읽을 수 없음.
  - +01.045 — **PII 암호화 확장 (applications.birthdate)**: 마이그레이션 0028로 `applications.birthdate_enc` 추가. 신청서 제출 시 키 있으면 birthdate를 암호화해서 `_enc`에 저장 + 평문 NULL. admin 신청서 GET(목록/단일)에서 자동 decrypt. piiBackfillCron에 birthdate 백필 분기 추가.
  - +01.046 — **암호화 phone의 정확 매칭 검색 부활 (HMAC)**: 마이그레이션 0029로 `users.phone_national_h`, `inquiries.phone_h` + 인덱스 추가. `computePiiHmac()` 헬퍼는 `PII_ENCRYPTION_KEY`에서 도메인-분리된 sub-key 도출 → HMAC-SHA256(digits-only normalized). signup/inquiry 쓰기 시 encrypt + HMAC 동시 저장. `/api/admin/search`가 q가 phone-like(4자리+) 시 HMAC 매칭 분기 추가. backfill cron이 (이미 암호화된) row를 decrypt → HMAC → 저장으로 점진 복구.
  - +01.060 — **FAQ 28문항 전면 교체 (한/영)**: 운영자가 보낸 신규 영문 원본을 기준으로 `dp_content_v1.faq` 전체 재작성. 30 → 28항목, 카테고리 6개로 재정렬 (About the Program 7 / Tuition Payment & Refunds 5 / Scholarships 3 / Learning Experience 5 / Certification & Career 4 / Partners & Operations 4). "정규 학위 아님 / 취업·비자·이민 미보장 / 환불은 CUFS 규정에 따름" 등 위험 회피 문구를 항목 본문에 명시. 2026 가을학기 일정(지원 6월 / 개강 8월 31일)을 Q28에 반영. `wrangler kv key put` 전체 blob 재업로드 방식 — 부분 patch 아님.
  - +01.061 — **CUFS 5개 마이크로디그리 카탈로그/상세페이지 전면 교체**: 운영자가 준 `Refbysonny_20260523_Dream Path — 5 Micro-Degree Programs _ CUFS.htm`를 기준으로 공개 프로그램 목록을 `AI & Language / Media Content Storytelling / YouTube Master / Basic K-Beauty Styling / Business Korean` 5개로 교체. `worker.js`에 프로그램 상세 기본 본문 fallback을 추가해 D1 row가 비어도 `/program/:id`에서 즉시 개요·커리큘럼·성과·지원자격이 렌더되도록 함. admin 프로그램 상세 preview 기본 경로와 공개 앱 기본 detail id도 `ai-language`로 교체.
  - +01.061.02 — **프로그램 상세페이지 디자인 리프레시**: `ProgramDetail.jsx`와 `site.css`를 업데이트해 참고 HTML의 정보 밀도와 카드형 레이아웃을 DreamPath 톤으로 재해석. 상단 hero를 2열 구조(카피 + glass 카드)로 바꾸고, 상세 본문 시작에 stat strip 추가. Overview / Curriculum / Outcomes / Eligibility / Instructor를 개별 섹션 카드로 분리하고, `pd-rich ul/li`를 plain bullet 대신 강조 카드형 리스트로 렌더. 사이드바도 단순 표에서 정보 카드 스타일로 업그레이드.
  - +01.061.03 — **레거시 4개 프로그램 완전 제거**: live `dp_content_v1` KV를 현재 5개 프로그램 배열로 직접 갱신하고, `worker.js` / `content-store.js`에 남아 있던 legacy 4개 프로그램 자동 보정 분기(`LEGACY_PROGRAM_IDS`, normalize shim)를 삭제. 이제 공개 프로그램 데이터는 호환 레이어 없이 현재 catalog만을 source of truth로 사용.
  - +01.061.04 — **상세페이지 커리큘럼 정보 보강 + 친근한 아이콘형 카드화**: `worker.js`의 기본 program detail HTML을 참고 문서 기준으로 확장해 각 과정별 `department`, `semester`, `faculty`, `lecture preview link`, 세부 설명을 커리큘럼 항목마다 포함. `site.css`에서는 `pd-rich` 리스트를 단순 bullet에서 번호 배지 + semester chip + 미리보기 링크가 있는 카드형 리스트로 바꿔 각 과목이 더 친근하게 보이도록 조정. 원격 D1 `program_details`는 현재 비어 있어 이 기본 본문이 곧바로 공개 상세페이지에 사용됨을 확인.
  - +01.062.00 — **과목별 교수 프로필 모달 + 관리자 편집 구조화**: `program_details`에 `courses_json` 컬럼(마이그레이션 0031) 추가. 각 프로그램 상세는 이제 과목별 `semester / title / description / professor name / title / bio / photo / preview URL` 배열을 가질 수 있음. 공개 `ProgramDetail.jsx`는 구조화된 course cards를 렌더하고, 교수 이름 클릭 시 프로필 모달을 표시. 관리자 `ProgramEditor`에는 `Course cards & professor profiles` 섹션이 추가되어 과목별 교수 사진과 소개를 직접 업로드/수정 가능.
  - +01.062.01 — **과목 카드에 교수 블록/강의 미리보기 링크를 상시 노출**: 참고 CUFS 문서에서 중요했던 `교수 정보 블록 + Watch Lecture Preview`가 카드 안에서 바로 보이도록 `ProgramDetail.jsx` 커리큘럼 마크업을 재배치. 과목 설명 아래 divider를 두고, 교수명/직함은 카드 일부처럼 노출한 뒤 클릭 시 모달이 열리게 유지. `site.css`는 2열 카드 그리드, 블루 semester 배지, 하단 preview link 스타일로 재조정해 레퍼런스의 정보 밀도와 친근한 인상을 더 가깝게 복원.
  - +01.062.02 — **프로그램 상세 공통 신뢰 섹션 `Why CUFS?` 복원**: reference HTML의 핵심 설득 블록이던 `Why CUFS?`를 `ProgramDetail.jsx`에 공통 섹션으로 추가. `Government Accredited / AI-Powered Learning / Proven Track Record / Expert Faculty / 12 Departments / K-Career Magnet` 6개 카드를 각 프로그램 상세 하단에 노출하고, `site.css`에 네이비 배경 + 3열 그리드 + 모바일 반응형 스타일을 추가해 참고 디자인의 분위기와 신뢰 메시지를 복원.
  - +01.062.03 — **Dream Path 차별점/가격 섹션 복원**: reference HTML의 `What Makes Dream Path Different`와 `How Much Does It Actually Cost?` 블록을 프로그램 상세페이지에 추가. `ProgramDetail.jsx`에 `Start FREE / DOME / Scholarship / Scout Network` 4개 차별화 카드와 한국 유학 대비 `~$720` 가격 비교 섹션을 넣고, `site.css`에서 골드 보더 카드/그린 가격 박스 스타일과 모바일 반응형을 구현.
  - +01.064.00 — **프로그램 상세 가격 섹션 전면 재구성 + Different/Why CUFS 카드 reference 정렬**: 새 reference HTML(2026-05-27)을 기준으로 `ProgramDetail.jsx`의 가격 섹션을 단순 before/after → 5-row × 2-column breakdown + `$14,258–$29,258` savings banner + 3.3%:96.7% 시각화 bar + zero-cost 칩 5개로 교체. Different 카드의 Scholarship 약속을 "criteria vary by country"로 변경(약속 위험 회피) + Scout Network → Global Partner Network. Why CUFS 카드는 "12 Departments" → "10 Faculties" + AI Innovation Award / 52/52 / 2 in 3 장학생 / 24/7 helpdesk(+82-6907-6703) 사실 인용. `site.css`에 `.pd-cost-breakdown / -col(.is-offline|.is-online) / .pd-savings-* / .pd-zero-list/-chip` 신규 (모든 색 토큰만 사용). 새 reference HTML은 `.assetsignore`로 자산 번들 제외.
  - +01.064.01 — **Live Preview 복구 (보안 헤더 SAMEORIGIN 완화)**: 운영자 보고 — admin의 모든 Live Preview iframe이 빈 화면. 원인은 v01.035 P0-4의 `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`이 same-origin admin iframe까지 차단. 두 헤더 모두 `SAMEORIGIN` / `'self'`로 완화. 외부 cross-origin 클릭재킹 방어는 유지. 11개 라운드 뒤에야 발견된 회귀이므로 두 헤더 위에 의도 주석(WHY) 인라인 추가해 같은 회귀 방지.
  - +01.071.01 — **다크모드 contrast 회복**: 운영자 보고 — 다크모드에서 챗봇 FAB / 알림 배지 / FAQ 펼침 아이콘 / 필터 chip의 흰 글씨가 light lavender 배경에 ~1.4:1로 사라지는 contrast 문제. colors_and_type.css에 두 신규 토큰(accent-purple-fill / badge-danger-fill) 추가 — 라이트·다크 모두 saturated 유지해 흰 텍스트 ≥4.5:1 (WCAG AA) 보장. 9 사이트 갱신 (site.css 2 + Floaters.jsx 3 + Nav/Member/VersionWatcher 각 1 + admin.html 4). 기존 의미 토큰(--scouting-purple / --state-danger)은 텍스트 색 용도로 그대로 유지. 텍스트 없는 시각 요소(차트 바, 디자인 swatch)는 변경 안 함.
  - +01.071.00 — **PII Phase 7b — legacy NOT NULL drop (테이블 재빌드 + NULL tombstone)**: 마이그레이션 0036으로 inquiries / applications 두 테이블 canonical SQLite rebuild 패턴(CREATE new + INSERT FROM old + DROP + RENAME + 인덱스 13개 재생성)으로 재빌드. inquiries.name/email/subject/body + applications.name/email 6개 컬럼 NOT NULL 제약 해제. submitInquiry / submitApplication / piiBackfillCron 3지점의 '' tombstone → NULL 교체. 두 테이블 production row 0 + 외래키 의존성 0 사전 검증으로 무위험 적용(10.7ms). 라이브 검증 — 신규 inquiry POST → name/email/body 모두 NULL + _enc set 확인. **PII 보호 로드맵 6/7 phases 완료**, Phase 5(admin 2FA)는 운영자 지시로 보류.
  - +01.070.00 — **PII Phase 7a — piiRetentionCron 자동 hard-delete 5분기**: 매시 정각 cron에 piiRetentionCron 등록. 5개 retention 분기 — users.deleted_at > 30일 / applications detach > 365일 / inquiries > 180일 / emails(trashed_at > 30일 OR ts > 365일) / orphan application_files > 30일. 각 분기 50/batch + catch-fallback. R2 첨부 함께 정리. 사이트 런칭 이후 PII 무기한 누적 문제 자동 정리. PII 보호 로드맵의 실질적 완성 라운드. **보너스**: 정각 cron이 직후 실행되어 Phase 3 legacy inbound emails 3행이 자동 ciphertext 회전됨 — Phase 3 backfill 자동 검증 완료. Phase 7b(legacy NOT NULL drop)는 SQLite 테이블 재빌드 위험으로 별도 라운드 분리. 운영자 지시로 Phase 5(admin 2FA)는 영구 또는 추후 보류.
  - +01.069.00 — **PII Phase 6 — self-service export 확장 + delete 정리 범위 확대**: exportMyData()에 application_files 메타(다운로드 URL 포함) / login_history 최근 100 / notifications 최근 200 추가. deleteMyAccount()에 apply_drafts + notifications hard-delete + users.phone *_enc/*_h NULL 처리 추가. 두 self-service 액션이 admin_audit에 self_export / self_delete 분류로 기록. UI는 v01.029의 기존 Member.jsx 개인정보 섹션 그대로 유지. 다음은 Phase 7 (retention auto-purge cron + legacy NOT NULL drop). Phase 5(admin 2FA)는 운영자 지시로 보류.
  - +01.068.00 — **PII Phase 4 — R2 첨부 envelope encryption**: 마이그레이션 0035로 email_attachments / application_files에 r2_encrypted 마커 컬럼 추가. encryptR2Bytes / decryptR2Bytes 신규 헬퍼(AES-GCM + ':r2-file' 도메인 분리 sub-key, 12B IV + 16B tag). 3개 R2 put 사이트(inbound email / application upload / outbound email) + 3개 download 사이트(admin app-file / admin attachment / me app-file) 모두 envelope 적용. R2 access token 유출만으로는 첨부물(주민증/여권/성적증명서) 평문 접근 불가 — 운영자 PII_ENCRYPTION_KEY까지 모두 깨져야 평문 노출. 신규 read-audit 1지점 추가(application-file download). 실 PNG 업로드로 r2_encrypted=1 라이브 검증. 운영자 지시로 Phase 5(admin 2FA)는 보류, 다음은 Phase 6 (user self-service).
  - +01.067.00 — **PII Phase 3 — inbound + outbound emails subject/body 암호화**: 마이그레이션 0034로 양 테이블에 subject_enc / body_text_enc / body_html_enc 6 컬럼 추가. inbound email ingest와 outbound /api/admin/mail/send 모두 즉시 AES-GCM 암호화. 신규 헬퍼 decryptEmailRow()를 6 read path 일괄 적용 (inbox 목록·단일·export, sent 목록·단일, admin search inbound·outbound 분기). 주소(from/to)는 의도적 평문 유지 — grouping/routing/mode-filter 운영 query 보존. piiBackfillCron 확장으로 legacy 4 행 다음 정각에 자동 회전. inboundSanitizeCron에 body_html_enc 가드 추가. 신규 read-audit 2지점 (inbound + outbound 단일 GET). 운영자 지시로 Phase 5(admin 2FA)는 보류, 다음은 Phase 4 (R2 envelope).
  - +01.066.00 — **PII Phase 2 — applications 9 필드 + 이메일 HMAC × 2 + 5 read path 갱신**: 신규 마이그레이션 0033으로 applications에 11개 컬럼(name_enc / email_enc / email_h / essay_body_enc / essay_body_2_enc / essays_json_enc / recommender_name_enc / recommender_email_enc / recommender_email_h / recommender_letter_enc / recommenders_json_enc) + 2 인덱스 추가. submitApplication()이 9 필드 AES-GCM 암호화 + 2 이메일 HMAC. 신규 헬퍼 decryptApplicationRow()를 5 read path(listApplications / admin 단일 GET / receipt / exportMyData / admin search) 일괄 적용. piiBackfillCron 50/batch 확장. 라이브 검증 — POST → DB 직접 조회로 9 필드 모두 ciphertext + email_h/recommender_email_h HMAC 저장 + receipt 라운드트립으로 decrypt 정상. production applications 행 0개라 backfill 부담 없음. Phase 1 inquiries 회귀 없음.
  - +01.065.10 — **콘텐츠 라운드: Scout framing 제거 + Youth/평생 교육 이니셔티브 재구성 + Fall 2026 명시 + 시크릿 점검(CLEAN)**: 운영자 지시 — 메인 홈/About에 '스카우트' 안 나오게, 청소년 리더십·평생 교육 맥락으로, Fall 2026(2026년 8월 31일 개강) 명확하게, 코드 비밀번호 정리. 라이브 KV 31 필드 + content-store.js DEFAULT_CONTENT + Apply.jsx 폼 라벨 + admin.html 신청서 상세 + index.html meta/og 모두 youth/young-leader/lifelong-education framing으로 재작성. cta_banner를 'Fall 2026 applications open. Programs start August 31, 2026.' / '2026년 2학기 · 2026년 8월 31일 개강'으로. dead code copy.js 삭제. 시크릿 정찰 결과: 하드코딩된 키 0건(모두 env.* Workers secret). --scouting-purple CSS 변수와 scoutkorea@kakao.com ALWAYS_ADMIN_EMAIL은 내부 식별자로 의도 유지.
  - +01.065.00→.01→.02 — **PII Phase 1 (P0 baseline)**: 운영자 지시 "개인정보가 제일 중요"에 따라 7단계 PII 로드맵 시작. 공개 문의 폼 `/contact`의 4 PII 필드(name/email/subject/body) AES-GCM 암호화 + `email_h` 결정론적 HMAC 검색 인덱스 + IP 5/h + email 3/h rate-limit (PRETEND_OK 패턴) + `sameOriginOrEmpty()` CSRF fail-closed 전환 + `admin_audit`에 `action='read_pii'` 4지점 + `admin_search` 쿼리 digest(SHA-256 8B) 기록. `computePiiHmac()`을 domain 파라미터로 일반화. 마이그레이션 0032. **두 hotfix**: .01 = `rateLimit()` 반환 키 mismatch (`rl.ok` vs `rl.allowed`) 1줄 hotfix, .02 = legacy NOT NULL 제약으로 plaintext NULL 시 D1 silent fail → `''` tombstone 사용. Phase 7에서 NOT NULL drop 예정.
  - +01.063.00 — **프로그램 상세페이지 톤앤매너 정렬 + 오버플로우 일괄 수정**: `site.css`의 `pd-*` 블록을 디자인 토큰 단일 출처로 재정렬. v01.062 라운드에서 빠르게 도입한 하드코딩 hex(네이비 `#0f1f66/#1a237e/#26338f`, 골드 `#f5c645/#ffcc4d`, 그린 `#226137/#2f8a40`, 슬레이트 `#597286/#3b4a57/#8ea2b2/#1f63c3` 등)를 전부 `var(--midnight-purple)` / `var(--royal-purple)` / `var(--sunshine-yellow)` / `var(--forest-green)` / `var(--state-success)` / `var(--state-danger)` / `var(--fg-secondary/muted/primary)` / `var(--bg-elevated)` / `var(--border-subtle)`로 교체. `Why CUFS?` 다크 박스는 브랜드 그라디언트(midnight → royal)로 통합. 오버플로우는 `.pd-rich`(이미지/iframe/표 max-width + pre/table overflow-x), `.pd-modal`(max-height + scroll), `.pd-modal-head`(flex-wrap + min-width:0), `.pd-side .row .v`(overflow-wrap anywhere), `.pd-cost-value`(`clamp(34px, 6vw, 56px)`), `.pd-stat-card / .pd-course-card / .pd-why-cufs-card / .pd-different-card`(min-width: 0)로 일괄 보호. 헤딩/본문 텍스트에는 `overflow-wrap: anywhere` 적용해 긴 URL/외국어 단어가 카드 밖으로 튀지 않도록 함.

## 2. 스택 한눈에

```
호스팅       Cloudflare Workers (단일 worker.js, ~3700줄)
정적 자산    Workers Assets binding (빌드 X)
KV           CONTENT_KV (dp_content_v1 + wiki:kms / color / design)
D1           dreampath-db (24개 테이블)
R2           dreampath-attachments (메일 첨부 + 지원서 PDF)
이메일 수신   Cloudflare Email Routing → email() 핸들러
이메일 발신   Resend API
인증         자체 세션 + 6자리 활성화 코드
프론트엔드    React 18 UMD + Babel-in-browser, npm 의존성 0개
디자인       colors_and_type.css 단일 토큰 + site.css 컴포넌트
버전 알림    /api/version + VersionWatcher.jsx (60초 폴링 + focus 이벤트)
```

## 3. 이번 라운드(v01.028 ~ v01.057)에 마친 큰 변경

### 공개 프론트 영어 전용 고정 — v01.060.01
- **요청 배경**: 운영자 지시로 공개 사이트는 외국인 대상 영어 전용으로 제공하고, 관리자 페이지의 한국어 UI는 유지해야 했음.
- **공개 프론트 변경**: `ui_kits/website/App.jsx`의 초기 언어와 저장 언어를 `en`으로 고정. 기존 브라우저 `localStorage.dp_lang=ko`가 남아 있어도 공개 프론트는 영어만 렌더링.
- **네비게이션 변경**: `ui_kits/website/Nav.jsx`에서 공개 사이트 `KO/EN` 토글 제거. 관리자 `admin.html` 언어 토글은 미변경.
- **영향 범위**: 홈만이 아니라 공개 SPA 전체(`/about`, `/programs`, `/apply`, `/contact` 등)가 영어 분기만 사용. 한/영 데이터 스키마는 유지되어 추후 필요 시 복구 가능.

### Programs 카테고리 드롭다운 필터 동기화 — v01.060.02
- **문제**: 공개 네비게이션의 Programs 드롭다운에서 `MICRO-DEGREE`, `BACHELOR` 같은 카테고리를 눌러도 이미 `/programs` 화면에 있는 경우 필터가 즉시 반영되지 않았음.
- **원인**: `App.jsx`는 같은 뷰 안에서 `pushState`로 `?cat=`만 바꾸고, `Programs.jsx`는 초기 마운트와 `popstate`에서만 URL 쿼리를 다시 읽고 있었음. SPA 내부 라우트 변경 이벤트는 놓치고 있었음.
- **수정**: `ui_kits/website/Programs.jsx`가 `dp-route-change` 이벤트도 구독해서 `/programs?cat=...` 이동 시마다 `catFilter`를 동기화하도록 변경.
- **결과**: 공개 드롭다운 카테고리 버튼이 같은 페이지 내 이동에서도 즉시 작동. 뒤로가기/앞으로가기와 deep-link 쿼리 동작은 그대로 유지.

### 공개 프론트 보안/정합성 1차 보강 — v01.060.03
- **콘텐츠 저장 보호**: `worker.js`의 `/api/content` 저장 경로가 이제 `legal.ko.body` / `legal.en.body` HTML을 저장 전에 sanitize. 공개 `LegalModal`이 `dangerouslySetInnerHTML`로 렌더하는 필드라, 관리자 토큰 오남용이나 악성 HTML 입력이 곧바로 stored XSS로 이어지지 않도록 차단.
- **분석 동의 정책 강화**: `ui_kits/website/analytics-store.js`가 기본 허용(opt-out)에서 명시 동의(opt-in)로 변경. `dp_consent_analytics === '1'`일 때만 pageview/click/event를 수집.
- **공개 문서 언어 정리**: `ui_kits/website/index.html`의 정적 `<html lang>`를 `en`으로 수정. JS 부팅 전 초기 문서, 무JS 환경, SEO/스크린리더 메타데이터가 공개 영어 정책과 일치.
- **남은 장기 리스크**: 공개 프론트는 여전히 React UMD + Babel-in-browser 구조라 CSP가 `unsafe-inline` / `unsafe-eval`를 필요로 함. 이번 라운드는 직접 취약 경로를 줄이는 1차 보강이고, 장기적으로는 빌드 단계 도입 후 CSP를 조이는 구조 개선이 필요.

### 관리자 메인 페이지 편집 UI 영어 전용 정리 — v01.060.04
- **요청 배경**: 공개 메인 페이지는 이미 영어 전용으로 운영 중인데, 관리자 페이지의 메인 페이지 편집 영역에는 한국어 입력 필드가 계속 남아 있어 운영자가 혼동할 수 있었음.
- **Homepage 탭 정리**: `Hero`, `How it works`, `CTA banner`에서 KO 입력 필드를 제거하고 EN 편집 필드만 남김.
- **메인 teaser 정리**: `Programs` 탭의 `Programs section heading (home page teaser)`에서도 KO 필드를 제거하고 EN만 편집하도록 변경.
- **보조 도구 정리**: `Translations` 탭에서 메인 페이지 관련 `hero`, `how`, `programs_section`, `cta_banner` 섹션을 제외. 관리자 안에서 메인 페이지 KO 번역쌍이 다시 보이지 않게 함.

### Live Preview handshake 보강 — v01.060.05
- **문제 추정**: 관리자 `Live Preview`가 iframe의 단발 `dp-preview-ready` 신호에 너무 의존하고 있어, 초기 메시지가 한 번만 유실돼도 미리보기가 기본값/구버전 상태에 머물 수 있었음.
- **관리자 측 보강**: `EditorWithPreview`가 이제 iframe `load` 시점과 `dp-preview-ready` 수신 시점 모두에서 draft를 다시 전송하고, 짧은 간격으로 몇 차례 재시도하도록 변경.
- **프리뷰 페이지 보강**: `content-store.js`의 preview mode가 `ready` 신호를 즉시 1회, `DOMContentLoaded`, `load` 시점에도 추가로 보내도록 변경.
- **기대 효과**: 특정 탭만이 아니라 전체 preview 공통 경로에서 handshake 유실에 훨씬 강해짐. iframe이 살짝 늦게 뜨거나 초기 이벤트 타이밍이 어긋나도 preview가 다시 붙음.

### Back-to-top + 자체 FAQ 챗봇 + AI 디스클레이머 — v01.056 / v01.057
- **신규 파일**: `ui_kits/website/Floaters.jsx` — 우측 하단 두 가지 위젯.
- **BackToTop**: `window.scrollY > 400`에서만 노출, 챗봇 패널이 열려 있으면 자동 숨김(레이어 충돌 방지). smooth scroll-to-top.
- **ChatBot**: 외부 LLM/의존성 0. `c.faq[]` 30개 Q&A를 키워드 + 한국어 2-gram bigram으로 점수 매겨 매칭(질문 hit 3x, 답변 hit 1x). 상위 답변 + 관련 질문 2개 칩. 인사말은 첫 진입 시 1회. 추천 질문 5개(비용/자격/온라인/장학금/문의) 칩. sessionStorage `dp_chat_log` 최근 40개 보존. 한/영 동기화.
- **v01.057 보강 (사용자 요청)**:
  1. **출처 표시**: 모든 FAQ-backed 답변 하단에 `출처: FAQ · {카테고리}` 노출 (book 아이콘).
  2. **AI 부정확성 안내**: 점선 구분선 + 작은 회색 글씨 "이 답변은 AI가 자동 생성한 것으로 정확하지 않을 수 있어요. 자세한 내용은 홈페이지를 다시 한 번 확인해 주시고, 그래도 부정확하다고 느껴지시면 hello@koreadreampath.com으로 보내주시면 최대 48시간 이내에 답변드릴게요." 인사말/폴백에는 미표시(중복 방지).
  3. **폴백 → Send-a-message 폼 딥링크**: 답변 매칭 실패 시 `[문의 양식으로 메시지 보내기]` 버튼이 `go('contact', null, { tab: 'form' })` 호출 → `/contact?tab=form`. Contact.jsx가 URLSearchParams에서 `tab=form`을 읽고 초기 탭을 폼으로 세팅. mailto 보조 버튼 + 48h 안내 동반.
- **z-index 9000** (VersionWatcher 100000 아래, content 위). 모바일은 패널이 거의 전체 화면(`window.innerWidth < 520`).
- **App.jsx**: `{window.ChatBot && <window.ChatBot lang={lang} c={content} go={go} />}` 마운트.
- **index.html**: Floaters.jsx 스크립트 로드 (VersionWatcher 다음).
- **알려진 한계**: 매칭은 FAQ 항목에만. 운영자가 새 Q&A를 admin → FAQ 탭에 추가하면 자동 반영. LLM-답변 없음(의도적 — 비용/대기시간/정합성).

### Stale version.js 한꺼번에 보정 (v01.046 → v01.057)
- `window.DREAMPATH_VERSION`이 v01.047~055 commit들에서 누락된 채 v01.046에 멈춰 있었음. v01.056에서 한 번에 정합화 + 이후 v01.057.00 정상 bump.

---

## 3-과거. v01.028 ~ v01.046 변경 요약

### 암호화 phone 정확 매칭 검색 부활 (HMAC) — v01.046
- **문제**: v01.042의 AES-GCM 암호화는 row별 랜덤 IV라 같은 phone도 다른 ciphertext로 저장 → 동치 검색 불가. v01.042에서 `/api/admin/search`의 phone 검색 분기를 제거했었음.
- **해결**: 결정론적 HMAC 컬럼을 부가. 같은 phone → 같은 digest → SQL `=` 매칭 가능.
- **마이그레이션 0029**: `users.phone_national_h TEXT`, `inquiries.phone_h TEXT` + 인덱스 2종.
- **HMAC 키 관리**: `env.PII_ENCRYPTION_KEY + ':phone-hmac'`을 SHA-256 한 결과를 HMAC-SHA256 키로 import. 도메인 분리해 암호화 키와 같은 secret이라도 다른 키 공간.
- **쓰기**: signup + inquiry create에서 encrypt + HMAC을 같이 계산해 저장. 입력 정규화는 digits-only(공백/하이픈/괄호/`+` 제거)라 "+82-10-1234-5678"과 "010 1234 5678"가 같은 digest.
- **읽기 / 검색**: `/api/admin/search`가 q가 phone-like(digits ≥ 4)면 HMAC 계산 후 `phone_national_h = ?` 조건 추가. q가 평범한 텍스트면 종전대로 email/name/id LIKE.
- **백필 복구**: piiBackfillCron이 `_enc IS NOT NULL AND _h IS NULL` 패턴으로 decrypt → HMAC → 저장. 키 미설정 시 no-op.
- **트레이드오프**: HMAC은 동치 매칭만 가능 — phone 부분 일치 / LIKE는 여전히 불가. 그래도 운영자의 99% 사용 케이스(전체 번호로 회원 찾기)는 회복.

### PII 암호화 확장 — applications.birthdate (v01.045)
- **마이그레이션 0028**: `applications.birthdate_enc TEXT NULL`.
- **쓰기 (submitApplication)**: 키 설정 시 `encryptPii(birthdate)` → `birthdate_enc`, 평문 컬럼 NULL. 키 미설정 시 종전대로 평문.
- **읽기 (listApplications / 단일 GET)**: `birthdate_enc` 있으면 decrypt → response `birthdate` 필드로 매핑, 응답 본문에서 `birthdate_enc` 제거. legacy 평문 row는 그대로 fallback.
- **piiBackfillCron 확장**: `applications.birthdate IS NOT NULL AND birthdate_enc IS NULL` 패턴으로 100 row씩 점진 암호화 + 평문 NULL.

### 클라이언트 cookie-first 전환 — v01.044 (P2-1 phase 2)
- **동기**: v01.041에서 서버는 `dp_session` HttpOnly 쿠키를 발급하기 시작했지만 클라이언트가 여전히 `localStorage.dp_user_token`을 작성·전송해서 XSS 위험이 남아 있었음. 이 라운드는 클라이언트가 localStorage에 토큰을 쓰지 않게 해서 XSS-via-localStorage를 완전 차단.
- **auth-store.js 변경**:
  - 로그인/가입/`adoptSession`에서 `setToken(...)` 호출 제거. 서버가 설정한 쿠키만 사용.
  - `fetchMe()`: 우선 `credentials: 'same-origin'`로 쿠키 경로 시도. 401이면 legacy `localStorage.dp_user_token` 있는지 확인하고, 있으면 한 번 Bearer-bootstrap. 성공하면 사용자 인계, 실패하면 legacy 토큰 삭제.
  - 로그인/활성화 성공 시 legacy 토큰 자동 삭제(`clearLegacyToken`).
  - `authFetch`: 쿠키가 자동 첨부됨. legacy 토큰이 남아 있으면 후방 호환으로만 Authorization 헤더 추가.
- **컴포넌트 영향 (Apply.jsx, Pages.jsx, Legal.jsx)**: 모두 이미 `if (token)` truthy 가드라 새 사용자(`token === ''`)는 자동으로 Authorization 헤더 없이 fetch만 호출 → 쿠키가 인증. 별도 수정 불요.
- **XSS-via-localStorage 결과**: 신규 사용자 토큰이 localStorage에 존재하지 않음 → XSS payload가 토큰을 훔칠 경로가 사라짐. legacy 토큰을 가진 기존 사용자는 다음 로그인 또는 30일 세션 만료 시 자연스럽게 마이그레이션 완료.
- **충돌 방지**: 서버 측 dual-auth(v01.041)가 그대로라 legacy 토큰도 계속 동작. 마이그레이션 무중단.

### Backfill cron 추가 — v01.043 (P2-5 + P1-1 백필)
- **piiBackfillCron**: 매시 정각 cron에서 100 row 단위 처리. `users` 테이블에서 `phone_country IS NOT NULL AND phone_country_enc IS NULL` 패턴으로 legacy 평문 row를 찾아 암호화 + 평문 NULL. 같은 패턴으로 `phone_national`, `inquiries.phone` 처리. 키 미설정 시 즉시 return (no-op).
- **inboundSanitizeCron**: 매시 정각 cron에서 50 row 단위 처리. 마이그레이션 0027로 `inbound_emails.sanitized_at` 마커 추가. cron이 `sanitized_at IS NULL`인 row를 가져와 `sanitizeHtml()` 재적용 + 마커 stamp. 신규 inbound는 INSERT 시점에 이미 sanitized_at = ts. legacy row 모두 처리 후 cron은 영구 no-op (빠른 SELECT 0건).
- **충돌 방지**: 두 cron 모두 fire-and-forget(`ctx.waitUntil`), 본 흐름 무영향. 마이그레이션 0027은 추가 column + 추가 인덱스만. 키 미설정 시 PII cron 즉시 종료라 빈 동작.

### PII at-rest 암호화 (phone) — v01.042 (P2-5)
- **동기**: D1 백업 / KV 스냅샷 / 마이그레이션 export가 누설되어도 회원 전화번호가 평문으로 나가지 않게.
- **마이그레이션 0026**: `users` 테이블에 `phone_country_enc`, `phone_national_enc`, `inquiries`에 `phone_enc` 추가. 모두 NULLable, 기존 컬럼은 그대로(legacy fallback용).
- **암호화**: AES-GCM, 12-byte 랜덤 IV, 16-byte tag. 키는 `env.PII_ENCRYPTION_KEY`를 SHA-256으로 derive해서 256-bit AES 키 생성. 저장 형식: `base64(IV || ciphertext+tag)`.
- **동작 (쓰기)**:
  - 키 설정됨: `_enc` 컬럼에 암호화 저장, 평문 컬럼은 NULL.
  - 키 미설정: 평문 컬럼에 저장(legacy). `_enc` NULL.
- **동작 (읽기)**: `_enc`가 있으면 decrypt, 없으면 legacy 평문 컬럼 사용.
- **운영자 액션**: `wrangler secret put PII_ENCRYPTION_KEY` (64자 이상 강력 passphrase) 실행 후부터 신규 데이터 자동 암호화. 기존 평문 row는 별도 backfill로 점진 처리(후속 commit에서 cron 추가 권장).
- **search 영향**: `/api/admin/search`의 user 검색에서 `phone_national LIKE` 제거. 암호화된 컬럼은 LIKE-search 불가. 전화번호 부분일치 검색이 필요하면 차후 deterministic-hash 인덱스 별도 도입.
- **충돌 방지**: 기존 컬럼 그대로 보존 → legacy row 읽기/쓰기 영향 없음. 키 미설정 시 시스템 100% 평문 동작 (역호환). 새 컬럼 모두 NULL 허용.

### HttpOnly 세션 쿠키 (서버 측) — v01.041 (P2-1)
- **목적**: 세션 토큰이 `localStorage`에만 살면 XSS 한 번이면 탈취 가능. HttpOnly 쿠키로 옮기면 JS가 읽을 수 없어 XSS의 도달 범위가 축소됨.
- **이번 commit 범위 (서버 측만)**:
  - `bearerToken()`이 `Authorization: Bearer ...` 헤더 또는 `dp_session` 쿠키 둘 다 읽음. 헤더가 있으면 헤더 우선.
  - 로그인/활성화/skipActivation signup 성공 응답에 `Set-Cookie: dp_session=...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=...` 부착.
  - 로그아웃 시 `Set-Cookie: dp_session=; Max-Age=0`으로 즉시 만료.
- **클라이언트 변경 없음**: `fetch`는 기본 `credentials: 'same-origin'`이라 쿠키 자동 첨부. 기존 Authorization 헤더 흐름도 그대로.
- **후속**: 클라이언트가 `localStorage.dp_user_token` 의존을 완전 끊으면 그때 XSS-via-localStorage 봉쇄 완료. 작업 범위: `auth-store.js` + `Apply.jsx` / `Pages.jsx` / `Legal.jsx`의 `DreamPathAuth.token` 참조 제거 + 로그인 응답에서 body의 `token` 사용 안 함.
- **충돌 방지**: 헤더 인증 경로 100% 보존. 쿠키는 추가 채널일 뿐. 기존 사용자 세션 무영향.

### TipTap HTML sanitize + ADMIN_TOKEN 이중 토큰 — v01.040 (P1-1 + P2-4)
- **P1-1 sanitizeHtml(html)** — HTMLRewriter 기반 allowlist (Cloudflare-native streaming HTML parser):
  - 허용 태그 25종 (`p`, `br`, `h1-h6`, `strong/em/u/s/b/i`, `ul/ol/li`, `a`, `img`, `blockquote/code/pre`, `table/thead/tbody/tr/td/th`, `details/summary`, `div/span`).
  - 차단 태그(remove with content): `script/style/iframe/object/embed/form/input/button/select/option/textarea/link/meta/svg/math/base/frame/frameset/applet`. 그 외 비허용 태그는 inner-text만 보존.
  - URL 속성(href/src) 화이트리스트 검증 — `javascript:` / `vbscript:` / `data:`(image 제외) 자동 strip. 상대경로/anchor/mailto/tel/http(s)만 통과.
  - 적용 지점 4곳: ① inbound 이메일 (가장 적대적) ② outbound 이메일 (admin TipTap) ③ program_details 9개 리치 필드 ④ wiki PUT 페이지 본문.
  - fail-closed: 파서 예외 시 빈 문자열 반환.
- **P2-4 ADMIN_TOKEN_NEXT** — 운영자 무중단 토큰 회전 지원:
  - `isAdmin()`이 `ADMIN_TOKEN` + `ADMIN_TOKEN_NEXT` 둘 다 정상 인증으로 인정.
  - 회전 절차: ① `wrangler secret put ADMIN_TOKEN_NEXT` (새 강력 토큰) ② 클라이언트를 새 토큰으로 전환 후 검증 ③ `wrangler secret put ADMIN_TOKEN` (NEXT와 동일 값으로) ④ `wrangler secret delete ADMIN_TOKEN_NEXT`.
  - `/api/admin/integrations/status`가 NEXT 설정 시에만 응답에 노출 → 운영자가 회전 중인지 한눈에 파악.

### VersionWatcher 강화 + WikiTab 페이지네이션 + 버전 위키 재구조화 — v01.039
- **VersionWatcher 강화** (사용자 긴급 요청): 폴링 주기 60s → **20s**. `focus` 외에 `visibilitychange`(탭 가시성) + `online`(네트워크 복귀) 리스너 추가. 배너를 슬라이드 인 + 잔잔한 보라색 펄스 + 36px 화살표 아이콘 + "지금 새로고침" 버튼으로 강조. 사용자가 의식하지 못한 채 옛 화면 쓰는 가능성 차단.
- **WikiTab 사이드바 페이지네이션**: 20개 단위. `activeId` 변경 시 그 페이지로 자동 점프. 페이지 수 변경 시 인덱스 범위 자동 보정.
- **wiki:versions 14페이지 재구조화** (사용자 요청): 각 페이지가 ① 이 버전의 주요 목적 ② 주요 업데이트 내역 ③ 세부 업데이트 내역(비개발자용 기본 표시 + 개발자용 접힘) ④ KMS 위키 반영 4섹션으로 표준화. `<details open>`/`<details>` 활용. 사용자(특히 운영자)가 한 라운드의 의도·결과·기술 디테일·문서 영향을 한 페이지에서 모두 볼 수 있게.

### 관리자 전체 검색 + admin VersionWatcher + 다크모드 contrast 잔여 수정 — v01.038
- **`GET /api/admin/search?q=...`**: 회원/지원/문의/받은메일/보낸메일/위키/콘텐츠 7개 영역 병렬 LIKE 검색, 영역당 최대 10건. `q` 길이 100자 cap. 위키 4개 슬러그(kms/design/color/versions) + CONTENT_KEY 전체 JSON 트리 walk + 매칭 string 경로 추출. 빈 q는 빈 결과 반환(전체 dump 방지).
- **사이드바 GlobalSearch 컴포넌트**: 입력 후 300ms debounce → fetch → 부동 결과 패널 (영역별 그룹, 빈 영역 자동 숨김). ESC로 clear. 결과 항목은 read-only preview (deep-link은 다음 라운드).
- **admin VersionWatcher**: 공개 사이트에 이미 있던 v01.029 컴포넌트를 `admin.html`에 동일하게 마운트. 새 배포가 들어오면 운영자도 우측 상단 토스트로 "새 버전이 배포되었습니다 vA→vB [새로고침][나중에]" 자동 알림.
- **다크모드 contrast 잔여 수정**: 사용자 지적("아직도 명도대비 규칙이 적용 안된곳이 있는듯"). WikiTab 페이지 리스트 active 항목 + Stat 카드 기본 accent + Marketing journey trail type 라벨이 `--midnight-purple`(고정 dark) → `--brand-text`(다크 모드 자동 lavender) 토큰으로 교체. 다크 elevated 카드 위 dark purple 텍스트(contrast 1.5) → light lavender(contrast AA 통과).

### 감사 로그 · 로그인 활동 · R2 키 랜덤화 · 세션 revoke + 위키 버전탭 — v01.037 (방어 라운드 P1-5 + P1-6 + P2-2 + P2-3)
- **P1-5 admin_audit 테이블**: 신규 D1 테이블 + 인덱스 3종(ts/actor/action). 6개 파괴적 admin 액션에 `ctx.waitUntil(writeAdminAudit(...))` hook. 모든 로그는 fire-and-forget이라 logging 장애가 본 흐름 막지 않음.
  - 추적 액션: `user_delete`, `user_update`(role/email/password 변경 시), `email_trash`, `email_purge`, `email_empty_trash`, `application_delete`, `application_bulk_delete/status`, `inquiry_delete`, `inquiry_bulk_delete`.
  - 컬럼: ts, actor_user_id (NULL이면 ADMIN_TOKEN 사용), via_admin_token, action, target_type, target_id, detail (JSON), ip, user_agent.
- **P1-6 login_activity 테이블**: 신규 D1 테이블. 로그인 성공 시 ts/user_id/email/ip/user_agent 한 줄 기록. 실패는 `users.failed_login_attempts` 컬럼에서 이미 추적 — 중복 저장 X.
- **P2-2 R2 키 prefix 랜덤화**: `apps/{folder}/{kind}/Date.now()-{file}` → `apps/{folder}/{kind}/{randomHex(8)}-{file}`. 64-bit 엔트로피로 인접 키 enumeration 차단. 기존 파일은 영향 없음(DB에 저장된 r2_key로 read).
- **P2-3 세션 revoke 확장**: 비번 변경뿐 아니라 **role/email 변경 시에도** 해당 user_id 모든 sessions DELETE. 권한 강등/식별 변경 시 기존 로그인 세션 무효화.
- **위키 → "버전 기록" 탭 신설**: admin 사이드바 → 위키 → "버전 기록 / Version history". WikiTab 재사용. `wiki:versions` KV에 12개 페이지 사전 populate (v01.018~027 묶음 + v01.028~037 개별).
- **마이그레이션**: `0025_admin_audit_and_login_activity.sql`.

### SRI · CSRF · 위키 PUT 검증 — v01.036 (방어 라운드 P1-2 + P1-3 + P1-4)
- **P1-2 SRI 해시**:
  - `index.html` react.production / react-dom.production / lucide 누락 → SHA-384 추가.
  - `admin.html` lucide 누락 → 추가.
  - 기존 Babel-standalone + admin의 react.dev / react-dom.dev은 이미 적용돼 있던 상태.
  - SRI 해시는 `curl -sL URL | openssl dgst -sha384 -binary | openssl base64 -A`로 생성.
- **P1-3 CSRF Origin/Referer 검사**:
  - `/api/admin/*` non-GET 메서드에 적용. Origin/Referer 둘 다 없으면 통과(curl·server-to-server), 한쪽이라도 있고 미스매치면 `403 origin_blocked`.
  - 현 시점 Bearer 인증 모델에선 CSRF는 구조적으로 어렵지만(브라우저가 `Authorization` 헤더를 cross-origin에 자동 부착 안 함), P2-1 HttpOnly 쿠키 전환 시 자동으로 보호 인계받음. 비용 거의 0의 방어 심화.
- **P1-4 위키 PUT 검증**:
  - 본문 ≤ 512KB, JSON parse 가능, top-level object, `pages` 배열 ≤ 200개, 각 page는 `id` (1-64 char string) + `title` (≤200 char string) + `body` (optional string).
  - 검증 실패 시 400-413 응답으로 거부. KV에 corrupted blob 저장 차단.
- **P1-1 TipTap sanitize 미진행 사유**: 워커 환경에서 DOMPurify를 isomorphic 모드로 도입할지, 화이트리스트 자체 파서를 짤지 설계 결정 필요. 라이브러리 도입은 CLAUDE.md "No new build step" 원칙과 부딪힘. 다음 별도 라운드로.

### 헤더·에러·시크릿·업로드 강화 — v01.035 (방어 라운드 P0-4 + P0-5 + P0-6 + P0-7)
- **P0-4 보안 헤더**: `withSecurityHeaders(resp)` 래퍼로 모든 응답(API, SPA, admin, sitemap, robots, 정적 자산)에 7개 헤더 부착.
  - `Content-Security-Policy`: 외부 스크립트는 unpkg.com 만. Babel-in-browser 때문에 `'unsafe-inline' 'unsafe-eval'` 불가피, 대신 `connect-src 'self'`로 외부 exfil 차단, `frame-ancestors 'none'`로 clickjacking 차단, `object-src 'none'`로 Flash/Java applet 차단, `base-uri 'self'`로 base tag injection 차단, `form-action 'self'`로 form hijack 차단.
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` — HSTS preload 등록 가능.
  - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` 8개 센서 API 차단, `Cross-Origin-Opener-Policy: same-origin`.
- **P0-5 에러 응답 generic화**: `/api/*` 글로벌 catch handler가 `{error:'internal', message: err.message}` 반환 → `{error:'internal'}` 단일. 상세 메시지는 D1 `error_logs`에만 기록 (운영자 콘솔에서 확인 가능). R2 put 실패 응답도 `upload_failed` 단일 + 상세는 로그.
- **P0-6 시크릿 length 노출 제거**: `/api/admin/integrations/status`가 각 시크릿의 `length` 반환 → 제거. UI는 "✓ Configured" / "— Not set"만 표시. 운영자가 시크릿 작동 여부는 실제 통합 테스트로 확인.
- **P0-7 파일 업로드 rate-limit**: `/api/applications/upload`에 KV 기반 20회/시간/IP cap. 이전 코멘트는 "4 files/min/IP"였으나 실제 구현 없었음. 초과 시 429 `rate_limited`.
- 이상 P0 7개 항목 모두 완료. 다음 라운드는 P1 (TipTap sanitize, SRI 해시, CSRF, 감사 로그).

### Enumeration / timing 완전 차단 — v01.034 (방어 라운드 P0-2 + P0-3)
- **운영자 헌법 재확인**: 응답 status · body · wall-clock 어느 차원으로도 분기 추론 불가.
- **signup**:
  - 기존 `email_taken` 409 응답 → 가입된 이메일 enumeration 가능 → 제거.
  - 신규 동작: 이미 가입된(또는 활성 pending) 이메일에 대해 PRETEND_OK 응답 — 실제 가입 응답과 구조·길이·필드 모두 동일.
  - IP rate-limit: cf-connecting-ip 기준 5회/시간. 초과 시 silent PRETEND_OK.
  - PRETEND_OK 경로에서도 dummy `hashPassword(password, TIMING_DUMMY_SALT)` 실행 → real 경로의 PBKDF2 비용 동등.
  - 익명 첨부 업로드 path는 영향 없음.
- **request-password-reset**:
  - 모든 경로 → 200 ok:true.
  - per-IP 10회/시간 + per-email 3회/시간 KV 기반 rate-limit. 초과해도 silent ALWAYS_OK.
  - dev fallback (`d.token` 응답 노출) 제거. 토큰은 메일로만 전달.
- **confirm-password-reset**:
  - invalid_token / already_used / expired → 모두 401 `invalid_request` 단일 응답.
  - password_too_short만 별도 (포맷 검증, 상태 비의존).
- **ctx.waitUntil 백그라운드 sendEmail**:
  - signup, request-password-reset, resend-activation 모두 `sendEmail`을 `ctx.waitUntil`로 fire-and-forget.
  - 이전엔 sendEmail이 `await`되어 응답 시간에 600-1500ms 추가됨 → 존재/부재 timing oracle 형성. 백그라운드화로 차단.
- **타이밍 floor 상향 + jitter**:
  - 모든 인증 경로 floor 1500ms (이전 350ms). KV cold read + D1 INSERT의 1.0-1.5s 실측 변동을 floor 안에 묻기 위함.
  - `AUTH_JITTER_MS = 500` — `crypto.getRandomValues` 기반 0-500ms 균등 jitter를 floor 위에 더해 인접 호출의 fingerprint도 무력화.
- **rate-limit helper** (`rateLimit(env, key, max, windowSec)`):
  - CONTENT_KV 기반 fixed-window. `{count, startedAt}` JSON + `expirationTtl` 자동 만료.
  - 실패 시 fail-open (KV 일시 장애로 정상 사용자 잠그지 않음).
  - 영역 키: `rl:signup:{ip}`, `rl:pwreset_ip:{ip}`, `rl:pwreset_email:{email}`.
- **검증 (6-sample × 5 경로)**:
  - signup NEW 평균 1.95s / TAKEN 평균 2.01s — diff 60ms (jitter 내)
  - login NONEXISTENT 평균 1.91s
  - pwreset NONEXISTENT 평균 1.98s / EXISTING 평균 1.96s — diff 20ms
  - 모든 분기 1.7-2.2s window 내 — 통계적으로 구분 불가.
- **UX 비용**: 모든 인증 round-trip 약 2초. 회원가입·로그인·비번 재설정 응답 체감 가능. 일말의 누설 차단 위해 수용.

### 인증 4경로 timing + status 균질화 — v01.033 (방어 라운드 P0-1)
- **운영자 지시**: "모든 코드는 외부에서 시간차이 혹은 반환 코드로 그 내역을 추측할 수 있도록 하면 안됨"
- **변경 대상**: `/api/auth/login`, `/api/auth/activate`, `/api/auth/resend-activation`, login의 lockout 응답
- **이전 누설 지점**:
  - 로그인: `if (!u) return 401` 즉시 반환 → 이메일 존재 여부 timing oracle. `account_not_activated` 403 → 미활성 계정 식별. `too_many_attempts` 429 → 잠금 상태 식별. 즉 한 이메일에 대해 4가지 상태(존재안함 / 활성 / 미활성 / 잠금)를 응답 분석으로 모두 구분 가능.
  - 활성화: 코드 brute-force 무방어(6자리 = 100만). `not_found` 404, `no_pending_activation` 400, `activation_expired` 410, `invalid_code` 401 — 모두 상태 누설.
  - 활성화 코드 생성: `Math.random()` 사용 → 시드 예측 가능.
  - resend-activation: 429 + `retry_after_seconds` → 해당 이메일이 존재하고 최근 발송된 적 있음을 누설. dev fallback이 RESEND 키 미설정 시 응답 body에 코드 노출.
- **새 규칙**:
  - **login**: 모든 실패 경로 → `401 {error:'invalid_credentials'}` 단일 응답. `hashPassword`는 분기 무관 항상 실행 (no-row일 때 dummy salt + dummy hash). 최소 350ms wall-clock pad.
  - **activate**: 모든 실패 경로 → `401 {error:'invalid_request'}` 단일 응답. `safeEqual`은 분기 무관 항상 실행 (no-row/malformed일 때 dummy code). 최소 350ms wall-clock pad. 3회+ 실패 시 지수 백오프 잠금 (60·2^(n-3)s).
  - **resend-activation**: 모든 경로 → `200 {ok:true}`. rate-limit 발동도 silent. dev fallback path 제거 (코드는 메일로만 전달).
- **마이그레이션**: `0024_activation_throttle.sql` — `users.failed_activation_attempts` + `failed_activation_locked_until`.
- **활성화 코드 생성**: `crypto.getRandomValues(Uint32Array)` → 1M 모듈로. modulo bias < 0.0000232% 허용.
- **클라이언트**: `Auth.jsx` 로그인 에러 모든 분기 → 단일 메시지(원인 가능성 모두 안내 + 복구 방법 3가지 제시). `Auth.views.jsx` 활성화 페이지 동일 처리. retry_after_seconds 처리 제거.
- **검증 (live)**: login(nonexistent + malformed) / activate(nonexistent + malformed) / resend(nonexistent) 모두 동일 status + body + ~550ms timing 확인.
- **알려진 한계 / 후속**: signup의 `email_taken` 409, password reset의 timing 비대칭, signup의 dev `activation_code` 응답 노출은 P0-2 / P0-3에서 처리. CSRF · 보안 헤더 · localStorage 토큰 등은 P1/P2.

### 로그인 brute-force 방어 — v01.032 (이번 라운드 신규)
- **문제**: 비밀번호 잘못 입력해도 무제한 시도 가능 → 자동화 공격에 취약
- **해결**: `users` 테이블에 `failed_login_attempts` + `failed_login_locked_until` 두 컬럼 추가
- **동작 (worker.js `login()`)**:
  - 잠금 시각이 미래면 즉시 **429 + `retry_after_seconds`** 반환 (비번 검증 skip)
  - 비번 틀림: `attempts++`, 3회 이상부터 지수 백오프 — `60 * 2^(attempts-3)`초
    `1~2회: 잠금 없음 / 3회: 60s / 4회: 120s / 5회: 240s / 6회: 480s …`
  - 로그인 성공 시 카운터·잠금 시각 모두 리셋
- **UX (`Auth.jsx`)**: `too_many_attempts` 메시지 ko/en + 남은 대기시간 표시 (60s 이상이면 분, 미만이면 초)
- **마이그레이션**: `0023_login_throttle.sql`
- **알려진 한계**: 계정별 잠금 (IP 기반 아님). 다른 계정으로 시도 가능. 차후 Turnstile / IP rate-limit 검토 필요.

### Apply draft 서버 영속화 + 72h TTL — v01.031
- **문제**: v01.030까지 임시저장은 sessionStorage에만 → 다른 기기 / 브라우저 클리어 시 사라짐
- **해결**: 새 D1 테이블 `apply_drafts (user_id PK, form_json, step, updated_at, size_bytes)` + 워커 API 3종
  - `GET /api/me/apply-draft` — 로그인 회원의 서버 draft 조회 (72h 초과 시 자동 삭제 + `expired:true` 반환)
  - `PUT /api/me/apply-draft` — debounce 1.5s로 자동 저장 (256KB 캡)
  - `DELETE /api/me/apply-draft` — 사용자 명시적 삭제 + 제출 성공 시 자동 호출
- **클라이언트 동작 (Apply.jsx)**:
  - 로그인 시: 마운트 즉시 서버 draft fetch → 있으면 form/step 복원 + sessionStorage 동기화
  - 키 입력 1.5s 후 서버 PUT (debounced) — "저장 중…" / "만료: MM/DD HH:MM" 표시
  - 임시저장 버튼 = 즉시 PUT + ✓ 토스트
  - 제출 성공 → 클라/서버 draft 모두 정리
- **PCI 안전**: `card_exp` / `card_cvc`는 클라이언트에서 strip + 워커에서 backstop strip → 서버에 절대 안 남음
- **TTL 강제 (3중)**:
  1. GET 시 만료 체크 (race 방지)
  2. 매시 cron `applyDraftCron` — 72h 초과 row 일괄 DELETE
  3. UI 안내문: "임시저장본은 마지막 수정 후 72시간 동안만 보관됩니다."
- **마이그레이션**: `0022_apply_drafts.sql`

### essays_json 컬럼 — v01.031 (이번 라운드 신규)
- 마이그레이션 `0021_essays_json.sql`: `applications.essays_json TEXT` 추가
- worker.js APP_FIELDS에 essays_json 추가 → 제출 시 자동 저장
- 첫 2개 에세이는 레거시 컬럼(essay_title/body × 2)에도 계속 저장 (백워드 호환)
- **운영자가 admin에서 에세이 문항을 3개 이상으로 늘려도 데이터 손실 없음**



### My page · 커리어 프로필 — v01.029
- **한국어 레벨** 자유 입력 → 5단계 드롭다운
  `(5) Native Speaker / (4) Professional (TOPIK 5~6) / (3) Intermediate (TOPIK 3~4) / (2) Basic (TOPIK 1~2) / (1) Beginner (Test Needed)`
- **간단 자기소개** 무제한 → `maxLength=500` + 실시간 카운터 (한도 도달 시 빨간색)
- 코드: `Member.jsx` `MemberCareer` 함수

### VersionWatcher (사이트 전역) — v01.029
- 푸터 우측 하단 `v 01.030.00` 표시 (이미 있던 것)
- **신규**: 페이지 우측 상단에 새 버전 감지 시 토스트
  `새 버전이 배포되었습니다  v01.029.00 → v01.030.00  [새로고침] [나중에]`
- 60초 간격 폴링 + 탭 포커스 시 즉시 재확인
- 새로고침 버튼: `?v=<latest>` 쿼리 파라미터 부착 후 `location.replace`
- "나중에"는 sessionStorage에 dismissed 버전 저장 → 또 새 버전 뜨면 다시 표시
- 코드:
  - `worker.js` `/api/version` (ASSETS에서 `version.js` 읽고 정규식 파싱, no-store 헤더)
  - `ui_kits/website/VersionWatcher.jsx`
  - `App.jsx`에서 항상 마운트

### Apply 폼 5단계 전면 개편 — v01.029
- **Step 3 (학력 · 서류)**: 단일 transcript 업로드 → **3개 분리 슬롯**
  1. 졸업(예정)증명서 1부
  2. 아포스티유 / 학력인정확인서 / 영사확인 중 택1 1부
  3. 한글번역공증본 (KO/EN 외 서류)
- **Step 4 (에세이)**: `c.essay_questions` (KV) 동적 렌더
  - 각 본문 500–1500자 · `maxLength=1500` 입력 차단
  - 실시간 카운터 (부족 → 노란색, 도달 → 빨간색)
  - 자동 저장 (sessionStorage, 키 입력마다)
- **Step 5 (트랙 · 결제)**: 프로그램 선택 `status === 'open'`만 표시 · 카드 만료일/CVC 필드 분리 (MM/YY 자동 슬래시 + CVC 4자리)
- **모든 단계**: `[← 이전] [임시저장] [다음 →]` · 임시저장 시 ✓ 토스트
- **필수 항목 미입력 시에도 다음 단계 이동 가능** — 유효성 검사는 최종 제출 시에만 강제 (`validateForSubmit`)
- 코드: `ui_kits/website/Apply.jsx` (전면 재작성)

### 다크모드 활성화 버튼 — v01.029
- 다크모드에서 `--scouting-purple`이 light lavender(#D4B8FF)로 플립되어 `.btn-primary`(흰 텍스트) contrast가 1.4:1까지 떨어지던 문제 → "비활성화처럼 보임"
- `[data-theme="dark"]` 전용 오버라이드:
  - `.btn-primary` bg `#7C3AED` (with white = ~5.2:1) · hover `#9466F2`
  - `.btn-secondary` border `--border-strong` · hover purple tint
  - `.btn-ghost` color `--fg-link` · hover lavender tint
- 코드: `site.css` 215~250줄 부근

### 회원 측 지원서 첨부파일 편집 — v01.030 (이번 라운드 신규)
- My page → 내 지원·영수증 → 각 지원서 카드 하단에 **"제출 서류" 패널**
- 3개 학력 슬롯 (graduation / recognition / translation):
  - 미업로드 → `[업로드]` 버튼
  - 업로드됨 → 파일명 다운로드 링크 + `[교체]` `[삭제]`
  - **교체는 atomic-ish**: 새 파일 업로드 성공 후에만 기존 파일 삭제 (실패 시 양쪽 보존)
- 추천서 + 레거시 transcript 등 기타 파일도 별도 섹션에서 다운로드/삭제 가능
- 새 워커 엔드포인트:
  - `GET    /api/me/applications/:id/files` — 소유자만 목록 조회
  - `GET    /api/me/application-files/:fileId/download` — 소유자만 다운로드
  - `DELETE /api/me/application-files/:fileId` — 소유자만 삭제 (R2 best-effort + DB row 삭제)
- `POST /api/applications/upload` 보강:
  - 새 kind 화이트리스트: `transcript_graduation`, `transcript_recognition`, `transcript_translation` 추가 (`transcript`는 레거시 alias로 유지)
  - **소유권 가드 추가**: `application_id`가 기존 row를 가리킬 때 owner 또는 admin이 아니면 403
  - 익명 폼 작성 중 업로드(드래프트)는 영향 없음 (application_id가 빈 문자열)

### 관리자 에세이 문항 탭 — v01.030 (이번 라운드 신규)
- 콘텐츠 그룹에 **"지원 에세이 문항 / Apply essays"** 탭 추가 (FAQ 옆)
- 항목별 편집:
  - Prompt KO / EN (Area)
  - Placeholder KO / EN (Text)
  - Min characters / Max characters (numeric input)
  - 위/아래 이동 + 삭제
- `+ Add essay question` 으로 무한 추가 — 공개 Apply Step 4가 자동으로 슬롯을 늘림
- 빈 배열일 때는 폴백으로 기본 2문항이 자동 적용 (서비스 중단 방지)
- 코드: `admin.html` `EssaysTab` 함수 + `STATIC_TAB_COMP`/`buildTabs`/`I18N` 등록

### 사이드바 14→11 그룹 통합 — v01.028
- Marketing (analytics-only) → Overview에 통합
- Pages + Programs + Content → "콘텐츠"로 통합
- Setup 슬림화, "System" 그룹 신설 (templates / integrations / legal / translations / design_system / api_dir)
- Mail / InternalMsg / Members / StudentSupport는 그대로 (운영자 멘탈 모델 차이)

## 4. 운영자 측 완료된 액션

| 항목 | 상태 |
|---|---|
| Cloudflare Email Routing 활성화 (catch-all → dream-path Worker) | ✅ |
| Resend 도메인 검증 (SPF/DKIM/DMARC) | ✅ |
| `RESEND_API_KEY` 등록 | ✅ |
| `ADMIN_TOKEN` 등록 (개발용) | ✅ |
| R2 버킷 `dreampath-attachments` 생성 | ✅ |
| 마이그레이션 0001~0020 모두 적용 | ✅ |

## 5. 아직 처리되지 않은 운영 측 액션 (런칭 전 권장)

| 항목 | 우선순위 | 사유 |
|---|---|---|
| **`ADMIN_TOKEN` 회전** | 🔴 H | 현재 단순 토큰. 공개 런칭 전 64자 시크릿으로 교체 |
| **결제 게이트웨이 결정** | 🟡 M | 사용자 요청에 따라 보류 중. 결정 후 통합 |
| **장학 신청 워크플로우** | 🟡 M | 결제 결정 후 |
| **Receipt 양식 PDF 업로드** | 🟡 M | 운영자 양식 제공 → ReceiptTemplateTab 에서 좌표 매핑 |
| **사이트 검증 토큰** | 🟢 L | API · 통합 탭에서 입력만 |
| **백업 정책** | 🟡 M | D1 export → R2 자동화 권장 (cron 추가) |
| **wiki:kms 페이지 갱신** | 🟢 L | 이번 라운드(v01.028~030) 변경을 KMS 위키에 반영 (운영자 또는 다음 세션) |

## 6. 알려진 한계 / 의도적으로 안 한 것

- **PaymentGateway 미통합** — 사용자 요청으로 별도 언급까지 보류
- **OAuth 미구현** — Google/카카오 로그인 없음, ID/PW 만
- **R2 cleanup 없음** — 업로드된 파일이 application/email 삭제 시 cascade 안 됨 (수동 정리 필요)
  - 단, 회원이 My page에서 파일 삭제 시는 R2도 best-effort 삭제됨 (v01.030~)
- **추천서 자동 발송 없음** — 사용자가 명시적으로 거부
- **상담 예약 / 뉴스레터 / 2FA / Slack 웹훅** — 사용자 요청에 따라 모두 제외
- **Recommendations 엔진 stub** — `/api/me/recommendations` 는 고정 3개 반환
- **News 항목 별도 URL 없음** — `/news/:id` 라우트는 있으나 클릭 시 push 안 함 (개선 필요)
- **Application file ↔ Recommender 직접 링크 없음** — `recommender_idx` 로 추적
- ~~**essays_json 컬럼 없음**~~ → **v01.031에서 해결**. 마이그레이션 0021로 컬럼 추가, APP_FIELDS에 등록.

## 7. 데이터 현황 (오늘 기준)

| 테이블 | 행 수 (대략) |
|---|---|
| users | 5 |
| sessions | 8 |
| applications | 0 |
| inquiries | 0 |
| inbound_emails | 2 |
| outbound_emails | 1 |
| notifications | 1 |
| notification_campaigns | 0 |
| member_groups | 0 |
| analytics_events | 70+ |
| error_logs | 1 (해결 처리됨) |

## 8. 디자인 가이드 준수 현황

KMS 위키 "10. Tokens-first 예외" 페이지 기준:
- ✅ 인라인 hex: 의도적 5종만 (Receipt, tag_color, shade(), hex+alpha, currentColor)
  - **신규 예외 (v01.029)**: 다크모드 .btn-primary 오버라이드의 `#7C3AED`/`#9466F2` — 토큰 외 직접 hex. 사유: `--scouting-purple`(다크 lavender)과 `--midnight-purple`(고정 다크 보라) 모두 활성 버튼 fill로는 부적합. 별도 토큰 신설보다 위치 한정 인라인이 가독성 ↑.
  - **신규 예외 (v01.029)**: VersionWatcher 인라인 스타일 일부 — 컴포넌트가 단일 파일이고 즉시 사용 가능해야 하는 외부 chrome 성격
- ✅ 에러 메시지: 모두 role="alert" + state-danger-bg + state-danger 통일
- ✅ 폼: 공개 사이트는 1단, 관리자는 2/3단으로 화면 가득
- ✅ EmailField / PhoneField: 공개 폼 모두 사용
- ✅ 다크모드: 토큰 자동 플립, AAA 대비 + 활성 버튼 가독성 패치 (v01.029)

## 9. 다음 라운드 후보 (이번 라운드 결과 + 사용자 요청에서 도출)

P0 (단기):
1. **News URL push 수정** — `/news/:id` 직접 공유 가능하도록
2. **결제 게이트웨이** (사용자 결정 대기)
3. **모바일 반응형 실측**
4. **쿠키 동의 배너** (GDPR)

P1 (중기):
5. **추천 엔진 실구현** (현재 stub) — 커리어 프로필 가중치
6. **저장한 프로그램 (Favorites)**
7. **이벤트 캘린더 + 오픈데이 등록**
8. **Apply 제출 후 확인 이메일 발송** (현재 미발송)
9. **장학 워크플로우** (트랙별 자격 심사)
10. ~~essays_json 컬럼 마이그레이션~~ ✅ 완료 (v01.031)

P2 (운영):
11. **R2 cascade cleanup cron** — application/email 삭제 시 R2 정리
12. **자동 번역 초안 (KO ↔ EN)**
13. **백업 자동화 (D1 → R2 cron)**
14. **관리자 audit 로그**
15. **이메일 템플릿 디자인** (현재 plain text 위주)

P3 (글로벌):
16. **국가별 랜딩 페이지**
17. **다국어 확장 (JA/ES/FR/ID)**
18. **Alumni 디렉토리 / 멘토 매칭**

P4 (SEO):
19. **Schema.org Course 구조화 데이터**
20. **사이트 검색**
21. **RSS 피드**
22. **hreflang 태그**

P5 (컴플라이언스 / 보안):
23. **CAPTCHA / Turnstile** (Apply 폼)
24. **접근성 선언문 + WCAG 2.1 AA 자체 감사**
25. **포커스 visible 통일 검증**

## 10. 변경 이력 (KMS Change log에 옮길 초안)

다음 항목들을 운영자가 admin → 위키 → KMS → "99. Change log" 페이지에 추가하면 됨.

```
2026-05-09 · v01.031.00 · Apply draft 서버 영속화 (72h) + essays_json + PCI strip
  Why: 임시저장이 sessionStorage 전용이어서 디바이스 변경 / 브라우저 클리어 시
       작업이 사라지는 위험. 운영자가 에세이 3개 이상으로 늘려도 손실 없게.
  변경: 마이그레이션 0021 (essays_json), 0022 (apply_drafts).
       worker.js: /api/me/apply-draft GET/PUT/DELETE + applyDraftCron (매시).
       Apply.jsx: 마운트 시 서버 draft 우선, 키입력 1.5s debounce PUT,
       제출 성공/Start over 시 클·서버 동시 정리, 72h TTL 안내문 항상 표시.
  안정성: TTL 3중 강제 (GET 만료 체크 + cron + UI 안내).
       PCI: card_exp/card_cvc 클라+서버 양측 strip → DB 미저장.
       크기 캡: 256KB JSON.
  Caveat: 첫 2개 에세이는 레거시 컬럼에도 이중 저장 (백워드 호환).

2026-05-09 · v01.030.00 · 회원 첨부파일 편집 + 관리자 에세이 탭
  Why: 사용자가 지원 후에도 학력 서류를 교체/삭제할 수 있어야 함.
       에세이 문항을 운영자가 직접 추가/수정해야 함.
  변경: Member.jsx ApplicationFiles 패널, worker.js 회원용 file API 3종,
       admin.html EssaysTab + buildTabs 등록.
  안정성: /api/applications/upload에 owner/admin 가드, 새 kind 화이트리스트.
  디자인: 다크/라이트 토큰만 사용. 신규 hex 없음.

2026-05-09 · v01.029.00 · Apply 5단계 전면 개편 + VersionWatcher + 다크 버튼
  Why: My page 커리어 폼 정합성, Apply 서류 분리, 에세이 길이 제한,
       임시저장 UX, 새 버전 강제 새로고침, 다크모드 활성 버튼 가독성.
  변경: Apply.jsx 전면 재작성, Member.jsx Korean level 드롭다운 +
       자기소개 500자 캡, VersionWatcher.jsx + /api/version 신설,
       site.css 다크 버튼 오버라이드.

2026-05-09 · v01.028.00 · 사이드바 14→11 그룹 통합
  (admin.html buildTabs 주석 참조)
```

## 11. 참고 자료

- **CLAUDE.md** — 프로젝트 룰 (반드시 세션 시작 시 읽기)
- **이 파일 (HANDOFF.md)** — 현재 스냅샷 (이번 라운드 종료 후 갱신됨)
- **wiki:kms** — 코딩 룰 + 기능정의서 + Change log (관리자 → 위키 → KMS) — **수동 갱신 필요**
- **wiki:color** — 컬러 가이드 (관리자 → 위키 → 컬러)
- **wiki:design** — 디자인 가이드 (관리자 → 위키 → 디자인)
- **migrations/** — 0001~0020, 모두 적용됨

## 12. 다음 세션 권장 시작 절차

1. `cd ~/Desktop/VS_Code/DreamPath`
2. `git pull` (다른 디바이스에서 작업했을 가능성)
3. `git log --oneline -20` 으로 최근 변경 확인
4. **CLAUDE.md** 읽기
5. **이 HANDOFF.md** 읽기
6. 위키 KMS의 Change log 페이지 확인 (관리자 → 위키 → KMS → 99. Change log) — §10의 초안이 반영됐는지 체크
7. `wrangler tail` 또는 admin → 오류 로그에서 새 엔드포인트 (`/api/me/application-files/*`, `/api/version`) 정상 동작 확인
8. 사용자 요청 대기

---

*마지막 업데이트: 2026-05-09 · v01.031.00 배포 직후 작성*
*작성자: Claude (Opus 4.7) — 자동 모드 세션*
