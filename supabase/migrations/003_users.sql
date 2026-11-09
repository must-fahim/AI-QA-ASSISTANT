create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null,
  email text not null check (char_length(btrim(email)) between 3 and 320),
  name text not null check (char_length(btrim(name)) between 1 and 200),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_google_sub_unique unique (google_sub)
);

create index if not exists users_email_idx on public.users (email);

alter table public.test_suites
  add column if not exists user_id uuid references public.users (id) on delete cascade;

alter table public.saved_page_tests
  add column if not exists user_id uuid references public.users (id) on delete cascade;

create index if not exists test_suites_user_id_idx on public.test_suites (user_id, created_at desc);
create index if not exists saved_page_tests_user_id_idx on public.saved_page_tests (user_id, created_at desc);

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
revoke all on table public.users from anon, authenticated;
grant all privileges on table public.users to service_role;
