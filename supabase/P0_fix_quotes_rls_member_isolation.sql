-- P0 external-demo hardening: tenant-aware quotes/orders RLS.
--
-- DO NOT RUN BLINDLY IN PRODUCTION.
-- Back up existing policies, test with owner/admin, member A, member B,
-- and an unauthenticated caller before applying to a paid-client tenant.
--
-- Intent:
-- - Tenant owner/admin can SELECT and UPDATE all quotes in their tenant.
-- - Tenant member/company user can SELECT only their own quotes
--   (user_id::text = auth.uid()::text).
-- - Authenticated users can INSERT only if:
--     (a) tenant_id matches their membership (via SECURITY DEFINER helper), AND
--     (b) user_id::text = auth.uid()::text.
-- - Members cannot UPDATE quotes (intentional for P0; add a narrow status-only
--   member update policy later if the UX requires it).
-- - No anon table access.
-- - Admin truth comes from tenant_memberships.role, NOT profiles.role.
-- - All membership checks go through SECURITY DEFINER helpers to prevent
--   RLS recursion on tenant_memberships.
--
-- Prerequisites (will raise if missing):
--   public.quotes with columns: tenant_id (uuid), user_id (text)
--   public.tenant_memberships
--   SECURITY DEFINER helpers: p0_is_tenant_member, p0_is_tenant_owner_or_admin
--   (deployed by P0_fix_profile_company_member_visibility.sql or this file)
--
-- Idempotent: yes — uses CREATE OR REPLACE, IF NOT EXISTS, and dynamic policy drops.

begin;

-- ── SECURITY DEFINER helpers ─────────────────────────────────────────────────
-- These bypass tenant_memberships RLS (which only allows users to read their
-- own row) so that admin checks can see any membership without recursion.

create or replace function public.p0_is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.user_id  = auth.uid()
      and tm.tenant_id = p_tenant_id
  )
$$;

create or replace function public.p0_is_tenant_owner_or_admin(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    where tm.user_id  = auth.uid()
      and tm.tenant_id = p_tenant_id
      and tm.role in ('owner', 'admin')
  )
$$;

-- Restrict helper execution to authenticated callers only.
revoke all   on function public.p0_is_tenant_member(uuid)          from public;
revoke all   on function public.p0_is_tenant_owner_or_admin(uuid)  from public;
grant execute on function public.p0_is_tenant_member(uuid)         to authenticated;
grant execute on function public.p0_is_tenant_owner_or_admin(uuid) to authenticated;

-- ── Pre-flight checks ────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.quotes') is null then
    raise exception 'public.quotes does not exist — check bootstrap order';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotes'
      and column_name = 'tenant_id'
  ) then
    raise exception 'public.quotes.tenant_id is required — run P0_fix_quotes_schema_drift.sql first';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quotes'
      and column_name = 'user_id'
  ) then
    raise exception 'public.quotes.user_id is required — run P0_fix_quotes_schema_drift.sql first';
  end if;
end $$;

-- ── Table-level access ───────────────────────────────────────────────────────

alter table public.quotes enable row level security;

revoke all                           on table public.quotes from anon;
grant  select, insert, update        on table public.quotes to authenticated;

-- Grant sequence if the order-number migration has been applied.
do $$
begin
  if to_regclass('public.order_number_seq') is not null then
    grant usage, select on sequence public.order_number_seq to authenticated;
  end if;
end $$;

-- ── Drop all existing quotes policies ────────────────────────────────────────
-- Removes conflicts from: schema.sql, fix-quotes-rls-policy.sql,
-- add-quotes-admin-rls.sql, tenant-data-isolation.sql, earlier P0 runs.

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'quotes'
  loop
    execute format('drop policy if exists %I on public.quotes', r.policyname);
  end loop;
end $$;

-- ── RLS policies ─────────────────────────────────────────────────────────────

-- SELECT: admin/owner sees all tenant quotes; member sees only own.
create policy "p0_quotes_select_admin_or_own"
  on public.quotes
  for select
  to authenticated
  using (
    tenant_id is not null
    and public.p0_is_tenant_member(tenant_id)
    and (
      public.p0_is_tenant_owner_or_admin(tenant_id)
      or user_id::text = auth.uid()::text
    )
  );

-- INSERT: caller must be a tenant member AND the row must be owned by them.
-- Prevents a member from inserting on behalf of another user or a foreign tenant.
create policy "p0_quotes_insert_own_tenant"
  on public.quotes
  for insert
  to authenticated
  with check (
    tenant_id is not null
    and public.p0_is_tenant_member(tenant_id)
    and user_id::text = auth.uid()::text
  );

-- UPDATE: admin/owner only. Members cannot alter quotes.
-- Add a narrow member update policy (e.g., cancel-only) if UX later requires it.
create policy "p0_quotes_update_admin_only"
  on public.quotes
  for update
  to authenticated
  using (
    tenant_id is not null
    and public.p0_is_tenant_owner_or_admin(tenant_id)
  )
  with check (
    tenant_id is not null
    and public.p0_is_tenant_owner_or_admin(tenant_id)
  );

-- DELETE: intentionally no policy. With RLS enabled, no authenticated browser
-- caller can delete quotes. Use an Edge Function with audit logging for
-- destructive operations in production.

commit;


-- ── Verification queries (run manually after applying) ────────────────────────
--
-- 1. Confirm RLS is enabled and all three policies exist:
--
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public' and tablename = 'quotes';
--
-- select policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename = 'quotes'
-- order by policyname;
--
-- Expected: 3 rows — p0_quotes_insert_own_tenant, p0_quotes_select_admin_or_own,
--           p0_quotes_update_admin_only.
--
--
-- 2. Confirm SECURITY DEFINER helpers exist with the right volatility and owner:
--
-- select proname, prosecdef, provolatile, proowner::regrole
-- from pg_proc
-- where proname in ('p0_is_tenant_member', 'p0_is_tenant_owner_or_admin')
--   and pronamespace = 'public'::regnamespace;
--
-- Expected: prosecdef = true, provolatile = 's' (stable) for both rows.
--
--
-- 3. Confirm anon has no table privileges:
--
-- select grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public' and table_name = 'quotes'
-- order by grantee, privilege_type;
--
-- Expected: no rows for grantee = 'anon'.
--
--
-- 4. Spot-check member isolation (run as member user via Supabase SQL editor with
--    SET LOCAL role = authenticated; SET LOCAL request.jwt.claims = '{"sub":"<member-uuid>"}'):
--
-- select count(*) from public.quotes;
-- -- Should return only the rows where user_id = '<member-uuid>'.
--
-- select count(*) from public.quotes
-- where user_id <> auth.uid()::text;
-- -- Should return 0.
--
--
-- 5. Spot-check admin visibility (run as owner/admin user):
--
-- select count(*) from public.quotes;
-- -- Should return all tenant quotes (e.g., 2 for TED demo).
