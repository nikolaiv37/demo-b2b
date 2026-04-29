# Branding Cleanup Report

Date: 2026-04-29

Scope:
- Searched for `FurniTrade`, `B2Bcenter`, `B2B Center`, `Lina Trade`, `TED`, `Mebelcenter`, `All Power`
- Searched for placeholder/demo emails and domains including `support@furnitrade.com`, `owner@example.com`, `dev@example.com`, `orders@sofiafurniture.bg`, `example.com`, `sofiafurniture.bg`

Action legend:
- `replace`
- `keep internal-only`
- `leave because not visible`
- `needs manual review`

## Findings

| Reference | File path | Visible to users? | Proposed action | Notes |
| --- | --- | --- | --- | --- |
| FurniTrade | `index.html` | Yes | replace | Browser title and meta description still use old product brand. |
| FurniTrade | `src/pages/LandingPage.tsx` | Yes | replace | Landing header/footer brand text still uses old name. |
| Mebelcenter | `src/pages/LandingPage.tsx` | Yes | replace | Public logo strip contains legacy company name. |
| All Power | `src/pages/LandingPage.tsx` | Yes | replace | Public logo strip contains legacy company name. |
| FurniTrade | `src/components/SidebarNav.tsx` | Yes | replace | Dashboard fallback company/product name still uses old brand. |
| dev@example.com | `src/components/QuoteRequestModal.tsx` | Internal fallback, potentially user-visible in edge case data | replace | Should use neutral support placeholder if fallback is ever persisted. |
| support@furnitrade.com | `src/app/dashboard/complaints/NewComplaintTab.tsx` | Yes | replace | Visible support contact. |
| FurniTrade | `src/app/auth/login.tsx` | Yes | replace | Login headline uses translation key with old brand. |
| FurniTrade | `src/app/auth/platform-login.tsx` | Yes | replace | Platform login headline uses translation key with old brand. |
| FurniTrade | `src/app/auth/signup.tsx` | Yes | replace | Signup headline uses translation key with old brand. |
| FurniTrade | `src/locales/en.json` | Yes | replace | Auth titles/onboarding welcome/copyright strings are user-visible. |
| FurniTrade | `src/locales/bg.json` | Yes | replace | Auth titles/onboarding welcome/copyright strings are user-visible. |
| FurniTrade | `src/lib/resendClient.ts` | Yes if email sending is re-enabled | replace | Visible email footer branding in templates. |
| orders@sofiafurniture.bg | `src/app/dashboard/orders/index.tsx` | No | leave because not visible | Inside commented demo data block only. |
| owner@example.com | `src/app/platform/tenants/CreateTenantModal.tsx` | Admin-only visible | replace | Placeholder shown in modal input. |
| user@example.com | `src/app/dashboard/layout.tsx` | Dashboard fallback only | replace | Generic placeholder shown in account dropdown when profile email missing. |
| you@example.com | `src/locales/en.json` | Yes | leave because not visible | Generic example email; acceptable unless full demo polish wants domain consistency. |
| you@example.com | `src/locales/bg.json` | Yes | leave because not visible | Generic example email; acceptable unless full demo polish wants domain consistency. |
| ivan@example.com | `src/locales/bg.json` | Yes | leave because not visible | Generic example email in quote/request placeholder. |
| john@example.com | `src/locales/en.json` | Yes | leave because not visible | Generic example email in form placeholder. |
| client@company.com / colleague@company.com / admin@example.com | `src/locales/en.json`, `src/app/platform/tenants/[id]/index.tsx` | Admin-only visible | needs manual review | Generic placeholders are acceptable, but could be normalized later for stricter demo consistency. |
| Centivon tenant wording | `src/pages/PortalNotFound.tsx` | Yes | replace | Better to say "Centivon workspace" or "Demo B2B Portal workspace" instead of "tenant". |
| Dev Company Wholesale | `src/app/dashboard/products/[sku]/page.tsx` | Yes | replace | Product page browser titles use another legacy placeholder brand. |
| FurniTrade | `README.md` | No | leave because not visible | Internal repo docs, not runtime UI. |
| FurniTrade | `design-system.md` | No | leave because not visible | Internal design documentation only. |
| FurniTrade | `docs/PROJECT_CONTEXT.md` | No | leave because not visible | Internal project context. |
| FurniTrade / TED / B2Bcenter / Mebelcenter / All Power / placeholder emails | `docs/audits/*`, `docs/CURRENT_PROGRESS.md`, `docs/PROJECT_DECISIONS.md` | No | keep internal-only | Internal audit and roadmap context; should remain as historical source material. |
| TED | `scripts/ted-xml-to-csv.js`, `ted_bg.xml`, generated TED CSV/XML assets, import docs | No | keep internal-only | Explicitly preserved per roadmap. Add clarifying internal sample comments where useful. |
| package name `furnitrade` | `package.json`, `package-lock.json` | No | leave because not visible | Technical package identifier; renaming is unnecessary risk for this stage. |
| b2bcenter / B2B Center comments | code comments and docs | No | leave because not visible | Avoid unnecessary refactors; clean later only if they surface in the UI. |
| Lina Trade | repo-wide search | No active user-visible hit found | leave because not visible | No concrete replacement needed in current code paths. |

## Planned implementation for this stage

1. Replace visible product branding with `Centivon`.
2. Use `Demo B2B Portal` where a neutral demo workspace/product descriptor fits better than a company name.
3. Replace visible support address with `support@centivon.com` where a contact address is needed.
4. Keep TED import scripts and raw TED references as internal-only onboarding/import samples.
5. Avoid renaming routes, database tables, package identifiers, or tenant/domain constants unless they are directly user-facing labels.
