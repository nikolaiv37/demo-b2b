-- Optional profile phone for account manager card (matches b2bcenter)
alter table public.profiles add column if not exists phone text;
