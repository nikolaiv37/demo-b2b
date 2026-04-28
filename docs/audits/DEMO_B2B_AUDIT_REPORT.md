# Demo B2B Audit Report

Date: 2026-04-28  
Repository: `/Users/nikolaiv37/projects/demo-b2b`  
Scope: static inspection only. No migrations, package installs, builds, or code changes were performed.

## Executive Summary

This repo is a React/Vite/Supabase B2B SaaS demo derived from a furniture wholesale/client platform. It has a real tenant-aware dashboard, catalog browsing, orders via the `quotes` table, complaints/returns, clients, CSV import, Econt shipping, platform-admin tenant management, Bulgarian/English i18n, and proforma PDF generation.

It is useful for a controlled sales demo, but it is not clean enough to sell as a production template yet. The main risks are:

- The app is a mix of old `FurniTrade`, `B2Bcenter`, TED, and Centivon naming.
- Admin-only pages are mostly hidden in the UI, but some are still route-opened and rely on RLS rather than route-level admin guards.
- CSV import is real, but client import readiness is medium: XML is not an in-app feature, mapping persistence is not wired, and category mapping can be confusing for real catalogs.
- Security posture depends heavily on Supabase RLS and Edge Functions, while many frontend modules access tables directly.
- SQL is fragmented into many standalone files with overlapping fixes, dev-mode relaxations, obsolete schema assumptions, and no clean ordered migration folder.
- `VITE_RESEND_API_KEY` is exposed to the frontend and `src/lib/resendClient.ts` sends email directly to Resend from the browser. This must not ship.
- `VITE_DEV_MODE` and placeholder/demo fallback behavior can expose all tenant orders to a non-admin route if enabled.

Bottom line: prepare a curated demo environment with locked demo data and hidden risky modules. Before a paid client, create a clean production bootstrap/migration path, remove frontend secrets, disable dev-mode behaviors, and verify RLS with real role tests.

## Readiness Scores

| Area | Score | Reason |
|---|---:|---|
| Sales demo readiness | 6/10 | Strong visible feature set, but branding cleanup, broken/unfinished labels, dev traces, and import complexity need curation. |
| Production readiness for first paid client | 4/10 | Core flows exist, but migrations, security posture, email, imports, and route-level role enforcement need hardening. |
| Security readiness | 4/10 | Tenant RLS exists, but frontend secrets, direct table access, permissive/dev SQL history, and route-open admin pages are risks. |
| Import readiness | 5/10 | CSV is functional; XML is script-based only; mapping persistence/history is mostly infrastructure-only. |
| Maintainability | 5/10 | React structure is understandable, but stale docs, overlapping SQL, legacy names, and duplicated status/role models raise support cost. |
| Support risk | 7/10 | Higher score means higher risk: imports, tenant/bootstrap drift, Econt settings, and order status mappings will generate support questions. |

## 1. Project Structure

### Main Entry Points

| Entry point | Purpose |
|---|---|
| `src/main.tsx` | Initializes i18n, PostHog analytics, and renders the React app. |
| `src/App.tsx` | Main router, tenant provider, query client, global error boundary, route guards. |
| `src/lib/supabase/client.ts` | Browser Supabase client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. |
| `src/lib/tenant/TenantProvider.tsx` | Resolves tenant by host, subdomain, or `/t/:slug`; checks membership. |
| `src/app/dashboard/layout.tsx` | Dashboard shell, top bar, sidebar, cart drawer, order request modal. |
| `src/components/SidebarNav.tsx` | Main dashboard navigation with admin-only UI filtering. |

### Routing Structure

Routes are centralized in `src/App.tsx`.

| Route | Area | Guarding |
|---|---|---|
| `/` | Domain-aware landing/app/tenant entry | `TenantProvider` and `RootRoute` logic |
| `/landing` | Marketing landing page | `DomainGuardMainOnly` |
| `/auth/login` | Tenant login or platform login | `LoginRouter` |
| `/auth/signup` | Signup | `DomainGuardMainOnly`, `SignupGuard` |
| `/auth/onboarding` | Company onboarding | No direct auth guard wrapper at route level |
| `/auth/accept-invite` | Invite handling | No direct auth guard wrapper at route level |
| `/auth/client-setup` | Invited client setup | No direct auth guard wrapper at route level |
| `/auth/owner-setup` | Owner setup | No direct auth guard wrapper at route level |
| `/platform/tenants` | Platform tenant list | `PlatformAdminGuard` |
| `/platform/tenants/:id` | Platform tenant detail | `PlatformAdminGuard` |
| `/dashboard/*` | Tenant dashboard | `DomainGuardTenantOnly`, `TenantActiveGuard`, `AuthGuard`, `MembershipGuard` |
| `/t/:slug/dashboard/*` | Slug fallback tenant dashboard | `SlugOnlyGuard` then same dashboard guards |

### Dashboard Navigation

Visible navigation is in `src/components/SidebarNav.tsx`.

Main section:
- Overview
- Orders
- Clients/Distributors, admin-only
- Complaints & returns
- Analytics

Catalog submenu:
- Categories
- Manage categories, admin-only
- All products
- Wishlist

Tools/account:
- CSV import, admin-only
- Settings: company/profile for all, team/integrations for admin inside settings page
- Logout

### Auth And Roles

There are two overlapping role models:

| Model | Values | Where used |
|---|---|---|
| Tenant membership | `owner`, `admin`, `member` | `tenant_memberships`, `TenantProvider`, `useAuth().isAdmin` |
| Profile role | `admin`, `company` | Product/category edit visibility, client lists, discount logic |

Effective admin status in most current UI comes from membership role via `useAuth().isAdmin`. Some modules still use `profile?.role === 'admin'`, which can drift from tenant membership.

### Admin vs Company/Client Areas

Admin areas:
- Platform console: `/platform/*`
- CSV import: `/dashboard/csv-import`
- Client management: `/dashboard/clients`
- Category management UI: `/dashboard/categories/manage`
- Admin orders view: `/dashboard/orders`
- Admin complaints view: `/dashboard/complaints`
- Settings team and Econt integration sections
- Unpaid balances

Company/client areas:
- Product/category browsing
- Wishlist
- Cart and order submission
- Own orders
- Complaints submission and own complaints
- Profile/company settings
- Analytics with user-filtered data

## 2. Feature Inventory

| Feature | Route/path | Role | Main files | Status | Demo? | Packaging |
|---|---|---|---|---|---|---|
| Marketing landing page | `/`, `/landing` on marketing host | Public | `src/pages/LandingPage.tsx` | Partially working; branded FurniTrade/Centivon | Hide or rebrand | Demo-only/marketing |
| Tenant entry | `/`, `/t/:slug` | Public/auth-aware | `src/pages/TenantEntry.tsx`, `TenantProvider` | Stable concept, complex domain behavior | Include if using tenant demo | Base |
| Platform login | `/auth/login` on app host | Platform admin | `src/app/auth/platform-login.tsx` | Partially working | Hide from sales demo | Internal-only |
| Tenant login | `/auth/login`, `/t/:slug/auth/login` | Public | `src/app/auth/login.tsx` | Stable | Include | Base |
| Signup | `/auth/signup` | Public | `src/app/auth/signup.tsx` | Partially working; main-domain only | Maybe hide for controlled demo | Base later |
| Onboarding | `/auth/onboarding` | Auth user | `src/app/auth/onboarding.tsx`, `CompanyForm.tsx` | Partially working | Hide during sales walkthrough unless needed | Base |
| Invite accept | `/auth/accept-invite` | Invited users | `src/app/auth/accept-invite.tsx`, `supabase/functions/accept-invite` | Important but complex | Hide unless demoing client onboarding | Base |
| Client/owner setup | `/auth/client-setup`, `/auth/owner-setup` | Invited users | auth setup pages | Partially working | Hide from main demo | Base |
| Dashboard overview | `/dashboard` | Both | `src/app/dashboard/overview.tsx` | Partially working; many direct queries | Include | Base |
| Analytics | `/dashboard/analytics` | Both | `src/app/dashboard/analytics/index.tsx` | Partially working; query fallbacks/logging | Include lightly | Add-on/upsell |
| Product catalog | `/dashboard/products` | Both | `products/index.tsx`, `ProductGridCard`, `ProductQuickViewModal` | Mostly stable | Include | Base |
| Product detail | `/dashboard/products/:sku` | Both | `products/[sku]/page.tsx` | Mostly stable | Include | Base |
| Categories browser | `/dashboard/categories/*` | Both | `categories/index.tsx`, `useCategoryHierarchy` | Mostly stable if categories exist | Include | Base |
| Manage categories | `/dashboard/categories/manage` | Admin UI, route open to members | `categories/manage.tsx` | Risky: no route-level admin guard | Demo only as admin | Base admin, fix before selling |
| CSV import | `/dashboard/csv-import` | Admin page check | `CSVImportWizard`, `useSmartMapping`, CSV libs | Functional CSV, risky operations | Internal/admin demo only | Add-on/internal onboarding |
| XML import | No app route | Internal script only | `scripts/ted-xml-to-csv.js`, `ted_bg.xml` | Not a product feature | Do not present as product feature | Internal-only |
| Wishlist | `/dashboard/wishlist` | Both/auth | `wishlist/index.tsx`, `useWishlist` | Stable | Include if catalog demo | Base |
| Cart/order request | Dashboard modal | Company mainly | `CartDrawer`, `QuoteRequestModal` | Working with caveats | Include | Base |
| Orders | `/dashboard/orders` | Both | `orders/index.tsx`, `AdminOrdersView` | Core working; status model drift | Include | Base |
| Quotes legacy page | `/dashboard/quotes` | Both | `quotes/index.tsx` | Risky/legacy: field mismatch with current orders table shape | Hide | Remove or merge into Orders |
| Proforma PDF | Orders actions | Company | `ProformaInvoicePDF`, `OrderDetailsSheet`, `orders/index.tsx` | Partially working; depends on company invoice data | Include only if tested | Add-on |
| Complaints/returns | `/dashboard/complaints` | Both | complaints pages | Mostly working | Include if relevant | Base or add-on |
| Clients/distributors | `/dashboard/clients` | Admin page check | `clients/index.tsx`, invite hooks | Partially working; invite Edge Function exists | Include admin demo | Base admin |
| Unpaid balances | `/dashboard/unpaid-balances` | Admin UI check | unpaid balance hooks/page | Partially working | Hide unless asked | Add-on |
| Settings company/profile | `/dashboard/settings` | Both | `settings/index.tsx`, `CompanyForm` | Mostly working; direct storage upload | Include lightly | Base |
| Settings team invites | `/dashboard/settings#team` | Admin UI check | `useQueryTeamMembers`, invite hooks | Partially working | Hide unless onboarding demo | Add-on/internal |
| Econt integration | `/dashboard/settings#integrations` | Admin UI check | `EcontIntegrationSettings`, Edge Functions | Functional but complex | Hide from generic demo unless Bulgarian shipping is the pitch | Add-on |
| Stripe/billing | No visible complete flow | N/A | `src/lib/stripeClient.ts` | Unfinished; no backend endpoint in repo | Hide | Remove or future add-on |
| Resend email | Indirect | N/A | `src/lib/resendClient.ts`, invite functions | Frontend Resend is unsafe; Edge invite email is better | Hide implementation | Must fix |
| PostHog tracking | Global | All | `src/lib/analytics.ts` | Functional if key set | Include silently | Internal ops |
| Platform tenants | `/platform/tenants` | Platform admin | `src/app/platform/tenants/*`, create/delete Edge functions | Internal console | Hide from client demo | Internal-only |

## 3. TED/Demo-Specific And Legacy State

### Hardcoded Or Residual Branding

| Term/source | Evidence | Action |
|---|---|---|
| FurniTrade | `package.json` name, `index.html`, `README.md`, landing page, email templates, schema comments | Rebrand before sales demo or make tenant branding fully dynamic. |
| B2Bcenter/b2bcenter | Comments in dashboard/account manager/profile files and SQL comments | Remove before sale; harmless but unprofessional. |
| Centivon | Tenant host constants, platform URLs, `PortalNotFound`, landing page, docs | Keep only if Centivon is the product brand; otherwise abstract. |
| TED | `ted_bg.xml`, `scripts/ted-xml-to-csv.js`, `scripts/ted-products.csv` | Treat as internal import sample; do not ship in generic demo. |
| Mebelcenter / All Power | Landing page logo strip and public assets | Remove or replace with neutral demo logos unless permitted. |
| Placeholder/demo emails | `orders@sofiafurniture.bg`, `owner@example.com`, `dev@example.com`, etc. | Fine for local samples, but hide in clean demo data. |
| `support@furnitrade.com` | Complaint page support mailto | Replace with demo/product support domain. |

### Environment/Domain Assumptions

- Marketing hosts: `centivon.com`, `www.centivon.com`.
- App hosts: `centivon.vercel.app`, and local-only `platform.centivon.local`, `centivon.local`, `localhost`.
- Subdomain root: `centivon.com`.
- Slug fallback: `/t/:slug`.

For a TED sales demo, set up one clean tenant with TED-like branding in data, not hardcoded code changes.

## 4. Import System Audit

### What Formats Are Supported?

Current in-app import is CSV only:
- Route `/dashboard/csv-import`.
- Page renders `CSVImportWizard`.
- Uses PapaParse through `parseCSVFlexible`.

XML is not currently an app feature in this repository:
- `scripts/ted-xml-to-csv.js` converts root-level `ted_bg.xml` into `scripts/ted-products.csv`.
- Docs mention a Universal/XML importer, but matching source files are not present in `src/components/import` or `src/lib/xml`.
- Therefore, XML should be described as internal preprocessing, not productized import.

### CSV Flow

| Step | Implementation |
|---|---|
| Upload | `CSVImportWizard.handleFileSelect` |
| Parse | `parseCSVFlexible(file)` in `src/lib/csv/parser.ts` |
| Delimiter | Auto-detects comma vs semicolon from first line |
| Header normalization | trim, lowercase, spaces to `_` |
| Distributor detection | `detectDistributor` in `src/lib/csv/distributors.ts` |
| Column mapping | `useSmartMapping`, `ColumnMappingStep` |
| Category mapping | `CategoryMappingStep`, `extractAndMatchCategories` |
| Validation | `useSmartMapping.validateData` |
| Category creation | `prepareProductsWithCategoryId` -> `syncCategoriesFromImport` |
| Product import | Batched `supabase.from('products').upsert(... onConflict: 'tenant_id,sku')` |
| Cache refresh | Invalidates products/categories/category hierarchy |

### Supported CSV Presets

- Megapap
- B2BMarkt
- IKEA
- Generic CSV

Detected/standard fields include: `sku`, `name`, `description`, `category`, `subcategory`, `manufacturer`, `model`, `retail_price`, `wholesale_price`, `stock`, `moq`, `weight`, `transportational_weight`, `availability`, `main_image`, `images`, `date_expected`.

### Required Fields

Code-level required mapped fields are only:
- `sku`
- `name`

`weboffer_price` is required by DB expectations, but the wizard falls back to:
1. mapped wholesale price
2. retail price
3. `0`

This means imports can silently create zero-priced products.

### Category Behavior

- Category text is normalized into main/subcategory if it contains `>`.
- Missing category becomes `Uncategorized`.
- Category sync is non-destructive: it creates missing categories and does not delete existing categories.
- Existing categories are matched by case-insensitive name and parent relationship.
- Product `category_id` is assigned before upsert.
- Legacy `products.category` text is still retained for compatibility/search.

### SKU Uniqueness

- Product upsert uses `onConflict: 'tenant_id,sku'`.
- `tenant-data-isolation.sql` creates unique index `idx_products_tenant_sku_unique on products(tenant_id, sku)`.
- This is tenant-scoped, not global, if the current SQL state is applied.
- The wizard deduplicates duplicate SKUs inside one import and keeps the last row.

### Mapping Persistence

- CSV mapping persistence is not wired into the UI.
- `csv_distributor_mappings`, `category_synonyms`, and `csv_import_history` SQL exists, but current wizard uses hardcoded presets and in-memory state.
- Import history is not written by the active wizard.

### Import Risks For Real Client Catalogs

- Zero-priced products can be imported if price mapping is wrong.
- Last duplicate SKU silently wins.
- No dry-run export of changes before upsert.
- No rollback snapshot or batch import ID.
- No import history record in active code.
- Category matching is helpful but not enough for complex nested catalogs.
- Image URLs are remote references; files are not copied into controlled storage.
- `Delete All Products` is available inside the import wizard for admins and can delete a tenant catalog.
- TED XML support is a one-off script, not reusable client-facing XML support.

### Demo Recommendation

Show CSV import only in an admin/internal part of the demo. For sales calls, prefer preloaded catalog data and show the import wizard as “admin tooling” only after explaining it is configurable onboarding tooling.

## 5. Security Audit

### Supabase Keys

- Frontend uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. That is normal for Supabase browser apps.
- Edge functions use `SUPABASE_SERVICE_ROLE_KEY` server-side for admin operations. That is appropriate when functions validate callers.
- `.env` exists in repo root locally. Ensure it is not committed and rotate any leaked keys if this repo was shared.

### Frontend-Exposed Secrets

Critical issue:
- `.env.example` documents `VITE_RESEND_API_KEY`.
- `src/lib/resendClient.ts` reads `VITE_RESEND_API_KEY` and calls `https://api.resend.com/emails` directly from the browser.
- Any real Resend API key in a `VITE_` variable is public to every browser user.

Action: remove frontend Resend usage and send all transactional mail through Supabase Edge Functions.

Stripe:
- `VITE_STRIPE_PUBLISHABLE_KEY` is safe as a publishable key.
- `createCheckoutSession` expects `/api/create-checkout-session`, which does not exist in this repo.

PostHog:
- `VITE_POSTHOG_KEY` is public by design.
- Autocapture is enabled. Consider disabling autocapture or filtering fields before demos with real client data.

### Auth/Session Handling

- Supabase auth persists session and auto refreshes.
- `useAuth` auto-creates tenant-scoped profiles with role `company`.
- `TenantProvider` checks `tenant_memberships`.
- `AuthGuard` redirects unauthenticated users and checks onboarding.

Risk:
- Profile role and membership role can drift.
- Platform host intentionally has no tenant profile loaded, so platform auth has custom checks.

### Route Protection And Role Checks

Strong:
- `/dashboard/*` requires tenant domain, active tenant, auth, and membership.
- `/platform/*` has `PlatformAdminGuard`.

Weak:
- `/dashboard/categories/manage` route is available to any member who manually opens it. The page itself does not hard-return for non-admins; it relies on RLS and hides some capabilities indirectly.
- `/dashboard/settings#team` and `#integrations` are UI-hidden for non-admins, but the route is still the same settings page.
- `/dashboard/unpaid-balances` shows access denied for non-admins.
- `/dashboard/clients` redirects non-admins.
- `/dashboard/csv-import` shows access denied for non-admins.

Action: add explicit route/page guards for every admin-only page, not just navigation filtering.

### Direct Table Access From Frontend

The app directly reads/writes many tables from the browser:
- `products`
- `categories`
- `quotes`
- `complaints`
- `wishlist_items`
- `profiles`
- `companies`
- `tenant_memberships`
- `tenant_invitations`
- `notifications`
- `shipments`

This can be acceptable with strict RLS, but it increases blast radius if policies drift.

### RLS And Data Isolation

Good:
- `tenant-data-isolation.sql` adds `tenant_id`, tenant-scoped indexes, and tenant RLS policies.
- `products`, `categories`, `quotes`, `complaints`, `wishlist_items`, `companies`, `profiles` are intended to be tenant-scoped.

Concerns:
- Many older SQL files contain permissive MVP/dev policies such as `WITH CHECK (true)` and `USING (true)`.
- `schema.sql` is obsolete and public-selects products with old roles `sales`/`buyer`.
- `current_tenant_id()` selects the first membership and the schema enforces one tenant per user. That matches current single-tenant membership intent but limits future multi-tenant users.
- `tenant_quotes_select` in `tenant-data-isolation.sql` allows any tenant member to select all tenant quotes. Company orders UI filters by user in production, but RLS does not restrict member access to own quotes.

Highest-risk RLS issue: a tenant member may be able to query all tenant `quotes` directly from the browser console if the final applied policy is `tenant_quotes_select` from `tenant-data-isolation.sql`.

### Dev/Demo Mode Behavior

Dangerous if enabled:
- `VITE_DEV_MODE=true` lets order creation use fallback IDs.
- Orders and complaints pages show all orders in dev/demo mode instead of filtering by user.
- Placeholder Supabase URL triggers demo mode in orders/complaints.

Action: ensure production/demo env has `VITE_DEV_MODE=false` and no placeholder URL logic reachable in deployed demos.

### File Upload/Storage

Buckets referenced:
- `logos` for company logos and avatars.
- `complaints` for complaint photos.
- `category-images` for category images.

Risks:
- `logos` bucket policies allow any authenticated user broad upload/update/delete by bucket, not path-owner scoped.
- Complaint photos are public if bucket created as public.
- Category image bucket migration was not found; code references `category-images`.
- File validation is mostly client-side type/size checks.

Action: define storage policy per bucket, per tenant/user path, and use signed URLs for complaint photos if they are sensitive.

### Console Logging

Many logs remain in production paths:
- CSV parsing logs raw headers/sample rows.
- Category sync logs company/tenant IDs.
- Auth logs tenant mismatch/profile details.
- Orders/complaints log query failures.

Action: gate diagnostic logs behind `import.meta.env.DEV` or a logger with redaction.

## 6. Reliability And Operations Audit

### Error Handling

Good:
- Global `ErrorBoundary` with `ErrorFallback`.
- React Query retry default is `1`; refetch on focus disabled.
- Many mutations show toast errors.
- Some schema drift fallbacks exist, e.g. orders internal notes fallback.

Gaps:
- No automated tests found.
- No smoke test script.
- No CI config found in this repo inspection.
- No centralized logging/monitoring except PostHog and Vercel Speed Insights.
- Import failure is per-batch, but no rollback or import history.
- Order creation has helpful migration error for missing `shipping_method`, but no retry/idempotency.
- Realtime subscriptions are broad by table and rely on RLS/client invalidation.

### Loading And Empty States

Mostly present in dashboard pages:
- Products, categories, orders, clients, unpaid balances, wishlist use skeletons/empty states.
- CSV wizard has progress state.
- Auth/tenant gates have spinners and timeout handling.

### Build/Lint/Test Scripts

`package.json`:
- `npm run dev`
- `npm run build` = `tsc && vite build`
- `npm run preview`
- `npm run lint`

No test script exists.

I did not run build/lint because the task requested inspection/reporting only and build writes to `dist`.

### Operational Gaps

- No clean backup/rollback procedure for imports.
- No import job table or batch ID.
- No production bootstrap runbook that matches current SQL state exactly.
- No definitive ordered migrations directory.
- No environment validation screen for required buckets/functions/policies.
- No RLS test suite by role.

## 7. Database And Migration Audit

### Required Tables By Current App

Core:
- `tenants`
- `tenant_domains`
- `tenant_memberships`
- `tenant_invitations`
- `profiles`
- `companies`
- `products`
- `categories`
- `quotes`
- `complaints`
- `wishlist_items`
- `notifications`

Integrations:
- `tenant_integrations`
- `shipments`

Import infrastructure:
- `csv_distributor_mappings`
- `category_synonyms`
- `csv_import_history`

Legacy/unused from old schema:
- `orders` table exists in `schema.sql`, but current app uses `quotes` as orders.

### Required Buckets

| Bucket | Used by | Migration found? | Notes |
|---|---|---|---|
| `logos` | Company logos and profile avatars | Yes: `create-logos-storage-bucket.sql` | Policies too broad for production. |
| `complaints` | Complaint photos | Yes: `create-complaints-table.sql` | Public photos may be inappropriate. |
| `category-images` | Category management | No dedicated migration found | Must add production bucket/policies. |

### Migration State

The repo has many loose SQL files under `supabase/`, not an ordered migration chain. There is no `supabase/migrations` directory in the file list. This creates high schema drift risk.

Obsolete/overlapping examples:
- `supabase/schema.sql` is old FurniTrade schema with roles `admin`, `sales`, `buyer`, `orders` table, `wholesale_price`, `stock`, and non-tenant model.
- Multiple profile RLS fixes: `fix-profiles-rls-simple.sql`, `fix-profiles-rls-final.sql`, `fix-profiles-rls-complete.sql`, `fix-profiles-rls-recursion.sql`.
- Multiple company insert/update policy fixes.
- Dev-mode constraint removals for products, complaints, wishlist.
- Product schema migrations include both `migration-update-products-table.sql` and `migration-update-products-table-safe.sql`.

### Role/Status Inconsistencies

Roles:
- Current app types: `Profile.role = admin | company`.
- Tenant membership: `owner | admin | member`.
- Old SQL: `admin | sales | buyer`.
- Invite target role: `admin | company`.

Statuses:
- Current UI order statuses: `processing`, `awaiting_payment`, `shipped`, `completed`, `rejected`.
- DB values often mapped as `new`, `pending`, `shipped`, `approved`, `rejected`.
- Complaints UI maps `pending`, `in-review`, `approved`, `rejected` into `new`, `in-progress`, `resolved`, `closed`.

Action: create one canonical status mapping document and DB constraints that match it.

### Production Bootstrap Checklist

Before first paid client:

1. Create an ordered migration directory from a blank Supabase project.
2. Remove obsolete `schema.sql` from runbooks or mark it legacy.
3. Define final role model and update all policies/code to use it consistently.
4. Define final order/complaint status enums or check constraints.
5. Create all storage buckets with tenant/path-safe policies.
6. Deploy Edge Functions: `invite-client`, `accept-invite`, `create-tenant`, `delete-tenant`, `lookup_tenant_by_email`, all Econt functions if shipping is sold.
7. Set Edge env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ECONT_CREDENTIALS_ENCRYPTION_KEY`, app URL/SITE URL.
8. Verify RLS with test users: owner/admin/member/platform admin.
9. Verify a member cannot query another member's quotes/complaints.
10. Verify import upsert uniqueness on `(tenant_id, sku)`.
11. Verify buckets and public/private URLs.
12. Run `npm run build` and `npm run lint`.
13. Seed one clean demo tenant with catalog, categories, admin, client, orders, complaints.
14. Disable `VITE_DEV_MODE`.
15. Remove frontend Resend key and route emails through functions.

## 8. Recommended Packaging

### Core/Base Package

- Tenant-aware dashboard
- Auth/login/invite onboarding after cleanup
- Product catalog
- Category browsing
- Wishlist
- Cart/order request
- Order status tracking
- Company/profile settings
- Basic client/admin separation
- Basic dashboard overview

### Add-on/Upsell Features

- Advanced analytics
- CSV catalog import/onboarding tool
- Proforma PDF generation
- Complaints/returns workflow
- Client commission/discount management
- Unpaid balances
- Econt/shipping integration
- Team member invites

### Internal-Only

- Platform tenant console
- Tenant create/delete functions
- TED XML converter and raw TED files
- CSV delete-all-products operation
- Import diagnostics/logging tools
- Dev-mode fallback behavior

### Hide From Demo

- `/dashboard/quotes`
- Stripe/billing
- Platform console
- Econt settings unless shipping integration is explicitly being sold
- CSV import delete-all action
- Signup/onboarding flows unless the demo is specifically about self-service onboarding
- Any TED conversion script/file references

### Remove Later

- Old `FurniTrade` branding if product is not FurniTrade.
- Old `B2Bcenter` comments.
- Obsolete SQL fixes after creating a clean migration chain.
- Unused `src/app/dashboard/distributors/index.tsx` if clients replaced distributors.
- `src/lib/resendClient.ts` frontend email sender.
- Legacy `/dashboard/quotes` route or merge it into orders.
- Placeholder Vite timestamp files.
- Checked-in generated TED CSV/XML from generic demo branches.

### Must Fix Before Selling

1. Remove frontend Resend API key usage.
2. Add route/page-level admin guards for every admin-only page.
3. Tighten RLS so company members cannot select all tenant quotes.
4. Disable and remove production dev-mode fallback IDs.
5. Build a clean migration chain from empty DB to final schema.
6. Add required buckets and storage policies.
7. Decide final brand and remove legacy branding.
8. Add import history, dry-run, and rollback/snapshot for catalog imports.
9. Add build/lint/test CI and RLS tests.
10. Verify Econt credentials encryption key and Edge Function deployment.

## 9. Detailed Findings

### Product/Catalog

Strengths:
- Product browsing is substantial: filters, search, pagination, quick view, wishlist, add to cart.
- Normalized `categories` table and `products.category_id` are used for browsing.
- Tenant filters are applied in queries.

Risks:
- Product edit is marked TODO.
- Admin determination in products/categories sometimes uses `profile?.role === 'admin'`, not tenant membership.
- Remote images are referenced directly; no image import/cache pipeline.

Demo recommendation: include product browsing and category browsing. Avoid claiming full product management unless edit/create flows are finished.

### Categories

Strengths:
- Category hierarchy exists with main/subcategory support.
- Admin can create/edit/delete/merge and upload images.

Risks:
- `/dashboard/categories/manage` needs explicit admin guard.
- `category-images` bucket migration was not found.
- Category sync may create duplicate-ish names if spelling/casing varies.

### Clients

Strengths:
- Admin client list exists with invitations, commission rates, pagination, sorting.
- Invite flow uses Edge Function with service role and caller authorization.

Risks:
- Invite function lists all auth users to find email; acceptable for small scale but not ideal at large scale.
- Client/company naming is inconsistent with distributor labels in translations/files.

### Orders/Quotes

Strengths:
- Orders page is the main order workflow and maps `quotes` into order UI.
- Admin can update statuses/internal notes.
- Company can generate proforma PDFs for selected orders.

Risks:
- `/dashboard/quotes` is legacy and appears inconsistent with current `quotes` fields.
- Company orders UI filters by user only in production mode; RLS may allow all tenant quote reads.
- Status mapping exists in multiple files.
- Per-order duplicate/email actions are TODO.

### Complaints/Returns

Strengths:
- Company complaint submission and admin complaint management exist.
- Photo upload and status updates exist.

Risks:
- Complaint photo storage should be tenant/user scoped and probably private.
- Dev/demo mode can show all orders as complaint source.
- Admin status values are mapped between two different vocabularies.

### Analytics

Strengths:
- Admin and member-specific analytics are implemented.
- Uses charts and direct queries.

Risks:
- Many catch/log fallbacks suggest fragile schema assumptions.
- No backend aggregate layer; heavy tenants may make browser queries slow.

### Billing/Stripe

Status: unfinished.

Evidence:
- `src/lib/stripeClient.ts` loads Stripe publishable key and calls `/api/create-checkout-session`.
- No backend API route for checkout session exists in this Vite SPA repo.

Recommendation: hide/remove billing claims from demo until backend flow exists.

### Email/Resend

Status: mixed.

Good:
- Invite emails are sent through Supabase Auth Admin in Edge Functions.

Bad:
- Browser-side Resend API key and direct send function exists.

Recommendation: remove browser Resend client before any deployed demo with real keys.

### Econt/Shipping

Strengths:
- Good Edge Function architecture.
- Credentials are encrypted with `ECONT_CREDENTIALS_ENCRYPTION_KEY`.
- Demo and prod environments supported.
- Shipment records are tenant-scoped.

Risks:
- Built-in Econt demo credentials exist in `_shared/econt.ts`.
- Requires several deployed functions and env vars.
- Operationally complex; not suitable to casually show unless configured and tested.

## 10. Demo Plan Recommendation

For a TED-style sales demo, use this flow:

1. Start as a client user in a clean tenant.
2. Show dashboard overview.
3. Browse categories and product catalog.
4. Add products to wishlist/cart.
5. Submit an order with shipping method.
6. Show order tracking.
7. Submit a complaint/return from an order.
8. Switch to admin user.
9. Show admin orders and complaint management.
10. Show clients and commission rate management.
11. Optionally show analytics.
12. Only show CSV import as an admin onboarding tool, not as a daily buyer feature.

Do not show:
- Platform tenant console.
- Raw signup/onboarding unless polished.
- Stripe.
- Legacy quotes page.
- Econt unless explicitly prepared.
- TED XML converter.

## 11. Cleanup Priority

### P0 Before Any External Demo

- Clean demo data and branding.
- Remove/hide legacy `/dashboard/quotes`.
- Ensure `VITE_DEV_MODE=false`.
- Do not deploy with a real `VITE_RESEND_API_KEY`.
- Verify demo users cannot manually open admin pages.
- Verify catalog/order/complaint flows in the target tenant.

### P1 Before Selling

- Clean ordered Supabase migrations.
- RLS test matrix.
- Route-level admin guards.
- Email through Edge Functions only.
- Storage bucket policies.
- Import history/dry-run/rollback.
- Remove stale docs that mention missing Universal/XML importer.

### P2 After First Client

- Add tests.
- Add monitoring/logging.
- Add background import jobs for large catalogs.
- Add configurable import mappings.
- Add dashboard performance optimizations and server-side aggregates.

