# HANDOFF · 메일 본문 높이 조절

- **시작**: 2026-08-25 (KST) · v01.100.00 라운드 직후
- **지시 원문**: "메일 작성 시 바디영역을 늘리고 줄일수 있게 만드는게 필요해"
- **상태**: 완료 (2026-08-25)
- ⚠️ 규칙 A 위반 — 코드를 먼저 만지고 핸드오프를 뒤에 썼다. 다음엔 먼저.

## 목표
- [x] 메일 작성 본문을 드래그로 늘리고 줄일 수 있다
- [x] 조절한 높이가 다음에 열 때도 유지된다
- [x] 마우스 없이도 조절 가능 (키보드)
- [x] 배포 · 커밋/푸시 · 위키

## 사전 확인 (이미 있는가)
- `RichEditor.jsx` 는 `minHeight` prop 만 받음 — **높이 조절 기능 없음**
- `.rt-content { min-height:160px }` (site.css:2176) 고정
- 왜 새로 만드나: 조절 수단이 코드베이스에 전혀 없음. `resize:vertical` 만으로는
  TipTap 컨테이너에서 기억이 안 되고 손잡이가 안 보인다 → prop 방식으로 추가하되
  **`resizable` 을 켠 곳에서만** 동작 (Pages.jsx·프로그램 상세는 그대로).

## 진행
- [x] RichEditor.jsx 에 `resizable` / `storageKey` prop + 손잡이
- [x] site.css `.rt-resize` (토큰만)
- [x] admin.html 메일 작성 본문에 적용
- [x] 배포 v01.101.00 · 커밋 f705a3e · 푸시
- [x] `wiki:versions` v01.101.00 · `wiki:kms` 메일함+Change log · `wiki:design` 폼 컴포넌트
- [x] `HANDOFF.md` §1/§3 · `rules/03-history-success.md`

## 남은 것
- 실브라우저 확인 미실시 (세션에 브라우저 도구 없음) — 관리자 → 메일 작성에서
  손잡이 끌기 · 더블클릭 복귀 · 새로고침 후 높이 유지 1회 확인 필요.
