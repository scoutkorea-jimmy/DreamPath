# CLAUDE_TASKS.md — backlog & priorities

> **Read this whenever you (or Claude) sit down to code on KoreaDreamPath.**
> Always read `CLAUDE.md` first; this file is the prioritized backlog.
> Last full audit: **2026-05-05**.

## How to use this file

- Top → bottom = strict priority. Don't pick from the middle without a reason.
- When you finish an item: move it to the **Done** section with a one-liner
  (date / what / why), then add a row to the KMS Change log too.
- When you find a new issue: add it to the right section (P0/P1/P2/icebox).
- When unsure: ship the smallest fix first, file the rest in P2.

---

## P0 — bugs / regressions to fix soon

These are wrong on production right now.

_All open P0s as of v01.009.00 are now fixed. New regressions land here._

---

## P1 — important: ship within the next round of work

Items here all require an external decision (provider, secret, account).
The code-side scaffolding is already in place — see notes below for what
each task still needs from a human.

- [ ] **Wire the email-send pipeline.** v01.012.00 mints verify /
      password-reset tokens and stores admin-editable templates, but
      there's no SMTP. **Decide on Mailgun / Resend / Cloudflare Email
      Workers**, register API key as a worker secret, replace the
      `dev_note` token-in-response with a real send, and remove the
      dev-mode link banner on `/reset-password`. Templates already
      live at admin → Setup → Email templates.

- [ ] **Real payment integration.** Apply step 4 still records last 4
      digits with no charge. **Decide on Stripe / Toss / KakaoPay /
      PortOne** based on the launch market, register secret, add
      webhook → mark application as paid, attach real transaction id
      to receipt.

- [ ] **PDF upload for scout recommender letters.** v01.005.00 captures
      filename only. **Create a Cloudflare R2 bucket**, add `R2_BUCKET`
      binding to wrangler.jsonc, add `/api/me/upload` presigned URL
      endpoint, store the R2 key on the recommender object.

- [ ] **Receipt PDF.** Receipt page is print-only HTML. Cloudflare
      Workers can't render PDF natively — pick a service (DocRaptor /
      htmlcsstoimage / Gotenberg on a separate runtime) and add
      `/api/applications/:id/receipt.pdf` that proxies the print HTML.

- [ ] **Rotate ADMIN_TOKEN before public launch.** Currently `admin`.
      `printf "$(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")" | wrangler secret put ADMIN_TOKEN`.

---

## P2 — nice to have

- [ ] **OAuth login** (Google / Kakao / Apple). Each provider needs an
      app registration → client_id / client_secret as worker secrets
      → /api/auth/oauth/:provider/callback.
- [ ] **Multi-currency receipts** (currently USD-only).
- [ ] **Admin role granularity** — extend `c.member_roles` schema to
      support "content editor" / "applications viewer" / "developer"
      role presets. The matrix UI is already in admin → Members →
      Roles & permissions.
- [ ] **ProgramEditor tabbed sections** (Basic / Logistics / Instructor /
      Content / SEO) — currently one long scroll. Cosmetic; works as-is.
- [ ] **News editor admin tab back as power option** for bulk edits;
      the on-page inline editor stays.
- [ ] **a11y audit** — run axe / Lighthouse, address every blocker.
      Focus rings + landmarks + alt text are mostly there but worth a
      systematic pass.
- [ ] **i18n: add Japanese / Vietnamese.** Current schema has KO/EN
      paired keys (`*_ko` / `*_en` everywhere). Adding a third language
      means either adding `*_jp` / `*_vn` companions to every paired
      key or migrating to a `translations[lang]` object. Do it once the
      translation team has copy ready — schema change is mechanical.

---

## P3 — icebox / dead schema to clean up

- [ ] **`partners_section` / `stories_section`** schema still in
      DEFAULT_CONTENT but never rendered. Admin doesn't expose them;
      harmless. Remove from `content-store.js` defaults next time the
      blob is otherwise touched.
- [ ] **`copy.js`** is still load-bearing as the fallback for
      `window.PARTNERS` / `STORIES` / `FAQ` when KV is empty. Decide:
      either inline the fallback into `Pages.jsx` or remove the
      fallback entirely once the KV blob is guaranteed in prod.

---

## P4 — operational / one-shot (see KMS · 8. 운영 체크리스트 for the full list)

These don't need code changes but should be done by a human.

- [ ] **Rotate ADMIN_TOKEN** before public launch (P1 reminder above).
- [ ] **Set up DPA & ROPA records** for GDPR (Records of Processing).
- [ ] **Register sitemap.xml** with Google Search Console + Naver
      Search Advisor.
- [ ] **Add a real `og:image`** asset (admin → Setup → OG / SEO images).
- [ ] **Set up Cloudflare alerts** on Worker error rate + D1 query
      latency.
- [ ] **Backup policy**: schedule a weekly `wrangler d1 export` of
      `dreampath-db` to R2 or external storage. Same for KV blob via
      admin → JSON 내보내기.
- [ ] **Dependency audit cadence**: re-pin React / Babel / Lucide /
      TipTap quarterly.

---

## Done

Closed items, newest first. Add a row whenever you finish something
above. Mirror to KMS Change log as well.

- 2026-05-05 · v01.012.00 · Email verification + password reset + apply
  draft sync (server-side). Templates editable in admin. SMTP wiring
  pending.
- 2026-05-05 · v01.011.00 · Bulk admin actions (apps + inquiries) +
  email templates schema + Inquiries CSV export.
- 2026-05-05 · v01.010.00 · News + Stories detail URLs (/news/:id,
  /stories/:id), per-program category metadata, dynamic sitemap,
  PrintAll.jsx + index-print.html removed.
- 2026-05-04 · v01.009.00 · About page rewired to c.about.exec, HEAD
  method support, mobile hamburger nav, Apply form sessionStorage
  draft persistence.
- 2026-05-04 · v01.006-08 · Dark mode + colorblind palette + WCAG AA,
  collapsible sidebar, inquiry-category CRUD, dynamic footer menu,
  per-route OG meta, version system, dashboard, member CRUD, role
  enforcement, error-resolve toggle.
- 2026-05-04 · GDPR consent system, error logs, public CORS APIs,
  Scholarships menu, About Executive Summary, Legal admin tab, API
  directory tab, Member privacy controls.
- 2026-05-04 · Visitor analytics + journey tracking + admin tab.
- 2026-05-04 · Top nav grouped into 3 hover dropdowns; footer programs
  derived from c.programs categories; sitemap.xml + robots.txt;
  admin KO/EN toggle.
- 2026-05-04 · Programs admin upgraded to a CMS-style board (search /
  filter / sort / bulk delete / duplicate / preview) with a dedicated
  per-program editor and D1 long-form details.
- 2026-05-04 · Project team page + footer link.
- 2026-05-04 · Friendly URL routing — `/admin`, `/about`, etc. served
  directly. Removed root redirect shim. Fixed CTA button stacking bug.
- 2026-05-04 · Cloudflare Worker + KV + D1 migration; member accounts;
  receipts; News editable from public site; KMS / color / design wikis;
  TipTap editor; error pages; admin re-grouping.

---

## Adding a new task — template

```
- [ ] **Title in bold.** Why this matters in one sentence. Then concrete
      steps if obvious; include file paths. Reference KMS or CLAUDE.md
      sections when needed.
```

Keep titles imperative and small ("Fix the X" not "Maybe we should think
about X"). If a task starts ballooning, split it.
