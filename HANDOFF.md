# HANDOFF · KoreaDreamPath

> **현 시점 (2026-05-25) 사이트 상태 스냅샷.**
> 다음 세션에서 작업을 이어받을 때 이 파일을 먼저 읽으세요.
> 위키와 중복되는 내용은 의도적입니다 — 한 곳에 모아둔 "현재"입니다.

---

## 1. 현재 버전 / 배포

- **버전**: `v01.101.11`
- **배포 방식**: `cd ~/Desktop/VS_Code/DreamPath && node rules/tools/deploy.mjs` (자동 모드)
  — preflight → `wrangler deploy` → **배포 후 렌더 스모크**(실제 브라우저, 약 7초)를 묶어서 돈다.
  맨손 `npx wrangler deploy` 는 앞뒤 검사가 통째로 빠진다.
- **마이그레이션 상태**: 0001 ~ **0042** + **0037_apply_pipeline** 모두 적용됨 (remote D1 검증 완료). **0037_apply_pipeline.sql** = 신청 파이프라인 컬럼(candidate_no/phone/cufs_reg_no/단계 타임스탬프/결제 동의 3종) + candidate_counters + (합의된) 레거시 신청 초기화 (v01.092). ⚠️ 기존 `0037_messages.sql`과 숫자 prefix가 겹치나, 원격 d1 추적은 각각 별도 파일명으로 적용·기록됨 — **파일명 변경 금지**(재적용 시 ALTER 중복 충돌). 0042 = error_logs rate-limit 인덱스. 0041 = analytics_events.is_bot. 0040 = scholarship_posts.image / info_json. 0039 = scholarship_posts. 0038 = users.totp. 0037_messages = messages 테이블.
- **Cron**: `0 * * * *` (매시 정각, 활성화 만료 정리 + 리마인더 + Apply draft 72h purge)

### 테스트 계정 (2026-05-19 표준화)
- **컨벤션**: email `qa+xxx@example.invalid`(RFC 6761 예약 도메인) + name `[TEST] xxx`. 최대 5개.
- **현재 시드**: `qa+basic`, `qa+apply`, `qa+paid`, `qa+admin`, `qa+spare`. admin → 회원 정보 상단 카운터 카드 + 각 행에 노란 TEST 배지로 자동 식별.
- **자세히**: KMS 위키 → `4-1. 테스트 계정 규약`.

### 버전 정책 (CLAUDE.md §1 재확인)
- `AA.bbb.cc` → AA(메이저, 운영자만) · bbb(마이너, 새 기능) · cc(패치, 버그 수정 / 카피)
- **이번 세션 누적**: v01.027.00 → **v01.046.00** (마이너 +19)
  - +01.098.04 — **부트 워치독 + TipTap 지연 로딩 (미배포분을 라이브로)**: 운영자 지적 "별도로 말하지 않더라도 커밋하고 푸시하라니까?". **발견**: `git status` 에 8/22 안정성 라운드(`ACTIVE-2026-08-22-stability-audit`)의 수정 3파일이 **커밋도 배포도 안 된 채** 남아 있었다. 그런데 이 `HANDOFF.md` 는 v01.097.01 항목에서 그것을 **"v01.097.00 으로 나갔다"고 적고 있었다** — 라이브에는 없었다(`curl` 로 `dp-boot-retry` 0건). CSP 복구분만 나가고 나머지는 작업트리에 갇힌 **반쯤 배포된 라운드**였다. 진짜 피해는 코드가 아니라 **거짓 기록**이다 — 이후 세션들이 그 기록을 믿고 v01.098.03 까지 채번했다. **대응**: 기록을 고치는 대신 **사실을 기록에 맞추었다**(배포). **(1) 부트 워치독**(`index.html`, P0-2): `load`+9s · 파싱+15s 두 타이머로 `#root` 가 비어 있으면 한·영 안내 + **캐시 우회 새로고침**(`?_r=`) 버튼을 그리고 `sendBeacon('/api/errors')` 로 보고(`missing_globals`·`failed_scripts`·`has_react`·`has_babel`). `.jsx` 21개를 브라우저에서 파싱하는 구조라 전송이 한 번 잘리면 SyntaxError → 전역 미생성 → **흰 화면**이고, D1 `error_logs` 에 2026-05~08 **지속** 발생 중이었다. 스타일은 인라인(`site.css` 도 함께 실패할 수 있다) · 한글 `word-break:keep-all`. **오탐 안전성**: `createRoot` 가 `App.jsx` 한 곳뿐 + 최상위 `return null` 없음 → 마운트 성공 시 `childElementCount ≥ 1` 보장, 늦게 마운트되면 React 가 교체해 자가 복구. **(2) TipTap 지연 로딩**(`editor-loader.js`·`RichEditor.jsx`, P2-6): 모듈 주입을 `window.DreamPathEditor.ensure()` 로 감싸 멱등화하고 `useTiptapReady()` 최상단에서 호출 — 공개 `NewsEditor` 와 관리자 `window.RichEditor` 6곳이 모두 이 훅 하나를 지난다. 에디터는 로그인 편집자만 쓰는데 **모든 방문자가** esm.sh 모듈 22개를 받고 있었다. 다운스트림 계약(`window.Tiptap`·`dp-tiptap-ready`) 불변. **(3) 자산 누출 차단**: `.playwright-mcp/` 를 `.gitignore`·`.assetsignore` 양쪽에 추가 — `*.log` 는 걸러졌으나 **`.yml` 스냅샷이 공개 자산으로 나갈 수 있었다**. **검증**: preflight 통과(경고 0) · 라이브 `dp-boot-retry` 존재 · `editor-loader.js` 에 `DreamPathEditor` 존재 · `version.js` 01.098.04 · 위키 2종 반영. ⚠️ **실브라우저 콘솔 확인 미실시**(이 세션에 브라우저 도구 없음) — **다음 라운드에서 1회 확인 필요**. **남은 안정성 항목**: P0-3 React 에러 바운더리 부재 · P1-4 `/api/content` 1.5MB(base64 이미지 3장 = 95%) · P1-5 정의되지 않은 전역을 폴백으로 쓰는 5곳.
  - +01.098.03 — **재발 방지: 배포 전 자동 점검 도입(`rules/tools/preflight.mjs`)**: 운영자 지시 "동일·유사 문제를 두 번 다시 겪지 않도록". **문제**: 같은 함정에 **세 번** 걸렸다 — 8/22 배너 · 8/23 CUFS 84곳 · 8/23 레거시 `DreamPath TF`. 전부 "KV 는 고쳤는데 **코드 기본값**은 그대로". 8/22 에 이미 규칙으로 적었는데도 다음 날 또 걸렸다 → **글로 적는 것만으로는 안 막힌다**가 진짜 교훈. **대응**: 배포 전 필수 검사기 신설(실패 시 `exit 1`). ① KV ↔ `DEFAULT_CONTENT` ↔ worker 상수 드리프트 ② 지우기로 한 문자열의 부활(기관명·레거시 표기·학기·박힌 날짜) ③ 내려둔 것이 사이트맵/JSON-LD/llms.txt 에 남아 있는지 ④ 접수 차단이 서버에서 실제로 걸리는지(503). `content-store.js` 를 **node 에서 실행해 진짜 기본값 객체**를 얻는다(정규식 아님). `CLAUDE.md` 하드 룰 D-0 로 못 박고, D-2 에 **배포 전 3종**(preflight · `git status` 로 타 세션 변경 · 위키 버전 번호 선조회)을 추가. **첫 실전에서 잡은 잔재 4건**: 관리자 커리큘럼 학기 라벨 2 · `ProgramDetail` 의 죽은 파트너 블록(렌더만 막아 두니 매번 경보를 울려 **삭제**) · KV `notice` 의 두 달 지난 배너 문구. **오탐 제거**: 첫 실행 8건 중 5건이 오탐이었고, "닫는 따옴표부터 매칭"하던 방식을 **문자열 리터럴을 실제로 잘라내는** 방식으로 교체. 예외는 1건만 문서화(개인 경력). **자체 검증**: `notice.enabled` 를 일부러 되돌려 놓고 돌려 **즉시 드리프트로 잡히는 것**을 확인. **한계 명시**: 검사기는 화면을 못 본다 — 지난 회귀 2건은 둘 다 스크린샷에서 발견됐다. 배포 후 화면 확인은 사람 몫으로 워크플로에 남김. 외부 서비스 오진(포워드 인증)도 별도 항목으로 등재하고 `00-workflow.md` §2-2 에 절차화.
  - +01.098.02 — **브랜드 2단 구조 확정 + 수신 메일 포워드 완결**: 운영자 "드림패스가 우리 사업명 / 인증메일 한번 더 보내줘". **브랜드**: `KoreaDreamPath`(법인·사이트·발신자) / **`Dream Path`·`드림패스`(사업=프로그램명)** / `(주)코리아드림패스`(법인 정식명)의 **2단 구조로 확정**. 즉 그동안 "표기 혼재"로 보고했던 것은 **오류가 아니라 의도된 구조**였다 → 일괄 치환하지 않고 **표기 흔들림만** 정리: `DreamPath`(한 단어) → `Dream Path`/`드림패스`, 레거시 `DreamPath TF` → `KoreaDreamPath 팀`(**KV 는 8/22 에 고쳤으나 코드 기본값에 남아 있었다**). KV 에세이 2 · `Apply.jsx` 2 · `content-store.js` 4 · `Auth.jsx` 1. 규칙은 `CLAUDE.md` §8 에 표로 못 박음. **메일 포워드**: `wrangler email routing addresses list` → **"No destination addresses found"** — 목적지 주소가 **애초에 등록된 적이 없었다**. ⚠️ 8/22 의 "인증 메일 링크를 눌러 주세요" 안내는 **틀렸다**(KV `forward_to` 설정과 Cloudflare 목적지 등록은 별개). `wrangler login` 으로 `email_routing:write` 확보 → `addresses create scoutkorea@kakao.com` → **계정 소유 주소라 생성과 동시에 자동 인증**(운영자 조치 불필요). 라우팅 전 구간 확인(Email Routing ready · **catch-all → worker `dream-path`** · KV `forward_to` 설정) → **다음 수신 메일부터 자동 전달**. 실패 기록의 해당 항목을 정정 후 해결 처리. **검증**: 라이브 `KoreaDreamPath` 59 · `Dream Path` 30 · **`DreamPath` 단독 0** · 공개 사이트 4xx 0 · 예외 0.
  - +01.098.01 — **등록금 표기를 "미공개 · 예약 단계"로**: 운영자 지시 "프로그램 등록금은 아직 미공개거나 예약 단계라고. 딱 그정도로". 임시값 `500` 을 실제 금액으로 채우는 대신 **금액을 감추고 상태로 표시**한다. KV 5개 + `content-store` 기본값 5개를 `0`(미공개)으로, 마이페이지 결제 화면은 금액 자리에 **"미공개 · 예약 단계"**, 결제 실패 문구도 "미설정·관리자 문의" → "아직 미공개입니다(예약 단계)"로. 관리자 입력에는 "비워 두거나 0이면 미공개로 표시되고 결제가 차단됨" 힌트. **프로그램 상세 Pricing 섹션은 렌더를 막았다** — `$720` · `12 credits × $60` · `$14,258–$29,258 절감` · `97% less` 같은 구체 금액 주장으로 가득해서, 등록금을 미공개라 해놓고 그 옆에 두면 그 자체가 모순이다. 지우지 않고 `tuitionPublished` 조건부로 두어 **금액이 들어가면 자동 복귀**한다. 서버는 `computeTuition()` 이 0 이면 `409 tuition_not_set` 으로 이미 막으므로 **미공개 동안 결제는 구조적으로 불가능**(현재는 접수 차단 503 이 먼저 걸린다). **검증**: KV 5개 `tuition: 0`, 관리자 콘솔 정상(4xx 0 · 예외 0), 공개 사이트 4xx 0 · 예외 0, 결제 엔드포인트 차단 확인.
  - +01.098.00 — **프로그램 등급(level) 제거 + 코드 기본값의 CUFS 잔재 정리**: 운영자 지시 "프로그램 등급은 삭제 / 콘텐츠는 차후 직접 / 운영 메일은 유지". **등급 제거**: KV `programs[].level` ×5 · `program_detail.label_level` · `content-store` 기본 5개 + 라벨 · `worker.js` `CURRENT_PROGRAMS` 5개 · `Programs.jsx` **등급 필터 칩 UI 통째 제거**(카테고리 필터 유지) · `ProgramDetail` 히어로 배지 + 스펙 행 · 관리자 목록 열/필터/입력 · 구조화 데이터 `Course.educationalLevel`. **🔴 하는 김에 발견**: 8/22 에 KV 의 CUFS 를 정리했지만 **코드 기본값에는 그대로 남아 있었다** — `content-store.js` 33곳 · `worker.js` 46곳 · `admin.html` 5곳. KV 초기화나 원격 콘텐츠 도착 전 첫 페인트에서 **전부 되살아난다**(전날 상단 배너와 동일한 함정). 프로그램 kicker · 섹션 제목 · 히어로 · 소개 · 안내 메일 2종(외부 입시 링크 포함) · 제3자 동의서 예시 · 기본 FAQ · 파트너 기본 카드 · **프로그램 상세 기본 본문의 기관 귀속 주장**(`government-recognized CUFS micro-degree certificate` 등) · 관리자 템플릿까지 정리 → **코드 전체 CUFS 0곳**(KV 잔여 1곳은 개인 경력, 의도적). **나머지 지시**: 콘텐츠(뉴스·파트너·이미지·장학)는 운영자가 직접 올리기로 → 대기 목록에서 내림(빈 상태 안내는 이미 적용됨). 운영 메일 `hello@` 포함 현행 유지 → 대기 목록에서 내림. **검증**: 관리자 콘솔 정상(4xx 0 · 예외 0), 공개 전 라우트 4xx 0 · 예외 0, KV·코드 양쪽 `level` 제거 확인.
  - +01.097.05 — **결함·모순 전수 수정**: 운영자 지시 "결함들 모두 수정하고 모순들도 모두 수정해". 추측이 아니라 **D1 오류 로그 + 전 14개 라우트 브라우저 크롤 + 상태 대조** 3가지 근거로 찾았다. **결함 2건**: ① `/api/auth/me` 가 익명 방문자에게 401 을 줘 **전 라우트 14/14 에서 콘솔 빨간 오류** — 보호 자원이 아니라 '지금 누구냐' 조회이므로 `200 {user:null}` 로 변경(클라이언트는 200+user없음도 레거시 토큰 경로를 타도록, 무효 토큰은 버리도록 함께 수정). ② `/partners` 가 파트너 0곳일 때 **본문이 통째로 비어** 히어로 아래가 끊겼다 → 빈 상태 안내 추가. **모순 5건**(모두 스위치 복귀 시 자동 원복되도록 코드 분기): 히어로 'Explore programs' 버튼 숨김 · 하단 CTA 를 모집 없을 때 '문의하기'로 · 상단 메뉴 라벨 '프로그램'→'소식·후기' · sitemap `/apply` 0.9→0.4 · `how` 2단계의 **'마이크로디그리, 온라인 학위, 어학 트랙' 카탈로그 주장 제거**(공개된 것이 하나도 없고, '학위'는 파트너 협의 미정 상태에서 가장 위험한 문장). **오류 로그 판정**: 22건 부팅 파일 잘림·10건 TipTap 은 병행 세션이 처리 중, `lang is not defined`·`structuredClone`·`/offline #130` 은 **현재 코드에서 이미 해결**, D1 타임아웃은 인프라 일시 장애. **검증**: 재크롤 HTTP 4xx **0건**(이전 14/14) · JS 예외 0건 · 관리자 콘솔 정상 · `/api/auth/me` 익명/무효토큰 200. **남은 것은 사실이 필요한 9건**(등록금·브랜드 표기·뉴스·파트너·이미지·장학·hello@·Cloudflare 인증·동시작업) — `rules/handoff/done/2026-08-23-defect-sweep.md` 에 표로.
  - +01.097.04 — **접수 안내 문구 재작성(중단 → 신규 모집 없음) + 상단 배너 기본값 수정**: 운영자 지시 "Paused보다, 현재 진행되고 있는 프로그램은 없고 기존 프로그램이 진행중이라고만. 신규 프로그램이 진행되면 별도 안내". **문구**: `/apply` 키커 `접수 중단`→**`모집 안내`**, 제목 `신청 접수가 일시 중단되었습니다`→**`현재 신규 모집 중인 프로그램이 없습니다`**, 본문은 **기존 프로그램 진행 중 + 신규 모집 시 별도 안내**로. `/programs` 안내, 마이페이지 배너(`신청 접수 일시 중단`→`신규 모집 준비 중`), `/llms.txt` 상태 문장까지 같은 사실로 통일. **함께 고친 모순**: 본문이 "프로그램 정보는 그대로 열람 가능"이라고 했는데 프로그램은 전날 내려 볼 수 없었다 → 문장 삭제 + 버튼 `프로그램 살펴보기`(막다른 길) → `문의하기`/`장학 정보 보기`. 일시정지 아이콘(⏸) → 달력 아이콘. **🔴 검증 중 발견**: 8/22 에 내린 상단 띠 배너(`Official launch mid-June`)가 화면에 다시 떠 있었다. KV 는 `notice.enabled=false` 로 정상이었으나 **표시된 문구가 `DEFAULT_CONTENT` 것**이었다 — SPA 는 원격 콘텐츠 도착 전 **첫 페인트를 코드 기본값으로** 그린다. 어제는 KV 만 끄고 코드 기본값은 `true` 그대로였다 → `DEFAULT_CONTENT.notice.enabled=false` + **기본 문구에서 날짜 제거**(코드에 박힌 날짜는 반드시 낡는다). **교훈(실패 기록 등재)**: 콘텐츠 스위치는 **KV 와 코드 기본값 둘 다** 내려야 하고, API 값만 확인하지 말고 **실제 화면을 봐야** 잡힌다. **검증**: 헤드리스 브라우저로 `/apply`·`/programs` 새 문구·아이콘·버튼 확인, 본문에 `paused/일시 중단` 0회, 배너 사라짐, JS 예외 0건. (v01.097.03 은 같은 라운드의 중간 배포)
  - +01.097.02 — **표현 정리: 파트너 대학/파트너 교육기관 + 학기 표현 제거**: 운영자 지시 "파트너 대학, 파트너 교육기관이라고 해주고 세메스터 그러니까 학기라는 표현보다 학습하러가기 정도로". **표현 기준**: 입학·합격·등록금처럼 대학이 분명한 자리는 **파트너 대학**(EN partner university), 동의서 수령자처럼 기관 일반을 가리키는 자리는 **파트너 교육기관**(EN partner institution). 동의서에 후자를 쓴 이유는 수령 기관이 반드시 대학이라는 보장이 없어서다 — 법적 문서에서 범위를 좁히면 나중에 어긋난다. 제3자 제공 동의서 **v1.1 → v1.2 (시행일 2026-08-23)**. **학기 표현 제거**: 홈 CTA 를 `2026년 2학기 / 8월 31일 개강 / 지금 지원하기` → `배움은 여기서 시작됩니다 / 온라인으로, 어디서나 함께합니다 / **학습하러 가기**`(EN Start learning)로 교체 — **철 지난 개강일도 함께 사라졌다**. FAQ 2건(`학기마다`→`개설 시기마다`, `by course and semester`→`by course and intake`), ProgramDetail 비용 안내, `worker.js` 기본 커리큘럼의 **학기 칩 38개**(국문 `과목` / 영문 `Course`) + `semester` 필드 9개. ⚠️ 칩을 한 번에 치환했다가 **영문 커리큘럼에 '과목'이 들어가** 줄 단위(`curriculum_ko`/`curriculum_en`)로 다시 갈랐다. **배포 전 점검**(2026-08-22 동시작업 사고 교훈 적용): `git status` 로 다른 세션 파일 확인 + 위키 최신 번호 조회 후 채번. **검증**: 라이브 콘텐츠에서 `협력 대학` 0 · `학기`/`semester` 0(파트너 대학 9 · 파트너 교육기관 5), 헤드리스 브라우저로 홈·about·contact 0회 + CTA 새 문구 + JS 예외 0건.
  - +01.097.01 — **프로그램 비공개 + 기관명 중립화(협력 대학)** ⚠️ *번호 정정: 01.097.00 은 같은 날 다른 세션의 안정성 라운드(글꼴·에디터 CSP 복구, 부트 워치독)가 선점해 패치 번호로 내렸다.*: 운영자 결정 — 제3자 제공 동의서에서 CUFS 를 빼고 "협력 대학" 형태로 표현, **프로그램 5종은 내림**. **(1) 프로그램 내리기**: 신규 스위치 `c.programs_gate.hidden`. 홈 티저 · 상단 메뉴 항목 · 푸터 열 · `/programs` 목록 · `/program/:id` 상세 · **사이트맵** · **JSON-LD(ItemList·Course)** · **llms.txt** · noscript 본문 · 해당 경로 `noindex` 까지 한 번에 내려간다. 화면에서만 내리고 기계가 읽는 층에 남기면 그게 곧 거짓말이라 같은 스위치로 묶었다. **데이터(programs[] 5종)는 보존** — 관리자 → 프로그램 탭 토글로 배포 없이 재개. 목록/상세 **주소는 살려 뒀다**(이미 퍼진 링크가 404 가 되는 것보다 "정비 중" 안내가 낫다). 상단 메뉴는 프로그램 항목만 빼고 소식/후기는 유지. **(2) 제3자 제공 동의서**: 기관 예시(`예: 사이버한국외국어대학교(CUFS) 등` / `e.g. Cyber Hankuk University of Foreign Studies`)만 삭제 → `운영 협력 대학` / `The partner university`. **문서 실질(수령자·항목·목적·보유기간·거부권·국외이전)은 그대로**. 버전 **1.0 → 1.1**, 시행일 **2026-08-22**. ⚠️ 과거 동의는 1.0 문서에 대한 것이며 소급되지 않는다. **(3) 기관명 중립화**: `how` · `programs_section` · `page_heros.programs` · `programs[].kicker`×5 · `about.hero` · 죽은 `news[1]` · 단계별 안내 메일 2종(**외부 입시 링크 제거** → 담당자 개별 안내) · `Member.jsx`(입학 절차 문구·접수번호 라벨·환불 동의, **외부 입시 버튼 제거**) · `Apply.jsx`(제3자 동의 설명) · `Home.jsx`. `partners[]` 의 **CUFS 카드 제거(1 → 0)**. `ProgramDetail` 의 Why-CUFS 섹션은 **렌더 차단**(`SHOW_PARTNER_SECTION = false`) + 기관 소개 영상 섹션 제거 — 인증·수상·헬프데스크 번호·비자 가점은 특정 기관에 대한 구체적 주장이라 기관명만 바꾸면 오히려 거짓이 된다. 원문은 보존. **남긴 것(의도)**: `project_team` 구성원 **경력 기록**의 기관명(개인 이력 사실), D1 `applications` 의 `cufs_*` 컬럼 5 + 상태값 2(내부 식별자, 신청 0건이라 나중에 일괄 정리 가능). **검증**: 헤드리스 브라우저로 홈·about·contact·scholarships·apply·team **CUFS 0회 · JS 예외 0건**, `/programs`·`/program/:id` 안내 화면, 사이트맵 프로그램 URL 0개, 홈 JSON-LD 에서 ItemList/Course 소거, llms.txt 프로그램 섹션 없음 + 미공개 문장 추가, 관리자 콘솔 컴파일 정상, KV blob CUFS 잔여 1곳(위 개인 경력). 실행 상세는 `rules/handoff/done/2026-08-22-faq-cufs.md`.
  - +01.096.01 — **FAQ 에서 CUFS 의존 내용 제거 + SEO 계층 중립화**: 운영자 "FAQ는 해당 내용들을 모두 삭제해줘 일단. CUFS와 좀 이야기가 잘못되어서 빼야하긴하거든". **FAQ 28 → 9건**(19건 삭제): CUFS 직접 언급 · 등록금/환불/결제 · 학위/학점/수료증을 다루는 항목 전부. 남은 9건은 강의 언어·장학 2·성인 학습자·한국어 요구·학습 시간·취업·TOPIK·커뮤니티(프로그램 약속과 무관한 일반 문항). 삭제 원문은 `rules/handoff/ACTIVE-2026-08-22-faq-cufs.md` 에 보존. **타이밍이 중요했다**: 바로 앞 v01.096.00 에서 FAQ 를 JSON-LD FAQPage 로 내보내기 시작했으므로, "수료증은 CUFS 가 발급" · "학점당 60 USD" · "환불은 대학 규정" 같은 문장이 **답변 엔진이 인용할 수 있는 형태로 막 공개된 참**이었다. **SEO 계층 4곳 중립화**: llms.txt 의 `Partner university: CUFS` 줄 삭제, `5 CUFS micro-degrees` → `5 online micro-degree tracks`, `certificates are issued by CUFS` → 파트너 기관 표현, JSON-LD ItemList name `CUFS micro-degree programs` → `Programs`. 이 4곳은 운영자 콘텐츠가 아니라 **한 시간 전 내가 하드코딩한 문장**이라 계획 승인 없이 정리했다. **FAQ 밖은 손대지 않았다** — 운영자가 "전면 검토 계획을 먼저" 선택. CUFS 전수 지도(KV 24곳 · 코드 31곳 · D1 컬럼 5 + 상태 2 · 법적 동의서 1) + 시나리오 3안(노출만 낮춤 / 기관명을 콘텐츠 변수로 구조화 / 완전 철수) + 추천(S2)을 같은 핸드오프에 작성해 승인 대기. **검증**: 라이브 FAQ 9건, 홈 HTML 에서 `per credit`·`refund`·`Micro-Degree completion`·`August 31` 전부 0회, 카테고리 5종 모두 ≥1건이라 빈 탭 없음, FAQ 소비처(공개 FAQ·챗봇) 모두 데이터 구동이라 인덱스 가정 없음. ⚠️ `legal.third_party` 는 CUFS 를 제3자 수령 기관으로 명시한 **동의 문서**라 소급 수정하지 않았다.
  - +01.096.00 — **SEO / AEO 계층 신설 (크롤러가 읽을 것이 없던 문제)**: 운영자 지시 "AEO와 SEO를 고려해 홈페이지 코딩 안정화 + 잠재적 홍보". **진단**: Babel-in-browser SPA 라 **원본 HTML 본문이 텍스트 89자**였다. 구글은 JS 를 실행하지만 답변 엔진 크롤러(GPTBot·ClaudeBot·PerplexityBot)는 대부분 실행하지 않아 **인용할 사실이 0** 이었고, 게다가 **모든 라우트의 canonical 이 홈**을 가리켜 하위 페이지가 홈의 중복으로 선언되고 있었다(하위 페이지가 검색에 안 잡히는 직접 원인). **조치**(빌드 스텝 없이 HTMLRewriter 로 셸 가공): ① 라우트별 title/description/canonical/OG + robots(색인 대상만·비공개/에러는 noindex), ② JSON-LD `@graph` — EducationalOrganization · WebSite · ItemList(Course 5) · Course(상세) · FAQPage(28문항) · BreadcrumbList, ③ `<noscript>` 대체 본문(히어로·프로그램·소개·FAQ·연락처 — 화면과 같은 사실), ④ `/llms.txt` 신설(답변 엔진용 요약 · **접수 개폐 상태를 실시간 반영**), ⑤ robots.txt 에 AI 크롤러 13종 명시 허용 + llms.txt 안내. **판단**: Course 에 가격(offers)을 **일부러 넣지 않았다** — 등록금이 임시값($500)이라 기계 판독 가격으로 퍼뜨리면 오정보가 된다. **부수 발견**: 셸이 KV 콘텐츠를 품게 되며 엣지 캐시가 낡은 HTML 을 서빙(`cf-cache-status: HIT`)하는 것을 확인 → `s-maxage=60`. schema.org 설명으로 나가는 `brand.footer_tagline_en` 이 레거시 "DreamPath Initiative" 로 시작해 KoreaDreamPath 로 교정. **검증**: 5개 라우트 JSON-LD 파싱 성공 + 타입 확인, 크롤러 본문 89자 → 1,400~5,000자, `/member` noindex, `/about` 고유 canonical·h1, `/llms.txt` 200. ⚠️ FAQ 구조화 데이터에 지난 일정("Application begins: June 2026")과 가격 문장("approximately USD 60 per credit")이 그대로 실린다 — 운영자 확인 대기 항목.
  - +01.095.01 — **현행화 1차: 철 지난 문구 제거 + 콘텐츠 감사**: 운영자 지시 "그 문구 내려. 재워딩하자. 현행화 시작". **KV 수정 3건**: `notice.enabled=false`(상단 띠 "🚧 6월 말 오픈 / launching late June" 내림), `about.team.{ko,en}.sub` 의 레거시 "DreamPath TF" → KoreaDreamPath 팀(CLAUDE.md §8), `cta_banner.en.sub` 의 "Fall 2026 applications open." 삭제 — **접수를 막아둔 상태에서 사실과 어긋나는 문구**였다(개강일 문구는 사실 확인 전이라 유지). **코드 수정**: `EntryGate.jsx` · `content-store.js` 의 게이트 폴백 문구에서 "6월 말 정식 공개" 날짜 제거 — 날짜가 코드에 박혀 있으면 게이트를 다시 켜는 순간 철 지난 안내가 뜬다. **감사 결과(운영자 판단 대기)**: 프로그램 5종 등록금이 전부 임시값 `$500`(v01.092 caveat 미해소) · D1 뉴스 0건(=/news 빈 페이지, KV 레거시 news[] 4건은 2024–2025) · `faq[27]` 가을학기 일정(지원 시작 2026년 6월 · 개강 8월 31일)이 현재 접수 중단과 모순 · 브랜드 표기 5종 혼재(KoreaDreamPath 58 · Dream Path 54 · DreamPath 3 · 드림패스 1 · 코리아드림패스 1) · 히어로 배경 미설정 5개(news/apply/apply_done/member/mypage/scholarships) · OG 기본 이미지 없음 · 파트너 1곳. 감사 스크립트와 목록은 `rules/handoff/done/2026-08-22-content-refresh.md` 에 보존.
  - +01.095.00 — **신청 전면 중단 + 진입 고지 게이트 해제 + 수신 메일 자동 포워드 + AI 작업 규칙 체계**: 운영자 지시(2026-08-22) — 사이트 현행화를 시작하니 첫 페이지 고지는 내리고 모든 신청을 막을 것. **(1) 신청 차단**: `c.apply_gate.closed` 스위치 신설. 켜지면 지원 폼이 안내 화면으로 바뀌고 워커가 학생측 제출을 전부 503 `applications_closed` 로 거절한다 — `POST /api/applications`, `/api/applications/upload`, `/api/me/applications/:id/{cufs-reg-no,admission,documents,pay}`. 조회(GET)는 열어둬 지원자가 자기 상태는 계속 본다. 폼만 감추면 API 직접 POST 로 우회되므로 **서버 차단이 본체**다. 워커 기본값 `APPLY_GATE_DEFAULT_CLOSED` 는 content-store 기본값과 짝이며 **같이 움직여야** 한다(SPA 는 기본값 병합, 워커는 KV 원본을 읽어 어긋나면 화면과 API 가 다른 말을 한다). **(2) 진입 게이트 해제**: KV 에 `entry_gate` 키가 아예 없어 코드 기본값이 곧 라이브 값이었음 → default `false` + KV 명시 기록. **(3) 관리자 토글 2종**: 페이지·콘텐츠 → 지원(신청 접수 중단 + 안내 ko/en), 설정 → 공지(진입 게이트 on/off + 문구 8종). 다음 개폐는 배포 없이 운영자가 직접. **(4) 마이페이지**: 동결 중 진행 카드 상단 배너 + 4개 제출 핸들러가 503 을 '제출 실패'가 아니라 중단 안내로 표시. **(5) 수신 메일 포워드**: KV `email_templates.forward_to = scoutkorea@kakao.com` (v01.092.10 기능 활성화). ⚠️ Cloudflare → Email → Routing → Destination addresses 에서 해당 주소 **인증 필요**(운영자 조치, 미인증 시 forward 만 실패하고 메일은 D1 보관). **(6) AI 작업 규칙 체계**: `CLAUDE.md` 를 정본 가이드 + 라우팅표로 개편하고 `rules/` 신설 — 00-workflow / 01-inventory(자동 생성) / 02-design-system / 03-history-success / 04-history-failure / 05-do-not / 06-weekly-review / handoff(TEMPLATE·ACTIVE·done) / tools/build_inventory.py. 지시 접수 시 **핸드오프 선생성**, 새 개발 전 **인벤토리 확인**(스파게티 방지), **실패도 사유·재시도 조건과 함께 기록**, **주간 점검**에서 새 모델·새 절차로 재도전 제안이 하드 룰. `.assetsignore` 에 `rules/` 추가(공개 배포 제외, 404 확인). **검증**: 운영 4개 엔드포인트 503 실측, 로컬 헤드리스 크롬으로 게이트 미표시·`/apply` 안내 화면·폼 미렌더·예외 0건, `/api/content` 라이브 값 3종 확인, `/rules/*`·`/CLAUDE.md` 404 확인.
  - +01.094.01 — **메일함 카운터(알람) 정합성 수정**: 운영자 보고 "메일함 알람 상태가 이상하다". 실제 결함 3종. (1) **폴더 카운터가 계정 범위를 무시** — `/api/admin/inbox`의 counts 쿼리에 `to` 필터가 없어 목록은 partner@ 6건인데 배지는 전 메일함 합계(받은편지함 21)를 표시했다. counts에도 같은 계정 스코프 적용(검색·미읽음 필터는 의도적으로 미적용 — 배지는 폴더를 세지 현재 쿼리를 세지 않는다). (2) **읽어도 상태가 안 바뀜** — 단건 GET이 서버에서 `read_at`을 찍는데 클라이언트가 목록·카운터를 갱신하지 않아, 보고 있는 메일이 계속 미읽음 점·굵은 글씨로 남고 카운트에도 포함됐다. `markReadLocally()`로 행/카운터 즉시 반영. (3) **사이드바 배지 지연·불일치** — 배지는 60초 폴링 + 탭 전환에만 갱신돼 같은 탭에서 읽으면 최대 1분간 stale. `dp-mail-counters-changed` 이벤트로 즉시 재조회. 또 그룹 배지가 API 총합(탭이 없는 catch-all 주소 포함)이라 하위 배지 합과 안 맞을 수 있었다 → 그룹 배지는 **탭이 있는 계정 합계**만, 나머지는 별도 `+N` 칩(툴팁으로 설명). 주소 조회는 대소문자 무시(API 키는 lowercase, `c.inboxes`는 수기 입력). worker `unread-by-account`도 `GROUP BY LOWER(to_addr)`로 — 대소문자 변형이 서로 덮어써 last-one-wins 되던 것 수정. 목록 필터도 `LOWER(to_addr) = ?`. **검증**: sqlite로 counts 쿼리 실측(스코프 전 inbox 20 vs 목록 6 → 스코프 후 6/6 일치, 대소문자 혼재 시 3→6 교정), 헤드리스 크롬으로 UI 실측(메일 열기 즉시 그룹 배지 3→2, 행 굵기 700→500, JS 예외 0건). worker.js + admin.html + version.js.
  - +01.094.00 — **메일 본문이 안 보이던 문제 수정 + 메일 전체화면 보기**: 운영자 보고 — 관리자 메일함에서 메일을 열면 본문 자리에 크롬의 "이 콘텐츠는 차단되어 있습니다" 회색 플레이스홀더만 뜸. 원인은 본문을 `<iframe sandbox="" srcdoc={...}>`로 렌더하던 구조 — 프레임 단위로 차단되면(페이지 CSP·확장·콘텐츠 어느 쪽이든) 프레임 안에서는 복구할 방법이 없다. 로컬 재현 결과 워커 CSP(`frame-src 'self' …`)는 srcdoc을 막지 않음(헤드리스 크롬 실측) — 즉 프레임에 의존하는 한 원인을 특정해도 재발 여지가 남아 **프레임 자체를 걷어냄**. 이제 정제된 HTML을 관리자 문서에 직접 렌더(`.mail-body`). 샌드박스를 뺀 대신 정제를 3중으로: 수신 시(worker `sanitizeHtml` allowlist) → **읽을 때 재정제**(inbound/sent 단건 GET, 레거시 행 대비) → **브라우저에서 3차 패스**(`sanitizeMailHtml`, DOMParser 재파싱 + 동일 allowlist, `javascript:`/`data:text/html` 제거, src 없는 img 제거, 링크 `target=_blank rel=noopener noreferrer nofollow`, 이미지 `referrerpolicy=no-referrer`). 파서가 다른 두 엔진이 같은 allowlist를 통과시켜야 하므로 한쪽의 직렬화 quirk가 다른 쪽에 살아있는 마크업을 넘기지 못한다. **전체화면 보기 추가**: 읽기 툴바 `⛶ 전체화면` → 뷰포트 전체 오버레이(`.mail-full`, 본문 폭 1180px 캡, 고정 `✕ 닫기` 버튼, Esc 닫기, 배경 스크롤 잠금). 4K에서 본문 칸이 좁던 문제도 함께 정리 — 목록/읽기 2단 그리드를 `grid-2`(1:1) → `.mail-grid`(목록 최대 420px + 나머지 전부), 두 패널 높이 `calc(100vh - 300px)`. `.mail-body` CSS는 전부 스코프 + 시맨틱 토큰(한글 `word-break:keep-all`), 다크/라이트 자동 대응(옛 iframe은 하드코딩 hex 스타일 블록을 주입했었다). admin.html + worker.js + version.js. **검증**: 목 API + 헤드리스 크롬 CDP로 실제 렌더 확인 — iframe/script/form/style 0건, `javascript:` 링크 0건, style 속성 0건, 전체화면 열기/Esc 닫기 동작, JS 예외 0건.
  - +01.093.00 — **진입 안내 게이트(EntryGate)**: 정식 공개 전 방문자 고지용 전체화면 게이트. 홈페이지 접속 **매 로드마다**(영속화 없음) "본 홈페이지는 6월 말 정식 공개 운영 예정 · 정보 변경 가능" 안내 모달을 띄우고, 동의 체크박스 체크 시 입장 버튼 활성화→사이트 입장. Escape·배경 클릭으로 안 닫히는 필수 게이트(BannerAdModal과 역할 분리). 신규 `EntryGate.jsx`(window.EntryGate, body 스크롤 잠금, z-index 100100 최상위), `c.entry_gate`(enabled + ko/en 제목·본문·체크·버튼) content-store 기본값(deepMerge라 KV 미설정에도 렌더), `site.css .gate-*`(토큰만), App.jsx 마운트 + index.html 스크립트. `version.js` 01.091.00(지연)→01.093.00 정렬. **출시 후 비활성** = `entry_gate.enabled=false`(KV) 1회(전용 admin 토글 미추가). 운영자 요청.
  - +01.092.10 — **메일 인프라 진단 + 발송 가시성 / 수신 forward**: 운영자 보고 "외부에서 info@로 메일을 못 보낸다" 진단. **결론: info@ 수신은 정상** — Cloudflare MX 3대 모두 `RCPT TO <info@>` 250 OK, 5/5~6/22 외부 발신자(Gmail·naver·kakao·nts.go.kr·stibee) 연속 수신 기록 확인. 외부 "못 보냄"은 info@ 자체가 아니라 오타·미라우팅 레거시 별칭(hello@/team@/partners@)·첨부 용량·발신자측 문제 가능성 → 반송 원문 확보가 다음 단계. **진짜 사각지대는 발송**: `sendEmail()` 13개 호출부가 반환값을 버려 Resend 실패가 무로그였음. (1) `sendEmail()`에 logFail 추가 — 모든 실패를 `error_logs`(source `email_send`)에 기록, (2) `email()`에 `email_templates.forward_to` 설정 시 `message.forward()`로 개인함 동시 전달(try/catch, 반송 금지), (3) content-store 기본값 + admin "Forward inbound to" 필드. worker.js+content-store.js+admin.html. **운영자 후속**: Cloudflare catch-all 규칙 + forward Destination verify + Resend 도메인 Verified 재확인.
  - +01.092.09 — **프로그램 상세 전 섹션 Pricing 톤 통일 리디자인**: v01.092.08 Pricing 톤(흰 카드+lucide 아이콘 칩+은은한 테두리/그림자+muted 패널+eyebrow)에 맞춰 상세 페이지 나머지를 일괄 정리. 스탯 스트립(4→3열+아이콘 칩), 본문 섹션 카드(개요/영상/커리큘럼/지원자격/강사: 좌측 액센트 바·회전 장식 제거+아이콘 칩 헤더+톤별 `--pd-accent`), 커리큘럼 번호 배지·과목 카드·학기 칩·교수 아바타 플랫 틴트화, Why CUFS(다크 패널→muted 패널+흰 카드+아이콘 칩), Dream Path Different(노란 테두리→muted 패널+흰 카드+옐로 틴트 칩+pill 태그), 사이드바(하드코딩 rgba→토큰, status state-success). 이모지→lucide 전부 전환, 시맨틱 토큰만(raw hex 없음). ProgramDetail.jsx + site.css, worker 무변경. 운영자 요청.
  - +01.092.08 — **Pricing 섹션 비교 카드형 리디자인**: CUFS 마이크로 디그리 상세의 비용(Pricing) 섹션을 운영자 제공 'Pricing Comparison' 레퍼런스대로 전면 교체. 2열 비교 카드(현장 유학 vs Dream Path 온라인, 아이콘 헤더+Best value 배지+행별 lucide 아이콘+온라인 'Not needed/Stay home' 라벨+카드별 Total), 절감 패널($14,258–$29,258·97%↓), 막대 비교 2종+절감 합계, 혜택 칩 5종, 사실 스트립 3종($60/credit·$720·$22), 현지통화 납부 안내, 장학(info)·학기 등록금(muted) 콜아웃. ProgramDetail.jsx costSection 재구성 + .pd-cost 렌더 재작성, site.css .pd-cost* 전면 교체(시맨틱 토큰만, lucide 아이콘). worker 무변경. 운영자 요청.
  - +01.092.07 — **해외 헬프데스크 번호 정정**: 프로그램 상세 'Why CUFS' → 'World-Class Faculty' 카드의 24/7 help desk 번호를 `+82-6907-6703` → `+82-2-6907-6703`(지역번호 2 누락)으로 정정. ProgramDetail.jsx whyCUFS body ko/en 2곳. 운영자 정정.
  - +01.092.06 — **영상 제목 'CUFS Introduction' + Cost 등록금 안내 노트**: 프로그램 상세 영상 섹션 제목을 'Program Introduction' → 'CUFS Introduction'(ko: CUFS 소개)으로 변경. Cost 섹션 하단에 안내 노트(`.pd-cost-note`, ko/en) 추가 — 표시 금액은 1년 전체 프로그램 비용이며, 학기별 등록금은 최대 프로그램 가격 범위 내에서 수강 신청한 과목에 따라 부과됨. ProgramDetail.jsx(video title + costSection.note) + site.css(.pd-cost-note 토큰). 운영자 요청.
  - +01.092.05 — **프로그램 상세 소개 영상 임베드**: 모든 CUFS 마이크로 디그리 상세 페이지의 Overview와 Curriculum 사이에 공유 YouTube 소개 영상(`_AwgacO988A`)을 16:9 반응형 카드로 추가. ProgramDetail.jsx `introVideoId` 단일 출처 상수 + sections 배열 `key:'video'` 블록(overview 다음/curriculum 앞) + 전용 렌더 분기(`youtube-nocookie.com/embed` iframe, loading=lazy, allowFullScreen). site.css `.pd-video`(aspect-ratio 16/9 래퍼) + `.pd-tone-video` 장식 토큰. worker.js CSP `frame-src`에 youtube.com / youtube-nocookie.com 추가(없으면 default-src 'self' 폴백으로 iframe 차단). 영상은 코드 상수 하드코딩(KV 스키마/마이그레이션 없음) — 교체 시 `introVideoId` 한 곳만 수정. 운영자 요청.
  - +01.092.00 — **신청 시스템 개편: 단일 5단계 → CUFS 입학 파이프라인 상태머신**: 설계서 v0.1(DreamPath×CUFS) 기준. 신청을 서버 권위 status 상태머신으로 전환 — `submitted→screen_passed→cufs_no_submitted→cufs_admitted→docs_submitted→docs_verified→paid→enrolled`(+screen_rejected/cancelled), 모든 전이 `assertStatus`(409) 가드 + 관리자 전이 audit. 학생 고유번호 **candidate_no**(`DP{YY}-{5자리}`, submitted 시 1회·불변, candidate_counters 원자 증가). **1차 신청서(Apply.jsx) 축소**: 서류·트랙·결제 제거, 전화번호+프로그램 선택 추가(4단계). **마이페이지(Member.jsx)** 단계별 진행 화면: CUFS 입시 안내(결제 주체 경고)+접수번호 입력 / 합격증 업로드 / 학력서류 3종 / 결제 동의 3종(CUFS·KDP 환불+PG). **관리자(admin.html)** 신청 탭: 단계 칸반 필터 + 고유번호/이메일 검색 + 단계별 액션(통과·탈락/합격증 검증/서류 검증/등록 확정/취소). **등록금 자동 연계**: KV `programs[].tuition`(USD) 단일 출처, 결제 시 worker `computeTuition` 재조회(클라 금액 불신), 0이면 결제 차단. **결제 PG 추상화**(DemoPaymentProvider, 실 PG 무수정 스왑). 단계별 안내 메일 6종 + 영수증 candidate_no. DB: 0037_apply_pipeline(파이프라인 컬럼+candidate_counters+레거시 초기화). worker: 9개 전이 API + submitApplication 재정의 + validateApplicationStage1. **운영 결정(2026-06-19)**: 레거시 신청 전부 초기화, 결제 USD 단일. **Caveat**: 프로그램 tuition 임시 $500 — 관리자 프로그램 탭에서 실제 금액 입력 필요. track/partial_tier 컬럼 미사용으로 남김(후속 정리).
  - +01.091.00 — **장학 게시판 상세 페이지(내부) + 이미지 + 유연한 세부 정보**: 운영자 지시 — Apply(실제 신청)는 외부지만, 목록에서 항목을 누르면 외부로 바로 튀지 말고 **우리 사이트 안의 상세 페이지**(`/scholarship/:id`)에서 정보를 보게 하고, 이미지·장학자격·범위 등 다양한 정보를 담을 수 있어야 함. 마이그레이션 0040으로 `scholarship_posts`에 `image`(R2 업로드 URL) + `info_json`(`[{label,value}]` 유연 행, 장학자격/범위/대상/선발인원 등) 추가. worker: `/api/scholarships/:id` GET이 새 컬럼 포함, create/update가 `normScholarshipInfo`로 info 정규화(≤30행·라벨120·값2000자), SPA 라우팅에 `/scholarship/` 추가, sitemap에 상세 URL 추가. App.jsx에 `scholarshipdetail` 뷰(viewFromLocation/go/popstate/뷰스위치/OG pageKey). `Scholarships.jsx`: 보드 행 클릭→상세 이동(인플레이스 아코디언·외부 Apply 버튼 제거, '자세히 보기' CTA + 선택적 좌측 썸네일), 신규 `window.ScholarshipDetail`(이미지·요약 lead·info 정의리스트·본문 pre-line·외부 '신청하러 가기' + 목록으로). 에디터 모달에 이미지 업로드(`/api/admin/upload-image`, authFetch 세션 어드민) + 세부 정보 행 추가/삭제(+빠른 추가 칩). site.css `.schol-thumb/-titlebtn/-detail-*/-info*` 추가(토큰만). 시드 3건에 info_json(Eligibility/Coverage/Who can apply) 채움. **쓰기는 admin 전용**(서버 `userIsAdmin` 게이트).
  - +01.090.00 — **장학 게시판을 D1 기반 관리자 직접 게시로 전환(외부 링크 → 우리가 정보 게시)**: 운영자 지시 — 외부 학교 사이트로 링크만 거는 게 아니라 **우리가 정보를 직접 올리고** 방문자가 보게 함. News 패턴 차용: 마이그레이션 0039 `scholarship_posts`(title=장학금명칭/organizer=주최기관/category/summary=내용/period=접수기간/details=주요내용/apply_url=신청링크/date) + `/api/scholarships` (GET 공개 목록·단건, POST/PUT/DELETE admin 전용 `userIsAdmin`). `Scholarships.jsx`가 `/api/scholarships` fetch + 공개 페이지에서 관리자 로그인 시 인라인 등록/수정/삭제(모달 `ScholarshipEditor`). admin `scholarships` 탭은 KV 항목 에디터 → News식 deep-link 탭(히어로+안내문+/scholarships 열기)으로 교체. content-store `scholarships`를 `{intro.en}`만 남기고 items 제거(데이터는 D1). 카테고리 Government/University/Private·Foundation 유지. (이후 .091에서 상세 페이지로 확장.)
  - +01.088.19 — **프로그램 카드 아이콘 정렬 수정**: `.prog-icon` 인셋 28px→20px — 칩(하단)·장식 원(우상단)·미디어 패딩(20px)과 동일 기준선으로 좌상단 정렬(아이콘만 28px라 8px 어긋나던 문제). 홈·프로그램 카드 공통.
  - +01.088.18 — **아이콘 전체 점검(무효 lucide 이름 치환 + createIcons 하드닝 shim)**: lucide 0.461 유효셋(1540) 대조 → 무효 5종 치환(check-circle-2→circle-check-big, help-circle→circle-help, alert-triangle→triangle-alert, alert-circle→circle-alert, bar-chart-3→chart-column; 코드+content-store 기본값). index.html·admin.html에 `createIcons` 1회 래핑 shim: 별칭 매핑 + 미지의 이름은 `circle` 폴백 → 빈 아이콘 영구 방지("없는 아이콘 생성"), KV 옛값·미래 오타도 런타임 커버. CSP unsafe-inline로 인라인 shim 동작.
  - +01.088.17 — **공개 사이트 아이콘 사라짐 수정**: 공개 사이트가 `lucide.createIcons()`를 route 변경 시 1회만 호출 → FAQ 탭/아코디언/플로터가 내부 state로 재렌더되면 새 `<i data-lucide>`가 미처리되어 빈 사각형/원으로 노출(유효 아이콘 plus도 빔). App.jsx에 deps 없는 `useEffect(()=>lucide.createIcons())` 추가(매 렌더 재생성, 관리자 셸과 동일). 멱등·DOM전용이라 루프 없음, svg 치환 노드는 skip.
  - +01.088.16 — **홈 배너 모달 충돌 검토·정리**: (1) 배너 팝업이 쿠키 동의 배너와 첫 방문 동시 노출되던 것 → 분석동의 doc 존재+미결정 시 `cookiePending()`로 배너 보류(동의 우선, 광고는 다음 방문). (2) `.bnr-overlay` z 9000→9200 — 챗봇/맨위로 플로터(9000)는 광고 뒤로, auth/team 모달(9500)·버전 토스트(100000)는 위 유지. (3) 배너 Escape 닫기. 나머지(랜덤 reshuffle 멱등·lucide 멱등·오버레이가 nav 클릭 차단)는 충돌 없음 확인.
  - +01.088.15 — **홈페이지 배너 광고 팝업(최대 3개, 이미지 전용)**: 신규 `Banners.jsx`(`window.BannerAdModal`) — 홈 첫 진입(세션 1회, 전 방문자) 시 모달로 최대 3개 이미지 배너 노출(2개↑ 슬라이드+점), 이미지 클릭→link 새 탭. 방문자 컨트롤 "Close"(sessionStorage)·"Don't show again today"(localStorage 날짜). content-store `banners{enabled,items[]}`. 관리자 Homepage 그룹 "배너 광고(팝업)" 탭(`BannersTab`): 이미지 전용 업로드(png/jpg/webp/svg 4MB→R2)+링크+alt+순서/활성/사용 토글. App.jsx 렌더(view=home), site.css `.bnr-*`. 노출 시점은 "세션 1회"로 구현(로그인 게이트 아님 — 필요 시 조정 가능).
  - +01.088.14 — **홈 "프로그램 더보기" 카드 전체폭 1단 배너화**: `.prog-more`를 `grid-column:1/-1`로 4개 카드 아래 전체폭 배너로(좌측 큰 타이틀 + 우측 pill CTA, accent-purple-fill, 모바일 CTA 전체폭). 2열 그리드에서 홀로 좁게 남던 카드 → 쫙 채운 큰 밴드.
  - +01.088.13 — **sitemap.xml / robots.txt 정비**: 누락된 /scholarships 추가, news 글 lastmod를 오늘 고정→실제 작성일(normDate YYYY-MM-DD), robots에 /verify·/reset-password·/activate Disallow. 비-인덱스 경로 제외 주석화.
  - +01.088.12 — **SEO 사이트 인증 메타 서버사이드 주입**: 네이버/구글 등 인증 메타가 App.jsx 클라이언트 주입만 존재 → JS 미실행 크롤러가 원본 HTML에서 못 찾아 인증 실패(값은 KV 정상 저장). worker `serveSpaShell()`이 HTMLRewriter로 `<head>`에 `site_verifications`(google/naver/bing/facebook/pinterest/yandex) 일괄 주입. App.jsx는 멱등 fallback 유지. `curl /`·/about·/programs 메타 노출 검증.
  - +01.088.11 — **홈 프로그램 랜덤+더보기 카드 / 디자인 가이드 라이브 샘플 / 예외 주석 인라인화**: 홈 프로그램 티저를 매 로드 랜덤 4개(useMemo Fisher-Yates) + 5번째 "View all programs" 카드(→/programs, `.prog-more`). 관리자 디자인 가이드(wiki:design) 7개 페이지에 실제 렌더 샘플(스와치/버튼/타입/카드/폼/아이콘/간격)을 코드 옆 좌우로 추가 — admin이 토큰+site.css+lucide 로드해 live 렌더, `data-live-sample` 마커로 멱등. tokens-first 예외 사유를 코드 인라인 주석화(site.css 12 + admin 사이드바 + Pages color-input 2).
  - +01.088.10 — **디자인 토큰 정리(raw hex → 시맨틱 토큰, 전체 raw-level 색 감사)**: 신규 `--fg-on-fill`(상수 흰색, fill 위 텍스트) + `--receipt-*` 12종(인쇄 고정) 토큰. site.css `color:#fff`×22→fg-on-fill, dark btn `#7C3AED`→accent-purple-fill, topnotice→state 토큰, 영수증 블록 전체→receipt 토큰; Floaters/Member/Nav/Receipt jsx 배지·플로터·영수증 색 토큰화. **값-동일 치환만 적용(시각 무변화)**. site.css raw hex 59→17(전부 의도적 예외). 미변환 예외(흰 표면·일회성 컴포넌트색·항상-다크 관리자 chrome·color-input 기본값)는 `wiki:design` → "Tokens-first 예외" 페이지에 등록.
  - +01.088.09 — **메시지 탭 UX 개선 + 깨진 버튼(.adminlang) 수정 + 버튼 raw-level 감사**: 마이페이지 메시지 탭을 이니셜 아바타 + 여유 레이아웃 + 패널형 스레드로 친근화(답답한 좌우 여백 해소). 관리자 "회원 개별·그룹" 토글이 기본 버튼으로 깨지던 cross-scope 버그 수정(`.topbar .adminlang`→`.adminlang` 일반화). 전 .jsx + admin.html 버튼 raw-level 전수 감사(brace/quote 파서) — 실제 깨짐은 .icon-btn(공개, .08)·.adminlang(.09) 2종뿐, 나머지는 부모 descendant 규칙/.btn로 정상.
  - +01.088.08 — **버튼 규칙 위반(죽은 .icon-btn) 정리**: CSS 미정의라 기본 회색 박스로 렌더되던 `.icon-btn`을 표준 `.btn btn-ghost btn-sm`로 일괄 교체(Member 메시지 Delete, Apply 추천인 Remove, Pages 뉴스 Edit/Delete/Read more). danger는 color:var(--state-danger). CLAUDE.md §6 위반 수정.
  - +01.088.07 — **메시지 전송 실패 사유 구체화**: TeamMessageModal이 모든 `!res.ok`를 "Could not send"로 뭉뚱그리던 것을 서버 error 코드별(cannot_message_self / rate_limited / recipient_unavailable)로 분기해 명확한 안내. 운영자(CEO 계정)가 동일 계정 연결된 CEO 카드에 전송 시 서버 `cannot_message_self` 400을 반환하나 generic 문구로 가려져 self-send 거부임을 알 수 없던 문제. **실제 버그 아님** — 학습자→CEO(다른 계정)는 정상 전송.
  - +01.088.06 — **메시지 전송 401("session expired") 회귀 수정**: 운영자(유효 dp_session 쿠키 + 옛 `dp_user_token` 잔존)가 /team에서 메시지 전송 시 401. 원인: auth-store `fetchMe`의 쿠키-우선 성공 경로가 레거시 localStorage 토큰을 안 지워, `authFetch`가 stale 토큰을 `Authorization: Bearer`로 첨부 → 서버 `bearerToken()`이 헤더를 쿠키보다 우선 → 유효 쿠키 덮어쓰고 `currentUser=null` → 401. 수정: 쿠키 인증 성공 시 `clearLegacyToken()` 호출(쿠키가 authoritative). 새로고침하면 stale 토큰 정리되어 정상.
  - +01.088.01~.04 — **스파크라인 곡선화 + 코디네이터 통합 + CREDENTIALS + 프로필 사진 위치 + 오류로그 0건 정리**: 대시보드 스파크라인 Catmull-Rom 곡선화(.01). 프로젝트팀 코디네이터를 상단 메시지 밴드 카드로 통합(.02). 멤버 세부이력 CREDENTIALS 항목(.03). 프로필 사진 상하좌우 위치 조정 PhotoPos/photo_pos, 정사각 강제 해제(.04). 미해결 오류 12건은 v01.077 수정 이전 발생분 — 재발 0 확인 후 해결완료(미해결 0).
  - +01.088.00 — **관리자 모든 카드 기본 접힘**: card+h3 카드 62개를 접이식 details(admin-fold)로 일괄 변환(균형 스캐너, 복잡 58개 스킵, babel 통과). 전역 규칙.
  - +01.087.00 — **운영용 KO 정리**: 이메일 템플릿·내부 알림·문의 유형·stats KO 입력 제거(EN전용). RBAC 라벨·메일 컴포저·번역툴 유지.
  - +01.086.00 — **메뉴 이름 일괄 편집 탭**: 페이지·콘텐츠 하위 "메뉴 이름"(menu_names) 탭 — 상단 nav.en 8개 + 푸터 컬럼·항목 라벨 일괄 편집(EN전용, 접이식). 운영자 요청.
  - +01.085.00 — **공개 프론트 KO 입력 전면 삭제(EN전용) + 페이지 헤더 탭 폐지→지원/지원완료/마이페이지/장학 전용 탭**: 공개는 영어 전용이므로 Brand/Nav/Footer·Program(코스/강사Bio)·Long-form rich(한영→영어)·Essays·Notice·OG/SEO·About(hero/blocks/closing)·coord_cta·ProgramDetail Korean 카드의 KO 입력 제거 + 죽은 PartnerCtaTab 삭제. 운영용(이메일/내부메시지/RBAC/번역툴)·관리자 라벨은 유지. "페이지 헤더" 통합 탭 폐지하고 apply/apply_done/mypage/scholarships 전용 탭(PageHeroText, 우측 미리보기) 신설. 남은 lang=ko 11개는 운영용.
  - +01.084.00 — **스토리 2분류(추천자/학습자) + 아코디언 네이티브 마커 제거 + 소식탭 미리보기 + ProgramDetail EN전용**: 스토리에 kind(learner/leader) → 공개 /stories 두 섹션. admin 유형 select+배지. 모든 admin 아코디언 네이티브 ▼/▶ 제거(단일 chevron). 소식 탭 2단 미리보기. ProgramDetail Korean 본문 카드 제거.
  - +01.083.00 — **페이지별 헤더 관리 통합 + 파트너 통합 + FAQ 아코디언 + EN전용 + 카드 기본접힘**: PageHeroText(EN전용)로 News/파트너/스토리/FAQ/프로그램 탭에서 헤더(텍스트+배경) 직접 편집. "페이지 헤더" 탭은 전용 탭 없는 페이지(apply/apply_done/member/mypage/scholarships)만. 파트너 탭에 헤더+항목(이름 아코디언, ↑/↓)+파트너 CTA 통합, 별도 CTA 탭 제거. FAQ 질문 아코디언(기본 접힘)+EN전용. News 탭 실제 헤더 관리. 공개 EN전용 정책에 맞춰 손댄 편집기 KO 입력 제거(스토리 Quote 등), 공개 히어로 읽기 .en 우선. 새 접이식 카드 모두 기본 접힘(.admin-fold). **남은 작업**: 스토리 2분류(추천자/학습자), 메뉴명 일괄편집, 나머지 편집기 EN전용·카드접힘 전체 스윕.
  - +01.082.00 — **전 페이지 히어로 텍스트 편집 + News 관리 탭**: 하드코딩이던 Apply(폼/완료)·Member(로그인안내/마이페이지)·Scholarships 히어로 텍스트를 page_heros 키로 편집 가능화(Apply/Member/Scholarships가 page_heros.<key>[lang] 폴백 + useHeroBg 배경, 훅 최상단 호출). PageHerosTab(페이지 헤더)에 5키 추가 + live KV 시드. News를 사이드바 Content 그룹 탭으로 등록(글 관리는 /news 딥링크).
  - +01.081.03 — **러너 스토리 편집기 아코디언+순서이동**: StoriesTab을 팀 멤버 편집기와 동일하게 이름 기준 native <details> 아코디언(기본 접힘) + ↑/↓ moveStory + Delete로 개선(스토리 다수 시 관리 용이). + News 헤더 이미지 확인(버그 아님 — 페이지 헤더 탭에서 설정 가능, 현재 미설정).
  - +01.081.02 — **Team 약력 모달 "메시지 보내기" 항상 노출**: TeamProfileModal에서 계정 연결(messageable) 멤버에게만 보이던 메시지 버튼을 모든 멤버에게 항상 표시. 로그아웃 사용자는 회원가입/로그인 유도, 로그인 사용자는 연결 멤버면 DM·미연결이면 문의함(/api/team/message) fallback(기존 TeamMessageModal 재사용). 계정 미연결 멤버(예: CEO)에게 버튼이 누락되던 문제 해결. + 앞서 현재 코드 기준 KMS 18→핵심 9페이지 전면 갱신.
  - +01.081.01 — **버전 기록 시간 KST 고정 표시 + 타임스탬프 정상화**: 버전 기록 81개 페이지의 updated_at을 git 커밋 시각으로 채우고(63 정확 + 18 인접 배포 시각, 기존 가짜 00:00 UTC 제거), WikiTab 표시를 `toLocaleString(ko-KR,{timeZone:Asia/Seoul})` + `KST`로 고정해 해외 접속에서도 한국시간으로 보이게 함.
  - +01.081.00 — **저속/해외용 히어로 배경 점진 로딩(느리면 색만)**: 신규 `window.useImageReady(src)`(2.5초 타임아웃, `navigator.connection` Save-Data/2g면 이미지 미요청) + `window.useHeroBg`. 이미지가 타임아웃 내 로드되면 표시, 너무 느리면 색(bg_color)·기본 배경으로 폴백 → 무거운 사진이 해외 첫 로딩을 막지 않음. Home/About/PageHero/Programs/Team→useHeroBg(Team 인라인 2회→단일), ProgramDetail `.pd-header`는 useImageReady 게이트(폴백=program.color 그라디언트). v01.080 R2 분리와 결합해 콘텐츠 블롭 경량 + 점진 이미지. 팁: 이미지+배경색 함께 지정 시 저속에서 그 색으로 폴백.
  - +01.080.00 — **이미지 업로드 base64-in-KV → R2 전환(홈페이지 안정성)**: 운영자 안정성 점검 중 `/api/content`(~1.49MB)의 ~90%가 인라인 base64 이미지임을 확인 — 매 페이지 로드마다 받는 블롭이라 히어로 이미지 누적 시 급격히 무거워지고 KV 25MB 한도 근접 리스크. 신규 `POST /api/admin/upload-image`(data URL→R2 `public/img/<hex>`, 비암호화, 4MB 캡)→`/uploads/` URL, 공개 `GET /uploads/<path>`(R2 서빙·immutable 1년 캐시·`..`차단). `ImageUploadField`가 base64 대신 업로드 URL 저장(히어로 배경/로고/팀 사진/OG 공통, 히어로 maxBytes 4MB). 기존 base64 항목은 하위호환 유지(data: 렌더), 백필 후속. 라이브 R2 put→GET /uploads 200 검증.
  - +01.079.03 — **페이지별 히어로 배경 카드(접이식) + 2FA를 IDLE·IP에 결속**: 프로그램/파트너/스토리/문의·FAQ 편집 탭에 각 `page_heros` 키의 "히어로 배경" 카드를 직접 추가(HeroBgFields를 접이식 `<details>` 카드로, 기본 펼침 + ▶ + 설정 상태 배지). 2FA step-up 토큰에 `ip` 추가 → IP 변경 시 무효(코드 재요구). step-up 쿠키 TTL 15→30분(idle 창 일치). 신규 `POST /api/admin/totp/lock`(=clearStepupCookie)을 admin idle 타임아웃 핸들러 + logout()에서 keepalive로 호출 → IDLE/로그아웃 시 회원정보·학생지원 코드 재요구. 클라 stepupOk 재잠금 타이머도 idle 창에 맞춤.
  - +01.079.02 — **프로그램 상세 히어로 배경 + 히어로 배경 별도 카드 분리 + 이미지 히어로 여백 보강**: 프로그램 상세(`.pd-header`)에도 히어로 배경 이미지 지원(ProgramEditor "상세 히어로 배경" 카드, 색은 기존 program.color → HeroBgFields `hideColor`; ProgramDetail.jsx가 `p.bg_image` 시 이미지+오버레이로 색 그라디언트 대체). 히어로 배경 편집을 모든 탭에서 별도 카드로 분리(HeroBgFields가 자체 `.card`+제목 렌더, PageHerosTab은 Fragment로 페이지별). `.phead.has-hero-media`에 min-height 380px(모바일 260)+수직 중앙정렬+패딩 확대로 상하 여백 보강.
  - +01.079.01 — **히어로 이미지 위치 조정을 슬라이더 + 미리보기로**: HeroBgFields의 위치 드롭다운(9방향)을 가로/세로 슬라이더(0–100%)로 교체, `bg_position`을 "X% Y%"로 저장(레거시 키워드 파싱). 이미지가 있으면 슬라이더 따라 움직이는 미리보기 + 가운데 초기화 버튼. 공개 `window.heroBg`는 무변경.
  - +01.079.00 — **모든 히어로 배경 이미지 업로드 + 배경색/위치 선택 + 모바일 밴드 높이 축소**: 콘텐츠 기반 히어로 8개(Home `.hero` / About / page_heros 5종 / Team)에 배경 이미지·색·초점 위치 추가. 신규 `window.heroBg(node)`(content-store) — 이미지면 어두운 오버레이+흰 글씨+cover(위치), 단색이면 `isDarkHex` 휘도로 글씨색 자동, 비우면 기존 컬러 유지. 각 컴포넌트 히어로에 적용(인라인 style + `has-hero-*`). 관리자엔 재사용 `HeroBgFields`(ImageUploadField banner + Color + 위치 select)를 HeroTab/AboutTab/PageHerosTab(5)/TeamAdminTab에 삽입. 모바일(운영자): `.team-coord-band`(Meet our CEO) + `.cta-banner`(WANT TO JOIN US) 패딩/사진/제목 약 절반, 버튼 하단 전체폭(cta-banner 인라인 패딩 제거 + ≤720px 규칙을 900px 블록 뒤 배치).
  - +01.078.06 — **/team 상단 메시지 밴드 문구 편집 가능화 + 기본 "Meet our CEO"**: "Have a question?" 밴드의 하드코딩 kicker/title/sub를 `project_team.coord_cta`(ko·en) 스키마로 분리, admin → 프로젝트 팀 → "상단 메시지 밴드" 카드(한/영)에서 편집. 기본 문구를 "Meet our CEO"(KO "CEO에게 물어보세요") + CEO가 적절한 담당자를 연결한다는 안내로 변경. Team.jsx는 coord_cta를 읽고 비면 새 기본으로 폴백. live `dp_content_v1` KV에 coord_cta 시드.
  - +01.078.05 — **Project Team 편집기: 섹션·멤버 순서 이동 + 멤버 펼치기/접기 버튼**: 섹션 헤더 ↑/↓(moveSection), 멤버 아코디언 summary ↑/↓(moveMember)로 순서 조정(끝단 disabled). 멤버 summary에 chevron(▶, `[open]` 90° 회전) 명시적 펼치기/접기 버튼 추가 — 이름 클릭 토글도 유지. 이동·삭제 버튼은 stopPropagation으로 `<details>` 토글과 분리. site.css `.tm-chevron` + summary 마커 제거.
  - +01.078.04 — **Project Team 멤버 편집기 정비 + 모달 링크/연락처 + 계정검색 회귀 수정**: 멤버 편집을 이름 기준 아코디언(native `<details>`, 기본 접힘)으로, 입력 순서 사진→이름·직함→BIO→주요 약력→주요 프로젝트 역할→**주요 링크(links_en)**→**연락처(contact_email)**. 공개 멤버 모달에 링크(새 탭)·연락처(mailto) 섹션 추가. **회귀 수정**: AccountLinkField(메시지 받을 계정 검색)가 `/api/admin/users`(v01.077 step-up 게이트) 호출로 비-게이트 Project Team 탭에서 403 → 검색 불가였음. 경량 `GET /api/admin/account-search`(isAdmin만, step-up 불필요, id/name/email/role) 신설로 복구.
  - +01.078.03 — **코디네이터 세부약력 제거**: 코디네이터는 약력 프로필이 아니라 메시지 CTA 용도이므로, v01.078.01에서 추가했던 코디네이터 BIO/약력/역할 입력 3칸 + 사진 클릭 모달을 되돌림(멤버 카드 모달은 유지).
  - +01.078.02 — **/team "Have a question?" 코디네이터 사진 항상 컬러**: `.team-coord-photo`의 grayscale-until-hover → `filter:none`. 운영자 요청.
  - +01.078.01 — **Project Team 약력 모달 3단 구조 + 관리자 입력**: 멤버 클릭 모달을 ① BIO ② 주요 약력(career_en) ③ 이번 프로젝트 주요 역할(project_role_en) 3단으로. 관리자 프로젝트 팀 편집(멤버+코디네이터)에 "클릭 시 모달 내용" Area 3개 추가. Team.jsx TeamProfileModal이 값 있는 섹션만 라벨과 함께 렌더. site.css `.team-profile-section/-label`. (admin 팀 탭은 EN-only 예외 유지.)
  - +01.078.00 — **관리자 2FA 계정단위(per-account) 전환 + Project Team 약력 모달**: v01.077의 단일 공유 2FA를 계정별로 전환(마이그레이션 0038 `users.totp_secret_enc`/`totp_confirmed_at`, encryptPii). 콘솔이 이미 계정별 로그인이라 `totpIdentity(request)`로 user 세션/bare ADMIN_TOKEN 분기 — user는 자기 계정 비밀키(+pending 단명 KV), token은 레거시 `admin:totp_v1` fallback. 5개 totp 엔드포인트 identity 기반, otpauth label=이메일. **step-up 쿠키에 uid 바인딩** → admin A 쿠키로 admin B 세션 통과 불가. 신규 `POST /api/admin/users/:id/totp-reset`(step-up+audit, 분실 admin 초기화→재등록 강제), `GET /api/admin/users/:id`에 `totp_enrolled`. admin: TwoFactorTab "내 계정" 문구+account 표시, MembersTab admin 회원 상세에 2FA 배지+초기화 버튼. Project Team 멤버·코디네이터 카드 클릭 → 약력 모달(TeamProfileModal). wiki(versions 3페이지 + kms 보안모델/관리자/changelog) 동시 갱신.
  - +01.077.00 — **회원정보/학생지원 탭 TOTP 2단계 인증(step-up) + 미해결 오류 3건 수정**: 가장 PII가 많은 Members/StudentSupport 그룹 탭과 해당 엔드포인트(`/api/admin/users`·`groups`·`search`, `/api/consents`, `/api/applications` admin GET·:id·bulk·files, `/api/inquiries` GET·:id·bulk)에 Google Authenticator(TOTP, RFC 6238) step-up을 **서버 단계 강제**. step-up = HttpOnly 쿠키 `dp_admin_stepup`(15분, HMAC 서명, PII 키 도메인분리). `pathNeedsStepUp ∩ isAdmin`일 때만 403 stepup_required → 회원 self-service(receipt/:id) 무영향. TOTP 코어 자체구현(base32 + Web Crypto HMAC-SHA1 + dynamic truncation, **RFC 6238 표준 벡터 5/5 통과**). 비밀키는 `encryptPii`로 KV `admin:totp_v1`에 암호화 저장, pending→confirmed 2단계 등록(오스캔 잠금 방지). 신규 5개 엔드포인트(state/setup/confirm/verify/disable, rate-limit + admin_audit). admin: `AdminStepUpGate`(탭 게이트) + Setup→**2단계 인증** 탭(`TwoFactorTab`, QR+수동키+confirm/disable), qrcode-generator(MIT) `/ui_kits/website/vendor/` 로컬 벤더링(CSP 'self'). **오류수정**: structuredClone 폴리필(content-store `dpClone`+admin 4곳, 구형 브라우저 백지 해결) / analytics ingest D1 timeout 내성화(500→204)+전역 catch transient D1 error→warn 강등 / `<html translate="no">`(자동번역 removeChild 크래시 제거). 오류 로그 27건 트리아지(해결 15 + 미해결 12 분석) 후 진행. wiki:versions·wiki:kms(보안모델·관리자기능·changelog) 동시 갱신. **Phase 5(admin 2FA) 보류 해제.**
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

### 관리자 백지 방어 세 겹 · 배포 후 렌더 스모크 — v01.101.11
- v01.101.10 사고에서 남은 둘을 닫았다. 피해를 키운 것은 재귀가 아니라 **아무도 모른
  채 방치된 것**이었다 — 안내도 보고도 없었다.
- **세 겹은 겹치는 게 아니라 각자 다른 실패를 잡는다**: 부트 워치독(React/Babel 이
  **아예 못 뜬** 경우) · 에러 경계 2단(렌더 중 예외) · 전역 핸들러(이벤트·비동기).
  공개 사이트엔 워치독이 v01.097 부터 있었는데 **관리자에는 없었다.**
- **탭 단위 경계** — 탭 하나가 죽어도 나머지 49개는 산다. 지난 사고에서 실제로
  `DashboardTab` 이 먼저 죽었다.
- **`jsx-check` 이 `.jsx` 만 보고 있었다** — 관리자 앱은 `admin.html` 인라인 50만 자라
  **관리자 화면 전체가 구문검사 밖**이었다. 이제 인라인 블록도 본다(23 → 24).
- **`recursion-check.mjs`** — 조건 없이 자기를 부르는 함수를 AST 로. v01.101.10 의 실제
  코드를 되돌려 잡는 것을 확인했고, 같은 코드를 구문검사는 여전히 통과시킨다.
- **`smoke.mjs`** — CDP 로 실제 브라우저에서 마운트 확인(약 7초). npm 의존성 0.
  Chrome 이 없으면 **종료코드 2** — 실패(1)와 다르며 **통과가 아니다.**
- ⚠️ 스모크 실패해도 **자동 롤백하지 않는다.** 검사가 틀릴 수 있다 — 실제로 첫 판이
  멀쩡한 홈을 죽었다고 했다(`--virtual-time-budget` 이 워치독 9초 타이머를 즉시 터뜨림).
- ⚠️ **남은 것**: `admin.html` 인라인 500KB 분할.

### 관리자 화이트 스크린 긴급 수정 — v01.101.10
- `admin.html` 의 `authHeaders(extra)` 가 자기 자신을 호출해 `RangeError: Maximum call
  stack size exceeded`. 에러 경계가 없어 `Gate` 아래 `Admin` 트리 전체가 언마운트 →
  `/admin` 이 완전한 백지였다.
- 뿌리는 **v01.101.07 의 헬퍼 통합**이다. 네 곳에 중복돼 있던 `authHeaders()` 를 하나로
  합칠 때 기본 헤더를 만드는 본체가 빠지고 재귀 호출만 남았다.
- **문법상 완벽한 코드**라 preflight 의 JSX 구문검사를 통과했고, 라이브 HTML 은 HTTP 200
  에 로컬과 바이트 단위로 같았다 — **정상 신호가 셋이나 있었다.** 헤드리스 브라우저로
  실제 콘솔을 읽어야 스택이 나왔다.
- 배포 후 다시 열어 관리자 콘솔이 끝까지 렌더되는 것을 확인했다.
- ⚠️ **남은 것**: 관리자 트리에 에러 경계가 없다. 어떤 렌더 예외든 곧바로 백지가 된다.
  인라인 스크립트 500KB 분할과 함께 다음 라운드 후보.
- ⚠️ 재귀가 살아 있던 동안 관리자 API 는 요청 자체가 나가지 못했다 — **재로그인 필요.**
- `wiki:versions` 에 누락돼 있던 **v01.101.06~09** 네 페이지를 함께 채웠다(148 → 153).

### 봇 제외 · 오류 정리 · 이모지 제거 · 인사이트 콘솔 — v01.101.04·05

운영자 지시 다섯 건을 한 라운드로. **"지난 100개 중 71개 오류"는 장애가 아니라
집계의 결함이었다** — 최근 25건 중 22건이 bingbot 한 마리였고, 나머지는 이미
고쳐진 옛 오류인데 아무도 해결 표시를 하지 않았다. 메일 수신 성공 로그(`info`)
까지 오류로 세고 있었다.

- `isBotUserAgent()` + 마이그레이션 0041(`analytics_events.is_bot`). 분석 읽기
  10곳과 `/api/errors` POST 에서 봇·AI 에이전트 제외. **행은 지우지 않는다.**
- 오류 71건을 원인별로 사유와 함께 `resolved` 처리. `/api/errors` GET 의
  `level` 이 콤마 목록 지원 → 대시보드는 `error,warn`.
- 이모지 전면 제거(UI·메일 기본값·라이브 KV). preflight 가 재발을 막는다 —
  **성질로 판정**한다: `→` 332개 같은 흑백 기호는 이모지가 아니다.
- 관리자 `<details>` 76개 상시 펼침 + 토글 무력화.
- `POST /api/admin/insight` + 우측 하단 InsightConsole. **규칙 기반, LLM 없음**
  (운영자 선택).

### 수신 발신자를 From 헤더에서 읽는다 — v01.101.03

수신 메일의 발신자가 `010c01a…@ap-northeast-2.amazonses.com` 로 저장됐다.
`message.from` 은 envelope sender(반송 주소)다 — SES·메일링리스트는 여기에 VERP
주소를 넣는다. `startReply()` 가 `from_addr` 를 수신자로 잡으므로 **답장이 반송
처리기로 나갔을 것**이다. `From:` 헤더 우선으로 바꾸고 `firstEmailAddress()` 를
더했다. **기존 15통은 백필 불가** — raw 를 보관하지 않는다.

### 메일 읽기 창 붕괴 수정 — v01.101.02

관리자 메일함에서 메일을 열면 제목이 한 글자씩 18줄로 접히고 본문 첫 줄에
SES message-id 가 노출됐다. 읽기 창 머리말을 세로 2단(툴바 / 메일 정보)으로
바꾸고, 살균기가 숨김 프리헤더를 노출시키지 않게 하고, `.mail-body table` 에
`width:100%` 를 더했다. 원인은 툴바의 `flexShrink:0` — 노트북에서 읽기 pane 은
550px 인데 툴바가 467px 를 양보하지 않아 제목 칼럼이 17px 로 굶었다.
`admin.html` 단독 변경.

### 안정성 결함 3건 수정 — v01.101.01

- ⚠️ **`RichEditor.jsx` 는 관리자 전용이 아니다.** 공개 `index.html:68` 이 로드하고
  `Pages.jsx`(공개 뉴스 편집기)가 쓴다 — 여기서 난 사고는 공개 화면까지 간다.
  이 파일을 고칠 때는 공개 사이트도 함께 확인할 것.
- 드래그 도중 언마운트 → `pointerup` 이 오지 않아 리스너가 남고
  `body{user-select:none}` 이 눌러붙었다 (새로고침해야 풀림) →
  `dragCleanupRef` + 언마운트 훅으로 보장.
- `userSelect` 복원을 `''` 대신 **드래그 시작 시점 값**으로. 빈 문자열은
  복원이 아니라 삭제다.
- 메일 임시저장의 빈 `catch` 제거 → 실패 시 저장 시각을 지우고 경고를 띄운다.
- 훅 순서: 새 `useEffect` 는 `if (!ready)` 조기 반환 **앞**에 (82 vs 139행).
  뒤에 넣으면 TipTap 로딩 전후로 훅 개수가 달라져 React 가 죽는다.

### 에디터 본문 높이 조절 — v01.101.00

- `RichEditor` 에 `resizable` · `storageKey` prop. 켜면 본문 아래 손잡이
  (`.rt-resize`)가 생기고 끌어서 120~2400px 로 조절.
- 높이는 `localStorage['dp_editor_h:<storageKey>']` 에 기억. 더블클릭 = 기본값,
  키보드 ↑/↓(Shift 시 4배)·Home 지원.
- 메일 작성 본문에 적용(`storageKey="mail-compose"`, 기본 320px).
- ⚠️ `resizable` 기본값은 `false` — `Pages.jsx`·프로그램 상세 에디터는 그대로.
  켜는 곳마다 `storageKey` 를 줘야 높이가 기억된다.
- 패턴 규약은 `wiki:design` → 폼 컴포넌트에 등재 (끌기·더블클릭·키보드 셋을
  모두 갖춘 조절 UI 만 허용).

### 메일 작성 상식화 (자동 임시저장 · 기본 펼침) — v01.100.00

- 관리자 메일함 작성 폼을 **기본 펼침**(`<details open>`)으로. 작성 화면에
  들어온 시점에 접어 둘 이유가 없었다.
- **60초 자동 임시저장** — `localStorage` 키 `dp_mail_draft_v1:<계정>`.
  저장 시점 넷: 60초 인터벌 · `beforeunload` · 언마운트 · '닫기' 버튼.
  다시 열면 복구되고 발송 성공 시 삭제된다.
- 마지막 저장 시각 표시 · 임시저장 삭제 버튼 · '취소' → **'닫기 (임시저장)'**.
- ⚠️ 첨부(base64)는 localStorage 한도(≈5MB)를 넘겨 **제외**. 초안 슬롯은
  계정당 1개 — 답장을 새로 시작하면 이전 초안을 덮어쓴다.

### 홈페이지 부정어 전면 제거 (긍정형 리라이트) — v01.099.00
- **지시**: "홈페이지에 전반적으로 부정어를 모두 제외해줘" (2026-08-23). 확정 방침 — **부정 표현을 긍정형으로 다시 쓰되 뜻은 유지**.
- **왜**: 같은 사실도 「~할 수 없습니다」로 말하면 이용자에게 차단·거절로 읽힌다. 접수 마감·심사 결과·입력 오류처럼 **이미 불편한 자리**일수록 표현이 상태를 키운다.
- **범위**: 오류 화면 4종(403·404·500·503) · 게이트 3종(apply/programs/entry) · FAQ 3건 · 후기 2건 · `how.steps` · `page_heros` · `project_team.hero` · `about.exec` · `inquiry_categories` · `email_templates` 7종 · 폼 검증·업로드·로딩·빈 상태 문구 전반 · `index.html` 부트 워치독 폴백. ko/en 짝을 함께 이동.
- **핵심 예시**: 「페이지를 찾을 수 없습니다」→「주소를 다시 확인해 주세요」 · 「현재 신규 모집 중인 프로그램이 없습니다」→「다음 모집을 준비하고 있습니다」 · 「이번 심사에서는 선정되지 않았습니다」→「이번 심사에서는 다른 지원자가 선정되었습니다」 · 「등록된 소식이 없습니다」→「새 소식이 준비되면 이곳에 올라옵니다」 · 🚫「파트너 대학에서 결제 금지」→💳「등록금을 받는 곳은 여기 한 군데입니다」.
- **세 곳 동시 반영**: KV `dp_content_v1` · `content-store.js` 의 `DEFAULT_CONTENT` · `.jsx` 하드코딩. 한 곳만 고치면 첫 페인트에서 코드 기본값이 이겨 옛 문구가 되살아난다(`rules/05-do-not.md`).
- **의도적으로 유지**: ① 약관·개인정보처리방침의 **「동의 거부권 + 거부 시 불이익」 조항** — 개인정보보호법 제22조가 명시 고지를 요구. 같은 문서라도 면책·의무 서술문(제6조·제7조)은 긍정형화. ② **동작 버튼명**(취소/Cancel · 삭제/Delete · 쿠키 거부/Decline)과 **신청 상태 라벨**(취소됨/CANCELLED) — 기능 식별자. ③ 관리자 화면(`admin.html`)은 범위 밖.
- **검증**: `@babel/standalone` 으로 `.jsx`·`.js` 전 파일 파싱 통과(리터럴이 깨지면 사이트 전체 백지) · `preflight.mjs` 경고 0 · KV 키 손실 0 · 라이브 경로 13개 200 · 라이브 `/api/content` 문구 직접 확인.

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
