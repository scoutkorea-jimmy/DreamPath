# 회원 신청(Apply) 플로우 — 현재 정의 (as-built)

> 전면 개편 전, **현재 코드 기준**으로 신청 방식을 정리한 스냅샷 문서.
> 작성일 2026-06-19 · 기준 코드: [Apply.jsx](./ui_kits/website/Apply.jsx),
> [worker.js](./worker.js), [migrations/](./migrations/)

---

## 1. 진입 & 구조

- **진입 경로:** `/apply` (SPA 라우트) → [Apply.jsx](./ui_kits/website/Apply.jsx)의 `Apply` 컴포넌트
- **형태:** 5단계 위저드 (step 0~4) + 완료 화면(step 5)
- 단계 이름 정의: [Apply.jsx:244-246](./ui_kits/website/Apply.jsx#L244-L246)

| Step | 화면(ko) | 컴포넌트 | 수집 항목 |
|------|---------|---------|----------|
| 0 | 개인정보 동의 | `ConsentStep` | `consent_personal`, `consent_third_party` (둘 다 필수) |
| 1 | 개인정보 · 추천코드 | `Step0` | `name*`, `email*`, `birthdate`, `admission_referrer_code`(선택) |
| 2 | 기본 정보 · 학력 · 서류 | `Step1` | `country*`, `prior_school*`, `prior_major`, `prior_gpa`, `transcript_note` + **서류 3종** |
| 3 | 에세이 · 추천인 | `Step2` | `essays[]` (관리자 편집, 기본 2문항) + `recommenders[]` (최소 3명) |
| 4 | 트랙 · 결제 | `Step3` | `program`, `track`, `partial_tier`, 카드 정보 |
| 5 | (완료 화면) | — | 신청 ID · 영수증 링크 · 확인 안내 |

단계 렌더 분기: [Apply.jsx:543-547](./ui_kits/website/Apply.jsx#L543-L547)

---

## 2. 핵심 동작 특징

### 2.1 단계 이동은 관대(permissive)
- `next()`/`back()`은 필수값이 비어 있어도 자유롭게 이동 ([Apply.jsx:262-264](./ui_kits/website/Apply.jsx#L262-L264))
- 실제 검증은 **최종 제출 시에만** `validateForSubmit()`로 수행 ([Apply.jsx:276-307](./ui_kits/website/Apply.jsx#L276-L307))
- 의도: 사용자가 순서와 무관하게 먼저 채우고 나중에 보완 가능

### 2.2 임시저장 (이중 저장)
- **sessionStorage** (`dp_apply_draft_v1`): 키 입력마다 자동 저장 ([Apply.jsx:176](./ui_kits/website/Apply.jsx#L176))
- **서버 드래프트** (`apply_drafts` 테이블, 로그인 시): 1.5초 디바운스 PUT, **72시간 TTL**, 크로스 디바이스 복원 ([Apply.jsx:226-236](./ui_kits/website/Apply.jsx#L226-L236))
  - API: `GET/PUT/DELETE /api/me/apply-draft`
  - 서버 복원본이 stale sessionStorage보다 우선 ([Apply.jsx:201-219](./ui_kits/website/Apply.jsx#L201-L219))
- ⚠️ **PCI:** `card_exp`/`card_cvc`는 서버 드래프트에 **절대 저장 안 함** ([Apply.jsx:99-108](./ui_kits/website/Apply.jsx#L99-L108))
- `임시저장` 버튼은 시각적 확인(토스트)용 ([Apply.jsx:309-318](./ui_kits/website/Apply.jsx#L309-L318))

### 2.3 서류 업로드 (3종 분리 슬롯)
정의: [Apply.jsx:696-716](./ui_kits/website/Apply.jsx#L696-L716) · 업로드 컴포넌트 `DocumentUpload`

| slotKey | kind | 서류 |
|---------|------|------|
| `transcript_graduation` | `transcript_graduation` | 졸업(예정)증명서 1부 |
| `transcript_recognition` | `transcript_recognition` | 아포스티유 · 학력인정확인서 · 영사확인 중 택1 |
| `transcript_translation` | `transcript_translation` | 한글번역공증본 (국문·영문 외 서류 한정) |

- 각 파일: **PDF · PNG · JPEG · WebP, 최대 10MB** ([Apply.jsx:28-30](./ui_kits/website/Apply.jsx#L28-L30))
- 업로드 흐름: `POST /api/applications/upload` (base64) → R2 봉투 암호화 저장 → `upload_token`(128bit) 반환 ([worker.js:1850-1939](./worker.js#L1850-L1939))
- 제출 시 행 ID가 아닌 **토큰으로 행을 입양(adopt)** — IDOR 핫픽스(2026-05-19) 이후 행 ID는 클라이언트에 보관하지 않음 ([worker.js:6273-6284](./worker.js#L6273-L6284))
- 레이트리밋: IP당 20회/시간 ([worker.js:1854](./worker.js#L1854))

### 2.4 에세이
- 관리자 편집 가능(`c.essay_questions`), 기본 2문항 ([Apply.jsx:9-20](./ui_kits/website/Apply.jsx#L9-L20))
- 각 문항: `title` + `body`, 본문 **500~1500자** (1500자 도달 시 입력 차단) ([Apply.jsx:759-813](./ui_kits/website/Apply.jsx#L759-L813))
- 문항 수 변경 시 `essays[]` 길이 자동 재동기화 ([Apply.jsx:163-171](./ui_kits/website/Apply.jsx#L163-L171))

### 2.5 추천인
정의: `RecommenderCard` [Apply.jsx:842-926](./ui_kits/website/Apply.jsx#L842-L926) · **최소 3명**

| 필드 | 필수 | 비고 |
|------|------|------|
| `name` | ✓ | 이름 |
| `email` | ✓ | 이메일 |
| `phone` | ✓ | 국제번호 형식 (`+`국가코드 필수) |
| `member_country` | ✓ | 소속 청년 교육 파트너 기관 (필드명은 레거시) |
| `training_level` | ✓ | 스카우트 훈련 수준 select (Wood Badge / ALT / LT / Adult Leader / Section Leader / Other) |
| `letter_file` | — | 추천서 PDF (선택) |

### 2.6 트랙 & 결제
정의: `Step3` [Apply.jsx:928-1061](./ui_kits/website/Apply.jsx#L928-L1061)

| 트랙 (`track`) | 처리비 | 비고 |
|------|------|------|
| `full` 전체 장학 | $10 | 지원자 심사(competitive) |
| `partial` 부분 장학 | $7 / $5 / $3 | `partial_tier` 70% / 50% / 30% |
| `general` 일반 등록 | 무료 | 처리비 없음 |

- 금액 계산: 클라 `trackPrice()` ([Apply.jsx:267-272](./ui_kits/website/Apply.jsx#L267-L272)) / 서버 `computeAmount()` ([worker.js:6409-6413](./worker.js#L6409-L6413))
- 프로그램 목록은 `status='open'`만 노출 ([Apply.jsx:250-258](./ui_kits/website/Apply.jsx#L250-L258))
- ⚠️ **결제는 프로토타입 — 실제 처리 안 함.** 카드 마지막 4자리(`card_last4`)만 저장 ([Apply.jsx:1054-1056](./ui_kits/website/Apply.jsx#L1054-L1056))

---

## 3. 제출(Submit)

클라이언트: [Apply.jsx:320-404](./ui_kits/website/Apply.jsx#L320-L404)

1. **로그인 필수** — 비로그인 시 회원가입 모달 강제 ([Apply.jsx:322-328](./ui_kits/website/Apply.jsx#L322-L328))
2. `validateForSubmit()` 통과 후 `POST /api/applications`
3. 페이로드 가공 ([Apply.jsx:350-367](./ui_kits/website/Apply.jsx#L350-L367)):
   - 에세이 처음 2개 → 레거시 컬럼(`essay_title/body`, `essay_title_2/body_2`)
   - 전체 → `essays_json`
   - 추천인 전체 → `recommenders_json`
   - 업로드 파일 → `file_tokens[]`
   - `card_exp`/`card_cvc`는 전송하되 **DB 저장 안 됨**
4. 성공 시: `appId`(`DP-xxx`), 영수증 URL(유료 트랙), 동의 기록(`recordConsent`), 드래프트 삭제(로컬+서버)

서버: `submitApplication()` [worker.js:6154-6305](./worker.js#L6154-L6305)

- 검증 `validateApplication()` ([worker.js:6367-6407](./worker.js#L6367-L6407)): name / email / country / prior_school / 에세이(각 본문 ≥50자) / 추천인 3명+ / track / card_last4
- ID 형식: `DP-{base36 timestamp}-{4랜덤}`
- status: `general` → `submitted`, 그 외 → `paid` (가짜 결제 즉시 완료)
- **PII 암호화** ([worker.js:6199-6224](./worker.js#L6199-L6224)): name, email, 에세이 본문, 추천인 정보, birthdate를 `*_enc` 컬럼에 저장하고 평문은 NULL 처리. 관리자 검색용 `email_h` / `recommender_email_h` HMAC 별도 저장
- 확인 이메일 `apply_received` 발송 (best-effort)
- 권한: 비로그인도 제출 허용. 로그인 시 역할별 `pages.apply.apply` 권한으로 차단 가능 ([worker.js:1830-1834](./worker.js#L1830-L1834))

---

## 4. 데이터 모델 (D1)

| 테이블 | 역할 | 마이그레이션 |
|--------|------|-------------|
| `applications` | 신청 본문 + 암호화 컬럼 + 결제/영수증/동의 메타 | 전체 컬럼 [0036](./migrations/0036_drop_legacy_not_null.sql#L74-L130) |
| `application_files` | 업로드 파일 메타 (R2 키, `upload_token`, `kind`, `recommender_idx`, `r2_encrypted`) | [0020](./migrations/0020_application_files.sql), [0030](./migrations/0030_application_files_upload_token.sql), [0035](./migrations/0035_r2_envelope_encryption.sql) |
| `apply_drafts` | 서버 임시저장 (72h TTL) | [0022](./migrations/0022_apply_drafts.sql) |

R2 바인딩 `ATTACHMENTS` — 첨부파일 봉투 암호화 후 저장.

서버 측 필드 화이트리스트: `APP_FIELDS` [worker.js:6134-6152](./worker.js#L6134-L6152)

---

## 5. 신청 후 회원 측

- **마이페이지** [Member.jsx](./ui_kits/website/Member.jsx): 본인 신청 목록 (`GET /api/me/applications` [worker.js:3428](./worker.js#L3428)), 파일 재업로드/삭제 (`/api/me/applications/:id/files` [worker.js:3499-](./worker.js#L3499))
- **영수증** [Receipt.jsx](./ui_kits/website/Receipt.jsx): `/receipt?id=...&token=...` (`/api/applications/:id/receipt` [worker.js:3573](./worker.js#L3573))
- **관리자**: 신청 목록/상세/일괄 처리 (`/api/applications`, `/api/applications/bulk`, `/api/admin/applications/:id/files`)

---

## 6. 개편 시 영향 범위 체크리스트

전면 수정 시 함께 손봐야 하는 지점:

- [ ] 단계 구조/검증 — [Apply.jsx](./ui_kits/website/Apply.jsx) `steps`, `validateForSubmit()`, 각 `StepN`
- [ ] 서버 검증/저장 — `validateApplication()`, `submitApplication()`, `APP_FIELDS` ([worker.js](./worker.js))
- [ ] 스키마 — 새 필드는 `migrations/`에 신규 SQL + `applications` 컬럼 추가
- [ ] PII 암호화 — 새 민감 필드는 `*_enc`/`encryptPii`/`decryptApplicationRow` 경로에 등록
- [ ] 임시저장 — 새 필드가 PCI 민감이면 `pushServerDraft` 제외 목록에 추가
- [ ] 업로드 종류 — 새 서류 kind는 `allowedKinds` ([worker.js:1863-1871](./worker.js#L1863-L1871))에 등록
- [ ] 트랙/금액 — 클라 `trackPrice` + 서버 `computeAmount` 동시 수정
- [ ] 관리자 UI — 신청 상세 화면 표시 필드
- [ ] 마이페이지/영수증 표시
- [ ] 위키 갱신 — `wiki:kms` 기능정의서 + Change log, `wiki:versions` (CLAUDE.md 하드룰 0)
