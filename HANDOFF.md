# HANDOFF · KoreaDreamPath

> **현 시점 (2026-05-09) 사이트 상태 스냅샷.**
> 다음 세션에서 작업을 이어받을 때 이 파일을 먼저 읽으세요.
> 위키와 중복되는 내용은 의도적입니다 — 한 곳에 모아둔 "현재"입니다.

---

## 1. 현재 버전 / 배포

- **버전**: `v01.032.00`
- **배포 방식**: `cd ~/Desktop/VS_Code/DreamPath && npx wrangler deploy` (자동 모드)
- **마이그레이션 상태**: 0001 ~ **0023** 모두 적용됨 (remote D1 검증 완료)
- **Cron**: `0 * * * *` (매시 정각, 활성화 만료 정리 + 리마인더 + Apply draft 72h purge)

### 버전 정책 (CLAUDE.md §1 재확인)
- `AA.bbb.cc` → AA(메이저, 운영자만) · bbb(마이너, 새 기능) · cc(패치, 버그 수정 / 카피)
- **이번 세션 누적**: v01.027.00 → **v01.032.00** (마이너 +5)
  - +01.028 — 사이드바 14→11 그룹 통합
  - +01.029 — 마이페이지 / 지원폼 대규모 개편 + VersionWatcher + 다크 버튼
  - +01.030 — 회원 측 첨부파일 편집 + 관리자 에세이 문항 탭 + 워커 안정성 강화
  - +01.031 — Apply draft 서버 영속화 (72h TTL) + essays_json 컬럼 + PCI 카드 필드 strip
  - +01.032 — 로그인 무차별 대입 방어 (실패 카운트 + 지수 백오프 잠금)

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

## 3. 이번 라운드(v01.028 ~ v01.032)에 마친 큰 변경

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
