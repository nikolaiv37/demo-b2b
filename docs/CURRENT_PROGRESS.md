# Current Progress — demo-b2b

Date: 2026-04-28

## Current roadmap state

### ✅ Етап 1 — P0 External Demo Cleanup
Completed.

Implemented:
- Feature flags for risky/demo-hidden modules.
- Hidden or guarded legacy quotes, Stripe/billing, unpaid balances, Econt, platform console.
- Removed/disabled frontend Resend API key usage.
- Removed invite token/link console logging.
- Added/verified admin guards for admin-only areas.
- Hardened VITE_DEV_MODE so it does not affect deployed demo/prod.
- Core demo flows still work.

### ✅ Етап 2 — P0 RLS / Supabase Cleanup
Core completed.

Completed:
- Fixed invite-client Edge Function ES256 auth issue.
- Deployed invite-client function successfully.
- Created invited company accounts through real flow.
- Fixed broken invited client profile/company linking manually for test accounts.
- Fixed RLS recursion by converting helper functions to SECURITY DEFINER:
  - public.current_tenant_id()
  - public.is_tenant_admin()
  - public.is_platform_admin()
- Fixed quotes schema drift:
  - added shipping_method
  - added user_id
  - added company_name
  - added email
  - added phone
  - relaxed old NOT NULL constraints blocking order insert
  - dropped old quotes_status_check
  - added idx_quotes_user_id
- Fixed dashboard analytics leakage:
  - member/company users now see only their own order analytics
  - admin/owner users still see tenant-wide analytics
- Applied quote/order RLS isolation patch:
  - admin/owner can see/update all tenant quotes
  - member users can select only own quotes
  - member users can insert only own quotes
  - member users cannot update quotes
  - no anon access

Verified:
- TED admin sees all orders.
- HobbyFarms member sees only HobbyFarms orders.
- No Brand LTD member sees only No Brand orders.
- Both companies can browse TED catalog.
- Both companies can submit orders.
- Admin receives/handles orders.
- Dashboard analytics are correctly scoped.

### ✅ Етап 3 — Clean Demo Branding
Completed.

### ✅ Етап 4 — Demo UX / Operations Stabilization
Core completed.

### ✅ Етап 5 — Observability + Minimal Smoke Tests
Completed.

Implemented:
- frontend Sentry bootstrap for React/Vite behind `VITE_SENTRY_DSN`
- safe Sentry context sync for user id, tenant id/slug, and role only
- privacy guardrails to avoid breadcrumbs, request bodies, cookies, headers, replay, and sensitive URL token leakage
- lightweight static smoke checks via `npm run smoke`
- `npm run verify` wrapper for build + smoke
- observability/runbook doc:
  - `docs/OBSERVABILITY_AND_SMOKE_TESTS.md`

## Important created/updated files

Audit/context:
- docs/audits/DEMO_B2B_AUDIT_REPORT.md
- docs/audits/DEMO_B2B_CONTEXT_PACK.md
- docs/audits/SECURITY_AUDIT_B2B.md
- docs/PROJECT_DECISIONS.md

Security / Supabase:
- supabase/P0_fix_quotes_rls_member_isolation.sql
- supabase/P0_fix_quotes_schema_drift.sql
- supabase/P0_fix_rls_recursion.sql
- supabase/DO_NOT_RUN_LEGACY_SQL.md
- supabase/P0_SQL_EXECUTION_GUIDE.md
- SUPABASE_RLS_VERIFICATION_CHECKLIST.md

Code areas touched:
- src/config/features.ts
- src/App.tsx
- src/components/SidebarNav.tsx
- src/app/dashboard/overview.tsx
- src/app/dashboard/categories/manage.tsx
- src/app/dashboard/orders/index.tsx
- src/app/dashboard/orders/AdminOrdersView.tsx
- src/app/dashboard/clients/index.tsx
- src/components/QuoteRequestModal.tsx
- supabase/functions/_shared/auth.ts
- supabase/functions/invite-client/index.ts

## Current known issues / P1 risks

Do not treat the system as fully paid-production ready yet.

Remaining risks:
- Profile/company visibility patch not applied yet because strict policies may break onboarding/client flows.
- Storage buckets still need hardening:
  - logos
  - complaints
  - category-images
- Other Edge Functions may need ES256 auth fix:
  - accept-invite
  - create-tenant
  - delete-tenant
- Role model still has schema drift:
  - tenant_memberships.role = owner/admin/member
  - profiles.role still allows/uses buyer/admin
  - DB rejected role='company'
- Clients onboarding should be fixed properly so profiles.tenant_id and profiles.company_id are set automatically.
- PostHog placeholder key creates console noise:
  - phc_REPLACE_ME
- Realtime WebSocket warnings may appear but are not the current blocker.
- CSV import still needs production hardening:
  - file size limits
  - import history
  - rollback/dry-run
- Clean ordered production migration path still needed before paid-client scaling.

## Next roadmap step

Next sequence:
1. manual final demo QA
2. Bulgarian offer concepts / pricing packages
3. pricing/package PDF or DOCX
4. then P1 production hardening

## Important rule for next session

Do not start P1 production hardening before the manual final demo QA and offer/package materials are prepared.
