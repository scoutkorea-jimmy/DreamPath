# CLAUDE.md — KoreaDreamPath project rules

> **READ THIS FIRST.** Every coding session on this repo must start by re-reading
> this file. Rules and conventions below have been earned through real
> incidents — ignoring them costs hours.
>
> **Then read [`HANDOFF.md`](./HANDOFF.md)** for the current site snapshot —
> what's deployed, what's pending, and the next-up backlog. Refreshed at the
> end of each significant session.
>
> **Then read [`CLAUDE_TASKS.md`](./CLAUDE_TASKS.md)** if present for the
> historical backlog. Pick from the top of P0 unless the user has asked for
> something specific. Don't pick from the middle of the list without a reason.
>
> **Wiki cross-reference**: Functional specs, change log, and the "intentional
> exceptions" register live in admin → 위키 → KMS (KV-backed, editable in the
> admin console). When you ship a non-trivial feature, add a page or
> addendum + a Change log line.

---

## 1. Project at a glance

- **Live site:** https://koreadreampath.com
- **Stack:** Cloudflare Workers + KV + D1 + static assets (no build step).
- **Frontend:** React 18 UMD + Babel-in-browser + plain `.jsx` files.
- **Asset directory:** `./` (the entire repo). Excluded files in `.assetsignore`.
- **Worker entrypoint:** `worker.js` (ESM module worker).
- **Bindings:**
  - `CONTENT_KV` — admin-edited content blob (`dp_content_v1`) + wiki pages
  - `DB` — D1 database `dreampath-db`. Schema in `migrations/`.
  - `ASSETS` — static asset binding for the public site.
  - `ADMIN_TOKEN` (secret) — bearer token for `/admin` and admin APIs.

## 2. Hard rules

0. **🔴 위키 갱신은 최우선 (NEVER SKIP).** 모든 코드/콘텐츠/스키마
   변경은 같은 라운드 안에 다음 위키 KV를 함께 갱신해야 한다. 누락은
   v01.046 → v01.057 누락 사건(2026-05-20)의 재발이다. 운영자가 요청
   하지 않아도 자동 수행:
   - **`wiki:versions`** — 모든 마이너/패치 버전마다 1페이지 추가
     (intro 바로 다음, **newest-first**). 표준 4섹션 구조 ① 이 버전의
     주요 목적 ② 주요 업데이트 내역 ③ 세부 업데이트 내역(비개발자
     `<details open>` + 개발자 `<details>`) ④ KMS 위키 반영.
     시맨틱 토큰만 사용 (`var(--bg-muted)` / `var(--fg-muted)` /
     `var(--border-subtle)` / `var(--brand-text)`), 하드코딩 hex/회색
     금지. `<pre>`에 인라인 background 줄 때 색 자동 플립 패턴
     (v01.057.01) 그대로 사용.
   - **`wiki:kms`** — 변경된 기능/스키마가 KMS 문서(코딩 룰, 기능
     정의서, 테스트 계정, 데이터 모델 등)에 영향이 있으면 **해당 페이지
     직접 갱신** + "99. Change log" 페이지에 한 줄 row 추가
     (date · what · **why** · caveat).
   - **`wiki:design` / `wiki:color` / `wiki:logo`** — 디자인 토큰, 색,
     로고, 폼/버튼 패턴 변경 시 영향 페이지 직접 갱신. 새 예외는
     무조건 그 위키의 "Tokens-first 예외" 페이지에 등록.

   **이 단계가 빠지면 그 라운드는 미완료.** `wrangler deploy` +
   `git push` 성공이 곧 완료가 아니다.

   **갱신 방법** (KV 직접 쓰기):
   ```
   # 1) 현재 페이지 가져오기 (전체 보존)
   npx wrangler kv key get --namespace-id=e3cb3043b2694cc7aa990b639a2a982c \\
     --remote "wiki:versions" > /tmp/cur.json
   # 2) JSON 파싱 + 새 페이지 추가 (intro 다음에 삽입)
   # 3) 덮어쓰기
   npx wrangler kv key put --namespace-id=e3cb3043b2694cc7aa990b639a2a982c \\
     --remote --path=/tmp/new.json "wiki:versions"
   ```
   부분 쓰기 가정 금지 — 전체 blob을 다시 올리는 구조다.

1. **Auto-deploy after every code change** that affects production behavior.
   Run `wrangler deploy` from the repo root. Don't wait to be asked.
2. **Auto-commit + push after every deploy.** 2026-05-20 운영자 지시.
   별도로 요청하지 않아도 배포 직후 자동 수행:
   - `git add` 해당 파일들 (시크릿 혼입 방지 위해 `git add -A` /
     `git add .` 회피, 변경 파일 명시).
   - `git commit` with what + **why** body + `Co-Authored-By` trailer.
   - `git push origin main`.
   - `HANDOFF.md` §1 버전, §3 라운드 요약 갱신.
3. **Always update the change log.** When you modify a feature, content, or
   schema:
   - Append a row to `KMS · Change log` (admin → Wiki → KMS) with: date,
     what changed, **why** (motivation, request, incident), and any caveats.
   - Commit message must include the why too — not just what.
3. **Never bypass the admin token.** All admin APIs require Bearer auth.
   Don't add public write endpoints without explicit approval.
4. **Don't ship secrets.** `.assetsignore` keeps `worker.js`, `.git`,
   `migrations/`, etc. out of the asset bundle. If you add a new sensitive
   file, add it to `.assetsignore` first.
5. **Don't break friendly URLs.** The Worker rewrites:
   - `/` → `/ui_kits/website/index.html`
   - `/admin` → `/ui_kits/website/admin.html`
   - SPA paths (`/about`, `/programs`, …) → SPA index
   - Anything else falls through to ASSETS.
   New SPA routes need to be added to `SPA_PATHS` in `worker.js` AND
   to `VIEW_TO_PATH` / view-switch in `App.jsx`.
6. **Use design tokens, never raw hex.** `colors_and_type.css` is the single
   source of truth. If a color isn't in the token system, add it there
   first, then reference it via `var(--name)`.
7. **No new build step.** Babel-in-browser is intentional for now. If you
   need a bundler, propose first — don't introduce it silently.
8. **Korean + English everywhere.** Any user-visible string ships in both
   `ko` and `en`. Schema lives in `c.*.ko` / `c.*.en` or `*_ko` / `*_en`.
9. **Don't silently downgrade UX.** If you remove a feature, add an explicit
   note in the change log. Stats removal (2026-05-04) is a recent example.

## 3. Where things live

```
/                            → repo root
├── worker.js                → Worker entry. /api/* + URL rewrites.
├── wrangler.jsonc           → bindings (KV, D1, ASSETS).
├── colors_and_type.css      → design tokens (single source of truth).
├── migrations/              → D1 schema migrations.
├── .assetsignore            → excludes from public asset bundle.
├── assets/                  → SVG logos, icons, placeholders.
└── ui_kits/website/         → public site + admin.
    ├── index.html           → public SPA shell.
    ├── admin.html           → admin shell (single inline React app).
    ├── site.css             → public-site CSS (uses design tokens).
    ├── content-store.js     → KV-backed content schema + API helpers.
    ├── auth-store.js        → user auth (login/signup/session token).
    ├── analytics-store.js   → batched event tracking → /api/analytics.
    ├── editor-loader.js     → dynamic TipTap loader.
    ├── App.jsx              → SPA router + view switch.
    ├── Nav.jsx, Footer.jsx  → chrome.
    ├── Home.jsx, About.jsx, Programs.jsx, ProgramDetail.jsx,
    │   Pages.jsx, Apply.jsx, Member.jsx, Receipt.jsx,
    │   Errors.jsx, Team.jsx → page components.
    ├── Auth.jsx             → login/signup modal.
    └── RichEditor.jsx       → TipTap React wrapper.
```

## 4. Schema map (high level)

KV (`dp_content_v1`):
- `brand`, `nav`, `hero`, `how`, `programs_section`, `programs[]`,
  `partners_section`, `partners[]`, `stories_section`, `stories[]`,
  `cta_banner`, `faq[]`, `icons`,
- `about{hero,mission,team}`, `page_heros{partners,stories,news,contact,programs}`,
- `partner_cta`, `program_detail`, `footer`,
- `project_team{hero,sections,cta}`, `notice`, `errors{401..offline}`.

D1:
- `users`, `sessions`, `member_profiles`
- `applications` (with `program_details` for long-form per-program content)
- `news_posts`
- `inquiries`
- `analytics_events`

KV (other keys):
- `wiki:kms`, `wiki:color`, `wiki:design` — admin wiki pages.

## 5. Friendly URL routing — full table

| URL path                        | Serves                                    |
|---------------------------------|-------------------------------------------|
| `/`                             | SPA (home view)                           |
| `/admin`, `/admin/`, `/admin.html` | Admin shell (token-gated)              |
| `/about`, `/programs`, `/apply` | SPA → matching view                       |
| `/partners`, `/stories`, `/news`, `/contact` | SPA                          |
| `/team`, `/member`, `/receipt`  | SPA                                       |
| `/program/:id`                  | SPA (ProgramDetail with id from URL)      |
| `/401`, `/403`, `/404`, `/500`, `/503`, `/offline` | SPA error views        |
| `/sitemap.xml`, `/robots.txt`   | Worker-generated                          |
| `/api/*`                        | Worker API                                |
| anything else                   | static assets, then 404 page              |

## 6. Coding conventions

- **Files** use plain `.jsx` parsed by Babel-in-browser. Don't introduce
  ESM imports in those files (they break Babel processing). Tiptap is the
  one exception, loaded via importmap-style module shim in `editor-loader.js`.
- **Globals** are intentionally on `window`: `window.Home`, `window.Nav`,
  `window.useAuth`, etc. Keep adding to that pattern.
- **CSS variables only** for color/spacing/radii/shadows. If you write a
  literal hex in a JSX inline style for a one-off, leave a comment.
- **No raw `\n` in static JSX text** — schema lives in `c.*` and any line
  break uses literal newline characters; CSS `white-space: pre-line` on
  the rendering element handles display.
- **Buttons:** `.btn` + variant (primary / secondary / ghost / white /
  outline) + optional size (`btn-sm` / `btn-lg`). Never override padding
  or color via inline style. Use `btn-block` for full-width.
- **Lang:** read `lang` prop in components; the public site language toggle
  drives `document.documentElement.lang`. Admin has its own `dp_admin_lang`
  preference.

## 7. Adding things — playbooks

### Add a new page
1. Create `Foo.jsx` exporting `window.Foo`.
2. Add `<script type="text/babel" src="/ui_kits/website/Foo.jsx">` in `index.html`.
3. Add `foo: '/foo'` to `VIEW_TO_PATH` in `App.jsx` and a `case 'foo'` in
   the view switch.
4. Add `'/foo'` to `SPA_PATHS` in `worker.js`.
5. Add a sitemap entry in `sitemapXml()`.
6. Add a nav/footer link if user-visible.
7. Update change log.

### Add a new admin tab
1. Write the React component inside `admin.html`.
2. Add an entry to `TABS` array (id + group).
3. Add a label in both `I18N.ko.tab` and `I18N.en.tab`.
4. Map the id → component in `TabComp`.

### Add a new D1 table
1. Create `migrations/000N_xxx.sql`.
2. `wrangler d1 migrations apply dreampath-db --remote`.
3. Add API endpoint in `worker.js`.
4. Add admin tab if it needs UI.

### Add a new content field
1. Add the default to `DEFAULT_CONTENT` in `content-store.js` (with both
   `ko` and `en` if user-visible).
2. Read it from the relevant component with a fallback to default.
3. Wire an admin field for it (Text/Area/Color/IconField).

## 8. Branding

- Company name: **KoreaDreamPath** (one word, both letters capitalized at
  word starts: KoreaDreamPath). Wordmark is split as
  `c.brand.wordmark_mark` ("KoreaDream") + `c.brand.wordmark_accent`
  ("Path", in yellow).
- Single contact email: `info@koreadreampath.com` (unified 2026-05-04;
  `hello@`, `partners@`, `team@` are legacy aliases).
- Old "DreamPath" / "DreamPath TF" mentions are **legacy** — they were
  renamed 2026-05-04. If you see one, fix it and note in the change log.

## 9. Change log discipline

Every meaningful edit gets one line in `wiki:kms` → "Change log" page:

```
2026-05-04 · Stats section removed (Home.jsx, content-store.js, admin TABS)
  Why: User asked. Card data was confusing without a clear narrative.
  Caveat: data still in DB rows for past KV blobs; reset will purge.
```

Commits should mirror the same intent in their message body.

## 10. Don't

- Don't introduce npm packages for the public site without proposing first.
- Don't store sensitive data (full card numbers, government IDs) — only
  last 4 digits of cards are kept (Apply form contract).
- Don't break the `/admin` URL — pentest/audit tools rely on a stable path.
- Don't disable `wrangler` deploy in CI without ack.
- Don't add a feature flag for UX experiments without writing it down here.
