# HANDOFF · 관리자 메일함 본문 렌더링 붕괴

- **시작**: 2026-08-27 (KST)
- **지시 원문**: "메일 읽으려고 하면 이렇게 되네. 이 문제를 해결해볼래?" (스크린샷 첨부)
- **상태**: 완료 (v01.101.02 배포·푸시·위키 반영)
- **기준 버전**: v01.101.01

## 증상
관리자 → 메일함 → Partner 에서 메일을 선택하면 읽기 창의 제목·발신자·본문이
한 글자씩 세로로 눌려 읽을 수 없다. 본문 첫 줄에 SES message-id
(`010c01a...@ap-northeast-2.amazonses.com`)가 그대로 노출된다.

## 1차 진단 (재현 하네스로 측정)
`admin.html` 의 CSS + `sanitizeMailHtml` 을 그대로 뽑아 재현 페이지를 만들고
Playwright 로 실제 폭을 쟀다.

| reader 카드 폭 | 헤더 왼쪽 칼럼 | 버튼 그룹 |
|---|---|---|
| 1076px | 539px | 467px (정상) |
| 624px  | **87px** | 467px (붕괴 — 스크린샷과 일치) |

- **결함 A** — 읽기 창 헤더의 버튼 그룹이 `flexShrink:0`. 버튼 6개의 고유 폭
  467px 가 줄지 않아, 사이드바가 있는 1440px 급 화면(오른쪽 pane ≈ 550px)에서
  제목·발신자 칼럼이 87px 로 눌린다.
- **결함 B** — `sanitizeMailHtml` 이 `style` 속성을 통째로 버려서, 마케팅 메일의
  숨김 프리헤더(`display:none`)가 본문 맨 위에 노출된다. 스크린샷의 message-id
  가 바로 그것.
- **결함 C** — 같은 이유로 레이아웃 테이블의 `width` 도 사라지는데
  `.mail-body table` 에는 `max-width:100%` 만 있고 `width` 가 없어, 중첩
  테이블이 auto layout 으로 셀을 min-content 까지 압축할 수 있다.

## 진행
- [x] 핸드오프 생성
- [x] 재현 하네스로 결함 A 확정
- [x] 수정 3건 + 하네스 회귀 확인 (제목 칼럼 17px→495px · 제목 18줄→2줄 ·
      프리헤더 제거 · 본문이 폭 495px 를 전부 사용)
- [x] 운영자 요청 반영 — wrap 대신 **세로 2단**(툴바 위 / 메일 정보 아래).
      wrap 은 특정 폭에서만 성립하고, 2단은 어떤 폭에서도 성립한다.
- [x] preflight 통과 · `npx wrangler deploy` · 라이브 version.js 01.101.02 확인
- [x] 커밋·푸시 · `wiki:versions` v01.101.02 · `wiki:kms` 99 Change log + 11 메일함
- [x] `rules/03-history-success.md` 등재
