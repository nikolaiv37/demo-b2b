-- P0 external-demo hardening: tenant-aware quotes/orders RLS.
--
-- DO NOT RUN BLINDLY IN PRODUCTION.
-- Review supabase/P0_SQL_EXECUTION_GUIDE.md first, back up policies/data, then
-- test with owner/admin, member A, member B, and unauthenticated callers.
--
-- Intent:
-- - Tenant owner/admin can select and update all quotes/orders in their tenant.
-- - Tenant member/company user can select only their own quotes/orders.
-- - Authenticated users can insert only their own quote/order in a tenant where
--   they are a member.
-- - Members cannot update quotes/orders. This is intentional for P0 because the
--   current app's core member flow creates orders but does not require member
--   quote updates. If future UX needs customer-side edits/cancellations, add a
--   narrow status-limited member update policy after product review.
-- - No anon table access.
--
-- Notes:
-- - The current app stores orders in public.quotes.
-- - Current frontend code treats quotes.user_id as a string in several places.
--   Policies compare user_id::text to auth.uid()::text so they work whether the
--   live column is text or uuid.
-- - This patch uses tenant_memberships as admin truth, not profiles.role.

begin;

-- Helper: checks membership in a specific tenant.
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

-- Helper: checks owner/admin role in a specific tenant.
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
  if to_regclass('public.quotes') is null then
    raise exception 'public.quotes does not exist; stop and review bootstrap order';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'quotes'
      and column_name = 'tenant_id'
  ) then
    raise exception 'public.quotes.tenant_id is required before applying P0 quotes RLS';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'quotes'
      and column_name = 'user_id'
  ) then
    raise exception 'public.quotes.user_id is required before applying P0 quotes RLS';
  end if;
end $$;

alter table public.quotes enable row level security;

-- Ensure old permissive grants cannot bypass the intended API surface. RLS still
-- enforces row access for authenticated users.
revoke all on table public.quotes from anon;
grant select, insert, update on table public.quotes to authenticated;

-- order_number inserts may use this sequence if add-order-number-column.sql has
-- been applied.
do $$
begin
  if to_regclass('public.order_number_seq') is not null then
    grant usage, select on sequence public.order_number_seq to authenticated;
  end if;
end $$;

-- Drop every existing quotes policy to remove conflicts from:
-- - supabase/schema.sql
-- - supabase/fix-quotes-rls-policy.sql
-- - supabase/add-quotes-admin-rls.sql
-- - supabase/tenant-data-isolation.sql
do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'quotes'
  loop
    execute format('drop policy if exists %I on public.quotes', r.policyname);
  end loop;
end $$;

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

create policy "p0_quotes_insert_own_tenant"
  on public.quotes
  for insert
  to authenticated
  with check (
    tenant_id is not null
    and public.p0_is_tenant_member(tenant_id)
    and user_id::text = auth.uid()::text
  );

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

-- No DELETE policy is created for P0. With RLS enabled, authenticated browser
-- users cannot delete quotes unless a future policy explicitly allows it.

commit;
