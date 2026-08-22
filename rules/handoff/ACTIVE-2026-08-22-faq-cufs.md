# HANDOFF · FAQ 에서 CUFS 의존 내용 제거

- **시작**: 2026-08-22 (KST)
- **지시 원문**: "FAQ는 해당 내용들을 모두 삭제해줘 일단. CUFS와 좀 이야기가
  잘못되어서 빼야하긴하거든"
- **상태**: FAQ 삭제 완료 · **CUFS 전면 검토 계획 승인 대기**
- **민감도**: 높음 — 파트너십 관련 공개 주장. 지우는 쪽이 안전한 방향.

## 배경
CUFS 와의 협의에 문제가 생겨 관련 내용을 빼야 한다. FAQ 28개 중 **13개가 CUFS
직접 언급**이고, 학위·수료증·등록금·환불·일정이 전부 CUFS 규정에 기대어 서술돼
있다. v01.096.00 에서 FAQ 를 **구조화 데이터(JSON-LD FAQPage)로 내보내기 시작**
했으므로, 이제 이 문장들은 답변 엔진이 인용할 수 있는 형태다 → 제거가 더 급하다.

## 원본 보존
삭제 전 KV 콘텐츠 전체 백업: 이 라운드 커밋 이전 상태는 git 이력과
`wiki:versions` 에 남는다. 삭제된 FAQ 원문은 아래 "삭제 기록" 에 보존한다.

## 진행
- [x] 지적했던 2건(학점당 가격 · 가을학기 일정) 삭제
- [x] 범위 질의 → 운영자 결정: **FAQ 는 CUFS·돈·학위 17건 제거**, FAQ 밖은 **계획 먼저**
- [x] FAQ 28 → 9건 (삭제 19건, 원문 보존)
- [x] SEO 계층에 내가 하드코딩했던 CUFS 단정 문구 4곳 중립화 (v01.096.01)
- [ ] **← 지금 여기**: CUFS 전면 검토 계획 제출 → 시나리오 선택 대기

## 삭제 기록 (복구 가능)
- 총 **19건** 삭제 (28 → 9). 원문 전체는 이 커밋 직전의 KV 스냅샷과 git 이력에 있다.
- 1차(2건): `How much does the program cost?` · `When does the program begin?`
- 2차(17건): What is Dream Path? / What is CUFS? / What is a Micro-Degree? /
  Is this a full university degree? / What courses are available? / Is the program fully online? /
  How do payments work? / Are installment payments available? / Is there a refund policy? /
  Are there hidden fees? / What learning platform is used? / What happens if I fail a course? /
  How long does it take to complete a Micro-Degree? / What certificate will I receive? /
  Can credits transfer to a future degree? / Who operates Dream Path? / Are local partners involved?
- **남은 9건**: 강의 언어 · 장학 2 · 성인 학습자 · 한국어 요구 · 학습 시간 · 취업 · TOPIK · 커뮤니티

---

# CUFS 전면 검토 계획 (2026-08-22 · 운영자 요청)

> 운영자 결정: **FAQ 는 17건 제거(완료), FAQ 밖은 계획을 먼저 받는다.**
> 아래는 "CUFS 를 빼려면 무엇을 건드려야 하는가" 의 전수 지도다. **이 문서만으로는
> 아무것도 바뀌지 않는다** — 시나리오를 고르면 그때 실행한다.

## 0. 이미 처리된 것 (승인 불필요했던 부분)

| 대상 | 처리 | 이유 |
|---|---|---|
| FAQ 28 → 9건 | 삭제 완료 | 운영자 지시 |
| SEO 계층의 CUFS 단정 문구 4곳 | 중립화 완료 | **운영자 콘텐츠가 아니라 내가 v01.096 에서 하드코딩한 문장**이었다. 답변 엔진에 제휴를 사실로 학습시키는 자리라 협의 확정 전까지 두면 안 된다 |
| 신청 접수 | 이미 전면 차단 중 (v01.095) | CUFS 입시로 넘어가는 경로가 이미 막혀 있다 — 지금 당장 학생이 CUFS 로 유입될 위험은 없다 |

## 1. CUFS 가 박혀 있는 곳 — 전수

### A. 공개 문구 (KV 콘텐츠 · 관리자에서 수정 가능 · 배포 불필요)
| 위치 | 내용 | 성격 |
|---|---|---|
| `programs[].kicker` ×5 | `MICRO-DEGREE · CUFS` | **프로그램 정체성** |
| `programs_section.title/sub` | "Five CUFS micro-degrees. All online." | 홈·프로그램 목록 제목 |
| `about.*` 2곳 | "We operate independently from CUFS…" | 오히려 **거리를 두는 문장** — 유지가 유리할 수 있음 |
| `page_heros` 2곳 · `how` 1곳 · `partners` 2곳 · `news` 2곳 · `project_team` 1곳 | 소개·연혁 서술 | 서술형 |
| `legal.third_party` 1곳 | **제3자 제공 동의서에 CUFS 를 수령 기관으로 명시** | ⚠️ **법적 문서** |
| `email_templates` 6곳 | 단계별 안내 메일 본문 | 발송 시점에만 노출 |

### B. 코드 (배포 필요)
| 파일 | 곳 | 무엇 |
|---|---|---|
| `Member.jsx` | 14 | **신청 파이프라인 그 자체** — "CUFS 입시 진행하기" 외부 링크, 접수번호 입력, 합격증 업로드, 전형료/등록금 결제 주체 경고 |
| `ProgramDetail.jsx` | 10 | `Why CUFS?` 섹션, "CUFS Micro-Degree" 히어로 배지, CUFS 소개 영상 |
| `Apply.jsx` | 6 | 제3자 제공 동의 문구(= CUFS 에 정보 제공), 완료 화면 안내 |
| `Home.jsx` | 1 | 소개 문구 |

### C. 데이터 구조 (마이그레이션 필요 · 되돌리기 어려움)
`applications` 테이블: `cufs_reg_no` · `cufs_reg_no_enc` · `cufs_admit_verified_at` ·
`cufs_admit_verified_by` · `consent_cufs_refund_at`, 그리고 **상태값**
`cufs_no_submitted` · `cufs_admitted`.
→ 컬럼/상태 이름은 내부용이라 **급하지 않다**. 이름만 바꾸는 마이그레이션은
비용 대비 이득이 없다(현재 신청 0건이므로 나중에 한 번에 정리 가능).

## 2. 핵심 판단 — "CUFS 를 빼면 무엇이 남는가"

지금 이 사이트가 파는 것은 **"CUFS 가 발급하는 1년짜리 마이크로디그리 5종"**이다.
CUFS 를 지우면 남는 것은 프로그램 **이름 5개와 커리큘럼 설명**뿐이고, 학위·수료증·
학점의 근거가 사라진다. 즉 이건 문구 교체가 아니라 **상품 정의의 문제**다.
그래서 아래 세 갈래 중 어디로 가는지가 먼저 정해져야 한다.

## 3. 시나리오별 실행안

### S1. 협의 진행 중 — 노출만 낮춘다 (가장 가벼움 · 되돌리기 쉬움)
- 공개 문구에서 **약속**만 제거: 수료증 발급 주체·학점·환불 규정·전형료 안내.
- 기관명 자체는 "협력 대학" 같은 중립 표현으로 대체(고유명사만 뺌).
- `Why CUFS?` 섹션 숨김, 프로그램 kicker 를 `MICRO-DEGREE` 로.
- 법적 문서(`legal.third_party`)는 **손대지 않는다** — 과거 동의의 근거 문서라
  소급 수정하면 안 된다. 대신 신규 동의를 받지 않도록 신청 차단을 유지.
- 코드 변경: ProgramDetail 1곳(섹션 노출 조건) 정도. 나머지는 KV 로 처리.
- **소요**: 반나절. 되돌리기: KV 복원 1분.

### S2. 파트너를 바꿀 수 있게 구조화 (중간 · 재사용 가치 높음)
- 기관명을 **콘텐츠 변수**로 뺀다: `partner_institution{name_ko,name_en,url,short}`.
  코드·문구에 박힌 "CUFS" 를 전부 이 변수로 치환.
- 그러면 파트너가 바뀌든 사라지든 **관리자에서 한 줄 고치면 전 사이트가 따라온다**.
- 신청 파이프라인의 단계 이름(접수번호·합격증)은 기관 중립적으로 다시 씀.
- **소요**: 1~2일(코드 31곳 + KV). 되돌리기: 쉬움. **어느 시나리오로 가든 손해가 없다.**

### S3. 완전 철수 (무거움)
- 프로그램 5종·신청 파이프라인·제3자 동의를 **비활성**하고, 사이트를
  "교육 이니셔티브 소개 + 장학 정보" 수준으로 축소.
- 신청은 이미 막혀 있으므로 실제 작업은 **화면에서 상품을 내리는 것**.
- **소요**: 2~3일. 되돌리기: 어려움(콘텐츠 복원 필요).

## 4. 추천

**S2 → (상황에 따라) S1 또는 S3.** 기관명을 변수로 빼는 작업은 협의가 어떻게
끝나든 버려지지 않는다. 지금 CUFS 를 손으로 지우면, 관계가 회복될 때 다시 손으로
채워야 하고, 파트너가 바뀌면 세 번째로 또 손으로 고쳐야 한다.

## 5. 승인 시 즉시 확인이 필요한 것
1. **법적 문서(`legal.third_party`)를 건드릴지** — 과거 동의의 근거라 소급 수정은
   권하지 않는다. 변호사 확인 없이는 손대지 않겠다.
2. 대체 표현: "협력 대학" / "파트너 기관" / 기관명 없이 / 새 파트너명 중 무엇인가.
3. 프로그램 5종을 **계속 노출**할 것인가(설명만 중립화) 아니면 내릴 것인가.

