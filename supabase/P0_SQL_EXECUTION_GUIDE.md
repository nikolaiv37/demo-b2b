# P0 SQL Execution Guide

This guide is for preparing `demo-b2b` for an external serious client demo and first paid-client hardening. It is intentionally conservative.

Do not run the P0 SQL patches automatically from the app or CLI. Review, back up, run in staging, verify by role, then apply manually if the results match expectations.

## P0 Cleanup Plan

1. Freeze the target demo tenant.
   - Confirm the exact tenant id, owner/admin user id, member A user id, and member B user id.
   - Confirm demo data has no real client PII.

2. Back up schema, policies, and target data.
   - Export current RLS policies for `quotes`, `profiles`, `companies`, `products`, `categories`, `complaints`, `wishlist_items`, and `tenant_memberships`.
   - Export grants for those tables.
   - Export data for the demo tenant from `quotes`, `profiles`, `companies`, `complaints`, and `wishlist_items`.

3. Quarantine legacy SQL.
   - Treat `supabase/DO_NOT_RUN_LEGACY_SQL.md` as the current blocklist.
   - Do not run old dev/permissive policy files against the demo or production project.

4. Apply P0 quote/order isolation first.
   - Review and run `supabase/P0_fix_quotes_rls_member_isolation.sql`.
   - Verify admin sees all tenant orders and each member sees only their own orders.

5. Apply profile/company visibility only after onboarding review.
   - Review `supabase/P0_fix_profile_company_member_visibility.sql`.
   - This patch is intentionally strict and may require self-service company creation to move through an Edge Function or pre-created invited company records.
   - If the external demo uses pre-created users/companies, apply in staging and verify.

6. Run the full checklist.
   - Use `SUPABASE_RLS_VERIFICATION_CHECKLIST.md`.
   - Test with owner/admin, member A, member B, and unauthenticated anon calls.

7. Promote only after successful staging verification.
   - Capture policy introspection output before and after.
   - Keep rollback SQL ready in the same change window.

## What To Back Up Before Running

At minimum, save the output of:

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'quotes',
    'profiles',
    'companies',
    'products',
    'categories',
    'complaints',
    'wishlist_items',
    'tenant_memberships'
  )
order by tablename, cmd, policyname;
```

```sql
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'quotes',
    'profiles',
    'companies',
    'products',
    'categories',
    'complaints',
    'wishlist_items',
    'tenant_memberships'
  )
order by table_name, grantee, privilege_type;
```

Also export target-tenant rows:

```sql
select * from public.quotes where tenant_id = '<tenant-id>';
select * from public.profiles where tenant_id = '<tenant-id>';
select * from public.companies where tenant_id = '<tenant-id>';
select * from public.complaints where tenant_id = '<tenant-id>';
select * from public.wishlist_items where tenant_id = '<tenant-id>';
```

For paid-client production, take a full Supabase backup or PITR checkpoint before changing RLS.

## Exact Order To Run Patches

Run this order in staging first:

1. Inspect current policies and grants with the queries above.
2. Run `supabase/P0_fix_quotes_rls_member_isolation.sql`.
3. Run the Quotes / Orders section of `SUPABASE_RLS_VERIFICATION_CHECKLIST.md`.
4. Review onboarding and clients/settings flows.
5. If compatible with the target demo flow, run `supabase/P0_fix_profile_company_member_visibility.sql`.
6. Run the Profiles and Companies sections of `SUPABASE_RLS_VERIFICATION_CHECKLIST.md`.
7. Run Products, Categories, Complaints, and Wishlist checks to confirm no unrelated policy drift.
8. Repeat policy/grant introspection and archive the output.

Recommended execution path:

- External demo with pre-created demo users/companies: run both patches in staging, verify, then apply manually to the demo project.
- External demo that needs live self-onboarding: run the quotes patch first; hold the profile/company patch until onboarding is moved to a trusted Edge Function or explicitly retested.
- First paid client: do not rely on manual one-off SQL long term. Convert reviewed patches into ordered migrations after staging verification.

## How To Verify After Running

Use these direct checks:

- Sign in as owner/admin with the app's anon client and confirm:
  - `/dashboard/orders` shows all tenant orders.
  - `/dashboard/clients` shows tenant clients.
  - Direct `quotes` select sees all tenant quotes.
  - Direct `profiles` and `companies` select behavior matches the applied patch.

- Sign in as member A and confirm:
  - `/dashboard/orders` shows only A orders.
  - A direct quote query cannot read B orders by id or by tenant-wide select.
  - A direct profile query cannot read B profile if the profile/company patch is applied.
  - A direct company query cannot read B company if the profile/company patch is applied.

- Sign in as member B and repeat the A/B checks in reverse.

- Use anon/no session and confirm:
  - `quotes`, `profiles`, and `companies` return no data and do not allow insert/update.

Use the full matrix in `SUPABASE_RLS_VERIFICATION_CHECKLIST.md` before external demo.

## What Not To Run

Do not run files listed in `supabase/DO_NOT_RUN_LEGACY_SQL.md` against a serious demo or paid-client project.

Especially do not run:

- `supabase/fix-quotes-rls-policy.sql`
- `supabase/fix-complaints-rls-policies.sql`
- `supabase/create-complaints-table.sql`
- `supabase/migration-update-products-table.sql`
- `supabase/schema.sql`
- old profile/company RLS fix files that use `profiles.role = 'admin'`

These files contain dev-mode, anon, broad authenticated, non-tenant, or obsolete profile-role policies.

## Rollback Notes

RLS policy rollback is possible but should be treated as a controlled change:

1. Keep the pre-change `pg_policies` and grants output.
2. If a patch blocks an expected flow, first confirm whether RLS is correctly blocking a risky browser-side flow.
3. To rollback, drop only the new P0 policies/functions that caused the issue and recreate the previous known-good policies from the backup output.
4. Do not rollback by running old permissive SQL files from `DO_NOT_RUN_LEGACY_SQL.md`.
5. If member order creation breaks after the quotes patch, check whether the inserted row includes:
   - `tenant_id` matching the user's `tenant_memberships.tenant_id`
   - `user_id` matching `auth.uid()`
6. If onboarding breaks after the profile/company patch, the likely cause is strict company select after insert. Prefer a trusted Edge Function that creates the company and links `profiles.company_id` in one server-side transaction.

## Production Follow-Up

Before first paid-client launch:

- Convert reviewed P0 SQL into formal migrations.
- Add automated RLS regression tests for owner/admin/member/anon.
- Harden storage buckets, especially `logos`, `complaints`, and `category-images`.
- Remove or archive legacy SQL files from the deploy path.
- Add audit logging for admin updates/deletes and tenant/platform actions.
- Add rate limiting for invite, tenant lookup, import, and integration Edge Functions.
