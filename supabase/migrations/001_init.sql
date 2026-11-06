create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.test_suites (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  requirement text not null check (char_length(requirement) between 1 and 20000),
  jira_ticket_id text check (jira_ticket_id is null or char_length(jira_ticket_id) <= 50),
  configuration jsonb not null default '{}'::jsonb,
  requirement_summary text,
  assumptions jsonb not null default '[]'::jsonb,
  clarification_questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint test_suites_assumptions_array check (jsonb_typeof(assumptions) = 'array'),
  constraint test_suites_questions_array check (jsonb_typeof(clarification_questions) = 'array'),
  constraint test_suites_configuration_object check (jsonb_typeof(configuration) = 'object')
);

create table if not exists public.test_cases (
  id uuid primary key default gen_random_uuid(),
  suite_id uuid not null references public.test_suites (id) on delete cascade,
  test_case_id text not null check (char_length(btrim(test_case_id)) between 1 and 40),
  title text not null check (char_length(btrim(title)) between 1 and 300),
  category text not null check (char_length(btrim(category)) between 1 and 80),
  priority text not null check (priority in ('Low', 'Medium', 'High', 'Critical')),
  preconditions jsonb not null default '[]'::jsonb,
  test_steps jsonb not null default '[]'::jsonb,
  test_data text,
  expected_result text,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint test_cases_suite_case_unique unique (suite_id, test_case_id),
  constraint test_cases_preconditions_array check (jsonb_typeof(preconditions) = 'array'),
  constraint test_cases_steps_array check (jsonb_typeof(test_steps) = 'array'),
  constraint test_cases_tags_array check (jsonb_typeof(tags) = 'array')
);

create index if not exists test_suites_created_at_idx on public.test_suites (created_at desc);
create index if not exists test_cases_suite_id_idx on public.test_cases (suite_id);
create index if not exists test_cases_category_idx on public.test_cases (category);
create index if not exists test_cases_priority_idx on public.test_cases (priority);

drop trigger if exists test_suites_set_updated_at on public.test_suites;
create trigger test_suites_set_updated_at
before update on public.test_suites
for each row execute function public.set_updated_at();

drop trigger if exists test_cases_set_updated_at on public.test_cases;
create trigger test_cases_set_updated_at
before update on public.test_cases
for each row execute function public.set_updated_at();

alter table public.test_suites enable row level security;
alter table public.test_cases enable row level security;

revoke all on table public.test_suites from anon, authenticated;
revoke all on table public.test_cases from anon, authenticated;

grant all privileges on table public.test_suites to service_role;
grant all privileges on table public.test_cases to service_role;
