# Do Not Run Legacy SQL

This repository contains historical one-off SQL files from earlier demo/client iterations. Do not run these against an external-demo or paid-client Supabase project unless they have been reviewed and folded into a single final migration.

The intended replacement direction is:

1. Start from a clean tenant-aware bootstrap.
2. Use `supabase/tenant-data-isolation.sql` as the historical baseline concept, but do not accept its broad member visibility policies unchanged.
3. Review and apply the P0 patches:
   - `supabase/P0_fix_quotes_rls_member_isolation.sql`
   - `supabase/P0_fix_profile_company_member_visibility.sql`
4. Verify with `SUPABASE_RLS_VERIFICATION_CHECKLIST.md`.

| File | Why dangerous or obsolete | Replaced by | Permissive/dev/anon risk |
|---|---|---|---|
| `supabase/schema.sql` | Old FurniTrade non-tenant schema with `admin/sales/buyer` roles, broad company-level policies, `Anyone can insert quotes`, and an `orders` table that current app does not use as the main order source. | Final tenant-aware bootstrap plus P0 quotes/profile/company patches. | Yes: broad insert/select policies; no tenant isolation. |
| `supabase/fix-quotes-rls-policy.sql` | Explicit dev-mode quote policies allow access when `auth.uid()` is null and grant anon quote insert/select. | `supabase/P0_fix_quotes_rls_member_isolation.sql`. | Yes: anon and dev/null-auth access. |
| `supabase/add-quotes-admin-rls.sql` | Adds admin quote policies using `profiles.role = 'admin'`, which conflicts with tenant membership as the current admin source of truth. | `supabase/P0_fix_quotes_rls_member_isolation.sql`. | No anon grant, but obsolete profile-role authorization. |
| `supabase/fix-complaints-rls-policies.sql` | Drops complaint FK and allows null-auth/dev-user complaint access; grants anon insert/select. | Tenant-aware complaint policies in `tenant-data-isolation.sql`, plus future complaint P1 hardening. | Yes: anon, null-auth, fixed dev UUID. |
| `supabase/create-complaints-table.sql` | Useful table shape, but includes dev/null-auth complaint policies and creates public complaint photo bucket. | A clean complaint table migration plus tenant/user-scoped storage policies. | Yes: null-auth/dev UUID; sensitive storage made public. |
| `supabase/fix-wishlist-rls-policies.sql` | Adds fixed dev UUID access and lacks tenant checks. | Tenant-aware wishlist policies in `tenant-data-isolation.sql`. | Yes: fixed dev UUID and no tenant isolation. |
| `supabase/migration-update-products-table.sql` | MVP/dev product policies allow all inserts, updates, and deletes, and grants anon select. | Tenant-scoped product policies in `tenant-data-isolation.sql`. | Yes: unrestricted authenticated writes; anon select. |
| `supabase/migration-update-products-table-safe.sql` | Safer than the MVP file but still supplier-id based, not tenant-membership based; grants anon select. | Tenant-scoped product policies in `tenant-data-isolation.sql`. | Medium: obsolete model and anon select. |
| `supabase/fix-supplier-id-type.sql` | Recreates product policies around `supplier_id`, not tenant membership. | Tenant-scoped product policies in `tenant-data-isolation.sql`. | Medium: obsolete model. |
| `supabase/create-categories-table.sql` | Category select uses `true`, management uses `profiles.role = 'admin'`, and table lacks tenant isolation until later patches. | Tenant-aware categories section in `tenant-data-isolation.sql`. | Medium: global read and profile-role admin checks. |
| `supabase/fix-profiles-rls-simple.sql` | Old single-table recursion fix; does not account for tenant membership or tenant visibility rules. | `supabase/P0_fix_profile_company_member_visibility.sql`. | Low/medium: incomplete tenant model. |
| `supabase/fix-profiles-rls-complete.sql` | Old recursion fix; does not include tenant membership authorization. | `supabase/P0_fix_profile_company_member_visibility.sql`. | Low/medium: incomplete tenant model. |
| `supabase/fix-profiles-rls-final.sql` | Uses `profiles.role = 'admin'` through `is_user_admin()` and does not scope admin to tenant membership. | `supabase/P0_fix_profile_company_member_visibility.sql`. | Medium: role drift risk. |
| `supabase/fix-profiles-rls-recursion.sql` | Grants `is_admin()` execute to anon and checks `profiles.role`, not tenant membership. | `supabase/P0_fix_profile_company_member_visibility.sql`. | Medium: anon function grant and role drift. |
| `supabase/add-commission-rate-to-profiles.sql` | Reintroduces profile admin policies using `profiles.role = 'admin'`. | Profile column addition only, plus P0 profile policies. | Medium: role drift risk. |
| `supabase/fix-companies-insert-policy.sql` | Allows any authenticated user to insert companies and select companies broadly during onboarding. | `supabase/P0_fix_profile_company_member_visibility.sql`, after onboarding review. | Medium/high: broad company visibility. |
| `supabase/fix-companies-insert-policy-alternative.sql` | Drops all company policies, allows broad authenticated select during onboarding, and uses `profiles.role = 'admin'` for update. | `supabase/P0_fix_profile_company_member_visibility.sql`, after onboarding review. | Medium/high: broad company visibility and role drift. |
| `supabase/fix-companies-update-policy.sql` | Old company update-only fix; no tenant membership checks. | `supabase/P0_fix_profile_company_member_visibility.sql`. | Medium: incomplete tenant model. |
| `supabase/fix-companies-update-policy-final.sql` | Allows broad authenticated select during onboarding and no tenant membership checks. | `supabase/P0_fix_profile_company_member_visibility.sql`, after onboarding review. | Medium/high: broad company visibility. |
| `supabase/create-logos-storage-bucket.sql` | Public logo bucket with any authenticated user allowed to upload, update, and delete any logo object. | Future tenant/user path-scoped storage hardening migration. | High: cross-tenant overwrite/delete risk. |

## Files That Are Useful But Need Review

These files are not automatically dangerous, but should be reviewed before inclusion in a final bootstrap:

- `supabase/tenant-data-isolation.sql`: likely intended tenant-aware baseline, but `tenant_quotes_select`, `tenant_profiles_select`, and `tenant_companies_select` are too broad for member/company users.
- `supabase/create-tenants-and-domains.sql`: core tenant tables; verify `tenant_memberships` policies allow admin workflows without exposing other members to regular users.
- `supabase/platform-admin-and-tenant-status.sql`: internal platform console support; keep out of client demo deployments unless platform administration is intentionally enabled.
- `supabase/platform-admin-auth-no-tenant.sql`: needed for platform admin profile self-select, but should be reviewed with platform-console visibility disabled in demos.
- `supabase/add-client-invitations.sql`: invitation model looks intentional; confirm token lookup remains narrow and rate-limited.
- `supabase/create-econt-integrations-and-shipments.sql`: tenant-aware, but Econt is an upsell/feature-flagged integration and should not be part of default demo execution unless enabled.
