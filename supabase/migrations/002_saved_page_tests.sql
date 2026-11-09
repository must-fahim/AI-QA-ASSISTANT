create table if not exists public.saved_page_tests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  site_url text not null check (char_length(btrim(site_url)) between 1 and 2000),
  page_count integer not null default 0 check (page_count >= 0),
  last_tested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_page_test_pages (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.saved_page_tests (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  url text not null check (char_length(btrim(url)) between 1 and 2000),
  source text not null check (source in ('discovered', 'manual')),
  last_status text check (last_status is null or last_status in ('loaded', 'failed')),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_page_test_pages_url_unique unique (test_id, url)
);

create index if not exists saved_page_tests_created_at_idx on public.saved_page_tests (created_at desc);
create index if not exists saved_page_test_pages_test_id_idx on public.saved_page_test_pages (test_id, position);

drop trigger if exists saved_page_tests_set_updated_at on public.saved_page_tests;
create trigger saved_page_tests_set_updated_at
before update on public.saved_page_tests
for each row execute function public.set_updated_at();

drop trigger if exists saved_page_test_pages_set_updated_at on public.saved_page_test_pages;
create trigger saved_page_test_pages_set_updated_at
before update on public.saved_page_test_pages
for each row execute function public.set_updated_at();

alter table public.saved_page_tests enable row level security;
alter table public.saved_page_test_pages enable row level security;

revoke all on table public.saved_page_tests from anon, authenticated;
revoke all on table public.saved_page_test_pages from anon, authenticated;

grant all privileges on table public.saved_page_tests to service_role;
grant all privileges on table public.saved_page_test_pages to service_role;
