-- P0 external-demo hardening: narrow member visibility for profiles/companies.
--
-- DO NOT RUN BLINDLY IN PRODUCTION.
-- This patch is intentionally stricter than the current tenant-wide policies in
-- supabase/tenant-data-isolation.sql. Review the onboarding tradeoff below and
-- test before applying to a paid-client tenant.
--
-- Intent:
-- - Tenant owner/admin can read all profiles and companies in their tenant.
-- - Tenant member/company user can read only their own profile and their own
--   linked company.
-- - Tenant member/company user cannot read other client profiles/companies by
--   direct browser Supabase queries.
-- - Admin truth comes from tenant_memberships, not profiles.role.
--
-- Onboarding tradeoff:
-- - The current frontend creates a company, expects the inserted row to be
--   returned, then links profiles.company_id to that new company.
-- - The safest member select policy only exposes the already-linked company.
--   That means self-service creation may need to be moved to an Edge Function
--   or changed to link the profile server-side in the same trusted transaction.
-- - For an external demo using pre-created invited client companies, this is the
--   safer posture. If live self-onboarding must remain browser-only, do not run
--   this patch until that flow is adjusted and retested.

begin;

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
    where tm.user_id = auth.uid()
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
    where tm.user_id = auth.uid()
      and tm.tenant_id = p_tenant_id
      and tm.role in ('owner', 'admin')
  )
$$;

revoke all on function public.p0_is_tenant_member(uuid) from public;
revoke all on function public.p0_is_tenant_owner_or_admin(uuid) from public;
grant execute on function public.p0_is_tenant_member(uuid) to authenticated;
grant execute on function public.p0_is_tenant_owner_or_admin(uuid) to authenticated;

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'public.profiles does not exist; stop and review bootstrap order';
  end if;

  if to_regclass('public.companies') is null then
    raise exception 'public.companies does not exist; stop and review bootstrap order';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'tenant_id'
  ) then
    raise exception 'public.profiles.tenant_id is required before applying P0 profile/company RLS';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'company_id'
  ) then
    raise exception 'public.profiles.company_id is required before applying P0 profile/company RLS';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'companies'
      and column_name = 'tenant_id'
  ) then
    raise exception 'public.companies.tenant_id is required before applying P0 profile/company RLS';
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.companies from anon;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.companies to authenticated;

-- Drop every existing policy so old tenant-wide or profile-role policies cannot
-- combine permissively with the P0 policies below.
do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', r.policyname);
  end loop;

  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'companies'
  loop
    execute format('drop policy if exists %I on public.companies', r.policyname);
  end loop;
end $$;

-- Profiles
create policy "p0_profiles_select_admin_or_self"
  on public.profiles
  for select
  to authenticated
  using (
    tenant_id is not null
    and public.p0_is_tenant_member(tenant_id)
    and (
      id = auth.uid()
      or public.p0_is_tenant_owner_or_admin(tenant_id)
    )
  );

create policy "p0_profiles_insert_self"
  on public.profiles
  for insert
  to authenticated
  with check (
    tenant_id is not null
    and id = auth.uid()
    and public.p0_is_tenant_member(tenant_id)
  );

create policy "p0_profiles_update_self"
  on public.profiles
  for update
  to authenticated
  using (
    tenant_id is not null
    and id = auth.uid()
    and public.p0_is_tenant_member(tenant_id)
  )
  with check (
    tenant_id is not null
    and id = auth.uid()
    and public.p0_is_tenant_member(tenant_id)
  );

create policy "p0_profiles_update_admin"
  on public.profiles
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

-- Companies
create policy "p0_companies_select_admin_or_own"
  on public.companies
  for select
  to authenticated
  using (
    tenant_id is not null
    and public.p0_is_tenant_member(tenant_id)
    and (
      public.p0_is_tenant_owner_or_admin(tenant_id)
      or id in (
        select p.company_id
        from public.profiles p
        where p.id = auth.uid()
          and p.tenant_id = companies.tenant_id
          and p.company_id is not null
      )
    )
  );

create policy "p0_companies_insert_tenant_member"
  on public.companies
  for insert
  to authenticated
  with check (
    tenant_id is not null
    and public.p0_is_tenant_member(tenant_id)
  );

create policy "p0_companies_update_admin_or_own"
  on public.companies
  for update
  to authenticated
  using (
    tenant_id is not null
    and public.p0_is_tenant_member(tenant_id)
    and (
      public.p0_is_tenant_owner_or_admin(tenant_id)
      or id in (
        select p.company_id
        from public.profiles p
        where p.id = auth.uid()
          and p.tenant_id = companies.tenant_id
          and p.company_id is not null
      )
    )
  )
  with check (
    tenant_id is not null
    and public.p0_is_tenant_member(tenant_id)
    and (
      public.p0_is_tenant_owner_or_admin(tenant_id)
      or id in (
        select p.company_id
        from public.profiles p
        where p.id = auth.uid()
          and p.tenant_id = companies.tenant_id
          and p.company_id is not null
      )
    )
  );

-- No DELETE policies are created for P0. Use an Edge Function with audit logging
-- for destructive client/company operations in production.

commit;
