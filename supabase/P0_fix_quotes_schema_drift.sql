-- P0 fix: align public.quotes schema with current order/quote insert payloads.
-- Reason:
-- - OrderRequestModal inserts user_id, company_name, email, phone, shipping_method.
-- - Existing demo DB was missing user_id/company_name/email/phone.
-- - Existing NOT NULL constraints blocked client-side order requests.
-- - Existing status CHECK blocked status='new'.
--
-- Safe/idempotent for demo/staging. Review before paid production.

begin;

alter table public.quotes
  add column if not exists shipping_method text default 'shop_delivery';

update public.quotes
set shipping_method = 'shop_delivery'
where shipping_method is null;

alter table public.quotes
  add column if not exists user_id text;

alter table public.quotes
  add column if not exists company_name text;

alter table public.quotes
  add column if not exists email text;

alter table public.quotes
  add column if not exists phone text;

alter table public.quotes
  alter column customer_id drop not null;

alter table public.quotes
  alter column company_id drop not null;

alter table public.quotes
  alter column subtotal drop not null;

alter table public.quotes
  alter column expires_at set default (now() + interval '30 days');

alter table public.quotes
  alter column expires_at drop not null;

alter table public.quotes
  drop constraint if exists quotes_status_check;

update public.quotes
set user_id = customer_id
where user_id is null
  and customer_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

create index if not exists idx_quotes_user_id on public.quotes (user_id);

commit;
