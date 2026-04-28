# Security Audit: Demo B2B Platform

Generated: 2026-04-28  
Repository: `/Users/nikolaiv37/projects/demo-b2b`  
Scope: static security inspection of frontend, Supabase SQL, storage, and edge functions.  
Constraint: no application logic was modified.

## Executive Verdict

This platform is close enough for a controlled internal demo, but it is not yet safe for a serious external client demo without configuration cleanup, and it is not ready for paid production.

The biggest security concerns are:

- A Resend API key is expected as `VITE_RESEND_API_KEY` and used directly from browser code.
- Several SQL files contain permissive/dev RLS policies that allow anonymous or fixed dev-user access if applied.
- The active tenant isolation migration has a quotes/orders select policy that appears too broad for company users.
- Admin-only pages are enforced inconsistently: some pages block non-admin users, while category management is only hidden in navigation and relies on RLS for writes.
- Storage policies for `logos` allow any authenticated user to update/delete any object in the bucket.
- Complaint/category image uploads have weak file validation and public URL exposure assumptions.
- Invite tokens are returned to the browser and logged in the clients page.
- The project has loose, overlapping SQL files rather than a single clean bootstrap path, so the deployed security state depends on which files were manually applied.

## 1. Authentication

### Supabase auth usage

The browser Supabase client is defined in `src/lib/supabase/client.ts`:

- Uses `VITE_SUPABASE_URL`.
- Uses `VITE_SUPABASE_ANON_KEY`.
- Enables `persistSession: true`.
- Enables `autoRefreshToken: true`.
- Enables `detectSessionInUrl: true`.

This is standard for Supabase browser auth. The anon key is safe to expose only if RLS and storage policies are correct.

### Login flow

Tenant login is in `src/app/auth/login.tsx`.

- Calls `supabase.auth.signInWithPassword`.
- Handles email confirmation hash/session cleanup.
- Supports password reset with `supabase.auth.resetPasswordForEmail`.
- Redirects to `/dashboard` or a requested redirect path.
- Defers membership verification to `TenantProvider`, `TenantEntry`, and `MembershipGuard`.

Platform login is in `src/app/auth/platform-login.tsx`.

- Looks up tenant by email via `lookup_tenant_by_email`.
- Signs in with password.
- Checks `profiles.is_platform_admin` for platform-console access.
- Signs out locally if the user is not a platform admin.
- Also uses `resetPasswordForEmail`.

### Signup/onboarding flow

Signup is in `src/app/auth/signup.tsx`.

- Calls `supabase.auth.signUp`.
- On app host, sends user back to login.
- On tenant host, sends user to `/auth/onboarding`.

Onboarding is in `src/app/auth/onboarding.tsx`.

- Creates or updates company/profile details after signup.
- Intended primarily for owner/admin tenant setup.

Client setup is in `src/app/auth/client-setup.tsx`.

- Requires an invite query parameter and an active Supabase session.
- Updates password via `supabase.auth.updateUser`.
- Updates profile fields.

Owner setup is in `src/app/auth/owner-setup.tsx`.

- Requires an invite query parameter and active session.
- Updates password via `supabase.auth.updateUser`.
- Marks invited owner/admin profile active before onboarding.

Invite acceptance is split across:

- Frontend: `src/app/auth/accept-invite.tsx`
- Edge function: `supabase/functions/accept-invite/index.ts`

The edge function requires a valid JWT, checks the invitation token, checks expiry/status, verifies the signed-in email matches the invitation email, upserts profile, and creates tenant membership.

### Session persistence

Session persistence is enabled in `src/lib/supabase/client.ts`. Supabase stores auth data in browser storage by default. The app also keeps transient auth state in `src/stores/authStore.ts`, but that Zustand store is not persisted.

Other browser persistence:

- `src/stores/cartStore.ts` persists cart state.
- `src/lib/i18n.ts` persists language in `localStorage`.
- `src/hooks/useDarkMode.ts` persists dark-mode preference.
- `src/components/SidebarNav.tsx` persists sidebar submenu state.

No obvious persisted Supabase service-role key or password was found in frontend code.

### Password reset/invite flows

Password reset is initiated from `src/app/auth/login.tsx` and `src/app/auth/platform-login.tsx` with redirect target `/auth/reset-password`.

Risk: no route for `/auth/reset-password` is registered in `src/App.tsx`. If Supabase sends users there, they may hit 404 or a broken recovery flow unless another mechanism handles it outside inspected routes.

Invite flows use Supabase Auth admin invitations from edge functions:

- `supabase/functions/invite-client/index.ts`
- `supabase/functions/create-tenant/index.ts`

These functions use `SUPABASE_SERVICE_ROLE_KEY` server-side, which is appropriate if deployed only as edge secrets.

Risk: `invite-client` returns the invitation token to the browser. `src/app/dashboard/clients/index.tsx` logs invite token and invite link with `console.info`.

### Route protection

Routes are in `src/App.tsx`.

Dashboard routes are wrapped by:

- `DomainGuardTenantOnly`
- `TenantActiveGuard`
- `AuthGuard`
- `MembershipGuard`

Platform routes are wrapped by:

- `PlatformAdminGuard`

Auth setup routes are mostly not route-level protected:

- `/auth/onboarding`
- `/auth/accept-invite`
- `/auth/client-setup`
- `/auth/owner-setup`

Those pages perform some internal checks, but route protection is not centralized.

## 2. Authorization

### Role model

There are two role concepts:

- Tenant membership role: `owner`, `admin`, `member` in `tenant_memberships`.
- Profile role: `admin`, `company`, plus legacy role values in types/pricing code.

The app mostly treats `membership.role === 'owner' || 'admin'` as admin. Some SQL and older files still check `profiles.role = 'admin'`.

Risk: role drift can produce inconsistent behavior, especially if SQL policies use profile role while UI uses tenant membership role.

### Client-side role checks

Strong client-side checks:

- `src/app/dashboard/csv-import/index.tsx` shows access denied for non-admin users.
- `src/app/dashboard/clients/index.tsx` redirects non-admin users.
- `src/app/dashboard/unpaid-balances/index.tsx` blocks non-admin users.
- `src/app/dashboard/orders/index.tsx` switches admin users to `AdminOrdersView`.
- `src/app/dashboard/complaints/index.tsx` switches admin users to `AdminComplaintsView`.
- `src/app/dashboard/settings/index.tsx` hides team/integration sections from non-admin users.

Weak client-side checks:

- `src/app/dashboard/categories/manage.tsx` has no explicit `isAdmin` check in the page itself. It is hidden in the sidebar for non-admins, but the route `/dashboard/categories/manage` exists and can be opened directly.
- `/dashboard/quotes` appears legacy and is still routable.
- Setup routes are directly routable and rely on internal state/session checks.

### Server/RLS assumptions

Most frontend modules call Supabase tables directly with the browser anon client. This means real authorization depends on RLS policies, not hidden navigation.

Important direct-table modules:

- Products: `src/hooks/useQueryProducts.ts`, `src/components/csv-import/CSVImportWizard.tsx`
- Categories: `src/app/dashboard/categories/manage.tsx`, `src/hooks/useCategoryHierarchy.ts`
- Quotes/orders: `src/components/QuoteRequestModal.tsx`, `src/app/dashboard/orders/index.tsx`, `src/app/dashboard/orders/AdminOrdersView.tsx`
- Complaints: `src/app/dashboard/complaints/*.tsx`
- Clients/profiles: `src/hooks/useQueryClients.ts`, `src/hooks/useMutationClient.ts`
- Wishlist: `src/hooks/useWishlist.ts`
- Companies/profiles: `src/hooks/useAuth.ts`, `src/app/dashboard/settings/index.tsx`, `src/components/CompanyForm.tsx`

The strongest apparent RLS set is in `supabase/tenant-data-isolation.sql`, but the repo also contains older permissive policy files. A production deployment must define one final policy set and remove the ambiguity.

### Direct route access risks

Company users can directly open:

- `/dashboard/categories/manage`: UI loads; writes should fail if tenant RLS admin policies are active, but the page itself should still be route-guarded.
- `/dashboard/quotes`: legacy page remains routable.
- `/dashboard/csv-import`: page blocks at UI level.
- `/dashboard/clients`: redirects at UI level.
- `/dashboard/unpaid-balances`: blocks at UI level.

If old permissive SQL policies are applied instead of tenant policies, hidden pages may become dangerous because the browser client can call Supabase directly.

## 3. Data Isolation

### Products

Frontend:

- `src/hooks/useQueryProducts.ts`
- `src/components/csv-import/CSVImportWizard.tsx`

Expected scope:

- Tenant-scoped by `tenant_id`.
- Admin writes only.
- Company users can read visible tenant products.

RLS in `supabase/tenant-data-isolation.sql`:

- Select: `tenant_id = current_tenant_id()`
- Insert/update/delete: tenant admin only.
- Unique SKU index: `(tenant_id, sku)`

Assessment: acceptable if this final policy is applied. Risk remains from route-level category management and import UI if old policies are active.

### Companies

Frontend:

- `src/hooks/useAuth.ts`
- `src/components/CompanyForm.tsx`
- `src/app/dashboard/settings/index.tsx`

RLS in `supabase/tenant-data-isolation.sql`:

- Select: all companies in current tenant.
- Insert: current tenant.
- Update: only the company linked to the current profile.

Risk: tenant-wide company select means any tenant member may be able to read company records for all clients if the app or direct Supabase query asks for them. For B2B client privacy, company users should normally only read their own company and perhaps supplier company, while admins can read all.

### Profiles

Frontend:

- `src/hooks/useAuth.ts`
- `src/hooks/useQueryClients.ts`
- `src/app/dashboard/clients/index.tsx`

RLS in `supabase/tenant-data-isolation.sql`:

- Select: all profiles in current tenant.
- Insert/update own only.

Risk: tenant-wide profile select can expose all client profile data to any tenant member via direct query unless the final policy is narrowed.

### Quotes/orders

Frontend:

- Company orders: `src/app/dashboard/orders/index.tsx`
- Admin orders: `src/app/dashboard/orders/AdminOrdersView.tsx`
- Quote/order creation: `src/components/QuoteRequestModal.tsx`, `src/hooks/useMutationQuote.ts`

Critical RLS issue:

`supabase/tenant-data-isolation.sql` defines `tenant_quotes_select` as `tenant_id = current_tenant_id()` with no `user_id = auth.uid()` restriction for members. If applied, a company user can likely read all quotes/orders in their tenant by direct Supabase call, even though the UI filters by `user_id` in production mode.

Old files also contain permissive policies:

- `supabase/fix-quotes-rls-policy.sql` allows `auth.uid() IS NULL` and grants `INSERT, SELECT` to `anon`.
- `supabase/add-quotes-admin-rls.sql` checks `profiles.role = 'admin'` without tenant membership context.

Assessment: blocks paid production and likely blocks serious external demo with real client-like data.

### Complaints

Frontend:

- `src/app/dashboard/complaints/NewComplaintTab.tsx`
- `src/app/dashboard/complaints/MyComplaintsTab.tsx`
- `src/app/dashboard/complaints/AdminComplaintsView.tsx`

Tenant isolation policy:

- Select: tenant admin or complaint owner.
- Insert: complaint owner.
- Update: owner only while pending, plus admin update.

This is the right shape.

Old files contain permissive policies:

- `supabase/create-complaints-table.sql`
- `supabase/fix-complaints-rls-policies.sql`

These allow `auth.uid() IS NULL`, a fixed dev user UUID, and grant `INSERT, SELECT` to `anon`. These must not be applied in production.

### Wishlist

Frontend:

- `src/hooks/useWishlist.ts`
- `src/app/dashboard/wishlist/index.tsx`

Tenant isolation policy:

- Select/insert/delete: current tenant and `user_id = auth.uid()`.

Old files:

- `supabase/create-wishlist-table.sql`
- `supabase/fix-wishlist-rls-policies.sql`

These include fixed dev-user access. If old policy set is active, wishlist data may leak across dev/demo assumptions.

### Import configs/import history

SQL:

- `supabase/create-csv-import-mappings.sql`

Tables:

- `csv_distributor_mappings`
- `category_synonyms`
- `csv_import_history`

Risks:

- `csv_distributor_mappings` and `category_synonyms` are globally readable via `USING (true)` in the old file.
- Admin checks use `profiles.role = 'admin'`, not tenant membership.
- Active import UI does not appear to persist mappings/history, so the table policy surface may be stale.
- `tenant-data-isolation.sql` only tenant-scopes `csv_import_history`, not distributor mappings/synonyms.

### Clients

Frontend:

- `src/app/dashboard/clients/index.tsx`
- `src/hooks/useQueryClients.ts`
- `src/hooks/useMutationClient.ts`
- `src/hooks/useMutationInviteClient.ts`

Client page has UI admin guard, but query/mutation security depends on RLS. `useQueryClients` reads `tenant_memberships`, `profiles`, and `quotes`. If `profiles` and `quotes` RLS are too broad, company users may query client data directly.

### Categories

Frontend:

- `src/app/dashboard/categories/manage.tsx`
- `src/app/dashboard/categories/index.tsx`
- `src/hooks/useCategoryHierarchy.ts`

Tenant isolation policy:

- Select all tenant categories.
- Insert/update/delete admin only.

Risk:

- Manage page lacks explicit admin route guard.
- Category images upload to `category-images`, but no matching bucket/policy SQL was found.

## 4. Secrets and Environment Variables

### Frontend `VITE_*` variables

Declared in `src/vite-env.d.ts`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_RESEND_API_KEY`
- `VITE_POSTHOG_KEY`
- `VITE_POSTHOG_HOST`

Additional usage:

- `VITE_DEV_MODE` appears in CSV import, orders, complaints, and quote creation code.

Safe public frontend variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`, only if RLS is correct.
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `VITE_POSTHOG_KEY`, with privacy configuration reviewed.
- `VITE_POSTHOG_HOST`

Risky public frontend variables:

- `VITE_RESEND_API_KEY`: should never be a browser-exposed secret.
- `VITE_DEV_MODE`: acceptable only in local builds; dangerous if enabled in deployed demo/prod.

### Resend

`src/lib/resendClient.ts` directly calls `https://api.resend.com/emails` with `Authorization: Bearer ${VITE_RESEND_API_KEY}`.

This is a critical issue. Anyone who loads the bundle can extract the key and send email as the configured account until the key is revoked.

### Stripe

`src/lib/stripeClient.ts` uses only `VITE_STRIPE_PUBLISHABLE_KEY`, which is appropriate. Checkout session creation is a placeholder call to `/api/create-checkout-session`; no server implementation was found in the inspected app. Stripe secret key was not found in frontend code.

### PostHog

`src/lib/analytics.ts` uses `VITE_POSTHOG_KEY` and autocapture.

Risk: autocapture may collect client names, product/order metadata, form text, and user identifiers unless configured. `identifyUser` sends email and role traits from `src/hooks/useAuth.ts`.

### Supabase service-role keys

Service-role usage is confined to edge functions:

- `supabase/functions/accept-invite/index.ts`
- `supabase/functions/invite-client/index.ts`
- `supabase/functions/create-tenant/index.ts`
- `supabase/functions/delete-tenant/index.ts`
- `supabase/functions/_shared/auth.ts`
- Econt shared functions.

This is acceptable if the key is only set as Supabase function secret. No service-role key value was found in frontend source.

## 5. Storage Security

### `logos` bucket

SQL: `supabase/create-logos-storage-bucket.sql`

- Bucket is public.
- Anyone can view objects.
- Any authenticated user can insert.
- Any authenticated user can update any object in the bucket.
- Any authenticated user can delete any object in the bucket.

Frontend upload points:

- Company logo: `src/components/CompanyForm.tsx`
- Avatar: `src/app/dashboard/settings/index.tsx`

File validation:

- Company logo validates image MIME type and max 5MB.
- Avatar validation exists elsewhere in settings form, but storage policy still allows direct uploads from browser clients.

Risk: an authenticated user can overwrite/delete other tenants' logos or upload arbitrary files directly through Supabase storage if bucket policy remains broad.

### `complaints` bucket

SQL: `supabase/create-complaints-table.sql`

- Bucket is public.
- Storage policy intends user-folder based access: `auth.uid()::text = (storage.foldername(name))[1]`.

Frontend path:

- `src/app/dashboard/complaints/NewComplaintTab.tsx` uploads to `complaints/${user.id}/...` inside the `complaints` bucket.

Risk:

- Because the bucket is public, public URLs may bypass the select policy depending on Supabase public bucket behavior.
- Upload validation only checks `file.type.startsWith('image/')`.
- No size limit is enforced in the complaint uploader.
- No server-side malware/content validation.

### `category-images` bucket

Frontend:

- `src/app/dashboard/categories/manage.tsx` uploads to `category-images`.

No SQL file defining this bucket or policies was found. This means the feature may fail in fresh environments or may rely on manually created public policies.

Risk:

- Unknown public/private status.
- Unknown write restrictions.
- No file type or file size validation is visible in the category image upload code.

## 6. Import Security

### CSV import risk

Main files:

- `src/app/dashboard/csv-import/index.tsx`
- `src/components/csv-import/CSVImportWizard.tsx`
- `src/lib/csv/parser.ts`
- `src/hooks/useSmartMapping.ts`
- `src/lib/category-sync-from-import.ts`

Risks:

- Full file is read into browser memory with `FileReader.readAsText`; no file size limit was found.
- PapaParse is used client-side; malformed huge files can freeze the browser.
- Imported descriptions/categories/names can include attacker-controlled content.
- CSV formula injection is possible if data is later exported to spreadsheet without escaping.
- Logs include headers, parsed sample rows, category sync summaries, and errors.
- Product images are external URLs from the CSV; browser will load them later, leaking user IP/user agent to third-party image hosts.
- Import writes directly from browser to `products` and `categories`; RLS must be perfect.
- Delete-all-products action exists in the wizard and should be admin-only server-validated.

Positive:

- Active import requires `isAdmin` at page level.
- Product upsert uses `(tenant_id, sku)` conflict key in `CSVImportWizard`.
- Duplicate SKUs in one file are deduplicated before upsert.

### XML parsing risk

XML is handled by script only:

- `scripts/ted-xml-to-csv.js`

Risks:

- Regex-based XML parsing is not robust for arbitrary XML.
- Reads `ted_bg.xml` from repo root and writes `scripts/ted-products.csv`.
- No file size limit.
- Not an app UI, so risk is mostly internal developer-machine risk unless exposed later.

### External URL fetch risk

No server-side remote image fetching was found in the import flow. Product image URLs are stored and loaded by browsers. This avoids server-side SSRF but still creates privacy and content risks.

### Malformed/huge file risk

CSV parsing and import are entirely client-side. A huge CSV can cause memory pressure, UI lockups, and partial writes. There is no server-side import job, validation boundary, upload scanning, row limit, or rollback.

### Image URL risk

Product image URLs from CSV are rendered in image tags. React escapes text fields by default, but image URLs can:

- Track users.
- Break UI.
- Serve inappropriate content.
- Trigger `onError` code paths.

`src/components/ProductGridCard.tsx` uses `target.parentElement.innerHTML` in image error handling. The string is static, so this is not directly user-controlled XSS, but direct `innerHTML` should be avoided in a hardened app.

## 7. Browser/Client Risks

### Console logging

Sensitive or noisy logs found:

- CSV parsed headers/sample rows: `src/lib/csv/parser.ts`, `src/components/csv-import/CSVImportWizard.tsx`
- Category sync details: `src/lib/category-sync-from-import.ts`
- Invite token/link: `src/app/dashboard/clients/index.tsx`
- Tenant/profile mismatch details: `src/hooks/useAuth.ts`
- Error objects from Supabase queries across dashboard modules.

The invite token logging is the highest concern. Logs may be visible to screen-share participants, browser extensions, support tooling, and end users.

### localStorage/sessionStorage

Expected Supabase session persistence is enabled. Additional app state:

- `src/stores/cartStore.ts` persists cart contents.
- Sidebar/dark-mode/i18n preferences use `localStorage`.

Risk: cart data may include product names, quantities, and pricing on shared devices. This is not a blocker but should be documented.

### Persisted Zustand stores

Only cart store is persisted. Auth store is not persisted directly.

### XSS risks

Positive:

- `src/components/HtmlContent.tsx` uses DOMPurify before `dangerouslySetInnerHTML`.

Risks:

- `HtmlContent` allows `href`, `target`, and `rel`, but does not explicitly constrain URI schemes in config. DOMPurify usually blocks dangerous schemes by default, but this should be tested.
- Email HTML templates in `src/lib/resendClient.ts` interpolate names/reasons without escaping, and the same file sends from browser.
- Product/category/import text comes from CSV and should be treated as untrusted everywhere.
- `ProductGridCard` uses static `innerHTML` in an error handler.

### Unsafe HTML rendering

The main explicit HTML rendering path is `HtmlContent`, which sanitizes. No un-sanitized `dangerouslySetInnerHTML` was found in the scanned app files.

## 8. Operational Security

### Backups

No backup policy, restore procedure, or PITR checklist was found in repo docs or scripts during this audit.

### Rollback

No clean rollback strategy was found for:

- CSV imports.
- Delete-all-products in import wizard.
- Tenant deletion.
- Schema migrations.

`supabase/functions/delete-tenant/index.ts` permanently deletes tenant-linked data and optionally auth users. This should require additional confirmation/audit logging in production.

### Logging/monitoring

Current logging is mostly `console.*` in frontend and edge functions. There is PostHog analytics and Vercel Speed Insights, but no security/audit monitoring layer was found.

Missing:

- Audit log table for admin actions.
- Import job history wired into active UI.
- Invite send/resend audit trail in app UI.
- Tenant deletion audit trail.
- Security event monitoring.
- Sentry or structured server error reporting.

### Admin action tracking

Not sufficient for production. Admin actions that should be audited:

- Product import.
- Delete all products.
- Category create/edit/delete/merge.
- Client invite/resend/delete/commission update.
- Order status changes.
- Complaint status/internal note updates.
- Econt settings changes.
- Tenant create/delete/status changes.

### Rate limiting and abuse prevention

No explicit rate limiting was found for:

- Login attempts beyond Supabase defaults.
- `lookup_tenant_by_email`.
- Invite-client edge function.
- Accept-invite attempts.
- CSV import attempts.
- Complaint uploads.

Edge functions should enforce basic per-user/per-tenant rate limits for invite creation, tenant lookup, and expensive shipping calls.

## 9. Risk Table

| Severity | Issue | Affected file/module | Exploit scenario | Recommended fix | Blocks demo | Blocks paid production |
|---|---|---|---|---|---|---|
| Critical | Resend API key is browser-exposed | `src/lib/resendClient.ts`, `src/vite-env.d.ts` | A visitor extracts `VITE_RESEND_API_KEY` from the JS bundle and sends email using your Resend account. | Remove `VITE_RESEND_API_KEY`; create a Supabase Edge Function for email sending; rotate the existing key. | Yes for serious external demo | Yes |
| Critical | Quotes/orders RLS may expose all tenant orders to any tenant member | `supabase/tenant-data-isolation.sql` | A company user runs a direct Supabase query against `quotes` and reads all tenant orders because select policy only checks tenant. | Change quotes select policy to admin OR `user_id = auth.uid()`, with tenant check; add tests. | Yes if real/client-like data exists | Yes |
| Critical | Old permissive RLS files grant anon/dev access | `supabase/fix-quotes-rls-policy.sql`, `supabase/fix-complaints-rls-policies.sql`, `supabase/create-complaints-table.sql` | If applied to production, anonymous or fixed dev-user access can insert/read quotes/complaints. | Remove/dev-quarantine these SQL files; produce one ordered production migration set; verify live policies. | Yes for serious external demo | Yes |
| High | `logos` bucket allows any authenticated user to update/delete all logos | `supabase/create-logos-storage-bucket.sql` | One logged-in client deletes or replaces another tenant's logo/avatar. | Scope object paths by tenant/user; restrict update/delete to owner path; add file size/MIME policies if possible. | No for internal demo | Yes |
| High | Invite token is returned and logged in browser | `src/app/dashboard/clients/index.tsx`, `supabase/functions/invite-client/index.ts` | A token appears in console during demo/support screen share and can be used to accept an invitation. | Do not return token except local dev; never log token/link in browser; use server email only. | Yes for external demo | Yes |
| High | Category management route lacks explicit admin guard | `src/App.tsx`, `src/app/dashboard/categories/manage.tsx` | Company user opens `/dashboard/categories/manage` directly; writes may fail only if RLS is correct. | Add page/route-level admin guard and keep RLS as enforcement. | Yes for polished external demo | Yes |
| High | Tenant/profile/company select policies are broad | `supabase/tenant-data-isolation.sql` | Company user can query all tenant profiles/companies directly. | Restrict member select to own profile/company plus supplier-safe fields; admins can read all. | Depends on demo data | Yes |
| High | Dev/demo mode can show all orders/complaint orders | `src/app/dashboard/orders/index.tsx`, `src/app/dashboard/complaints/NewComplaintTab.tsx`, `src/components/QuoteRequestModal.tsx`, `src/hooks/useCSVImport.ts` | A deployed build with `VITE_DEV_MODE=true` or placeholder Supabase URL shows all orders to company users. | Hard-fail production builds with dev mode; remove placeholder demo bypasses. | Yes if deployed externally | Yes |
| High | Complaint uploads lack size limit and public URL assumptions | `src/app/dashboard/complaints/NewComplaintTab.tsx`, `supabase/create-complaints-table.sql` | User uploads huge files or public complaint images leak outside intended viewers. | Enforce client and storage size/type limits; consider private bucket with signed URLs. | No for controlled demo | Yes |
| High | `category-images` bucket/policies missing | `src/app/dashboard/categories/manage.tsx` | Feature fails in fresh deploy or relies on unknown manually configured policies. | Add explicit migration for bucket and tenant/admin-scoped policies. | No if hidden | Yes |
| Medium | Platform admin guard checks profile without tenant context | `src/components/guards/PlatformAdminGuard.tsx` | If profile RLS/policies expose or hide wrong row, platform console gating can behave unexpectedly. | Use edge function/RPC for platform admin assertion or ensure explicit policy for self platform-admin flag. | No | Yes |
| Medium | Role model drift: membership role vs profile role | `src/hooks/useAuth.ts`, `supabase/create-csv-import-mappings.sql`, old admin RLS files | User with stale `profiles.role='admin'` may receive privileges in SQL that UI would not grant. | Standardize on tenant membership roles; remove profile-role admin checks from RLS. | No | Yes |
| Medium | Autocapture analytics may collect sensitive B2B data | `src/lib/analytics.ts`, `src/hooks/useAuth.ts` | PostHog autocaptures client/order/import data or identifies users with email. | Disable autocapture or mask forms; define privacy allowlist; update DPA settings. | Maybe | Yes for regulated clients |
| Medium | CSV import can freeze browser or partially write large imports | `src/lib/csv/parser.ts`, `src/components/csv-import/CSVImportWizard.tsx` | Admin uploads huge/malformed CSV, causing tab crash or partial database state. | Add file size/row limits; move import to server job; add import transactions/rollback. | No for small demo | Yes for real catalogs |
| Medium | Product image URLs are untrusted external content | CSV import/product rendering | Imported product images track client users or show unsafe content. | Proxy/cache images server-side or allowlist trusted hosts; validate URL schemes. | No | Before scaling |
| Medium | Password reset route appears missing | `src/App.tsx`, `src/app/auth/login.tsx`, `src/app/auth/platform-login.tsx` | User clicks reset link and lands on unregistered `/auth/reset-password`. | Implement reset-password route or change redirect to existing handler. | No | Yes |
| Medium | Import mapping/history tables have stale/global policies | `supabase/create-csv-import-mappings.sql` | Users read global distributor mappings; admin checks use profile role only. | Tenant-scope or explicitly mark global read-only seed data; update admin checks. | No | Before production import |
| Medium | `delete-tenant` is destructive with limited visible audit trail | `supabase/functions/delete-tenant/index.ts` | Platform admin deletes tenant/data with no durable audit event. | Add audit log, confirmation phrase, soft-delete option, backup checkpoint. | No | Yes |
| Medium | Edge functions lack explicit rate limits | `supabase/functions/invite-client`, `lookup_tenant_by_email`, Econt functions | Abuse causes invite spam, tenant enumeration, or external API cost. | Add per-user/IP/tenant rate limits and logging. | No | Yes |
| Low | Static `innerHTML` used in image fallback | `src/components/ProductGridCard.tsx` | Low direct XSS risk because string is static, but pattern is unsafe. | Replace with React state fallback rendering. | No | No |
| Low | Console logs reveal internal IDs/import samples | Multiple files | Demo/support user sees internal data in browser console. | Gate logs behind development checks and remove sample row logging. | No | Before production |
| Low | Cart persists in browser storage | `src/stores/cartStore.ts` | Shared device reveals cart contents/pricing. | Clear on logout or tenant switch; document shared-device risk. | No | No |

## 10. Final Recommendation

### Safe for internal demo

Conditionally yes, if:

- The deployed environment does not use real client data.
- `VITE_DEV_MODE` is understood and intentionally configured.
- The Resend key is not a real production key, or email sending is not exercised.
- Demo users are trusted.

Internal demo risk level: medium.

### Safe for external client demo

Not yet for a serious client such as TED unless P0 fixes are completed.

Minimum required before external demo:

- Remove browser Resend key usage and rotate any exposed key.
- Ensure `VITE_DEV_MODE` is false in the deployed demo.
- Remove invite token console logging.
- Hide or guard `/dashboard/categories/manage`.
- Verify live Supabase RLS policies, especially `quotes`, `profiles`, `companies`, and old dev policies.
- Use sanitized demo data only.
- Confirm storage buckets cannot be modified cross-tenant.

External demo risk level before fixes: high.

### Safe for first paid client

No.

Minimum required before first paid deployment:

- Create one clean production migration/bootstrap path.
- Replace all old permissive SQL policy files with a verified final policy set.
- Fix quotes/orders RLS to enforce admin-vs-owner access.
- Narrow profile/company data exposure.
- Move email sending to edge/server.
- Harden storage buckets and upload validation.
- Add audit logs for admin actions.
- Add rate limiting for invite, tenant lookup, and integration endpoints.
- Add import file limits and a recoverable import strategy.
- Verify password reset route.

Paid-client risk level before fixes: critical/high.

### Safe for 5-10 clients

No.

Additional requirements before multi-client operation:

- Automated RLS/security regression tests.
- Monitoring and alerting for edge function errors and auth abuse.
- Backups/PITR and restore drills.
- Tenant deletion/change audit trail.
- Server-side import jobs with staging, validation, rollback, and import history.
- Privacy-reviewed analytics configuration.
- Formal incident response and key-rotation process.

Multi-client risk level before fixes: critical.

## Immediate P0 Security Checklist

- Rotate any Resend key that has ever been used as `VITE_RESEND_API_KEY`.
- Remove direct browser Resend API calls from `src/lib/resendClient.ts`.
- Confirm deployed `VITE_DEV_MODE` is false.
- Fix `tenant_quotes_select` in `supabase/tenant-data-isolation.sql`.
- Quarantine old dev RLS SQL files so they cannot be applied to production.
- Remove invite token/link logging from `src/app/dashboard/clients/index.tsx`.
- Add explicit admin guard to `src/app/dashboard/categories/manage.tsx`.
- Lock down `logos`, `complaints`, and `category-images` storage policies.
- Verify the live Supabase project policies match the intended final policy set.

