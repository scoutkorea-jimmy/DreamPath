# DreamPath — Public Website

VS Code로 가져가서 실제 구현할 수 있도록 정리된 메인 사이트 번들.

## 폴더 구조

```
handoff-website/
├── index.html              ← 진입점
├── admin.html              ← 콘텐츠 관리자 (localStorage 기반)
├── site.css                ← 전체 스타일
├── content-store.js        ← 콘텐츠 store (admin과 연결)
├── copy.js                 ← 다국어 카피 (ko/en)
├── App.jsx                 ← 라우터 + 언어 토글
├── Nav.jsx, Footer.jsx     ← 공통 chrome
├── Home.jsx                ← 홈/랜딩
├── About.jsx               ← 프로젝트 소개
├── Programs.jsx            ← 프로그램 리스트
├── ProgramDetail.jsx       ← 프로그램 상세
├── Apply.jsx               ← How to Apply + 신청 폼
├── Pages.jsx               ← Partners + Stories + News + Contact (번들)
└── assets/
    ├── logo-dreampath*.svg ← 로고 8종 (mark / horizontal / stacked / mono / app-icon / favicon)
    ├── placeholder-*.svg   ← 이미지 플레이스홀더
    └── icons/              ← 18개 SVG 아이콘
```

## 로컬 실행

CDN 기반 (Babel-in-browser)이라 정적 서버만 있으면 됨:

```bash
# 옵션 1 — Python
python3 -m http.server 8080

# 옵션 2 — Node (npx)
npx serve .

# 옵션 3 — VS Code Live Server 익스텐션
```

브라우저에서 `http://localhost:8080/index.html` 접속.
관리자: `http://localhost:8080/admin.html`

## 프로덕션 전환 시

현 구조는 시안용 — 빌드 단계가 없습니다. 실제 배포 시:

1. **Vite + React 마이그레이션** (권장)
   - `.jsx` 파일들 그대로 import 체인으로 묶음
   - Babel CDN 제거, 번들러로 트랜스파일
   - `window.X` 글로벌 의존을 ES module export 로 교체

2. **Tailwind / CSS Module 도입**
   - 현 `site.css`는 단일 글로벌. 컴포넌트 단위로 쪼개거나 Tailwind 로 마이그레이션

3. **백엔드 연동**
   - `content-store.js` 가 현재 localStorage 사용 → CMS API 로 교체
   - `Apply.jsx` 폼 → POST 엔드포인트 연결

## 디자인 토큰

- **Primary** Midnight Purple `#4D006E`
- **Accent** Scouting Purple `#7F3F98`
- **Highlight** Sunshine Yellow `#FFD400`
- **Type** Pretendard (KO) + Inter (EN)
- 자세한 토큰은 `site.css` 의 `:root` 블록 참조

## 다국어 추가

`copy.js` 에 새 top-level key 추가 (예: `ja`, `vi`).
`Nav.jsx` 의 언어 토글 옵션에 코드 추가.
