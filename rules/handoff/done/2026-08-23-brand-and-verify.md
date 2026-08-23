# HANDOFF · 브랜드 표기 규칙 확정 + 메일 목적지 인증

- **시작**: 2026-08-23 (KST)
- **지시 원문**: "드림패스가 우리 사업명이라고 생각하면 좋을듯해. 인증메일 한번 더
  보내줘. 그럼 내가 승인해놓을께"
- **상태**: 완료 (2026-08-23) · v01.098.02

## 해석
1. **브랜드 2단 구조 확정** — `KoreaDreamPath` = 법인/사이트,
   `Dream Path`(드림패스) = **사업(프로그램)명**. 섞여 있는 게 오류가 아니라 규칙이었다.
   → 규칙으로 못 박고, **표기 흔들림만** 정리한다.
2. **Cloudflare 목적지 인증 메일 재발송** — `scoutkorea@kakao.com`.

## 진행
- [x] 메일 목적지 등록 + 인증 (아래 "메일 인증" 참조)
- [x] 브랜드 2단 구조 확정 + 표기 흔들림 정리 · CLAUDE.md 규칙화 · v01.098.02 배포

## 메일 인증 — 예상과 달랐다
- `wrangler email routing addresses list` → **"No destination addresses found."**
  즉 **목적지 주소가 애초에 등록된 적이 없었다.** 인증 메일도 발송된 적이 없다.
  ⚠️ 8/22 에 내가 "인증 메일 링크를 눌러 주세요" 라고 안내한 것은 **틀린 안내**였다.
  KV 에 `forward_to` 를 넣는 것과 Cloudflare 에 목적지를 등록하는 것은 별개다.
- `email_routing:write` 스코프가 없어 막혀서 `wrangler login` 재인증 → 스코프 확보.
- `addresses create scoutkorea@kakao.com` → 생성과 동시에 **`verified` 타임스탬프가 찍혔다**
  (계정 소유 주소라 Cloudflare 가 자동 인증). 운영자가 따로 누를 것이 없다.
- 라우팅 전 구간 확인: Email Routing `enabled/ready`, **catch-all → worker `dream-path`**,
  KV `email_templates.forward_to = scoutkorea@kakao.com`.
  → **다음 수신 메일부터 자동 전달된다.**

## 브랜드 — 2단 구조로 확정
운영자: "드림패스가 우리 사업명이라고 생각하면 좋을듯해."
| 층위 | 표기 | 자리 |
|---|---|---|
| 법인 · 사이트 · 발신자 | **KoreaDreamPath** | 브랜드명 · 워드마크 · 메일 발신자 · 약관 주체 |
| **사업(프로그램)명** | **Dream Path** / **드림패스** | 본문에서 프로그램을 가리킬 때 |
| 법인 정식명 | (주)코리아드림패스 · Korea Dream Path Co., Ltd. | 법적 문서 · 경력 |

**섞여 있는 것이 오류가 아니었다.** 그래서 일괄 치환하지 않고 **표기 흔들림만** 고쳤다:
- `DreamPath`(한 단어, Korea 없이) → `Dream Path` / 한국어는 `드림패스`
- `DreamPath TF`(레거시) → `KoreaDreamPath 팀` — **KV 는 8/22 에 고쳤지만 코드 기본값에 남아 있었다**
- 정리 대상: KV 에세이 문항 2 · `Apply.jsx` 폴백 2 · `content-store.js` 기본값 4 · `Auth.jsx` 가입 안내 1

규칙은 `CLAUDE.md` §8 에 표로 못 박았다(다음 세션이 또 "혼재"로 오해하지 않도록).

## 검증
- 라이브 콘텐츠: `KoreaDreamPath` 59 · `Dream Path` 30 · **`DreamPath` 단독 0** · `드림패스` 1.
- 공개 사이트 전 라우트 4xx 0 · 예외 0.
