# Supabase RLS Verification Checklist

Use this checklist before any external serious demo and before first paid-client deployment. Run these tests in a staging Supabase project or a disposable tenant first. Do not test against production data without a backup.

## Test Actors

Create or identify four callers:

| Actor | Required setup |
|---|---|
| Owner/admin user | Auth user with `tenant_memberships.role in ('owner', 'admin')` for the demo tenant. |
| Company/member user A | Auth user with `tenant_memberships.role = 'member'`, `profiles.tenant_id = demo tenant`, and one or more own quotes, complaints, wishlist rows. |
| Company/member user B | Same tenant as A, separate auth user, separate profile/company, separate quotes/complaints/wishlist rows. |
| Unauthenticated user | No JWT/session; use anon key only. |

Recommended seed shape:

- One tenant.
- Two member users in that tenant.
- At least one quote/order for user A and one for user B.
- At least one complaint for user A and one for user B.
- At least one wishlist item for user A and one for user B.
- Products and categories in that tenant.

## How To Test

Use the Supabase JavaScript client, REST calls, or SQL editor with impersonated JWT claims. The important part is to use the anon client plus each user's access token, not the service-role key. The service-role key bypasses RLS and is not a valid RLS test.

For browser-console testing in the app, sign in as each actor and run direct `supabase.from(...)` calls from a controlled staging environment.

## Quotes / Orders

| Test | Owner/admin expected | Member A expected | Member B expected | Unauthenticated expected |
|---|---|---|---|---|
| `select * from quotes where tenant_id = demo_tenant` | Sees all tenant quotes. | Sees only A quotes. | Sees only B quotes. | No rows / 401 / permission denied. |
| Select quote owned by A by exact `id` | Allowed. | Allowed for A. | Denied/no row. | Denied/no row. |
| Select quote owned by B by exact `id` | Allowed. | Denied/no row. | Allowed for B. | Denied/no row. |
| Insert quote with `tenant_id = demo_tenant`, `user_id = own auth.uid()` | Allowed. | Allowed for own user id. | Allowed for own user id. | Denied. |
| Insert quote with another user's `user_id` | Denied. | Denied. | Denied. | Denied. |
| Insert quote with another tenant's `tenant_id` | Denied unless admin is a member/admin of that tenant. | Denied. | Denied. | Denied. |
| Update quote status/internal notes | Allowed for all tenant quotes. | Denied. | Denied. | Denied. |
| Delete quote | Denied unless a future explicit delete policy is added. | Denied. | Denied. | Denied. |

## Profiles

| Test | Owner/admin expected | Member A expected | Member B expected | Unauthenticated expected |
|---|---|---|---|---|
| `select * from profiles where tenant_id = demo_tenant` | Sees all tenant profiles. | Sees only A profile. | Sees only B profile. | Denied/no rows. |
| Select own profile by `id` | Allowed. | Allowed. | Allowed. | Denied. |
| Select another member profile by `id` | Allowed. | Denied/no row. | Denied/no row. | Denied. |
| Update own profile basic fields | Allowed. | Allowed for own profile. | Allowed for own profile. | Denied. |
| Update another member profile | Allowed for admin workflows. | Denied. | Denied. | Denied. |
| Insert own profile | Allowed if tenant membership exists and `id = auth.uid()`. | Allowed if tenant membership exists and `id = auth.uid()`. | Allowed if tenant membership exists and `id = auth.uid()`. | Denied. |

## Companies

| Test | Owner/admin expected | Member A expected | Member B expected | Unauthenticated expected |
|---|---|---|---|---|
| `select * from companies where tenant_id = demo_tenant` | Sees all tenant companies. | Sees only A linked company. | Sees only B linked company. | Denied/no rows. |
| Select own linked company by `id` | Allowed. | Allowed. | Allowed. | Denied. |
| Select another member company by `id` | Allowed. | Denied/no row. | Denied/no row. | Denied. |
| Update own linked company | Allowed. | Allowed for own company only. | Allowed for own company only. | Denied. |
| Update another company | Allowed. | Denied. | Denied. | Denied. |
| Browser self-onboarding company insert + `.select().single()` | Review carefully. Current strict patch may block returned row until profile is linked. Prefer Edge Function onboarding before paid deployment. | Review carefully. | Review carefully. | Denied. |

## Products

| Test | Owner/admin expected | Member A expected | Member B expected | Unauthenticated expected |
|---|---|---|---|---|
| Select visible tenant products | Allowed. | Allowed for same tenant. | Allowed for same tenant. | Should be denied unless public catalog is explicitly intended. |
| Insert product | Allowed for tenant owner/admin. | Denied. | Denied. | Denied. |
| Update product | Allowed for tenant owner/admin. | Denied. | Denied. | Denied. |
| Delete product | Allowed for tenant owner/admin if delete policy exists. | Denied. | Denied. | Denied. |
| Upsert product with duplicate SKU in same tenant | Should update same tenant SKU only. | Denied. | Denied. | Denied. |
| Upsert same SKU in different tenant | Should not conflict across tenants if `(tenant_id, sku)` unique index exists. | Denied. | Denied. | Denied. |

## Categories

| Test | Owner/admin expected | Member A expected | Member B expected | Unauthenticated expected |
|---|---|---|---|---|
| Select tenant categories | Allowed. | Allowed for same tenant. | Allowed for same tenant. | Should be denied unless public catalog is explicitly intended. |
| Insert category | Allowed. | Denied. | Denied. | Denied. |
| Update category | Allowed. | Denied. | Denied. | Denied. |
| Delete category | Allowed if category has no protected dependencies and policy exists. | Denied. | Denied. | Denied. |
| Open `/dashboard/categories/manage` | Allowed by UI and RLS. | Blocked by UI route/page guard and RLS. | Blocked by UI route/page guard and RLS. | Redirect/login. |

## Complaints

| Test | Owner/admin expected | Member A expected | Member B expected | Unauthenticated expected |
|---|---|---|---|---|
| Select tenant complaints | Sees all tenant complaints. | Sees only A complaints. | Sees only B complaints. | Denied/no rows. |
| Select complaint owned by another member | Allowed. | Denied/no row. | Denied/no row. | Denied. |
| Insert complaint with own `user_id` and tenant | Allowed if needed, but normally member flow. | Allowed. | Allowed. | Denied. |
| Insert complaint with another user's `user_id` | Denied. | Denied. | Denied. | Denied. |
| Update own pending complaint | Confirm intended policy. | Allowed only if pending, if policy remains. | Allowed only if pending, if policy remains. | Denied. |
| Admin update complaint status/internal notes | Allowed. | Denied. | Denied. | Denied. |

## Wishlist

| Test | Owner/admin expected | Member A expected | Member B expected | Unauthenticated expected |
|---|---|---|---|---|
| Select own wishlist | Allowed for own rows. | Allowed for A rows. | Allowed for B rows. | Denied. |
| Select another member wishlist | Should be denied unless admin reporting explicitly requires it. | Denied/no row. | Denied/no row. | Denied. |
| Insert own wishlist row | Allowed for own user id. | Allowed. | Allowed. | Denied. |
| Insert wishlist row for another user | Denied. | Denied. | Denied. | Denied. |
| Delete own wishlist row | Allowed. | Allowed. | Allowed. | Denied. |
| Delete another member wishlist row | Denied unless future admin support policy is added. | Denied. | Denied. | Denied. |

## Policy Introspection Queries

Run these after applying patches:

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

Confirm there are no policies with names or expressions containing:

- `auth.uid() is null`
- `WITH CHECK (true)` on sensitive write tables
- `USING (true)` on sensitive non-public tables
- fixed dev UUID `00000000-0000-0000-0000-000000000123`
- quote policies using only `tenant_id = current_tenant_id()` for member select
- admin policies using `profiles.role = 'admin'` instead of `tenant_memberships.role`

## Grant Introspection Queries

```sql
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('quotes', 'profiles', 'companies', 'products', 'categories', 'complaints', 'wishlist_items')
order by table_name, grantee, privilege_type;
```

Confirm:

- `anon` has no direct grants on sensitive tables unless intentionally public.
- `authenticated` has only the privileges needed by RLS-backed app flows.
- Service-role tests are not used to validate RLS behavior.
