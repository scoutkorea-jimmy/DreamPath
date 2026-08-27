# 01 · 구현 인벤토리 (자동 생성)

> **손대지 말 것 — 생성물이다.** `python3 rules/tools/build_inventory.py` 로 다시 만든다.
> 새 기능·새 화면·새 API 를 만들기 전에 **먼저 여기서 이미 있는 것을 찾아라.**
> 같은 일을 하는 두 번째 구현이 스파게티의 시작이다.

- 생성 시각: `2026-08-27 13:03:08 KST`
- 기준 커밋: `f30084f`
- 사이트 버전: `01.101.11`

## 화면 (SPA `.jsx`)

| 파일 | 줄 수 | `window.*` 전역 |
|---|---:|---|
| `ui_kits/website/About.jsx` | 65 | About |
| `ui_kits/website/App.jsx` | 378 | DPErrorBoundary, useContent |
| `ui_kits/website/Apply.jsx` | 842 | Apply |
| `ui_kits/website/Auth.jsx` | 315 | AuthModal, useAuth |
| `ui_kits/website/Auth.views.jsx` | 310 | ActivateAccountView, ResetPasswordView, VerifyEmailView |
| `ui_kits/website/Banners.jsx` | 117 | BannerAdModal |
| `ui_kits/website/EntryGate.jsx` | 78 | EntryGate |
| `ui_kits/website/Errors.jsx` | 200 | Error401, Error403, Error404, Error500, Error503, ErrorOffline |
| `ui_kits/website/Floaters.jsx` | 511 | BackToTop, ChatBot |
| `ui_kits/website/Footer.jsx` | 107 | Footer |
| `ui_kits/website/Home.jsx` | 196 | Home, ProgramCard |
| `ui_kits/website/Legal.jsx` | 116 | ConsentRow, CookieBanner, LegalModal, recordConsent |
| `ui_kits/website/Member.jsx` | 1353 | Member |
| `ui_kits/website/Nav.jsx` | 410 | Nav, NavGroup |
| `ui_kits/website/Pages.jsx` | 597 | Contact, InquiryForm, News, NewsDetail, NewsEditor, Partners, Stories, StoryDetail |
| `ui_kits/website/ProgramDetail.jsx` | 564 | ProgramDetail |
| `ui_kits/website/Programs.jsx` | 89 | Programs |
| `ui_kits/website/Receipt.jsx` | 216 | Receipt, ReceiptTemplate |
| `ui_kits/website/RichEditor.jsx` | 276 | RichEditor |
| `ui_kits/website/Scholarships.jsx` | 407 | ScholarshipDetail, Scholarships |
| `ui_kits/website/Team.jsx` | 392 | Team |
| `ui_kits/website/VersionWatcher.jsx` | 139 | VersionWatcher |
| `ui_kits/website/forms.jsx` | 161 | DP_COUNTRY_CODES, EmailField, PhoneField |

## API 엔드포인트 (`worker.js`) — 95개

- `/api/(me|admin)/applications/([A-Za-z0-9_-]+)/cancel`
- `/api/admin/account-search`
- `/api/admin/application-files/(\d+)/download`
- `/api/admin/applications/([A-Z0-9_-]+)/files`
- `/api/admin/applications/([A-Za-z0-9_-]+)/enroll`
- `/api/admin/applications/([A-Za-z0-9_-]+)/screen`
- `/api/admin/applications/([A-Za-z0-9_-]+)/verify-admission`
- `/api/admin/applications/([A-Za-z0-9_-]+)/verify-documents`
- `/api/admin/attachment/(\d+)/download`
- `/api/admin/email/test`
- `/api/admin/groups`
- `/api/admin/groups/([A-Z0-9_-]+)`
- `/api/admin/groups/([A-Z0-9_-]+)/members`
- `/api/admin/inbox`
- `/api/admin/inbox/(\d+)`
- `/api/admin/inbox/(\d+)/restore`
- `/api/admin/inbox/empty-trash`
- `/api/admin/inbox/export`
- `/api/admin/insight`
- `/api/admin/integrations/status`
- `/api/admin/mail/send`
- `/api/admin/mail/unread-by-account`
- `/api/admin/notification-campaigns`
- `/api/admin/notification-campaigns/([A-Z0-9_-]+)`
- `/api/admin/notifications`
- `/api/admin/search`
- `/api/admin/sent`
- `/api/admin/sent/(\d+)`
- `/api/admin/sent/(\d+)/restore`
- `/api/admin/totp/confirm`
- `/api/admin/totp/disable`
- `/api/admin/totp/lock`
- `/api/admin/totp/setup`
- `/api/admin/totp/state`
- `/api/admin/totp/verify`
- `/api/admin/upload-image`
- `/api/admin/users`
- `/api/admin/users/([A-Za-z0-9_-]+)`
- `/api/admin/users/([A-Za-z0-9_-]+)/totp-reset`
- `/api/analytics`
- `/api/analytics/journeys`
- `/api/analytics/summary`
- `/api/applications`
- `/api/applications/([A-Za-z0-9_-]+)`
- `/api/applications/([A-Za-z0-9_-]+)/receipt`
- `/api/applications/bulk`
- `/api/applications/upload`
- `/api/auth/activate`
- `/api/auth/confirm-password-reset`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/me`
- `/api/auth/request-password-reset`
- `/api/auth/resend-activation`
- `/api/auth/signup`
- `/api/auth/verify-email`
- `/api/consents`
- `/api/content`
- `/api/errors`
- `/api/errors/(\d+)`
- `/api/errors/clear`
- `/api/health`
- `/api/inquiries`
- `/api/inquiries/([A-Za-z0-9_-]+)`
- `/api/inquiries/bulk`
- `/api/me`
- `/api/me/application-files/(\d+)`
- `/api/me/application-files/(\d+)/download`
- `/api/me/applications`
- `/api/me/applications/([A-Za-z0-9_-]+)/admission`
- `/api/me/applications/([A-Za-z0-9_-]+)/cufs-reg-no`
- `/api/me/applications/([A-Za-z0-9_-]+)/documents`
- `/api/me/applications/([A-Za-z0-9_-]+)/files`
- `/api/me/applications/([A-Za-z0-9_-]+)/pay`
- `/api/me/apply-draft`
- `/api/me/export`
- `/api/me/messages`
- `/api/me/messages/([A-Za-z0-9_-]+)`
- `/api/me/notifications`
- `/api/me/notifications/([A-Z0-9_-]+)`
- `/api/me/profile`
- `/api/me/recommendations`
- `/api/news`
- `/api/news/([A-Za-z0-9_-]+)`
- `/api/programs/([A-Za-z0-9_-]+)/details`
- `/api/public/categories`
- `/api/public/news`
- `/api/public/partners`
- `/api/public/programs`
- `/api/public/stories`
- `/api/scholarships`
- `/api/scholarships/([A-Za-z0-9_-]+)`
- `/api/team/message`
- `/api/version`
- `/api/wiki/([a-z0-9_-]{1,32})`

## 콘텐츠 스키마 최상위 키 (`content-store.js` → KV `dp_content_v1`) — 36개

`brand`, `nav`, `hero`, `how`, `programs_section`, `programs`, `partners_section`, `partners`, `stories_section`, `stories`, `news`, `cta_banner`, `faq`, `icons`, `essay_questions`, `errors`, `legal`, `member_roles`, `inboxes`, `site_verifications`, `receipt_template`, `email_templates`, `inquiry_categories`, `notice`, `entry_gate`, `programs_gate`, `apply_gate`, `banners`, `og`, `about`, `project_team`, `scholarships`, `page_heros`, `partner_cta`, `program_detail`, `footer`

## 관리자 탭 (`admin.html` TABS) — 50개

- `about` · Content
- `analytics` · Overview
- `api_dir` · System
- `apply` · Content
- `apply_done` · Content
- `apps` · StudentSupport
- `banners` · Homepage
- `brand` · Setup
- `consent_log` · Members
- `cta` · Homepage
- `dashboard` · Overview
- `design_system` · System
- `email_templates` · System
- `error_logs` · Errors
- `error_preview` · Errors
- `errors_copy` · Errors
- `essays` · Content
- `faq` · Content
- `footer` · Setup
- `hero` · Homepage
- `how` · Homepage
- `icons` · Setup
- `inquiries` · StudentSupport
- `inquiry_categories` · StudentSupport
- `integrations` · System
- `legal` · System
- `member_groups` · Members
- `member_roles` · Members
- `members` · Members
- `menu_names` · Content
- `mypage` · Content
- `news` · Content
- `notice` · Setup
- `notification_history` · InternalMsg
- `og_images` · Setup
- `partners` · Content
- `program_detail` · Content
- `programs` · Content
- `receipt_template` · System
- `scholarships` · Content
- `send_notification` · InternalMsg
- `stories` · Content
- `team` · Content
- `translations` · System
- `two_factor` · Setup
- `wiki_color` · Wiki
- `wiki_design` · Wiki
- `wiki_kms` · Wiki
- `wiki_logo` · Wiki
- `wiki_versions` · Wiki

## D1 테이블 (`migrations/`) — 29개

`admin_audit`, `analytics_events`, `application_files`, `applications`, `applications_new`, `apply_drafts`, `candidate_counters`, `consents`, `email_attachments`, `email_verifications`, `error_logs`, `inbound_emails`, `inquiries`, `inquiries_new`, `login_activity`, `member_audits`, `member_group_members`, `member_groups`, `member_profiles`, `messages`, `news_posts`, `notification_campaigns`, `notifications`, `outbound_emails`, `password_resets`, `program_details`, `scholarship_posts`, `sessions`, `users`

## 공개 사이트 CSS 클래스 (`site.css`) — 429개

> 새 컴포넌트를 만들기 전에 이 목록에서 쓸 수 있는 것을 먼저 찾아라.

`.about-block`, `.about-block-title`, `.about-grid`, `.about-list`, `.admin-fold`, `.apply-card`, `.apply-desc`, `.apply-sub`, `.auth-close`, `.auth-err`, `.auth-field`, `.auth-modal`, `.auth-overlay`, `.auth-sub`, `.auth-switch`, `.bnr-close`, `.bnr-dot`, `.bnr-dots`, `.bnr-foot`, `.bnr-img`, `.bnr-imgbtn`, `.bnr-modal`, `.bnr-nav`, `.bnr-overlay`, `.bnr-stage`, `.btn`, `.btn-block`, `.btn-ghost`, `.btn-lg`, `.btn-outline`, `.btn-primary`, `.btn-secondary`, `.btn-sm`, `.btn-white`, `.consent-required`, `.consent-row`, `.consent-text`, `.consent-view`, `.contact-tab`, `.contact-tabs`, `.container`, `.container-narrow`, `.cookie-banner`, `.cookie-banner-actions`, `.cookie-banner-text`, `.cta-banner`, `.errpage`, `.errpage-body`, `.errpage-circle`, `.errpage-code`, `.errpage-ctas`, `.errpage-dot`, `.errpage-grid`, `.errpage-helpful`, `.errpage-helpful-grid`, `.errpage-helpful-h`, `.errpage-helpful-link`, `.errpage-helpful-wrap`, `.errpage-illust`, `.errpage-note`, `.errpage-text`, `.errpage-title`, `.faq-a`, `.faq-group`, `.faq-group-head`, `.faq-icon`, `.faq-item`, `.faq-list`, `.faq-q`, `.field`, `.filter-chip`, `.filters`, `.fold-chevron`, `.footer`, `.footer-bg`, `.footer-bot`, `.footer-bot-with-brand`, `.footer-brand`, `.footer-col`, `.footer-inner`, `.footer-top`, `.footer-ver`, `.form-actions`, `.form-row`, `.gate-body`, `.gate-check`, `.gate-icon`, `.gate-modal`, `.gate-overlay`, `.gate-title`, `.has-hero-dark`, `.has-hero-light`, `.has-hero-media`, `.hero`, `.hero-bg-card`, `.hero-bg-chevron`, `.hero-bg-state`, `.hero-ctas`, `.hero-dots`, `.hero-inner`, `.hero-kicker`, `.hero-sub`, `.hero-title`, `.lang-toggle`, `.legal-body`, `.member-card`, `.member-grid`, `.member-msg`, `.member-msg-avatar`, `.member-msg-bubble`, `.member-msg-bubble-body`, `.member-msg-bubble-time`, `.member-msg-dot`, `.member-msg-empty`, `.member-msg-head`, `.member-msg-head-meta`, `.member-msg-item`, `.member-msg-item-main`, `.member-msg-item-preview`, `.member-msg-item-subject`, `.member-msg-item-time`, `.member-msg-item-top`, `.member-msg-list`, `.member-msg-reply`, `.member-msg-subject`, `.member-msg-thread`, `.member-tab`, `.member-tabs`, `.mobile-nav-body`, `.mobile-nav-close`, `.mobile-nav-foot`, `.mobile-nav-head`, `.mobile-nav-link`, `.mobile-nav-overlay`, `.mobile-nav-panel`, `.mobile-nav-section`, `.nav`, `.nav-burger`, `.nav-dropdown`, `.nav-dropdown-item`, `.nav-dropdown-sep`, `.nav-group`, `.nav-inner`, `.nav-links`, `.nav-logo`, `.nav-right`, `.news-date`, `.news-item`, `.news-list`, `.news-tag`, `.news-title`, `.page`, `.partner`, `.partner-body`, `.partner-chip`, `.partner-chip-name`, `.partner-chip-text`, `.partner-full`, `.partner-link`, `.partner-logo`, `.partner-name`, `.partner-role`, `.partner-strip`, `.partner-strip-kicker`, `.partner-strip-row`, `.partners-grid`, `.pay-amount`, `.pay-label`, `.pay-lock`, `.pay-note`, `.pay-summary`, `.pd-back`, `.pd-body`, `.pd-cost`, `.pd-cost-badge`, `.pd-cost-bar`, `.pd-cost-bar-amt`, `.pd-cost-bar-fill`, `.pd-cost-bar-foot`, `.pd-cost-bar-head`, `.pd-cost-bar-track`, `.pd-cost-breakdown`, `.pd-cost-callout`, `.pd-cost-callout-icon`, `.pd-cost-callout-title`, `.pd-cost-col`, `.pd-cost-col-head`, `.pd-cost-col-icon`, `.pd-cost-col-note`, `.pd-cost-col-title`, `.pd-cost-col-total`, `.pd-cost-col-total-amt`, `.pd-cost-fact`, `.pd-cost-fact-big`, `.pd-cost-fact-label`, `.pd-cost-fact-sub`, `.pd-cost-facts`, `.pd-cost-head`, `.pd-cost-pay`, `.pd-cost-row`, `.pd-cost-row-amt`, `.pd-cost-row-free`, `.pd-cost-row-label`, `.pd-cost-sub`, `.pd-course-card`, `.pd-course-desc`, `.pd-course-divider`, `.pd-course-footer`, `.pd-course-grid`, `.pd-course-preview`, `.pd-course-sem`, `.pd-course-title`, `.pd-course-top`, `.pd-different`, `.pd-different-card`, `.pd-different-grid`, `.pd-different-head`, `.pd-different-icon`, `.pd-different-tag`, `.pd-faculty-avatar`, `.pd-faculty-btn`, `.pd-faculty-copy`, `.pd-fallback-list`, `.pd-header`, `.pd-hero-card`, `.pd-hero-card-icon`, `.pd-hero-card-kicker`, `.pd-hero-card-text`, `.pd-hero-card-title`, `.pd-hero-grid`, `.pd-instructor-line`, `.pd-kicker`, `.pd-main`, `.pd-meta`, `.pd-modal`, `.pd-modal-backdrop`, `.pd-modal-body`, `.pd-modal-close`, `.pd-modal-course`, `.pd-modal-head`, `.pd-modal-photo`, `.pd-modal-photo-fallback`, `.pd-modal-title`, `.pd-rich`, `.pd-savings-amount`, `.pd-savings-banner`, `.pd-savings-bar-note`, `.pd-savings-bar-wrap`, `.pd-savings-label`, `.pd-savings-pct`, `.pd-section-card`, `.pd-section-eyebrow`, `.pd-section-head`, `.pd-section-headtext`, `.pd-section-icon`, `.pd-side`, `.pd-side-kicker`, `.pd-side-note`, `.pd-stat-card`, `.pd-stat-icon`, `.pd-stat-label`, `.pd-stat-strip`, `.pd-stat-text`, `.pd-stat-value`, `.pd-sub`, `.pd-title`, `.pd-tone-curriculum`, `.pd-tone-eligibility`, `.pd-tone-instructor`, `.pd-tone-intro`, `.pd-tone-video`, `.pd-video`, `.pd-why-cufs`, `.pd-why-cufs-card`, `.pd-why-cufs-grid`, `.pd-why-cufs-head`, `.pd-why-cufs-icon`, `.pd-zero-chip`, `.pd-zero-list`, `.phead`, `.prog`, `.prog-arrow`, `.prog-chips`, `.prog-grid`, `.prog-icon`, `.prog-kicker`, `.prog-media`, `.prog-meta`, `.prog-more`, `.prog-more-cta`, `.prog-more-text`, `.prog-sub`, `.prog-title`, `.programs-board`, `.receipt-actions`, `.receipt-brand`, `.receipt-foot`, `.receipt-head`, `.receipt-issuer`, `.receipt-meta`, `.receipt-page`, `.receipt-paper`, `.receipt-payer`, `.receipt-section`, `.receipt-table`, `.rt-content`, `.rt-count`, `.rt-resize`, `.rt-resize-grip`, `.rt-resize-label`, `.rt-toolbar`, `.rt-wrap`, `.schol-board`, `.schol-cat`, `.schol-chip`, `.schol-date`, `.schol-deadline`, `.schol-detail-body`, `.schol-detail-cta`, `.schol-detail-img`, `.schol-detail-lead`, `.schol-detail-org`, `.schol-empty`, `.schol-filters`, `.schol-info`, `.schol-info-row`, `.schol-note`, `.schol-provider`, `.schol-row`, `.schol-row-body`, `.schol-row-foot`, `.schol-row-top`, `.schol-summary`, `.schol-thumb`, `.schol-titlebtn`, `.sec-kicker`, `.sec-sub`, `.sec-title`, `.section`, `.section-tight`, `.skip-link`, `.sr-only`, `.stat`, `.stat-l`, `.stat-n`, `.stats`, `.stats-inner`, `.step`, `.step-d`, `.step-icon`, `.step-indicator`, `.step-n`, `.step-t`, `.steps`, `.stories-grid`, `.story`, `.story-avatar`, `.story-foot`, `.story-name`, `.story-prog`, `.team-admin-member`, `.team-card`, `.team-coord-action`, `.team-coord-band`, `.team-coord-copy`, `.team-coord-photo`, `.team-coord-section`, `.team-desc`, `.team-grid`, `.team-group-title`, `.team-msg-btn`, `.team-name`, `.team-page-bio`, `.team-page-body`, `.team-page-card`, `.team-page-card-click`, `.team-page-grid`, `.team-page-more`, `.team-page-name`, `.team-page-photo`, `.team-page-role`, `.team-profile-actions`, `.team-profile-bio`, `.team-profile-bio-empty`, `.team-profile-head`, `.team-profile-label`, `.team-profile-links`, `.team-profile-name`, `.team-profile-photo`, `.team-profile-role`, `.team-profile-section`, `.team-role`, `.theme-toggle`, `.tier-chip`, `.tier-fee`, `.tier-pct`, `.tier-row`, `.tm-actions`, `.tm-area`, `.tm-avatar`, `.tm-chevron`, `.tm-close`, `.tm-done`, `.tm-done-icon`, `.tm-err`, `.tm-from`, `.tm-gate`, `.tm-gate-actions`, `.tm-gate-icon`, `.tm-head`, `.tm-input`, `.tm-label`, `.tm-modal`, `.tm-overlay`, `.tm-to`, `.tm-to-role`, `.topnotice`, `.track-badge`, `.track-card`, `.track-desc`, `.track-grid`, `.track-head`, `.track-name`, `.track-price`, `.user-avatar`, `.user-dropdown`, `.user-label`, `.user-menu`, `.user-trigger`

## 디자인 토큰 (`colors_and_type.css`) — 141개

> 색·간격·반경·그림자는 **여기 있는 것만** 쓴다. 없으면 토큰을 먼저 추가한다.

`--accent-purple-fill`, `--badge-danger-fill`, `--bg-elevated`, `--bg-muted`, `--bg-overlay`, `--bg-stripe`, `--bg-stripe-alt`, `--blossom-pink`, `--border-default`, `--border-hair`, `--border-strong`, `--border-subtle`, `--brand`, `--brand-2`, `--brand-accent`, `--brand-outline`, `--brand-text`, `--brand-tint`, `--canvas-white`, `--cb-black`, `--cb-blue`, `--cb-bluegreen`, `--cb-orange`, `--cb-redpurple`, `--cb-skyblue`, `--cb-vermilion`, `--cb-yellow`, `--coral-red`, `--duration-fast`, `--duration-normal`, `--duration-slow`, `--ease-out`, `--ease-standard`, `--ember-orange`, `--fg-inverse`, `--fg-link`, `--fg-muted`, `--fg-on-fill`, `--fg-primary`, `--fg-secondary`, `--fire-red`, `--focus-color`, `--focus-offset`, `--focus-ring`, `--focus-width`, `--font-en`, `--font-kr`, `--font-mono`, `--font-sans`, `--forest-green`, `--gray-100`, `--gray-200`, `--gray-300`, `--gray-400`, `--gray-50`, `--gray-500`, `--gray-600`, `--gray-700`, `--gray-800`, `--gray-900`, `--icon-2xl`, `--icon-lg`, `--icon-md`, `--icon-sm`, `--icon-xl`, `--icon-xs`, `--leading-normal`, `--leading-relaxed`, `--leading-snug`, `--leading-tight`, `--leaf-green`, `--midnight-purple`, `--midnight-violet`, `--ocean-blue`, `--radius-2xl`, `--radius-lg`, `--radius-md`, `--radius-pill`, `--radius-sm`, `--radius-xl`, `--receipt-accent`, `--receipt-bg`, `--receipt-brand`, `--receipt-faint`, `--receipt-field`, `--receipt-id`, `--receipt-ink`, `--receipt-line`, `--receipt-line-2`, `--receipt-line-3`, `--receipt-muted`, `--receipt-paper`, `--receipt-rule`, `--river-blue`, `--royal-purple`, `--scouting-purple`, `--shadow-brand`, `--shadow-lg`, `--shadow-md`, `--shadow-sm`, `--shadow-xs`, `--soft-lavender`, `--space-1`, `--space-10`, `--space-12`, `--space-16`, `--space-2`, `--space-20`, `--space-3`, `--space-4`, `--space-5`, `--space-6`, `--space-8`, `--state-danger`, `--state-danger-bg`, `--state-info`, `--state-info-bg`, `--state-success`, `--state-success-bg`, `--state-warning`, `--state-warning-bg`, `--sunshine-yellow`, `--text-2xl`, `--text-3xl`, `--text-4xl`, `--text-5xl`, `--text-base`, `--text-lg`, `--text-md`, `--text-sm`, `--text-xl`, `--text-xs`, `--z-base`, `--z-dropdown`, `--z-modal`, `--z-nav`, `--z-overlay`, `--z-raised`, `--z-sticky`, `--z-toast`, `--z-tooltip`
