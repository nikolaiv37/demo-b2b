# Econt Export Audit

This audit covers the current Econt integration implemented in this repo and highlights the pieces you can reuse in a standalone Shopify app.

Primary implementation files:

- [supabase/functions/_shared/econt.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/econt.ts)
- [supabase/create-econt-integrations-and-shipments.sql](/Users/nikolaiv37/projects/b2bplatform/supabase/create-econt-integrations-and-shipments.sql)
- [src/components/shipping/ShipmentPanel.tsx](/Users/nikolaiv37/projects/b2bplatform/src/components/shipping/ShipmentPanel.tsx)
- [src/components/integrations/EcontIntegrationSettings.tsx](/Users/nikolaiv37/projects/b2bplatform/src/components/integrations/EcontIntegrationSettings.tsx)
- [src/lib/shipping/carriers/econt.ts](/Users/nikolaiv37/projects/b2bplatform/src/lib/shipping/carriers/econt.ts)
- [docs/econt-integration.md](/Users/nikolaiv37/projects/b2bplatform/docs/econt-integration.md)

Notable finding up front:

- The repo has an office lookup flow now (`econt-offices-list` plus frontend office picker), but [docs/econt-integration.md](/Users/nikolaiv37/projects/b2bplatform/docs/econt-integration.md) still says “No offices/cities sync in MVP (manual `office_code` / address entry)”. The code is ahead of the docs.

## 1. Edge Functions

All Econt edge functions are in [supabase/functions](/Users/nikolaiv37/projects/b2bplatform/supabase/functions) and use shared helpers from:

- [supabase/functions/_shared/econt.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/econt.ts)
- [supabase/functions/_shared/auth.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/auth.ts)
- [supabase/functions/_shared/http.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/http.ts)
- [supabase/functions/_shared/cors.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/cors.ts)

Common behavior across functions:

- Method contract: `POST` or `OPTIONS` only.
- Auth: bearer token required; tenant membership resolved server-side by `requireTenantAuth`.
- Multi-tenant scoping: reads/writes are always filtered by `tenant_id`.
- Success responses use JSON shape `{ success: true, ... }`.
- Error responses use JSON shape `{ error: string, details?: unknown }`.

### Shared Econt server module

File: [supabase/functions/_shared/econt.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/econt.ts)

Purpose:

- Defines all shared Econt domain types.
- Encrypts/decrypts stored Econt credentials.
- Normalizes tenant defaults and shipment input.
- Resolves office names to office codes.
- Calls Econt over HTTP with Basic Auth.
- Normalizes calculate/create-label/track responses.
- Reads/writes `tenant_integrations` and `shipments`.

Important shared utilities:

- `encryptEcontCredentials` / `decryptEcontCredentials`
- `normalizeDefaults`
- `parseShipmentInput`
- `resolveShipmentOfficeDestinations`
- `buildEcontLabelPayload`
- `getTenantEcontIntegration`
- `resolveEcontCredentials`
- `econtPost`
- `normalizeCalculateResult`
- `normalizeCreateLabelResult`
- `normalizeTrackResult`
- `upsertShipmentDraft`
- `getTenantShipment`
- `getSettingsResponse`
- `listTenantEcontOffices`

Important shared constants:

- `ECONT_PROVIDER = 'econt'`
- `ECONT_BASE_URLS.demo = 'https://demo.econt.com/ee/services/'`
- `ECONT_BASE_URLS.prod = 'https://ee.econt.com/services/'`
- Built-in demo credentials fallback:
  - username: `iasp-dev`
  - password: `1Asp-dev`

Important implementation details to preserve when exporting:

- Stored credentials are encrypted with AES-GCM using a SHA-256 hash of `ECONT_CREDENTIALS_ENCRYPTION_KEY`.
- If credentials are missing and environment is `demo`, demo credentials are injected automatically.
- Office results are cached in-memory for 30 minutes.
- Office matching supports exact code, exact name, transliterated name, prefix match, and contains match.
- Econt validation errors are returned as HTTP `422`; transport/non-validation failures become `502`.

### `econt-settings-get`

File: [supabase/functions/econt-settings-get/index.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/econt-settings-get/index.ts)

Purpose:

- Returns sanitized tenant Econt settings.
- Never returns credentials.
- If no integration row exists yet, returns a normalized default response instead of failing.

Input body:

```ts
{
  tenant_id?: string
}
```

Auth:

- Any authenticated tenant member.

Shared deps:

- `requireTenantAuth`
- `getTenantEcontIntegration`
- `getSettingsResponse`
- `parseJson`, `requirePostOrOptions`, `ok`, `errorResponse`

Output shape:

```ts
{
  success: true
  integration: {
    provider: 'econt'
    enabled: boolean
    environment: 'demo' | 'prod'
    defaults: {
      sender?: {
        name?: string
        phone?: string
        email?: string | null
        officeCode?: string | null
        address?: {
          countryCode3?: string
          city: string
          postCode?: string
          quarter?: string
          street?: string
          streetNum?: string
          other?: string
        } | null
      }
      default_weight_kg?: number
      default_parcels_count?: number
      default_payer?: 'SENDER' | 'RECEIVER'
      default_cod_enabled?: boolean
      default_declared_value_enabled?: boolean
      tracking_throttle_minutes?: number
      [key: string]: unknown
    }
    has_credentials: boolean
  }
}
```

Notes:

- `has_credentials` is derived from stored JSON presence only.
- If the row does not exist, `provider` is still reported as `'econt'` and defaults are normalized server-side.

### `econt-settings-save`

File: [supabase/functions/econt-settings-save/index.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/econt-settings-save/index.ts)

Purpose:

- Creates or updates the tenant Econt integration row.
- Encrypts credentials before storage.
- Normalizes defaults before storage.

Input body:

```ts
{
  tenant_id?: string
  enabled?: boolean
  environment?: 'demo' | 'prod'
  username?: string
  password?: string
  clear_credentials?: boolean
  defaults?: Record<string, unknown>
}
```

Auth:

- Tenant admin or owner only.

Shared deps:

- `requireTenantAuth`
- `ECONT_PROVIDER`
- `encryptEcontCredentials`
- `normalizeDefaults`
- `getSettingsResponse`
- `HttpError`
- `parseJson`, `requirePostOrOptions`, `ok`, `errorResponse`

DB behavior:

- Upserts `tenant_integrations` on conflict `(tenant_id, provider)`.
- Keeps prior credentials if username/password are omitted.
- Clears credentials if `clear_credentials === true`.
- Rejects partial credential updates where only username or only password is provided.

Output shape:

```ts
{
  success: true
  integration: {
    provider: 'econt'
    enabled: boolean
    environment: 'demo' | 'prod'
    defaults: {
      sender?: {
        name?: string
        phone?: string
        email?: string | null
        officeCode?: string | null
        address?: {
          countryCode3?: string
          city: string
          postCode?: string
          quarter?: string
          street?: string
          streetNum?: string
          other?: string
        } | null
      }
      default_weight_kg?: number
      default_parcels_count?: number
      default_payer?: 'SENDER' | 'RECEIVER'
      default_cod_enabled?: boolean
      default_declared_value_enabled?: boolean
      tracking_throttle_minutes?: number
      [key: string]: unknown
    }
    has_credentials: boolean
  }
}
```

Frontend gap:

- The current frontend does not expose `clear_credentials`, but the function supports it.

### `econt-offices-list`

File: [supabase/functions/econt-offices-list/index.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/econt-offices-list/index.ts)

Purpose:

- Lists Econt offices for Bulgaria.
- Uses the tenant’s configured Econt environment and credentials.
- Used by the shipment panel office picker.

External Econt endpoint:

- `Nomenclatures/NomenclaturesService.getOffices.json`

Input body:

```ts
{
  tenant_id?: string
  query?: string
  limit?: number
}
```

Auth:

- Any authenticated tenant member.

Shared deps:

- `requireTenantAuth`
- `getTenantEcontIntegration`
- `listTenantEcontOffices`
- `parseJson`, `requirePostOrOptions`, `ok`, `errorResponse`

Output shape:

```ts
{
  success: true
  offices: Array<{
    code: string
    name: string
    city: string | null
  }>
  count: number
}
```

Important details:

- `limit` is clamped server-side to `1..1000`.
- Office list is cached in-memory for 30 minutes.
- Search supports transliteration and partial matching.

### `econt-calculate`

File: [supabase/functions/econt-calculate/index.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/econt-calculate/index.ts)

Purpose:

- Builds an Econt label payload in `mode: 'calculate'`.
- Calls Econt for shipment pricing without creating a label.
- Saves or updates a draft shipment row in `shipments`.

External Econt endpoint:

- `Shipments/LabelService.createLabel.json` with `mode: 'calculate'`

Input body:

```ts
{
  tenant_id?: string
  shipment_id?: string
  shipment?: Record<string, unknown>
}
```

Accepted shipment contract after parsing:

```ts
{
  quoteId?: number | null
  receiver: {
    name: string
    phone: string
    email?: string | null
  }
  destination: {
    type: 'office' | 'address'
    officeCode?: string
    address?: {
      countryCode3?: string
      city: string
      postCode?: string
      quarter?: string
      street?: string
      streetNum?: string
      other?: string
    }
  }
  parcelsCount: number
  weightKg: number
  codAmount?: number | null
  declaredValue?: number | null
  payer?: 'SENDER' | 'RECEIVER' | null
  description?: string | null
}
```

Auth:

- Any authenticated tenant member.

Shared deps:

- `requireTenantAuth`
- `getTenantEcontIntegration`
- `parseShipmentInput`
- `resolveShipmentOfficeDestinations`
- `buildEcontLabelPayload`
- `econtPost`
- `normalizeCalculateResult`
- `upsertShipmentDraft`
- `parseJson`, `requirePostOrOptions`, `ok`, `errorResponse`

DB effects:

- Creates or updates a shipment row.
- Stored status becomes `'calculated'`.
- `econt_label_data` stays `null`.
- `carrier` is always `'econt'`.

Output shape:

```ts
{
  success: true
  shipment: {
    id: string
    tenant_id: string
    quote_id: number | null
    carrier: string
    receiver: Record<string, unknown>
    destination: Record<string, unknown>
    parcels_count: number
    weight_kg: number
    cod_amount: number | null
    declared_value: number | null
    price_amount: number | null
    currency: string | null
    econt_waybill_number: string | null
    econt_label_data: Record<string, unknown> | null
    status: string
    tracking_last_requested_at: string | null
    last_synced_at: string | null
  }
  result: {
    carrier: 'econt'
    total_price: number | null
    currency: string
  }
}
```

### `econt-create-label`

File: [supabase/functions/econt-create-label/index.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/econt-create-label/index.ts)

Purpose:

- Creates a real Econt label in `mode: 'create'`.
- Can use an incoming shipment payload or reconstruct from an existing `shipments` row.
- Stores AWB and label metadata.

External Econt endpoint:

- `Shipments/LabelService.createLabel.json` with `mode: 'create'`

Input body:

```ts
{
  tenant_id?: string
  shipment_id?: string
  shipment?: Record<string, unknown>
}
```

Behavior:

- If `shipment` is present, it is parsed from the request.
- If `shipment` is absent but `shipment_id` is present, the function reads the existing shipment row and converts it back to input with `shipmentRowToInput`.
- If both are missing, the function throws `400`.

Auth:

- Any authenticated tenant member.

Shared deps:

- `requireTenantAuth`
- `getTenantEcontIntegration`
- `getTenantShipment`
- `shipmentRowToInput`
- `parseShipmentInput`
- `resolveShipmentOfficeDestinations`
- `buildEcontLabelPayload`
- `econtPost`
- `normalizeCreateLabelResult`
- `upsertShipmentDraft`
- `HttpError`
- `parseJson`, `requirePostOrOptions`, `ok`, `errorResponse`

DB effects:

- Creates or updates a shipment row.
- Stored status becomes `'created'`.
- Stores `econt_waybill_number`.
- Stores `econt_label_data`.
- Sets `last_synced_at`.

Output shape:

```ts
{
  success: true
  shipment: {
    id: string
    tenant_id: string
    quote_id: number | null
    carrier: string
    receiver: Record<string, unknown>
    destination: Record<string, unknown>
    parcels_count: number
    weight_kg: number
    cod_amount: number | null
    declared_value: number | null
    price_amount: number | null
    currency: string | null
    econt_waybill_number: string | null
    econt_label_data: Record<string, unknown> | null
    status: string
    tracking_last_requested_at: string | null
    last_synced_at: string | null
  }
  result: {
    carrier: 'econt'
    waybill_number: string
    label?: Record<string, unknown> | null
    total_price: number | null
    currency: string
  }
}
```

Important `label` payload fields produced by normalization:

- `pdfUrl`
- `printUrl`
- `shipmentNum`
- `shipment_payer`
- `shipment_description`
- `service_description`
- `total_price`
- `currency`
- `expected_delivery_at`
- `raw`

### `econt-track`

File: [supabase/functions/econt-track/index.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/econt-track/index.ts)

Purpose:

- Tracks an existing created shipment by AWB.
- Enforces a tenant-configured throttle window.
- Updates internal shipment status.

External Econt endpoint:

- `Shipments/ShipmentService.getShipmentStatuses.json`

Input body:

```ts
{
  tenant_id?: string
  shipment_id?: string
}
```

Auth:

- Any authenticated tenant member.

Shared deps:

- `requireTenantAuth`
- `getTenantEcontIntegration`
- `getTenantShipment`
- `getTrackingThrottleMinutes`
- `econtPost`
- `normalizeTrackResult`
- `HttpError`
- `parseJson`, `requirePostOrOptions`, `ok`, `errorResponse`

Throttle behavior:

- Reads `tracking_throttle_minutes` from integration defaults.
- Server clamps it to `5..15`.
- If `shipments.tracking_last_requested_at` is too recent, returns a success payload with `throttled: true` instead of throwing.

Throttled response shape:

```ts
{
  success: false
  throttled: true
  retry_after_seconds: number
  retry_after_minutes: number
  next_allowed_at: string
}
```

Successful tracking response shape:

```ts
{
  success: true
  throttled: false
  shipment: {
    id: string
    tenant_id: string
    quote_id: number | null
    carrier: string
    receiver: Record<string, unknown>
    destination: Record<string, unknown>
    parcels_count: number
    weight_kg: number
    cod_amount: number | null
    declared_value: number | null
    price_amount: number | null
    currency: string | null
    econt_waybill_number: string | null
    econt_label_data: Record<string, unknown> | null
    status: string
    tracking_last_requested_at: string | null
    last_synced_at: string | null
  }
  result: {
    carrier: 'econt'
    status: string
    status_code?: string | null
    status_name?: string | null
    tracked_at?: string
  }
  next_allowed_at: string
  throttle_minutes: number
}
```

Internal status mapping:

- `deliver*` -> `delivered`
- `cancel*` -> `cancelled`
- `return*` -> `returned`
- `transit*`, `courier*`, `office*` -> `in_transit`
- fallback -> `created`

### `econt-delete-label`

File: [supabase/functions/econt-delete-label/index.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/econt-delete-label/index.ts)

Purpose:

- Cancels an already created Econt label by AWB.
- Marks the local shipment as cancelled.

External Econt endpoint:

- `Shipments/LabelService.deleteLabels.json`

Input body:

```ts
{
  tenant_id?: string
  shipment_id?: string
  reason?: string
}
```

Auth:

- Any authenticated tenant member.

Shared deps:

- `requireTenantAuth`
- `getTenantEcontIntegration`
- `getTenantShipment`
- `econtPost`
- `HttpError`
- `parseJson`, `requirePostOrOptions`, `ok`, `errorResponse`

Behavior:

- Requires an existing shipment with `econt_waybill_number`.
- `reason` is truncated to 255 chars.
- Defaults delete reason to `Cancelled from platform`.

Output shape:

```ts
{
  success: true
  shipment: {
    id: string
    tenant_id: string
    quote_id: number | null
    carrier: string
    receiver: Record<string, unknown>
    destination: Record<string, unknown>
    parcels_count: number
    weight_kg: number
    cod_amount: number | null
    declared_value: number | null
    price_amount: number | null
    currency: string | null
    econt_waybill_number: string | null
    econt_label_data: Record<string, unknown> | null
    status: string
    tracking_last_requested_at: string | null
    last_synced_at: string | null
  }
}
```

DB effects:

- Sets `status = 'cancelled'`
- Sets `last_synced_at = now()`

### Shared server auth/http utilities

#### `_shared/auth.ts`

File: [supabase/functions/_shared/auth.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/auth.ts)

Purpose:

- Creates user-scoped and service-role Supabase clients.
- Verifies the bearer token.
- Resolves `tenant_memberships`.
- Enforces admin-only access when requested.

Returned auth context:

```ts
{
  userId: string
  tenantId: string
  role: 'owner' | 'admin' | 'member'
  userClient: ReturnType<typeof createClient>
  adminClient: ReturnType<typeof createClient>
}
```

#### `_shared/http.ts`

File: [supabase/functions/_shared/http.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/http.ts)

Purpose:

- Standard JSON parsing.
- Standard CORS-aware JSON responses.
- Standard error serialization.

Error contract:

```ts
{
  error: string
  details?: unknown
}
```

#### `_shared/cors.ts`

File: [supabase/functions/_shared/cors.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/cors.ts)

Purpose:

- Shared CORS config for all edge function responses.

## 2. Database Schema

Schema source:

- [supabase/create-econt-integrations-and-shipments.sql](/Users/nikolaiv37/projects/b2bplatform/supabase/create-econt-integrations-and-shipments.sql)

Supporting auth/RLS helper definitions:

- [supabase/tenant-data-isolation.sql](/Users/nikolaiv37/projects/b2bplatform/supabase/tenant-data-isolation.sql)
- [supabase/create-tenants-and-domains.sql](/Users/nikolaiv37/projects/b2bplatform/supabase/create-tenants-and-domains.sql)
- [supabase/create-quotes-table.sql](/Users/nikolaiv37/projects/b2bplatform/supabase/create-quotes-table.sql)

Important note:

- This repo does not store the Econt schema in `supabase/migrations/`; it lives in standalone SQL files.

### Direct Econt tables

### `public.tenant_integrations`

Defined in [supabase/create-econt-integrations-and-shipments.sql](/Users/nikolaiv37/projects/b2bplatform/supabase/create-econt-integrations-and-shipments.sql)

Full column definition:

```sql
create table if not exists public.tenant_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null,
  enabled boolean not null default false,
  environment text not null default 'demo' check (environment in ('demo', 'prod')),
  credentials jsonb not null default '{}'::jsonb,
  defaults jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_integrations_provider_not_blank check (length(trim(provider)) > 0)
);
```

Indexes:

- Unique: `(tenant_id, provider)`
- Non-unique: `(tenant_id)`

Trigger:

- `update_tenant_integrations_updated_at` -> `public.update_updated_at_column()`

RLS:

- Enabled.
- `tenant_integrations_select_admin`
  - `SELECT`
  - `tenant_id = public.current_tenant_id() and public.is_tenant_admin()`
- `tenant_integrations_insert_admin`
  - `INSERT`
  - same check
- `tenant_integrations_update_admin`
  - `UPDATE`
  - same `using` and `with check`
- `tenant_integrations_delete_admin`
  - `DELETE`
  - same check

Grants:

- `select, insert, update, delete` to `authenticated`

How Econt uses it:

- One row per tenant/provider.
- Current implementation uses `provider = 'econt'`.
- `credentials` stores encrypted or legacy-plain JSON.
- `defaults` stores sender defaults and tracking throttle.

### `public.shipments`

Defined in [supabase/create-econt-integrations-and-shipments.sql](/Users/nikolaiv37/projects/b2bplatform/supabase/create-econt-integrations-and-shipments.sql)

Full column definition:

```sql
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  quote_id integer references public.quotes(id) on delete set null,
  carrier text not null,
  receiver jsonb not null default '{}'::jsonb,
  destination jsonb not null default '{}'::jsonb,
  parcels_count integer not null default 1 check (parcels_count > 0),
  weight_kg numeric(10,3) not null default 1 check (weight_kg > 0),
  cod_amount numeric(12,2),
  declared_value numeric(12,2),
  price_amount numeric(12,2),
  currency text not null default 'BGN',
  econt_waybill_number text,
  econt_label_data jsonb,
  status text not null default 'draft',
  last_synced_at timestamptz,
  tracking_last_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipments_carrier_not_blank check (length(trim(carrier)) > 0),
  constraint shipments_status_check check (
    status in (
      'draft',
      'calculated',
      'created',
      'cancelled',
      'in_transit',
      'delivered',
      'returned',
      'error'
    )
  )
);
```

Indexes:

- `(tenant_id)`
- `(tenant_id, quote_id)`
- `(tenant_id, carrier)`
- `(econt_waybill_number)` where not null
- `(tracking_last_requested_at)` where not null

Trigger:

- `update_shipments_updated_at` -> `public.update_updated_at_column()`

RLS:

- Enabled.
- `tenant_shipments_select`
  - `SELECT`
  - `tenant_id = public.current_tenant_id() and auth.uid() is not null`
- `tenant_shipments_insert`
  - `INSERT`
  - same check
- `tenant_shipments_update`
  - `UPDATE`
  - `tenant_id = public.current_tenant_id() and auth.uid() is not null and public.is_tenant_admin()`
- `tenant_shipments_delete_admin`
  - `DELETE`
  - `tenant_id = public.current_tenant_id() and public.is_tenant_admin()`

Grants:

- `select, insert, update, delete` to `authenticated`

How Econt uses it:

- `carrier` is always `'econt'`.
- `receiver` is the snapshot of receiver identity.
- `destination` is the snapshot of office/address delivery target.
- `econt_waybill_number` stores AWB.
- `econt_label_data` stores sanitized print/PDF/price/service metadata plus raw Econt response.
- `tracking_last_requested_at` enforces on-demand tracking throttle.

Status lifecycle in practice:

- `draft`
- `calculated`
- `created`
- `cancelled`
- `in_transit`
- `delivered`
- `returned`

### Supporting tables and helper functions

These are not Econt-specific tables, but the integration depends on them.

### `public.tenants`

Defined in [supabase/create-tenants-and-domains.sql](/Users/nikolaiv37/projects/b2bplatform/supabase/create-tenants-and-domains.sql)

Relevant relation:

- `tenant_integrations.tenant_id` -> `tenants.id`
- `shipments.tenant_id` -> `tenants.id`

Important columns:

```sql
id uuid primary key default gen_random_uuid()
name text not null
slug text not null unique
status text not null default 'active' check (status in ('active', 'suspended'))
branding jsonb not null default '{}'::jsonb
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

### `public.tenant_memberships`

Defined in [supabase/create-tenants-and-domains.sql](/Users/nikolaiv37/projects/b2bplatform/supabase/create-tenants-and-domains.sql)

Relevant relation:

- Edge auth resolves tenant membership and role from this table.

Important columns:

```sql
id uuid primary key default gen_random_uuid()
user_id uuid not null references auth.users(id) on delete cascade
tenant_id uuid not null references public.tenants(id) on delete cascade
role text not null default 'member' check (role in ('owner', 'admin', 'member'))
created_at timestamptz not null default now()
```

### `public.quotes`

Defined in [supabase/create-quotes-table.sql](/Users/nikolaiv37/projects/b2bplatform/supabase/create-quotes-table.sql)

Relevant relation:

- `shipments.quote_id` -> `quotes.id`
- Shipment panel uses the order/quote ID as the shipment grouping key.

Important columns from original create script:

```sql
id serial primary key
user_id text not null
company_name text not null
email text not null
phone text
notes text
items jsonb not null
total decimal(10, 2) not null
status text not null default 'new' check (status in ('new', 'pending', 'approved', 'rejected', 'expired'))
created_at timestamptz default now()
updated_at timestamptz default now()
```

Additional tenancy dependency:

- [supabase/tenant-data-isolation.sql](/Users/nikolaiv37/projects/b2bplatform/supabase/tenant-data-isolation.sql) later adds `quotes.tenant_id` and scopes quote rows by tenant.

### Helper SQL functions used by Econt RLS

Defined in [supabase/tenant-data-isolation.sql](/Users/nikolaiv37/projects/b2bplatform/supabase/tenant-data-isolation.sql)

```sql
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select tenant_id
  from public.tenant_memberships
  where user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_tenant_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.tenant_memberships
    where user_id = auth.uid()
      and role in ('owner', 'admin')
  )
$$;
```

### Updated-at trigger helper used by Econt tables

Defined in [supabase/create-econt-integrations-and-shipments.sql](/Users/nikolaiv37/projects/b2bplatform/supabase/create-econt-integrations-and-shipments.sql)

```sql
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

### Enums and types

Postgres enums/types used specifically for Econt:

- None.

Instead, the implementation uses:

- SQL `text` columns with `check` constraints for `environment` and `status`
- TypeScript string unions for:
  - `'demo' | 'prod'`
  - `'SENDER' | 'RECEIVER'`
  - `'econt'`
  - shipment status values
- JSONB blobs for:
  - `credentials`
  - `defaults`
  - `receiver`
  - `destination`
  - `econt_label_data`

## 3. Frontend Integration

There is frontend integration, but it is not abstracted into standalone hooks. Most logic lives directly in components and a thin carrier adapter.

### Main frontend files

### Shipment UI

File: [src/components/shipping/ShipmentPanel.tsx](/Users/nikolaiv37/projects/b2bplatform/src/components/shipping/ShipmentPanel.tsx)

Purpose:

- Main Econt shipment creation/calculation/tracking/cancel UI.
- Used inside order detail views.

Rendered from:

- [src/app/dashboard/orders/AdminOrdersView.tsx](/Users/nikolaiv37/projects/b2bplatform/src/app/dashboard/orders/AdminOrdersView.tsx)
- [src/components/OrderDetailsSheet.tsx](/Users/nikolaiv37/projects/b2bplatform/src/components/OrderDetailsSheet.tsx)

Component props:

```ts
{
  seed: {
    quoteId: number | string
    orderNumber?: number | string | null
    receiverName?: string | null
    receiverPhone?: string | null
    receiverEmail?: string | null
  }
  className?: string
}
```

State and data dependencies:

- Tenant context from `useTenant()`
- Toasts from `useToast()`
- i18n strings from `useTranslation()`
- React Query cache
- Local React state:
  - `lastTrackMessage`
  - `nextTrackAllowedAt`
  - `officeSuggestions`
  - `officePickerOpen`
  - `officeSearch`
- React Hook Form state for shipment form fields

Backend calls:

- `supabase.functions.invoke('econt-settings-get', { body: { tenant_id } })`
- `supabase.functions.invoke('econt-offices-list', { body: { tenant_id, limit: 800 } })`
- Direct table query:
  - `supabase.from('shipments').select('*').eq('tenant_id', tenantId).eq('carrier', 'econt').eq('quote_id', numericQuoteId)`
- Carrier adapter calls:
  - `econt-calculate`
  - `econt-create-label`
  - `econt-track`
  - `econt-delete-label`

Invoke pattern:

- Reads settings and office list directly with `supabase.functions.invoke`.
- Uses a client-side adapter wrapper for calculate/create/track/delete.
- Reads shipment history directly via RLS-protected table query, not through an edge function.

Important behavior:

- Draft shipment reuse:
  - If the newest shipment has no AWB yet, its `id` is reused for calculate/create updates.
- Office picker:
  - Loads up to 800 offices.
  - Filters client-side.
  - Accepts office names or codes.
- Carrier error mapping:
  - Extracts Econt validation payloads and maps them to specific form fields.
- Tracking:
  - Displays throttle window returned by `econt-track`.
- Shipment history:
  - Reads `printUrl`, `pdfUrl`, price, currency, service description, and expected delivery from `econt_label_data`.

### Settings UI

File: [src/components/integrations/EcontIntegrationSettings.tsx](/Users/nikolaiv37/projects/b2bplatform/src/components/integrations/EcontIntegrationSettings.tsx)

Purpose:

- Tenant admin settings screen for Econt.

Rendered from:

- [src/app/dashboard/settings/index.tsx](/Users/nikolaiv37/projects/b2bplatform/src/app/dashboard/settings/index.tsx)

State and data dependencies:

- Tenant context from `useTenant()`
- Toasts from `useToast()`
- React Hook Form + Zod validation
- React Query settings fetch and save mutation

Backend calls:

- `supabase.functions.invoke('econt-settings-get', { body: { tenant_id } })`
- `supabase.functions.invoke('econt-settings-save', { body: payload })`

Invoke pattern:

- Load once via query key `['tenant', tenantId, 'econt-settings']`
- Save via mutation
- On success, resets form and refetches settings

Important behavior:

- Credentials are write-only in the UI.
- Existing credentials are only exposed as `has_credentials`.
- Sender defaults require either sender office code or sender city/address.
- Demo hint is hardcoded in the component.

### Carrier adapter

File: [src/lib/shipping/carriers/econt.ts](/Users/nikolaiv37/projects/b2bplatform/src/lib/shipping/carriers/econt.ts)

Purpose:

- Thin client wrapper around Supabase edge function invocations.
- Normalizes error payloads into readable messages.

Methods:

- `calculate`
- `createLabel`
- `track`
- `deleteLabel`

Invoke pattern:

```ts
const { data, error } = await supabase.functions.invoke(fn, { body })
```

Important behavior:

- If the edge function returns an Econt validation tree in `payload.details.econt`, it extracts nested messages and throws a simplified `Error`.

### Carrier registry

File: [src/lib/shipping/carriers/registry.ts](/Users/nikolaiv37/projects/b2bplatform/src/lib/shipping/carriers/registry.ts)

Purpose:

- Returns an `EcontCarrierAdapter` for carrier code `'econt'`.

Important note:

- The `_tenantId` argument is currently unused.

### Supporting UX assets

Files:

- [src/locales/en.json](/Users/nikolaiv37/projects/b2bplatform/src/locales/en.json)
- [src/locales/bg.json](/Users/nikolaiv37/projects/b2bplatform/src/locales/bg.json)

Purpose:

- Text for shipment form, office picker, toasts, and validation messages.

These are not required for backend export, but they are useful if you want to preserve the current UX wording.

## 4. Types & Interfaces

I did not find a generated shared Supabase `Database` TypeScript file in this repo. The Econt integration currently relies on local TS interfaces and untyped `Record<string, unknown>` JSON payloads.

### Server-side shared types

File: [supabase/functions/_shared/econt.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/econt.ts)

```ts
export type EcontEnvironment = 'demo' | 'prod'
export type EcontPayer = 'SENDER' | 'RECEIVER'

export interface EcontCredentials {
  username: string
  password: string
}

export interface EcontAddressInput {
  countryCode3?: string
  city: string
  postCode?: string
  quarter?: string
  street?: string
  streetNum?: string
  other?: string
}

export interface ShipmentDestinationInput {
  type: 'office' | 'address'
  officeCode?: string
  address?: EcontAddressInput
}

export interface ShipmentReceiverInput {
  name: string
  phone: string
  email?: string | null
}

export interface ShipmentSnapshotInput {
  quoteId?: number | null
  receiver: ShipmentReceiverInput
  destination: ShipmentDestinationInput
  parcelsCount: number
  weightKg: number
  codAmount?: number | null
  declaredValue?: number | null
  payer?: EcontPayer | null
  description?: string | null
}

export interface EcontIntegrationDefaults {
  sender?: {
    name?: string
    phone?: string
    email?: string | null
    officeCode?: string | null
    address?: EcontAddressInput | null
  }
  default_weight_kg?: number
  default_parcels_count?: number
  default_payer?: EcontPayer
  default_cod_enabled?: boolean
  default_declared_value_enabled?: boolean
  tracking_throttle_minutes?: number
  [key: string]: unknown
}

export interface TenantIntegrationRow {
  id: string
  tenant_id: string
  provider: string
  enabled: boolean
  environment: EcontEnvironment
  credentials: Record<string, unknown>
  defaults: EcontIntegrationDefaults
}

export interface ShipmentRow {
  id: string
  tenant_id: string
  quote_id: number | null
  carrier: string
  receiver: Record<string, unknown>
  destination: Record<string, unknown>
  parcels_count: number
  weight_kg: number
  cod_amount: number | null
  declared_value: number | null
  price_amount: number | null
  currency: string | null
  econt_waybill_number: string | null
  econt_label_data: Record<string, unknown> | null
  status: string
  tracking_last_requested_at: string | null
  last_synced_at: string | null
}
```

### Edge function request-body types

Files:

- [supabase/functions/econt-settings-save/index.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/econt-settings-save/index.ts)
- [supabase/functions/econt-settings-get/index.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/econt-settings-get/index.ts)
- [supabase/functions/econt-offices-list/index.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/econt-offices-list/index.ts)
- [supabase/functions/econt-calculate/index.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/econt-calculate/index.ts)
- [supabase/functions/econt-create-label/index.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/econt-create-label/index.ts)
- [supabase/functions/econt-track/index.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/econt-track/index.ts)
- [supabase/functions/econt-delete-label/index.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/econt-delete-label/index.ts)

```ts
interface SaveBody {
  tenant_id?: string
  enabled?: boolean
  environment?: 'demo' | 'prod'
  username?: string
  password?: string
  clear_credentials?: boolean
  defaults?: Record<string, unknown>
}

interface SettingsGetBody {
  tenant_id?: string
}

interface OfficesListBody {
  tenant_id?: string
  query?: string
  limit?: number
}

interface CalculateBody {
  tenant_id?: string
  shipment_id?: string
  shipment?: Record<string, unknown>
}

interface CreateLabelBody {
  tenant_id?: string
  shipment_id?: string
  shipment?: Record<string, unknown>
}

interface TrackBody {
  tenant_id?: string
  shipment_id?: string
}

interface DeleteLabelBody {
  tenant_id?: string
  shipment_id?: string
  reason?: string
}
```

### Shared edge auth types

File: [supabase/functions/_shared/auth.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/auth.ts)

```ts
export type TenantRole = 'owner' | 'admin' | 'member'

export interface AuthContext {
  userId: string
  tenantId: string
  role: TenantRole
  userClient: ReturnType<typeof createClient>
  adminClient: ReturnType<typeof createClient>
}
```

### Frontend carrier types

File: [src/lib/shipping/carriers/types.ts](/Users/nikolaiv37/projects/b2bplatform/src/lib/shipping/carriers/types.ts)

```ts
export type CarrierCode = 'econt'

export type ShipmentDestinationType = 'office' | 'address'
export type ShipmentPayer = 'SENDER' | 'RECEIVER'

export interface ShipmentAddressInput {
  countryCode3?: string
  city: string
  postCode?: string
  quarter?: string
  street?: string
  streetNum?: string
  other?: string
}

export interface ShipmentDraftInput {
  quoteId?: number | null
  receiver: {
    name: string
    phone: string
    email?: string | null
  }
  destination: {
    type: ShipmentDestinationType
    officeCode?: string
    address?: ShipmentAddressInput
  }
  parcelsCount: number
  weightKg: number
  codAmount?: number | null
  declaredValue?: number | null
  payer?: ShipmentPayer | null
  description?: string | null
}

export interface CalculateInput {
  tenantId: string
  shipmentId?: string
  shipment: ShipmentDraftInput
}

export interface CalculateResult {
  shipment: any
  result: {
    carrier: CarrierCode
    total_price: number | null
    currency: string
  }
}

export interface CreateLabelInput {
  tenantId: string
  shipmentId?: string
  shipment?: ShipmentDraftInput
}

export interface CreateLabelResult {
  shipment: any
  result: {
    carrier: CarrierCode
    waybill_number: string
    label?: Record<string, unknown> | null
    total_price: number | null
    currency: string
  }
}

export interface TrackInput {
  tenantId: string
  shipmentId: string
}

export interface TrackResult {
  success: boolean
  throttled?: boolean
  retry_after_seconds?: number
  retry_after_minutes?: number
  next_allowed_at?: string
  throttle_minutes?: number
  shipment?: any
  result?: {
    carrier: CarrierCode
    status: string
    status_code?: string | null
    status_name?: string | null
    tracked_at?: string
  }
}

export interface DeleteLabelInput {
  tenantId: string
  shipmentId: string
  reason?: string
}

export interface CarrierAdapter {
  calculate(input: CalculateInput): Promise<CalculateResult>
  createLabel(input: CreateLabelInput): Promise<CreateLabelResult>
  track(input: TrackInput): Promise<TrackResult>
  deleteLabel?(input: DeleteLabelInput): Promise<void>
}
```

### Shipment panel local view-model types

File: [src/components/shipping/ShipmentPanel.tsx](/Users/nikolaiv37/projects/b2bplatform/src/components/shipping/ShipmentPanel.tsx)

```ts
interface OrderShipmentSeed {
  quoteId: number | string
  orderNumber?: number | string | null
  receiverName?: string | null
  receiverPhone?: string | null
  receiverEmail?: string | null
}

interface ShipmentRow {
  id: string
  quote_id: number | null
  carrier: string
  status: string
  price_amount: number | null
  currency: string | null
  econt_waybill_number: string | null
  econt_label_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
  last_synced_at: string | null
  tracking_last_requested_at: string | null
}

interface EcontSettingsSanitized {
  success: boolean
  integration: {
    enabled: boolean
    environment: 'demo' | 'prod'
    defaults: {
      default_weight_kg?: number
      default_parcels_count?: number
      default_payer?: 'SENDER' | 'RECEIVER'
      tracking_throttle_minutes?: number
      default_cod_enabled?: boolean
      default_declared_value_enabled?: boolean
    }
  }
}

interface EcontOfficeRow {
  code: string
  name: string
  city: string | null
}

interface EcontOfficeListResponse {
  success: boolean
  count: number
  offices: EcontOfficeRow[]
}

interface EcontErrorEntry {
  type: string | null
  message: string | null
}
```

`FormValues` in `ShipmentPanel` is inferred from a Zod schema with this expanded shape:

```ts
type FormValues = {
  receiverName: string
  receiverPhone: string
  receiverEmail?: string
  destinationType: 'office' | 'address'
  officeCode?: string
  city?: string
  postCode?: string
  street?: string
  streetNum?: string
  other?: string
  weightKg: number
  parcelsCount: number
  payer: 'SENDER' | 'RECEIVER'
  codAmount?: number
  declaredValue?: number
  description?: string
}
```

### Settings screen local view-model types

File: [src/components/integrations/EcontIntegrationSettings.tsx](/Users/nikolaiv37/projects/b2bplatform/src/components/integrations/EcontIntegrationSettings.tsx)

```ts
type SettingsResponse = {
  success: boolean
  integration: {
    enabled: boolean
    environment: 'demo' | 'prod'
    has_credentials: boolean
    defaults: {
      sender?: {
        name?: string
        phone?: string
        email?: string | null
        officeCode?: string | null
        address?: {
          city?: string
          postCode?: string
          street?: string
          streetNum?: string
          other?: string
        } | null
      }
      default_weight_kg?: number
      default_parcels_count?: number
      default_payer?: 'SENDER' | 'RECEIVER'
      default_cod_enabled?: boolean
      default_declared_value_enabled?: boolean
      tracking_throttle_minutes?: number
    }
  }
}
```

`FormValues` in `EcontIntegrationSettings` is inferred from a Zod schema with this expanded shape:

```ts
type FormValues = {
  enabled: boolean
  environment: 'demo' | 'prod'
  username?: string
  password?: string
  senderName: string
  senderPhone: string
  senderEmail?: string
  senderOfficeCode?: string
  senderCity?: string
  senderPostCode?: string
  senderStreet?: string
  senderStreetNum?: string
  senderOther?: string
  defaultWeightKg: number
  defaultParcelsCount: number
  defaultPayer: 'SENDER' | 'RECEIVER'
  defaultCodEnabled: boolean
  defaultDeclaredValueEnabled: boolean
  trackingThrottleMinutes: number
}
```

## 5. Environment Variables & Secrets

### Edge function env vars actually used by the Econt integration

### `ECONT_CREDENTIALS_ENCRYPTION_KEY`

Used in:

- [supabase/functions/_shared/econt.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/econt.ts)

Purpose:

- Derives the AES-GCM key used to encrypt/decrypt stored Econt credentials.

Where it should live:

- Supabase Edge Function secret.

Repo evidence:

- Referenced in code.
- Mentioned in [docs/econt-integration.md](/Users/nikolaiv37/projects/b2bplatform/docs/econt-integration.md).
- Not found in any checked-in `.env*` file.

### `SUPABASE_URL`

Used in:

- [supabase/functions/_shared/auth.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/auth.ts)

Purpose:

- Creates user and admin Supabase clients inside edge functions.

Where it should live:

- Supabase runtime environment / edge function env.

### `SUPABASE_ANON_KEY`

Used in:

- [supabase/functions/_shared/auth.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/auth.ts)

Purpose:

- Creates the user-scoped client that validates the bearer token.

Where it should live:

- Supabase runtime environment / edge function env.

### `SUPABASE_SERVICE_ROLE_KEY`

Used in:

- [supabase/functions/_shared/auth.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/auth.ts)

Purpose:

- Creates the admin client used for tenant-scoped server-side reads/writes.

Where it should live:

- Supabase runtime environment / edge function env.

### Frontend env vars indirectly required for the integration

These are not Econt-specific, but the frontend cannot call the Econt edge functions without them.

### `VITE_SUPABASE_URL`

Used in:

- [src/lib/supabase/client.ts](/Users/nikolaiv37/projects/b2bplatform/src/lib/supabase/client.ts)

Documented in:

- [docs/RUNBOOK.md](/Users/nikolaiv37/projects/b2bplatform/docs/RUNBOOK.md)

Where it lives:

- Frontend `.env`

### `VITE_SUPABASE_ANON_KEY`

Used in:

- [src/lib/supabase/client.ts](/Users/nikolaiv37/projects/b2bplatform/src/lib/supabase/client.ts)

Documented in:

- [docs/RUNBOOK.md](/Users/nikolaiv37/projects/b2bplatform/docs/RUNBOOK.md)

Where it lives:

- Frontend `.env`

### Secrets summary

- Supabase secrets / edge runtime:
  - `ECONT_CREDENTIALS_ENCRYPTION_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Frontend `.env`:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

Missing from repo:

- I did not find a checked-in `.env.example` or other explicit repo file documenting `ECONT_CREDENTIALS_ENCRYPTION_KEY`.

## 6. Dependencies

### Deno / edge-function imports

Direct import used by Econt edge functions:

- `https://esm.sh/@supabase/supabase-js@2`
  - imported in [supabase/functions/_shared/auth.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/auth.ts)

Deno/runtime built-ins used by the Econt server module:

- `fetch`
- `crypto.subtle`
- `crypto.getRandomValues`
- `TextEncoder`
- `TextDecoder`
- `btoa`
- `atob`
- `structuredClone`
- `Map`

No third-party Econt SDK is used:

- Econt is called with raw `fetch` and manually constructed JSON payloads.

### Frontend npm packages directly used by Econt UI/adapter

From [package.json](/Users/nikolaiv37/projects/b2bplatform/package.json) and direct imports:

- `@supabase/supabase-js`
  - Supabase browser client and edge function invocation
- `@tanstack/react-query`
  - queries and mutations for settings, shipments, offices
- `react-hook-form`
  - form state
- `@hookform/resolvers`
  - Zod resolver
- `zod`
  - validation schemas
- `lucide-react`
  - icons for settings/shipment UI
- `react-i18next`
  - translated labels and messages in shipment panel

Indirect local UI dependencies used through internal components:

- local wrappers around Radix/select/popover/switch/button/input/badge/toast primitives
- utility helpers from local modules:
  - [src/lib/utils.ts](/Users/nikolaiv37/projects/b2bplatform/src/lib/utils.ts)
  - [src/components/ui/use-toast.ts](/Users/nikolaiv37/projects/b2bplatform/src/components/ui/use-toast.ts)

### Shared internal modules worth extracting as units

- [supabase/functions/_shared/econt.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/econt.ts)
  - best single backend extraction unit
- [src/lib/shipping/carriers/econt.ts](/Users/nikolaiv37/projects/b2bplatform/src/lib/shipping/carriers/econt.ts)
  - thin client adapter
- [src/lib/shipping/carriers/types.ts](/Users/nikolaiv37/projects/b2bplatform/src/lib/shipping/carriers/types.ts)
  - frontend type contract

## Suggested Extraction Units For A Shopify App

If you want to rebuild this cleanly in a standalone Shopify app, the most reusable pieces are:

- Server Econt core:
  - Port the logic from [supabase/functions/_shared/econt.ts](/Users/nikolaiv37/projects/b2bplatform/supabase/functions/_shared/econt.ts)
  - Keep:
    - credential encryption/decryption
    - default normalization
    - shipment input parsing
    - office lookup + name-to-code resolution
    - label payload builder
    - raw Econt HTTP client
    - response normalization
- Persistence model:
  - Recreate `tenant_integrations` and `shipments`, or Shopify-app equivalents such as:
    - `shop_integrations`
    - `shop_shipments`
- Frontend contracts:
  - Reuse shapes from [src/lib/shipping/carriers/types.ts](/Users/nikolaiv37/projects/b2bplatform/src/lib/shipping/carriers/types.ts)
- Admin UI:
  - Rebuild [src/components/integrations/EcontIntegrationSettings.tsx](/Users/nikolaiv37/projects/b2bplatform/src/components/integrations/EcontIntegrationSettings.tsx) against your Shopify app backend
- Shipment UI:
  - Rebuild [src/components/shipping/ShipmentPanel.tsx](/Users/nikolaiv37/projects/b2bplatform/src/components/shipping/ShipmentPanel.tsx) against Shopify order data and your own shipment storage

Pieces that are platform-specific and should not be copied as-is:

- Supabase tenant auth resolution in `_shared/auth.ts`
- RLS policies based on `current_tenant_id()` / `is_tenant_admin()`
- Direct browser queries to Supabase tables

Pieces that should be simplified in a Shopify app:

- Replace multi-tenant `tenant_id` with `shop_id` or Shopify store identity.
- Replace `quote_id` with Shopify order ID.
- Replace Supabase edge functions with your app server routes or server actions.

