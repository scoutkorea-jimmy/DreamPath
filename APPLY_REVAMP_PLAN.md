# 신청 시스템 개편 — 구현 계획 (DreamPath×CUFS 파이프라인)

> 근거 설계서: **DreamPath×CUFS 신청 시스템 개편 설계서 v0.1** (byJimmy, 2026-06-19)
> as-built 스냅샷: [APPLY_FLOW.md](./APPLY_FLOW.md)
> 작성일 2026-06-19 · 본 문서는 **실행 계획**이며, 코드 변경은 단계별로 배포.

---

## 0. 설계서 ↔ 코드베이스 정합성 (먼저 확정할 것)

구현 전 반드시 짚고 갈 **설계서와 실제 코드의 차이**:

| # | 설계서 가정 | 실제 코드베이스 | 조치 |
|---|------------|----------------|------|
| C1 | `programs`는 D1 테이블, `ALTER TABLE programs ADD COLUMN tuition/currency` (§5·§6.2) | **`programs`는 KV** `dp_content_v1.programs[]` ([content-store.js:194](./ui_kits/website/content-store.js#L194)). D1에 programs 테이블 없음 | **결정:** `tuition`만 **KV 스키마 + admin `programs` 탭 필드**로 추가. **통화는 USD 단일 고정** → `currency` 필드/컬럼 불필요. D1 ALTER 폐기 |
| C2 | `audit_log`에 관리자 전이 기록 | 이미 존재 ([0025](./migrations/0025_admin_audit_and_login_activity.sql)) + worker에서 사용 중 | 그대로 재사용 |
| C3 | consent를 `{agreed, agreed_at, version}`로 기록 + `recordConsent` 확장 | `consents` 테이블 ([0009](./migrations/0009_gdpr_errors.sql)) + `recordConsent()` ([worker.js:5377](./worker.js#L5377)) 이미 application_id 컬럼 보유 | 기존 경로 재사용. `applications`의 `consent_*_at` 컬럼은 게이트 판정용 캐시로만 |
| C4 | 기존 단일 제출(`submitted`/`paid`) 행 존재 | 운영 DB에 레거시 행 있음 (테스트용) | **결정:** 기존 `applications` 행 **전부 삭제/초기화** (+ 연결된 `application_files`, `apply_drafts`, `consents`). 레거시 분기·legacy 분류 로직 **불필요** |

→ **C1·C4 운영자 확정 완료 (2026-06-19).** 설계서대로 진행하되 위 결정 반영.

---

## 1. 핵심 아키텍처 결정 (설계서 §0 고정)

1. **상태 = 서버 권위.** 클라 step은 UI 표시뿐. 게이트/전이는 worker가 `applications.status`로만 판정.
2. **전이 단방향 + 멱등.** 역행은 관리자 액션만, `audit_log` 기록. 같은 전이 재호출 = no-op + 200.
3. **선행 status 가드 + idempotency.** 불일치 = `409 Conflict`. 공통 헬퍼 `assertStatus(app, expected[])`.
4. **`candidate_no` = 불변 외부 식별자.** `submitted` 진입 시 1회 발급, 이후 불변.
5. **PII 암호화 경로 계승.** 신규 민감 필드는 `*_enc`/`encryptPii`/`decryptApplicationRow` 경로 등록.

### status 상태머신 (설계서 §1.1)

```
draft → submitted → screen_passed → cufs_no_submitted → cufs_admitted
                  ↘ screen_rejected (terminal)
   → docs_submitted → docs_verified → paid → enrolled (terminal)
   (any) → cancelled (terminal)
```

| status | 진입 주체 | 다음 전이 | 트리거 |
|--------|----------|----------|--------|
| `draft` | 학생 | submitted | 1차 제출 |
| `submitted` | 학생 | screen_passed / screen_rejected | 관리자 스크리닝 |
| `screen_rejected` | 관리자 | — (terminal) | |
| `screen_passed` | 관리자 | cufs_no_submitted | 학생 접수번호 입력 |
| `cufs_no_submitted` | 학생 | cufs_admitted | 관리자 합격증 검증 |
| `cufs_admitted` | 관리자 | docs_submitted | 학생 서류 3종 업로드 |
| `docs_submitted` | 학생 | docs_verified | 관리자 서류 검증 |
| `docs_verified` | 관리자 | paid | 학생 결제(데모) |
| `paid` | 학생 | enrolled | 관리자 등록 확정 |
| `enrolled` | 관리자/시스템 | — (terminal) | |
| `cancelled` | 학생/관리자 | — (terminal) | |

> 약관 동의는 status가 아니라 **플래그**. 결제 게이트 = `status == docs_verified` **AND** consent 3종 true.

---

## 2. 단계별 구현 계획 (배포 단위 = Phase)

각 Phase는 **독립 배포 가능**하도록 순서화. 매 배포마다 CLAUDE.md 하드룰(deploy → commit/push → 위키 갱신).

### Phase 0 — 스키마 & 공통 기반 *(배포해도 기존 동작 무변)*

목표: 파이프라인의 토대를 깔되, 기존 신청 플로우는 건드리지 않음.

- [ ] **마이그레이션 `0037_apply_pipeline.sql`** — `applications`에 컬럼 추가:
  `candidate_no`, `cufs_reg_no`, `cufs_admit_verified_at/by`, `docs_verified_at/by`,
  `screen_decided_at/by`, `screen_note`, `consent_cufs_refund_at`, `consent_kdp_refund_at`,
  `consent_pg_pii_at`, `consent_versions_json` + `CREATE UNIQUE INDEX idx_applications_candidate_no`.
  - **(C4) 레거시 행 초기화** — 같은 마이그레이션(또는 별도 1회 SQL)에서
    `DELETE FROM applications; DELETE FROM application_files; DELETE FROM apply_drafts;`
    + 신청 관련 `consents` 정리. R2 첨부도 일괄 정리(orphan 방지).
  - `track`/`partial_tier`는 **drop하지 않음** — 신규 코드에서 미사용 처리만 (Phase 7 후속 정리).
  - `wrangler d1 migrations apply dreampath-db --remote`
- [ ] **candidate_no 발급 헬퍼** (worker.js): `DP{YY}-{5자리}` 연도별 시퀀스. 동시성 안전 — 카운터 테이블(권장) 또는 D1 트랜잭션 내 `MAX(seq)+1`, 충돌 시 재시도. → 카운터 테이블도 0037에 포함.
- [ ] **공통 가드 헬퍼** `assertStatus(app, expected[])` → 불일치 시 `409`. 전이 핸들러 공통 적용.
- [ ] **status enum 상수** `APP_STATUSES` + 전이표 코드화(허용 전이 맵).
- [ ] **audit 헬퍼**: 관리자 전이 시 `audit_log`에 (주체·시각·전후 status) 기록 (기존 테이블 재사용).
- [ ] **업로드 `allowedKinds`에 `admission_certificate` 추가** ([worker.js:1863-1871](./worker.js#L1863-L1871)).
- [ ] **KV programs[]에 `tuition` 추가 — 단일 출처(single source of truth)** (C1):
  - 입력 위치: **admin `programs` 탭** ([admin.html](./ui_kits/website/admin.html)의 programs 편집 폼)에 프로그램별 `tuition` 필드 1개. 운영자가 여기서만 입력.
  - 저장: [content-store.js](./ui_kits/website/content-store.js) DEFAULT_CONTENT의 각 program 객체에 `tuition: 0` 기본값 추가 → KV `dp_content_v1.programs[]`에 저장.
  - **자동 연계(요구사항):** 결제 금액·신청 화면 어디서도 등록금을 별도 입력/하드코딩하지 않음. 학생이 선택한 `program.id`로 KV programs[]를 조회해 `tuition`을 **자동 표기**. admin 프로그램 페이지에서 값을 바꾸면 신청·결제·영수증에 즉시 반영.
  - **통화는 USD 단일 고정** — `currency` 필드 없음, 표기는 코드 상수 `'USD'`.

### Phase 1 — 1차 신청서 재정의 *(draft → submitted)*

목표: [Apply.jsx](./ui_kits/website/Apply.jsx)를 "1차 신청"만 담당하도록 축소.

- [ ] **Apply.jsx 단계 재구성** — 1차에서 **제거**: 서류 3종 업로드(→Phase 5), track/partial_tier/처리비 UI, 결제 단계 전체.
  - 남기는 것: 동의 2종(`ConsentStep`), 개인정보(name*/email*/birthdate/country*/**phone* 추가**), 자기소개서(essay 시스템 그대로), 추천인 3명(`RecommenderCard` 그대로).
  - `trackPrice()` / `Step3`(결제·트랙) 제거.
- [ ] **`validateApplicationStage1()`** (worker.js) — name/email/country/birthdate/phone/자소서(각 ≥50자, 문항규칙)/추천인 3명+/consent 2종. **서류·track·card 검증 제거.**
- [ ] **`POST /api/applications` 재정의** — status를 항상 `submitted`로 (기존 `general→submitted / 그외→paid` 분기 제거). `candidate_no` 발급. `apply_received` 확인 이메일. 드래프트 삭제.
- [ ] **`APP_FIELDS` 갱신** ([worker.js:6134](./worker.js#L6134)) — track/partial 제거, phone 추가.
- [ ] **프로그램 선택 시점 (설계 보완 필요)** — 구 플로우는 결제 단계(Step3)에서 프로그램을 골랐으나, 신 플로우는 결제가 맨 끝(Phase 6)이라 그 전에 선택돼야 함. **권장: 1차 신청서에서 프로그램 선택** (관리자가 프로그램 기준으로 스크리닝 가능, 등록금 자동 연계의 기준이 됨). `status='open'` 프로그램만 노출. → 운영자 확인 항목.
- [ ] **완료 화면** — 영수증 대신 `candidate_no` + "스크리닝 대기" 안내로 교체.

### Phase 2 — 관리자 스크리닝 + 파이프라인 보드 *(submitted → screen_passed/rejected)*

- [ ] **`POST /api/admin/applications/:id/screen` `{ decision, note }`** — `assertStatus(['submitted'])`, audit 기록, `screen_decided_at/by`/`screen_note` 저장.
- [ ] **관리자 `ApplicationsTab` → 칸반 보드** ([admin.html:7516](./ui_kits/website/admin.html#L7516)) — status 컬럼별(submitted / screen_passed / cufs_no_submitted / cufs_admitted / docs_submitted / docs_verified / paid / enrolled), 각 카드에 `candidate_no`. 검색은 `candidate_no` / `email_h`.
- [ ] **통과 시 CUFS 입시 안내 이메일** 발송(신규 템플릿).

### Phase 3 — CUFS 안내 + 접수번호 회수 *(screen_passed → cufs_no_submitted)*

- [ ] **마이페이지([Member.jsx](./ui_kits/website/Member.jsx)) CUFS 안내 화면** — 반드시 명시:
  - CUFS 진행 링크 `https://go.cufs.ac.kr/ent/ent/ent_step0.jsp?regEntType=new` (새 탭)
  - **결제 주체 경고**: ✅ 전형료=CUFS 사이트에서 결제(정상) / 🚫 등록금=CUFS 결제 금지, 합격 후 우리 홈페이지에서만.
- [ ] **`POST /api/me/applications/:id/cufs-reg-no` `{ cufs_reg_no }`** — `assertStatus(['screen_passed'])` → `cufs_no_submitted`. `cufs_reg_no`는 PII로 취급(암호화 경로 검토).

### Phase 4 — 합격증 업로드 + 검증 *(cufs_no_submitted → cufs_admitted)*

> 자동 조회 불가 — 학생이 CUFS 발표 후 직접 통보 (확정 제약).

- [ ] **학생 합격증 업로드** — `admission_certificate` kind. 기존 업로드+R2 봉투암호화+`upload_token` adopt 경로 재사용. `POST /api/me/applications/:id/admission`.
- [ ] **`POST /api/admin/applications/:id/verify-admission`** — `assertStatus(['cufs_no_submitted'])` → `cufs_admitted`, `cufs_admit_verified_at/by` 기록, audit.

### Phase 5 — 서류 3종 이동 + 검증 *(cufs_admitted → docs_submitted → docs_verified)*

- [ ] **서류 3종을 마이페이지의 `cufs_admitted` 단계로 이동** — 기존 `DocumentUpload` 3종(transcript_graduation / recognition / translation) 컴포넌트 그대로, 위치만 Apply→Member로.
- [ ] **`POST /api/me/applications/:id/documents`** — `assertStatus(['cufs_admitted'])` → `docs_submitted`.
- [ ] **`POST /api/admin/applications/:id/verify-documents`** — `assertStatus(['docs_submitted'])` → `docs_verified`, `docs_verified_at/by`, audit. **검증 통과해야 결제 오픈** (§0 규칙 3).
- [ ] **단계별 kind 허용 가드** — transcript 3종 업로드는 status가 `cufs_admitted`일 때만, admission은 `cufs_no_submitted`일 때만.

### Phase 6 — 결제 단계 분리 + PG 추상화 *(docs_verified → paid)*

- [ ] **결제 약관 3종 게이트** — `consent_cufs_refund` / `consent_kdp_refund` / `consent_pg_pii` 모두 체크해야 결제 버튼 활성. 기록은 `recordConsent` 확장 + `consent_*_at`. **docs_verified 이후·paid 이전에만** 기록 허용.
- [ ] **PG 추상화 인터페이스**:
  ```js
  // PaymentProvider.createCharge({ amount, currency, card, candidate_no, application_id })
  //   -> { ok, provider_txn_id, raw }
  // DemoPaymentProvider: 입력 검증만 + 즉시 ok:true + fake provider_txn_id. 실청구/외부호출 없음.
  // 실 PG는 동일 인터페이스 뒤 무수정 스왑. split 정산은 인터페이스 밖(주석 자리만).
  ```
- [ ] **`POST /api/me/applications/:id/pay`** — 가드: `status==docs_verified` + consent 3종 true 아니면 `409`. 성공 → `paid` + 영수증 + 결제 확인 이메일. `card_last4`만 저장.
- [ ] **`computeAmount()` 축소 — 등록금 자동 연계** — 트랙 로직 전부 제거. 서버는 신청 행의 `program` id로 **KV programs[]의 `tuition`을 조회해 금액 결정**(클라가 보낸 금액 불신, §0 규칙 1). 클라 `trackPrice()` 제거하고 결제 화면은 선택 프로그램의 `tuition`을 그대로 표시. **통화 USD 고정** (`currency='USD'` 상수, createCharge에 전달).
  - 정합성 가드: 결제 시점 `tuition`이 미설정(0/null)인 프로그램이면 결제 차단(409 또는 명시적 오류) — 운영자가 admin에서 등록금을 넣어야 결제 가능.
- [ ] **영수증** ([Receipt.jsx](./ui_kits/website/Receipt.jsx)) — `candidate_no` 표기 추가. 기존 `/receipt?id=&token=` 재사용.

### Phase 7 — 등록 확정 + 마무리

- [ ] **`POST /api/admin/applications/:id/enroll`** — `assertStatus(['paid'])` → `enrolled` (terminal), audit.
- [ ] **레거시 데이터 정리(후속 SQL)** — `track`/`partial_tier` 컬럼 drop은 레거시 행 영향 검토 후 별도 마이그레이션.
- [ ] **위키 갱신** — `wiki:kms` 기능정의서 전면 개정 + Change log, `wiki:versions` 새 버전 페이지 (CLAUDE.md 하드룰 0).

---

## 3. API 엔드포인트 요약 (설계서 §7.2)

| 메서드·경로 | 주체 | 선행 status | 결과 status | Phase |
|------------|------|------------|------------|-------|
| `POST /api/applications` (재정의) | 학생 | draft | submitted | 1 |
| `POST /api/admin/applications/:id/screen` | 관리자 | submitted | screen_passed/rejected | 2 |
| `POST /api/me/applications/:id/cufs-reg-no` | 학생 | screen_passed | cufs_no_submitted | 3 |
| `POST /api/me/applications/:id/admission` | 학생 | cufs_no_submitted | (검증 대기) | 4 |
| `POST /api/admin/applications/:id/verify-admission` | 관리자 | cufs_no_submitted | cufs_admitted | 4 |
| `POST /api/me/applications/:id/documents` | 학생 | cufs_admitted | docs_submitted | 5 |
| `POST /api/admin/applications/:id/verify-documents` | 관리자 | docs_submitted | docs_verified | 5 |
| `POST /api/me/applications/:id/pay` (데모) | 학생 | docs_verified | paid | 6 |
| `POST /api/admin/applications/:id/enroll` | 관리자 | paid | enrolled | 7 |
| `GET /api/applications/:id/receipt` | 학생 | paid+ | — | 6 |

공통: 모든 전이 핸들러 앞단에 `assertStatus()`. 모든 관리자 전이는 `audit_log` 기록.

---

## 4. 동의(consent) 모델 (설계서 §4)

| 단계 | 키 | 제3자 | 기록 시점 |
|------|----|------|----------|
| 1차 | `consent_personal` | — | submitted |
| 1차 | `consent_third_party` | CUFS | submitted |
| 2차 | `consent_cufs_refund` | — | docs_verified→paid 사이 |
| 2차 | `consent_kdp_refund` | — | docs_verified→paid 사이 |
| 2차 | `consent_pg_pii` | PG사 | docs_verified→paid 사이 |

`recordConsent` 재사용 + `applications.consent_*_at` 게이트 캐시 + `consent_versions_json` 버전 추적.

---

## 5. 유지·계승 (건드리지 않음)

essay 시스템 / `RecommenderCard` / R2 봉투암호화 업로드 + `upload_token` adopt / PII `*_enc` 경로 / `Receipt.jsx` / `consents` 테이블 / `audit_log` / 회원가입·로그인(1차 진입 전 로그인 필수 정책 유지).

---

## 6. 미해결 / 착수 전 확정 필요

설계서 §10에서 도출 (C1·C4는 확정 완료):

- ✅ **(C1) 등록금/통화** — `tuition`은 KV programs[] + admin 탭 입력, **통화 USD 단일 고정** (2026-06-19 확정).
- ✅ **(C4) 레거시 행** — 기존 applications/files/drafts **전부 삭제·초기화** (2026-06-19 확정).
- ⏳ **VAT/영세율, 세금계산서** — 본 개편 범위 밖. PG 정산 구조 확정 후 별도 (§10-2).
- ⏳ **실 PG 연동** — split 정산 webhook/콜백 스펙 (§10-3). 데모 인터페이스 뒤로 무수정 스왑 전제.
- ⏳ **CUFS 전형료 흐름** — CUFS 사이트 자체 결제(우리 시스템 비관여). 안내 문구로만 (§10-4).

---

## 7. 데이터 마이그레이션 메모

- `0037` = 컬럼 추가 + **(C4) 레거시 행 전부 삭제/초기화**. 삭제 대상: `applications`, `application_files`, `apply_drafts`, 신청 관련 `consents`, R2 orphan 첨부. → 신·구 status 의미 충돌 없음, legacy 분기 불필요.
- `candidate_no`는 초기화 후 신규 발급분만. 연도별 시퀀스 카운터도 0 리셋.
- `track`/`partial_tier` drop은 **Phase 7 이후 별도 SQL** (행이 비므로 영향 적음, 컬럼만 정리).
- 신규 민감 컬럼(`cufs_reg_no` 등) PII 여부 판단 → 암호화 경로 등록 시 `decryptApplicationRow` 동시 갱신.

---

## 8. 권장 착수 순서

1. **C1·C4 운영자 확정** (위 §6-1, §6-2).
2. **Phase 0** 배포 (스키마/기반, 무중단).
3. **Phase 1** 배포 — 이 시점부터 신규 신청은 새 1차 플로우. (레거시 행은 §7 정책대로)
4. Phase 2~7 순차 배포. 각 Phase는 앞 Phase status를 소비하므로 **순서 의존**.
