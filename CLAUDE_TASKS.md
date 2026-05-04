# CLAUDE_TASKS.md — backlog & priorities

> **Read this whenever you (or Claude) sit down to code on KoreaDreamPath.**
> Always read `CLAUDE.md` first; this file is the prioritized backlog.
> Last full audit: **2026-05-04**.

## How to use this file

- Top → bottom = strict priority. Don't pick from the middle without a reason.
- When you finish an item: move it to the **Done** section with a one-liner
  (date / what / why), then add a row to the KMS Change log too.
- When you find a new issue: add it to the right section (P0/P1/P2/icebox).
- When unsure: ship the smallest fix first, file the rest in P2.

---

## P0 — bugs / regressions to fix soon

These are wrong on production right now.

- [ ] **About page regressed to hardcoded text.** User pasted a new
      About.jsx that no longer reads `c.about`. The admin "About page"
      tab still edits `c.about` but nothing on the public site renders
      those edits. **Fix:** wire the new Executive Summary structure
      back to `c.about` (preserve the new shape, but read every string
      from schema with the current English copy as fallback). Or remove
      the admin tab.
      *Files:* `ui_kits/website/About.jsx`, admin AboutTab.

- [ ] **Worker doesn't accept `HEAD`.** Health monitors, some crawlers,
      and `curl -I` use HEAD; we currently 404 / 405 them. **Fix:** in
      `worker.js`, treat HEAD as GET (call the GET handler, return the
      response with body stripped — or just `if (method === 'HEAD')
      method = 'GET'` early). Also CORS for OPTIONS preflight on every
      `/api/public/*` endpoint.
      *Files:* `worker.js`.

- [ ] **No mobile nav.** Below 900px the nav links are hidden and there
      is no hamburger replacement, so mobile visitors can't navigate.
      **Fix:** add a hamburger button + slide-in panel that uses the
      same MENU structure as desktop (incl. dropdown groups).
      *Files:* `ui_kits/website/Nav.jsx`, `ui_kits/website/site.css`.

- [ ] **Top notice banner shows even on `/admin`** because admin.html
      doesn't render `<App>`. Confirm the banner only appears on the
      public SPA. (Likely already true — re-verify and document in KMS.)

- [ ] **Inline color hex** in `Member.jsx`, `Auth.jsx` (e.g. `#888`,
      `#666`, `#B91C1C`, `#248737`). Replace with `var(--fg-muted)`,
      `var(--state-danger)`, `var(--state-success)`. (Tokens-first rule
      from `CLAUDE.md`.)
      *Files:* `ui_kits/website/Member.jsx`, `ui_kits/website/Auth.jsx`.

---

## P1 — important: ship within the next round of work

Stuff users will ask about soon if we don't do it.

- [ ] **Email verification on signup.** Currently anyone can sign up
      with an email they don't own. Add a verification link sent on
      signup; gate `apply` and other write actions until verified.
      Probably needs a transactional-email integration (Cloudflare
      Email Workers + a relay, or Mailgun / Resend).

- [ ] **Password reset flow.** No way to recover a forgotten password.

- [ ] **Real payment integration.** Apply form takes the last 4 digits
      of a card but doesn't actually charge. Decide on Stripe / Toss /
      KakaoPay / PortOne; integrate in step 4. Receipt should reflect
      the real transaction id.

- [ ] **PDF upload for scout recommender letters.** Currently we store
      the filename only — the file itself never reaches us. Wire to R2:
      add `R2_BUCKET` binding, presigned upload URL, store the R2 key
      on the recommender object.

- [ ] **News post detail URLs.** Each news post is editable inline but
      has no shareable URL. Add `/news/:id` route + Pages.jsx detail
      view. Update sitemap to include each post.

- [ ] **Per-route SEO meta.** Right now every SPA route serves the same
      `<title>`, description, and OG tags (the home set). For Programs
      / Apply / News we want per-page meta. Options:
      (a) Worker rewrites the HTML head per friendly URL,
      (b) generate static per-route HTML in build,
      (c) keep SPA but add `<head>` updates via `useEffect` for human
      visitors and rely on Worker for crawlers (cf-bot detection).

- [ ] **Admin token rotation reminder.** Site is open with a weak token
      ("admin"). Before public launch, rotate to a 64-char secret:
      `printf "$(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")" | wrangler secret put ADMIN_TOKEN`.

- [ ] **Apply form persistence.** A user halfway through Apply who hits
      refresh loses everything. Save form state to sessionStorage on
      every change, restore on mount.

- [ ] **Receipt PDF.** Currently the Receipt page is browser-print only.
      Add a real PDF endpoint (`/api/applications/:id/receipt.pdf`)
      using `@cloudflare/pdf` or html-to-pdf service.

---

## P2 — nice to have

- [ ] **OAuth login** (Google / Kakao / Apple).
- [ ] **Multi-currency receipts** (currently USD-only).
- [ ] **Per-program category metadata in admin.** Right now category
      is implied from the kicker first segment. Make it an explicit
      `category` field with admin-editable list (so KO display name
      can differ from the URL slug).
- [ ] **Apply autosave to D1 as draft** (not just sessionStorage).
      Lets a user start on phone and finish on laptop.
- [ ] **Bulk admin actions on Applications + Inquiries** (mark read,
      bulk export, status change).
- [ ] **Email templates** (admin-editable in c.email.*).
- [ ] **Admin role granularity** beyond single ADMIN_TOKEN — e.g.
      separate "content editor", "applications viewer", "developer"
      roles via member.role + per-role allowed APIs.
- [ ] **ProgramEditor tabbed sections** (Basic / Logistics / Instructor /
      Content / SEO) — currently one long scroll.
- [ ] **News editor admin tab back as power option** for bulk edits;
      keep the on-page inline editor too.
- [ ] **Stories detail page** (each `c.stories[]` entry as its own
      shareable URL).
- [ ] **Dark mode** for the public site (admin already gradient-purple).
- [ ] **a11y audit** — focus rings on every clickable element, semantic
      landmarks, alt text on every `<img>`. Run axe.
- [ ] **i18n: add Japanese / Vietnamese** (current schema is KO+EN only).

---

## P3 — icebox / dead schema to clean up

- [ ] **`partners_section` / `stories_section`** schema is admin-editable
      but never rendered. Decide: bring them onto the home page as
      teaser sections, or delete from schema + admin tabs.
- [ ] **`copy.js`** (192 lines) is partially redundant with
      `content-store.js`. Audit which globals are still read; remove
      the rest. Goal: zero references → delete the file.
- [ ] **`PrintAll.jsx`** + `index-print.html` are not linked anywhere.
      Either link from admin or delete.
- [ ] **Hardcoded English fallback in About.jsx** (and its inline copy)
      should move into `c.about` once P0 #1 is fixed.

---

## P4 — operational / one-shot

These don't need code changes but should be done by a human.

- [ ] **Rotate ADMIN_TOKEN** before public launch (P1 reminder above).
- [ ] **Set up DPA & ROPA records** for GDPR (Records of Processing).
- [ ] **Register sitemap.xml** with Google Search Console + Naver
      Search Advisor.
- [ ] **Add `og:image`** asset (currently no OG image).
- [ ] **Set up Cloudflare alerts** on Worker error rate + D1 query
      latency.
- [ ] **Backup policy**: schedule a weekly `wrangler d1 export` of
      `dreampath-db` to R2 or external storage.
- [ ] **Dependency audit cadence**: re-pin React / Babel / Lucide /
      TipTap quarterly.

---

## Done

Closed items, newest first. Add a row whenever you finish something
above. Mirror to KMS Change log as well.

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
