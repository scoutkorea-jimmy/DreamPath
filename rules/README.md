# Rules — AI 작업 규칙 폴더

이 폴더는 **AI(Claude)가 이 저장소에서 일하는 방식**을 담는다.
사람이 읽어도 되지만, 1차 독자는 매번 기억을 잃고 오는 AI다.

규칙 본문의 **정본은 저장소 루트 [`CLAUDE.md`](../CLAUDE.md)** 이고,
이 폴더는 그 규칙이 굴러가면서 **쌓이는 기록**을 담는다.

## 언제 무엇을 읽나

| 상황 | 읽을 파일 |
|---|---|
| 세션 시작 · 지시를 받았을 때 | [`00-workflow.md`](00-workflow.md) → 핸드오프부터 만든다 |
| 새 기능·새 화면·새 API를 만들려 할 때 | [`01-inventory.md`](01-inventory.md) — **이미 있는지 먼저 확인** |
| 디자인·CSS·컴포넌트를 손댈 때 | [`02-design-system.md`](02-design-system.md) |
| 무엇을 어떻게 고쳤는지 궁금할 때 | [`03-history-success.md`](03-history-success.md) |
| "이거 예전에 시도해봤나?" | [`04-history-failure.md`](04-history-failure.md) |
| 무엇을 하면 안 되는지 | [`05-do-not.md`](05-do-not.md) — **매 라운드 시작 전 필독** |
| 주간 점검일이 지났을 때 | [`06-weekly-review.md`](06-weekly-review.md) |
| 진행 중인 작업이 있는지 | `handoff/ACTIVE-*.md` (없으면 진행 중인 작업 없음) |

## 폴더

```
rules/
├── README.md                  ← 지금 이 파일 (라우팅표)
├── 00-workflow.md             ← 작업 절차 (핸드오프 → 작업 → 기록 → 종료)
├── 01-inventory.md            ← 구현 인벤토리 (자동 생성물, 손대지 말 것)
├── 02-design-system.md        ← 디자인·CSS·컴포넌트 재사용 규칙
├── 03-history-success.md      ← 성공 히스토리 (최신 우선)
├── 04-history-failure.md      ← 실패 히스토리 (사유 + 재시도 조건)
├── 05-do-not.md               ← 금지 사항 · 운영자가 불편을 호소한 것
├── 06-weekly-review.md        ← 주간 점검 큐 (새 모델·새 절차로 재도전)
├── handoff/
│   ├── TEMPLATE.md            ← 핸드오프 서식
│   ├── ACTIVE-*.md            ← 진행 중 (하나씩 유지)
│   └── done/                  ← 완료 보관
└── tools/
    └── build_inventory.py     ← 01-inventory.md 재생성 스크립트
```

## 이 폴더와 기존 문서의 관계

| 문서 | 역할 | 계속 쓰나 |
|---|---|---|
| `CLAUDE.md` (루트) | **AI 가이드 정본.** 하드 룰 + 라우팅 | 예 — 규칙은 여기에만 쓴다 |
| `rules/` | 살아 움직이는 기록(핸드오프·히스토리·인벤토리) | 예 |
| `HANDOFF.md` (루트) | **배포 릴리즈 로그**(버전별 누적). 크고 과거 지향적 | 예 — 버전 기록 전용 |
| 관리자 위키 (KV `wiki:*`) | 운영자가 관리자 콘솔에서 보는 기능 정의서·변경 로그 | 예 — 운영자용 정본 |

⚠️ **헷갈리기 쉬운 지점**: 진행 중 작업 추적은 `rules/handoff/ACTIVE-*.md`,
배포된 버전 기록은 루트 `HANDOFF.md`. 이름이 비슷하지만 다른 물건이다.
