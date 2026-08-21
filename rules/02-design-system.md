# 02 · 디자인 시스템 · 재사용 규칙

> 목적: **같은 것을 두 번 만들지 않는다.** 새 화면을 그리기 전에 여기와
> `01-inventory.md` 의 CSS·토큰 목록을 먼저 본다.

## 정본이 어디에 있나

| 대상 | 정본 | 비고 |
|---|---|---|
| 색·타이포·간격·반경·그림자 | `colors_and_type.css` | **토큰 141개.** 여기 없으면 먼저 토큰을 추가 |
| 공개 사이트 컴포넌트 | `ui_kits/website/site.css` | 클래스 426개 — 새로 만들기 전에 검색 |
| 관리자 콘솔 | `ui_kits/website/admin.html` 내 `<style>` | 항상 다크 chrome |
| 디자인 가이드(운영자용) | 관리자 → 위키 → 디자인 / 색 / 로고 | KV `wiki:design` 등 |

## 절대 규칙

1. **raw hex 금지.** 색은 `var(--토큰)`. 일회성 예외는 그 자리에 주석 +
   위키 "Tokens-first 예외" 페이지에 등록.
2. **버튼은 `.btn` + variant** (`primary` / `secondary` / `ghost` / `white` /
   `outline`) + 선택적 크기(`btn-sm` / `btn-lg`), 전체폭은 `btn-block`.
   인라인 스타일로 패딩·색을 덮어쓰지 않는다.
3. **한글 줄바꿈은 어절 단위.** 한글이 들어가는 블록에는
   `word-break: keep-all; overflow-wrap: break-word;`. 넣은 뒤 좁은 폭에서
   가로 스크롤이 안 생기는지 확인.
4. **공개 문자열은 ko/en 둘 다.** 스키마는 `*_ko` / `*_en` 또는 `.ko` / `.en`.
5. **새 CSS는 스코프 안에.** 전역 셀렉터를 늘리지 말고 컴포넌트 클래스
   아래에 둔다 (예: `.mail-body td`).
6. **빌드 스텝 추가 금지.** Babel-in-browser 가 의도된 선택이다. 번들러가
   필요하면 먼저 제안한다.

## 새 화면을 만들기 전 체크

- [ ] `01-inventory.md` 에서 비슷한 화면/클래스를 찾아봤다
- [ ] 재사용할 수 있는 것을 재사용했다 (`.card` `.section` `.container-narrow`
      `.phead` `.btn` `.pill` `.member-card` `.apply-card` …)
- [ ] 색·간격을 토큰으로만 썼다
- [ ] ko/en 둘 다 넣었다
- [ ] 다크/라이트 양쪽에서 확인했다
