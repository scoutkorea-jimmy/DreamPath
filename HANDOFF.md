# HANDOFF · KoreaDreamPath

> **현 시점 (2026-05-05) 사이트 상태 스냅샷.**
> 다음 세션에서 작업을 이어받을 때 이 파일을 먼저 읽으세요.
> 위키와 중복되는 내용은 의도적입니다 — 한 곳에 모아둔 "현재"입니다.

---

## 1. 현재 버전 / 배포

- **버전**: `v01.027.00`
- **마지막 배포 ID**: `03d6063e-2a5e-446e-af72-e1cf944f5ec1`
- **배포 방식**: `cd ~/Desktop/VS_Code/DreamPath && npx wrangler deploy` (자동 모드)
- **마이그레이션 상태**: 0001 ~ 0020 모두 적용됨
- **Cron**: `0 * * * *` (매시 정각, 활성화 만료 정리 + 리마인더 발송)

## 2. 스택 한눈에

```
호스팅       Cloudflare Workers (단일 worker.js, ~3500줄)
정적 자산    Workers Assets binding (빌드 X)
KV           CONTENT_KV (dp_content_v1 + wiki:kms / color / design)
D1           dreampath-db (24개 테이블)
R2           dreampath-attachments (메일 첨부 + 지원서 PDF)
이메일 수신   Cloudflare Email Routing → email() 핸들러
이메일 발신   Resend API
인증         자체 세션 + 6자리 활성화 코드
프론트엔드    React 18 UMD + Babel-in-browser, npm 의존성 0개
디자인       colors_and_type.css 단일 토큰 + site.css 컴포넌트
```

## 3. 오늘 마친 큰 변경 (v01.018 → v01.027)

### 메일함 (Mailbox) — v01.020 ~ v01.025
- Cloudflare Email Routing → 워커 → D1 인박스
- Resend 발송 + R2 첨부 (수신 ≤50MB / 발신 ≤40MB Resend cap)
- 사이드바: **계정별 sub-tab** (Hello / Partner / Info)
- 받은편지함 / 즐겨찾기 / 스팸 / 휴지통 / 보낸편지함 / 보낸 휴지통
- 행 체크박스 + select-all + 일괄 (즐겨찾기/스팸/읽음/안읽음/휴지통/영구삭제)
- CC / BCC 발송 + TipTap HTML 본문
- iframe 본문 다크모드 자동 스타일 주입
- 사이드바에 계정별 미읽음 빨간 배지

### 내부 알림 (InternalMsg) — v01.022 / v01.026
- 관리자 → 회원 알림 발송 (My Page에만 표시, 외부로 안 나감)
- **캠페인 단위 발송 기록** (notification_campaigns 테이블)
- 좌측 캠페인 목록 + 우측 상세 + 수신자별 읽음/미읽음 + 영구 삭제
- 일반 사이트 우상단 종 아이콘 → 알림 패널 (인라인 SVG, 다크모드 호환)
- 회원 그룹 (member_groups) — 그룹 만들기/이름 수정/삭제/멤버 추가/제외
- 알림 발송 시 "회원 개별 / 그룹" 토글, dedup 자동

### 회원가입 강화 — v01.023
- 비밀번호 정책: 10자 이상 + 대/소/숫자/특수문자 4가지 (실시간 체크리스트)
- 비밀번호 확인 필드
- 휴대폰 번호 + 국가번호 (PhoneField 47개 코드)
- **6자리 활성화 코드 + 72시간 유효** (메일 + URL 둘 다)
- 미인증 로그인 차단 (account_not_activated 403)
- hourly cron이 만료 계정 purge + 24h 무응답 사용자 1회 한정 리마인더
- `scoutkorea@kakao.com` 은 항상 활성화 (락아웃 방지)
- `/activate?email=...&code=...` SPA 라우트

### 관리자 idle 타임아웃 — v01.023 / v01.026
- 30분 무활동 자동 로그아웃 (1분 전 토스트 + 우상단 카운트다운)
- **마우스 무브는 카운트하지 않음** (mousedown/keydown/touchstart만)
- **+30분 연장** 버튼 (잔여 ≤10:00 일 때만 활성화)

### 다크모드 가독성 — v01.026.04
- `--scouting-purple` 다크모드 #B695E8 → **#D4B8FF** (≈9:1)
- `--brand-text` 다크모드 #C7A5FF → **#DCC2FF**
- 인라인 `var(--midnight-purple)` 텍스트 14곳 → `var(--brand-text)` 자동 플립
- 메일 본문 iframe 다크모드 CSS 주입

### 법률 문서 — v01.024
- LegalTab 서브 탭 (TOS / 회원가입 개인정보 / 지원 개인정보 / 제3자 / 분석)
- 버전 직접 입력 + **+0.1 마이너 / +1.0 메이저** 버튼 (효력일 자동 stamp)

### OG / 로고 업로드 — v01.024
- ImageUploadField 신규 컴포넌트 (PNG/SVG/JPG/WebP → data URL 또는 URL 입력)
- BrandTab 로고 + OgImagesTab 모든 이미지 + PartnersTab 로고

### 푸터 재구조 — v01.022 / v01.023
- 4컬럼: 소개 → 프로그램 → 문의 → 법률/약관
- KoreaDreamPath 워드마크 + tagline 하단 밴드로 이동
- 렌더 시점 정렬로 KV 옛 순서도 자동 정정
- "분석/추적 동의" 링크 target 오타 수정 (`analytics` → `analytics_cookies`)

### 홈 파트너 띠 — v01.027
- "How it works" 와 "Programs" 사이 quiet trust band
- 모든 파트너 표시 (CUFS / WOSM / APR / NSOs)
- 회색조 + hover 컬러
- `partner.logo` 있으면 이미지, 없으면 그라데이션 텍스트
- 관리자에서 로고 업로드 가능

### Apply PDF 업로드 — v01.027
- 학력증명서 + 추천서 (per-recommender) 모두 R2 직업로드
- ≤10MB / PDF / PNG / JPG / WebP
- 관리자 Applications 상세에 첨부 파일 섹션 + 다운로드 프록시

### 기타 — v01.025 / v01.026
- 회원 커리어 폼 깨진 디자인 (`apply-field` typo) 수정 → `.field` 사용
- Member 알림 상세 — header / body / footer 3영역 분리
- 종 아이콘 인라인 SVG 교체 (lucide 동적 마운트 미적용 이슈 회피)
- 5곳 에러 메시지에 `--state-danger-bg` 배경 추가 (디자인 가이드 준수)
- 대시보드 오류 카운트 `?resolved=0` 필터 추가 (해결된 항목 제외)
- KMS 신규 페이지 "10. Tokens-first 예외" — 의도적 hex 사용 5종 사유 정리

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
| **사이트 검증 토큰** (Google/Naver Search Console 등) | 🟢 L | API · 통합 탭에서 입력만 |
| **백업 정책** | 🟡 M | D1 export → R2 자동화 권장 (cron 추가) |

## 6. 알려진 한계 / 의도적으로 안 한 것

- **PaymentGateway 미통합** — 사용자 요청으로 별도 언급까지 보류
- **OAuth 미구현** — Google/카카오 로그인 없음, ID/PW 만
- **R2 cleanup 없음** — 업로드된 파일이 application/email 삭제 시 cascade 안 됨 (수동 정리 필요)
- **추천서 자동 발송 없음** — 사용자가 명시적으로 거부
- **상담 예약 / 뉴스레터 / 2FA / Slack 웹훅** — 사용자 요청에 따라 모두 제외
- **Recommendations 엔진 stub** — `/api/me/recommendations` 는 고정 3개 반환
- **News 항목 별도 URL 없음** — `/news` 단일 페이지에서 펼침
- **Application file ↔ Recommender 직접 링크 없음** — `recommender_idx` 로 추적

## 7. 데이터 현황 (오늘 기준)

| 테이블 | 행 수 |
|---|---|
| users | 5 |
| sessions | 8 |
| applications | 0 |
| inquiries | 0 |
| inbound_emails | 2 |
| outbound_emails | 1 |
| notifications | 1 |
| notification_campaigns | 0 (마이그레이션 0019 이후 발송 없음) |
| member_groups | 0 |
| analytics_events | 70 |
| error_logs | 1 (미해결 0, 해결 처리 후 대시보드에 표시 안 됨) |

## 8. 디자인 가이드 준수 현황

KMS 위키 "10. Tokens-first 예외" 페이지 기준:
- ✅ 인라인 hex: 의도적 5종만 (Receipt, tag_color, shade(), hex+alpha, currentColor)
- ✅ 에러 메시지: 모두 role="alert" + state-danger-bg + state-danger 통일
- ✅ 폼: 공개 사이트는 1단, 관리자는 2/3단으로 화면 가득
- ✅ EmailField / PhoneField: 공개 폼 모두 사용
- ✅ 다크모드: 토큰 자동 플립, AAA 대비

## 9. 다음 라운드 후보 (사용자 요청에서 도출)

P0 (단기):
1. 결제 게이트웨이 (사용자 결정 대기)
2. Receipt PDF 양식 업로드 (사용자 양식 제공 대기)

P1 (중기):
3. 추천 프로그램 엔진 (커리어 정보 가중치)
4. 저장한 프로그램 (Favorites)
5. 이벤트 캘린더 + 오픈데이 등록

P2 (운영):
6. 자동 번역 초안 (KO → EN)
7. 백업 자동화 (D1 → R2 cron)
8. 관리자 audit 로그 (현재는 회원 변경만)

P3 (글로벌):
9. 국가별 랜딩 페이지
10. 다국어 확장 (JA/ES/FR/ID)
11. Alumni 디렉토리 / 멘토 매칭

P4 (SEO):
12. Schema.org Course 구조화 데이터
13. 사이트 검색
14. RSS 피드

P5 (컴플라이언스):
15. 쿠키 동의 배너 (GDPR)
16. 접근성 선언문
17. CAPTCHA / Turnstile (Apply 폼)

## 10. 참고 자료

- **CLAUDE.md** — 프로젝트 룰 (반드시 세션 시작 시 읽기)
- **CLAUDE_TASKS.md** — 백로그 (있다면)
- **wiki:kms** — 코딩 룰 + 기능정의서 + Change log (관리자 → 위키 → KMS)
- **wiki:color** — 컬러 가이드 (관리자 → 위키 → 컬러)
- **wiki:design** — 디자인 가이드 (관리자 → 위키 → 디자인)
- **migrations/** — 0001~0020, 모두 적용됨
- **이 파일 (HANDOFF.md)** — 현재 스냅샷

## 11. 다음 세션 권장 시작 절차

1. `cd ~/Desktop/VS_Code/DreamPath`
2. `git pull` (다른 디바이스에서 작업했을 가능성)
3. `git log --oneline -20` 으로 최근 변경 확인
4. **CLAUDE.md** 읽기
5. **이 HANDOFF.md** 읽기
6. 위키 KMS의 Change log 페이지 확인 (관리자 → 위키 → KMS → 99. Change log)
7. 사용자 요청 대기

---

*마지막 업데이트: 2026-05-05 · v01.027.00 배포 직후 작성*
*작성자: Claude (Opus 4.7) — 자동 모드 세션*
