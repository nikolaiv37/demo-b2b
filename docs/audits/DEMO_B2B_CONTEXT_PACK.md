# Demo B2B Context Pack

Purpose: compact context for ChatGPT review and founder/developer decisions about what to keep, hide, fix, sell, upsell, or remove.  
Generated: 2026-04-28  
Repository: `/Users/nikolaiv37/projects/demo-b2b`  
Scope: static project inspection. No application logic was modified.

## 1. Executive Summary

This project is a React/Vite/Supabase B2B SaaS demo derived from an existing furniture/client platform. It currently includes a tenant-aware dashboard, auth/invites, product catalog, normalized categories, wishlist, cart/order requests, admin order management, complaints/returns, client management, analytics, CSV product import, proforma PDFs, Econt shipping integration, and an internal platform tenant console.

Main purpose: prepare a clean demo/sales template for potential clients such as TED mattress, while deciding which modules belong in the base product, which are upsells, which should be hidden during demos, and which are legacy/internal.

Current demo/client assumptions:
- Single-wholesaler B2B model: store/client users browse and order from one wholesaler.
- Tenants/workspaces exist via `tenants`, `tenant_domains`, and `/t/:slug` fallback routing.
- Current product language and data are furniture/mattress-oriented, with TED import artifacts in repo.
- Branding is mixed: FurniTrade, Centivon, B2Bcenter comments, TED data, Mebelcenter/All Power assets.

Main risks:
- SQL/migrations are loose standalone files with overlapping fixes and old schema assumptions.
- Admin-only pages are partly hidden by UI but not uniformly route-guarded.
- Frontend exposes `VITE_RESEND_API_KEY` and has direct browser Resend sending code.
- `VITE_DEV_MODE` and placeholder demo behavior can bypass normal user-specific order filtering.
- CSV import is functional, but XML is script-based only, not a real app UI.
- Mapping persistence/import history are not wired into the active import wizard.
- RLS must be verified carefully; current tenant quote policy may allow any tenant member to read all tenant orders if final policy is applied as written.

## 2. Route Map

Routes are defined in `src/App.tsx`.

| Route | Type | Component/file | Guard/notes |
|---|---|---|---|
| `/` | Public/domain-aware | `src/pages/LandingPage.tsx`, `src/pages/MainIndexRoute.tsx`, `src/pages/TenantEntry.tsx`, `src/pages/PortalNotFound.tsx` via `RootRoute` | Behavior depends on resolved domain kind. |
| `/landing` | Public marketing | `src/pages/LandingPage.tsx` | `DomainGuardMainOnly`. |
| `/auth/login` | Public/auth | `src/app/auth/login.tsx` or `src/app/auth/platform-login.tsx` | `LoginRouter` chooses platform login on app host without tenant. |
| `/auth/signup` | Public auth | `src/app/auth/signup.tsx` | `DomainGuardMainOnly`, `SignupGuard`. |
| `/auth/onboarding` | Auth/setup | `src/app/auth/onboarding.tsx` | No explicit route-level auth guard. |
| `/auth/accept-invite` | Auth/setup | `src/app/auth/accept-invite.tsx` | Handles invitation token flow. |
| `/auth/client-setup` | Auth/setup | `src/app/auth/client-setup.tsx` | Invited client setup. |
| `/auth/owner-setup` | Auth/setup | `src/app/auth/owner-setup.tsx` | Invited owner setup. |
| `/platform` | Internal platform | `src/app/platform/layout.tsx` | `PlatformAdminGuard`. |
| `/platform/tenants` | Internal platform | `src/app/platform/tenants/index.tsx` | Platform admin only. |
| `/platform/tenants/:id` | Internal platform | `src/app/platform/tenants/[id]/index.tsx` | Platform admin only. |
| `/dashboard` | Tenant dashboard | `src/app/dashboard/overview.tsx` inside `src/app/dashboard/layout.tsx` | Tenant domain, active tenant, auth, membership. |
| `/dashboard/categories` | Dashboard | `src/app/dashboard/categories/index.tsx` | Both roles. |
| `/dashboard/categories/:mainCategory` | Dashboard | `src/app/dashboard/categories/index.tsx` | Both roles. |
| `/dashboard/categories/:mainCategory/:subCategory` | Dashboard | `src/app/dashboard/categories/index.tsx` | Both roles. |
| `/dashboard/categories/manage` | Dashboard admin | `src/app/dashboard/categories/manage.tsx` | Visible to admins, but route is not separately admin-guarded. |
| `/dashboard/products` | Dashboard | `src/app/dashboard/products/index.tsx` | Both roles. |
| `/dashboard/products/:sku` | Dashboard | `src/app/dashboard/products/[sku]/page.tsx` | Both roles. |
| `/dashboard/wishlist` | Dashboard | `src/app/dashboard/wishlist/index.tsx` | Both roles/auth user. |
| `/dashboard/orders` | Dashboard | `src/app/dashboard/orders/index.tsx`; admin delegates to `AdminOrdersView.tsx` | Both roles. |
| `/dashboard/complaints` | Dashboard | `src/app/dashboard/complaints/index.tsx`; admin delegates to `AdminComplaintsView.tsx` | Both roles. |
| `/dashboard/quotes` | Dashboard legacy | `src/app/dashboard/quotes/index.tsx` | Likely legacy; hide/remove. |
| `/dashboard/csv-import` | Dashboard admin | `src/app/dashboard/csv-import/index.tsx` | Page shows access denied for non-admin. |
| `/dashboard/settings` | Dashboard | `src/app/dashboard/settings/index.tsx` | Company/profile all; team/integrations admin only inside page. |
| `/dashboard/analytics` | Dashboard | `src/app/dashboard/analytics/index.tsx` | Both roles with role-specific query behavior. |
| `/dashboard/unpaid-balances` | Dashboard admin | `src/app/dashboard/unpaid-balances/index.tsx` | Page shows access denied for non-admin. |
| `/dashboard/clients` | Dashboard admin | `src/app/dashboard/clients/index.tsx` | Redirects non-admin. |
| `/t/:slug` | Slug tenant fallback | `src/pages/TenantEntry.tsx` | `SlugOnlyGuard`. |
| `/t/:slug/auth/login` | Slug tenant auth | `src/app/auth/login.tsx` | Tenant login. |
| `/t/:slug/auth/onboarding` | Slug setup | `src/app/auth/onboarding.tsx` | Same setup page. |
| `/t/:slug/auth/client-setup` | Slug setup | `src/app/auth/client-setup.tsx` | Same setup page. |
| `/t/:slug/auth/owner-setup` | Slug setup | `src/app/auth/owner-setup.tsx` | Same setup page. |
| `/t/:slug/dashboard/*` | Slug dashboard | Same dashboard route set | Wrapped in slug and tenant guards. |
| `*` | 404 | `src/pages/NotFound.tsx` | Generic not found. |

## 3. Sidebar / Navigation Map

Sidebar is defined in `src/components/SidebarNav.tsx`.

| Navigation item | Defined in | Role visibility | Target route |
|---|---|---|---|
| Overview | `mainNavItemsConfig` | Both | `/dashboard` |
| Orders | `mainNavItemsConfig` | Both | `/dashboard/orders` |
| Clients/Distributors | `mainNavItemsConfig` | Admin only | `/dashboard/clients` |
| Complaints & Returns | `mainNavItemsConfig` | Both | `/dashboard/complaints` |
| Analytics | `mainNavItemsConfig` | Both | `/dashboard/analytics` |
| Catalog accordion | Component logic | Both | Click generally routes to `/dashboard/products` |
| Categories | `catalogSubmenuItemsConfig` | Both | `/dashboard/categories` |
| Manage Categories | `catalogSubmenuItemsConfig` | Admin only | `/dashboard/categories/manage` |
| All Products | `catalogSubmenuItemsConfig` | Both | `/dashboard/products` |
| Wishlist | `catalogSubmenuItemsConfig` | Both | `/dashboard/wishlist` |
| CSV Import | inline Tools section | Admin only | `/dashboard/csv-import` |
| Settings accordion | Component logic | Both | `/dashboard/settings` |
| Company | `settingsSubmenuItemsConfig` | Both | `/dashboard/settings#company` |
| Profile | `settingsSubmenuItemsConfig` | Both | `/dashboard/settings#profile` |
| Team | Settings page local sidebar | Admin only | `/dashboard/settings#team` |
| Integrations | Settings page local sidebar | Admin only | `/dashboard/settings#integrations` |
| Logout | inline Tools section | Both | Calls `signOut()` |

## 4. Feature Map

| Feature/module | User-facing name | Route | Main files | Role | Status | Dependencies | Recommended action |
|---|---|---|---|---|---|---|---|
| Landing | Marketing site | `/`, `/landing` | `src/pages/LandingPage.tsx` | Public | Partially polished, legacy branding | i18n, assets | Fix/rebrand |
| Tenant discovery | Workspace selection | `/` app host | `MainIndexRoute.tsx`, `TenantSelector.tsx`, `useTenantMemberships.ts` | Auth/platform | Functional | Supabase auth, memberships | Keep |
| Tenant routing | Tenant portal | `/t/:slug`, custom domains | `TenantProvider.tsx`, `resolveTenant.ts`, guards | Public/auth | Functional, complex | `tenants`, `tenant_domains` | Keep/fix docs |
| Login | Login | `/auth/login` | `login.tsx`, `platform-login.tsx` | Public | Functional | Supabase auth | Keep |
| Signup | Signup | `/auth/signup` | `signup.tsx`, `SignupGuard.tsx` | Public | Partially demoable | Supabase auth | Hide in sales demo unless tested |
| Onboarding | Company setup | `/auth/onboarding` | `onboarding.tsx`, `CompanyForm.tsx` | Auth | Partially working | `companies`, `profiles` | Fix before paid |
| Invites | Accept invite/client setup/owner setup | `/auth/accept-invite`, `/auth/client-setup`, `/auth/owner-setup` | auth setup pages, `accept-invite` function | Invited users | Functional but complex | Edge functions, auth admin | Keep/fix |
| Dashboard overview | Overview | `/dashboard` | `overview.tsx`, `overview-charts.tsx` | Both | Partially working | `quotes`, `products`, unpaid hooks | Keep |
| Product catalog | Products | `/dashboard/products`, `/dashboard/products/:sku` | product pages, cards, quick view | Both | Mostly stable | `products`, `categories` | Keep/base |
| Category browser | Categories | `/dashboard/categories/*` | `categories/index.tsx`, `useCategoryHierarchy.ts` | Both | Mostly stable | `categories`, `products` | Keep/base |
| Category management | Manage categories | `/dashboard/categories/manage` | `categories/manage.tsx` | Admin | Risky route guard/bucket gap | `categories`, `products`, `category-images` | Fix before showing admin import/category ops |
| Wishlist | Wishlist | `/dashboard/wishlist` | `wishlist/index.tsx`, `useWishlist.ts` | Both | Stable | `wishlist_items`, `products` | Keep/base |
| Cart/order request | Submit order | Modal from dashboard/cart | `CartDrawer.tsx`, `QuoteRequestModal.tsx`, `cartStore.ts` | Company mainly | Working with caveats | `quotes`, notifications | Keep/base |
| Orders | Orders | `/dashboard/orders` | `orders/index.tsx`, `AdminOrdersView.tsx`, `OrderDetailsSheet.tsx` | Both | Core working, status drift | `quotes`, `shipments`, PDFs | Keep/fix |
| Quotes legacy | Quotes | `/dashboard/quotes` | `quotes/index.tsx`, `useMutationQuote.ts` | Both | Legacy/risky | `quotes`, email client | Hide/remove |
| Complaints | Complaints/Returns | `/dashboard/complaints` | complaints folder | Both | Mostly working | `complaints`, `quotes`, `complaints` bucket | Keep or upsell |
| Clients | Clients/Distributors | `/dashboard/clients` | `clients/index.tsx`, client hooks | Admin | Partially working | `profiles`, `tenant_invitations`, invite function | Keep/fix |
| Analytics | Analytics | `/dashboard/analytics` | `analytics/index.tsx`, `analytics.ts` | Both | Partially working | `quotes`, `products`, PostHog | Upsell |
| Unpaid balances | Unpaid Balances | `/dashboard/unpaid-balances` | unpaid page/hooks | Admin | Partially working | `quotes` | Upsell/hide |
| Settings company/profile | Settings | `/dashboard/settings` | `settings/index.tsx`, `CompanyForm.tsx` | Both | Mostly working; storage concerns | `companies`, `profiles`, `logos` bucket | Keep/fix |
| Team invites | Team | `/dashboard/settings#team` | settings team section, `useMutationInviteTeamMember.ts` | Admin | Partially working | `tenant_memberships`, `tenant_invitations`, invite function | Upsell/fix |
| Econt | Integrations / Shipping | `/dashboard/settings#integrations`, order shipment panel | `EcontIntegrationSettings.tsx`, `ShipmentPanel.tsx`, Econt functions | Admin | Functional but complex | `tenant_integrations`, `shipments`, Edge env | Upsell/hide unless relevant |
| Platform console | Tenants | `/platform/tenants` | platform folder, create/delete functions | Platform admin | Internal | `tenants`, memberships, functions | Internal-only |
| CSV import | CSV Import Wizard | `/dashboard/csv-import` | `CSVImportWizard.tsx`, `useSmartMapping.ts`, CSV libs | Admin | Functional CSV | `products`, `categories` | Upsell/internal onboarding |
| XML import | TED XML conversion | No app route | `scripts/ted-xml-to-csv.js`, `ted_bg.xml` | Internal | Script only | Node script | Hide/internal-only |
| Stripe | Billing/checkout | No complete route | `stripeClient.ts` | N/A | Unfinished | Missing `/api/create-checkout-session` | Remove/hide |
| Email/Resend | Transactional email | No visible route | `resendClient.ts`, invite functions | N/A | Unsafe frontend client | Resend API, Edge functions | Fix/remove frontend client |
| Notifications | Notification bell | Dashboard header | `NotificationBell.tsx`, `useNotifications.ts`, `notifications.ts` | Both | Functional if RPC/table present | `notifications`, RPC | Keep |

## 5. Environment Variables

Do not include actual values when sharing.

| Variable | Used in | Frontend public? | Risk if exposed | Notes |
|---|---|---:|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabase/client.ts`, demo checks | Yes | Low | Public Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase/client.ts` | Yes | Medium | Public anon key is normal, but RLS must be correct. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `src/lib/stripeClient.ts` | Yes | Low | Publishable key only; backend missing. |
| `VITE_RESEND_API_KEY` | `src/lib/resendClient.ts` | Yes | Critical | Resend API key must not be exposed in browser. Remove. |
| `VITE_POSTHOG_KEY` | `src/lib/analytics.ts` | Yes | Low/medium | Public project key; review autocapture privacy. |
| `VITE_POSTHOG_HOST` | `src/lib/analytics.ts` | Yes | Low | Host config. |
| `VITE_DEV_MODE` | CSV import, orders, complaints, quote modal, old hook | Yes | High if true | Enables fallback IDs and relaxed/demo behavior. |
| `SUPABASE_URL` | Edge functions | Server only | High | Edge function runtime only. |
| `SUPABASE_ANON_KEY` | Edge functions | Server only in functions | Medium | Used to create user-scoped clients in functions. |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge functions | Server only | Critical | Must never reach frontend. |
| `ECONT_CREDENTIALS_ENCRYPTION_KEY` | `supabase/functions/_shared/econt.ts` | Server only | Critical | Required to encrypt/decrypt Econt credentials. |
| `APP_SITE_URL` / `SITE_URL` | invite function fallback | Server only | Medium | Controls invite redirect URL. |

## 6. Supabase Map

### Tables Used By App

Core tenant/auth:
- `tenants`
- `tenant_domains`
- `tenant_memberships`
- `tenant_invitations`
- `profiles`
- `companies`

Product/catalog:
- `products`
- `categories`
- `wishlist_items`

Orders/ops:
- `quotes` (current orders source)
- `complaints`
- `notifications`

Shipping/integrations:
- `tenant_integrations`
- `shipments`

Import infrastructure present:
- `csv_distributor_mappings`
- `category_synonyms`
- `csv_import_history`

Potential legacy/unused:
- `orders` from old `schema.sql`
- `client_invitations` referenced in `delete-tenant` cleanup, not clearly part of current app flow.

### Storage Buckets

| Bucket | Used by | Files |
|---|---|---|
| `logos` | Company logos, profile avatars | `CompanyForm.tsx`, `settings/index.tsx`, `create-logos-storage-bucket.sql` |
| `complaints` | Complaint photos | `NewComplaintTab.tsx`, `create-complaints-table.sql` |
| `category-images` | Category images | `categories/manage.tsx`; no obvious bucket migration found |

### Edge Functions

- `accept-invite`
- `invite-client`
- `create-tenant`
- `delete-tenant`
- `lookup_tenant_by_email`
- `econt-settings-get`
- `econt-settings-save`
- `econt-offices-list`
- `econt-calculate`
- `econt-create-label`
- `econt-delete-label`
- `econt-track`

### RLS / Policy Files Of Interest

Important/current-looking:
- `create-tenants-and-domains.sql`
- `tenant-data-isolation.sql`
- `platform-admin-and-tenant-status.sql`
- `platform-admin-auth-no-tenant.sql`
- `create-categories-table.sql`
- `add-category-id-to-products.sql`
- `add-category-slug-and-unique-constraint.sql`
- `create-complaints-table.sql`
- `create-wishlist-table.sql`
- `create-notifications-table.sql`
- `create-econt-integrations-and-shipments.sql`
- `add-client-invitations.sql`
- `add-target-role-to-invitations.sql`
- `enforce-single-tenant-membership.sql`
- `fix-handle-new-user-tenant-aware.sql`

Required-looking migrations/additions:
- Product schema updates: `migration-update-products-table-safe.sql`, `add-category-id-to-products.sql`, `add-shipping-method-column.sql`, `add-order-number-column.sql`, `add-quotes-internal-notes.sql`
- Company/profile fields: `add-company-onboarding-fields.sql`, `add-company-invoice-fields.sql`, `add-profiles-phone-column.sql`, `add-commission-rate-to-profiles.sql`
- Tenant model: `create-tenants-and-domains.sql`, `tenant-data-isolation.sql`, `seed-tenants.sql`
- Import infra: `create-csv-import-mappings.sql` if import history/persistence will be used.

Old/conflicting-looking files:
- `schema.sql` old FurniTrade non-tenant schema and old roles.
- `migration-update-products-table.sql` older permissive product migration.
- `fix-profiles-rls-simple.sql`, `fix-profiles-rls-recursion.sql`, `fix-profiles-rls-final.sql`, `fix-profiles-rls-complete.sql` overlap.
- `fix-companies-insert-policy*.sql`, `fix-companies-update-policy*.sql` overlap.
- `fix-supplier-id-constraint.sql`, `fix-supplier-id-type.sql`, `fix-wishlist-foreign-key.sql`, `fix-complaints-foreign-key.sql` mention dev-mode relaxations.
- `fix-quotes-rls-policy.sql`, `fix-complaints-rls-policies.sql`, `fix-wishlist-rls-policies.sql` may conflict with tenant isolation policies.
- `sample-data.sql`, `sample-products.csv` are seed/demo only.

## 7. Import Map

### CSV Architecture

Main files:
- `src/app/dashboard/csv-import/index.tsx`
- `src/components/csv-import/CSVImportWizard.tsx`
- `src/components/csv-import/steps/*`
- `src/hooks/useSmartMapping.ts`
- `src/lib/csv/parser.ts`
- `src/lib/csv/distributors.ts`
- `src/lib/category-sync-from-import.ts`

Current UI:
- Route `/dashboard/csv-import`
- Admin-only page check.
- Five-step wizard: upload, column mapping, category mapping, validation, results.
- Includes a dangerous admin `Delete All Products` action.

Data flow:
1. Upload CSV file.
2. `parseCSVFlexible` reads client-side, detects comma/semicolon, normalizes headers.
3. `detectDistributor` chooses preset: Megapap, B2BMarkt, IKEA, or Generic.
4. `autoMapColumns` and manual UI map source columns to standard fields.
5. Category mapping maps source categories/subcategories.
6. `getTransformedData()` builds product payloads.
7. `prepareProductsWithCategoryId()` creates/reuses categories and adds `category_id`.
8. Products are cleaned, tenant/company IDs added.
9. Duplicate SKUs inside the import are deduped: last row wins.
10. Batched `upsert` into `products` with `onConflict: 'tenant_id,sku'`.
11. Product/category query caches invalidated and notifications sent.

Required fields:
- Mapping validation requires `sku` and `name`.
- `weboffer_price` is required by practical DB/product needs but falls back to wholesale, retail, then `0`.

Category sync:
- Non-destructive.
- Creates missing main categories/subcategories.
- Parses `Main > Subcategory`.
- Assigns `products.category_id`.
- Keeps legacy `products.category` text.

Product upsert conflict key:
- `tenant_id,sku`
- Requires unique index `idx_products_tenant_sku_unique` from `tenant-data-isolation.sql`.

Known CSV risks:
- Zero prices can be imported silently.
- Last duplicate SKU wins silently.
- No persistent mapping save/load in active UI.
- No import history write in active UI.
- No rollback/import snapshot.
- Remote image URLs are not copied to storage.
- Delete-all-products action can wipe tenant catalog.

### XML Architecture

Current app UI:
- No active XML import route or Universal/XML wizard files found in current `src`.

Current XML support:
- `scripts/ted-xml-to-csv.js` converts root-level `ted_bg.xml` to `scripts/ted-products.csv`.
- This is a one-off internal preprocessing script for TED-style XML.

Known XML risks:
- Not productized.
- Not configurable in UI.
- Regex/XML extraction script is specific and not robust for arbitrary providers.
- Should be described as internal onboarding support, not a demo feature.

## 8. Security Checklist

Concrete concerns:

- Frontend Resend secret exposure:
  - Files: `src/lib/resendClient.ts`, `.env.example`, `src/vite-env.d.ts`
  - Concern: `VITE_RESEND_API_KEY` is browser-exposed and used against Resend API.
  - Action: remove frontend Resend client; use Edge Function.

- Admin pages not uniformly route-guarded:
  - Routes/files: `/dashboard/categories/manage` -> `src/app/dashboard/categories/manage.tsx`
  - Concern: hidden in nav, but direct route can open. RLS may block writes but UX/data exposure risk remains.
  - Action: add admin route/page guard.

- Tenant quote RLS may be too broad:
  - File: `supabase/tenant-data-isolation.sql`
  - Concern: `tenant_quotes_select` uses only `tenant_id = current_tenant_id()`, which can let a member read all tenant quotes if policy is final.
  - Action: restrict members to own quotes; admins see all.

- Dev/demo bypass behavior:
  - Files: `src/app/dashboard/orders/index.tsx`, `src/app/dashboard/complaints/NewComplaintTab.tsx`, `src/components/QuoteRequestModal.tsx`, `src/components/csv-import/CSVImportWizard.tsx`, `src/hooks/useCSVImport.ts`
  - Concern: fallback IDs and all-order visibility in dev/demo modes.
  - Action: ensure disabled in demo/prod; remove before selling.

- Direct browser table writes:
  - Files: many dashboard/hooks modules using `supabase.from(...)`
  - Concern: app depends heavily on perfect RLS.
  - Action: add RLS tests by role and tenant.

- Storage policy risk:
  - Files: `create-logos-storage-bucket.sql`, `create-complaints-table.sql`, `categories/manage.tsx`
  - Concern: broad authenticated bucket access and public complaint photos.
  - Action: tenant/user path-scoped storage policies; signed URLs for sensitive photos.

- Econt credential handling:
  - Files: `supabase/functions/_shared/econt.ts`, Econt functions
  - Concern: good encryption design, but requires `ECONT_CREDENTIALS_ENCRYPTION_KEY`; demo credentials are built in for demo mode.
  - Action: ensure env exists, hide unless tested.

- Platform admin checks:
  - Files: `PlatformAdminGuard.tsx`, platform routes/functions
  - Concern: depends on `profiles.is_platform_admin`.
  - Action: verify RLS and function caller checks with non-platform users.

- Console logs/data leakage:
  - Files: CSV parser/import, category sync, auth, orders, complaints
  - Concern: logs can include headers, sample rows, tenant/profile details.
  - Action: gate logs behind dev mode/logger.

## 9. Demo Cleanup Checklist

### P0: Must Fix Before Showing TED / Serious Client

- Confirm `VITE_DEV_MODE=false`.
- Remove or avoid real `VITE_RESEND_API_KEY`; do not deploy frontend Resend key.
- Rebrand visible app shell away from mixed FurniTrade/B2Bcenter if pitching generic/TED.
- Hide `/dashboard/quotes`.
- Hide platform console from sales demo.
- Hide Stripe/billing.
- Hide Econt unless explicitly configured and relevant.
- Use a clean seeded tenant with curated products/categories/orders/complaints.
- Verify company user cannot access `/dashboard/clients`, `/dashboard/csv-import`, `/dashboard/unpaid-balances`.
- Add or simulate admin guard for `/dashboard/categories/manage` before demoing with non-admin users.
- Remove/avoid TED raw XML/CSV files from client-facing repo/demo narrative.

### P1: Fix Before Paid Deployment

- Build one clean ordered Supabase migration path.
- Remove/mark obsolete conflicting SQL.
- Tighten `quotes` RLS for member users.
- Add route/page admin guards for all admin-only pages.
- Move all email sending to Edge Functions.
- Add storage bucket migrations and strict policies for `logos`, `complaints`, `category-images`.
- Add import history, dry-run summary, and rollback/snapshot plan.
- Add mapping persistence for imports if selling import as feature.
- Run and fix `npm run build` and `npm run lint`.
- Add RLS/security tests for owner/admin/member/platform admin.
- Align role/status vocabulary across DB/code/docs.

### P2: Later Polish

- Add automated tests and CI.
- Add centralized logging/error reporting.
- Add server-side analytics aggregates for larger tenants.
- Add background import jobs for large catalogs.
- Replace remote product images with controlled image ingestion/cache if needed.
- Improve onboarding copy and empty states.
- Remove stale timestamp Vite files and old docs.
- Decide final product brand and domain model.

## 10. Files ChatGPT Should Inspect First

1. `DEMO_B2B_AUDIT_REPORT.md` - full prior audit with recommendations and risks.
2. `src/App.tsx` - canonical route map and guard composition.
3. `src/components/SidebarNav.tsx` - visible navigation and role filtering.
4. `src/lib/tenant/TenantProvider.tsx` - tenant resolution, session, membership checks.
5. `src/lib/tenant/resolveTenant.ts` - host/domain/slug tenant lookup.
6. `src/hooks/useAuth.ts` - auth bootstrap, profile loading/creation, role derivation.
7. `src/components/AuthGuard.tsx` - dashboard auth and onboarding guard.
8. `src/components/guards/PlatformAdminGuard.tsx` - platform-admin authorization.
9. `src/app/dashboard/layout.tsx` - dashboard shell, cart/order modal wiring.
10. `src/app/dashboard/products/index.tsx` - core catalog/product browsing.
11. `src/app/dashboard/categories/index.tsx` - category browsing UX.
12. `src/app/dashboard/categories/manage.tsx` - admin category management and storage usage.
13. `src/components/csv-import/CSVImportWizard.tsx` - active CSV import flow.
14. `src/hooks/useSmartMapping.ts` - import mapping/validation/transformation state.
15. `src/lib/csv/distributors.ts` - supported import fields and presets.
16. `src/lib/category-sync-from-import.ts` - category creation/linking during import.
17. `src/app/dashboard/orders/index.tsx` - company order view, dev/demo behavior, PDF flow.
18. `src/app/dashboard/orders/AdminOrdersView.tsx` - admin order workflow and Econt panel integration.
19. `supabase/tenant-data-isolation.sql` - most important RLS/data isolation migration.
20. `supabase/functions/invite-client/index.ts` - invite/team/client onboarding security boundary.

Additional files worth inspecting after the top 20:
- `src/lib/resendClient.ts` - frontend secret issue.
- `src/lib/stripeClient.ts` - unfinished Stripe backend assumption.
- `supabase/create-econt-integrations-and-shipments.sql` and `supabase/functions/_shared/econt.ts` - shipping integration.
- `src/app/dashboard/settings/index.tsx` - company/profile/team/integrations settings.
- `scripts/ted-xml-to-csv.js` - TED XML preprocessing script.

