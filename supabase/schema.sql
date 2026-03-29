create extension if not exists pgcrypto;

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  owner_email text null,
  repo_url text not null,
  repo_name text not null,
  source text not null default 'github',
  status text not null default 'PENDING',
  summary text null,
  total_files integer not null default 0,
  total_lines integer not null default 0,
  is_private boolean not null default false,
  error_message text null,
  languages jsonb not null default '{}'::jsonb,
  file_tree jsonb not null default '[]'::jsonb,
  architecture jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analyses_owner_email_idx on public.analyses(owner_email);
create index if not exists analyses_created_at_idx on public.analyses(created_at desc);

create table if not exists public.query_history (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid null references public.analyses(id) on delete cascade,
  owner_email text null,
  query text not null,
  response text not null,
  created_at timestamptz not null default now()
);

create index if not exists query_history_analysis_id_idx on public.query_history(analysis_id);
create index if not exists query_history_owner_email_idx on public.query_history(owner_email);

alter table public.analyses enable row level security;
alter table public.query_history enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'analyses' and policyname = 'Service role manages analyses'
  ) then
    create policy "Service role manages analyses"
    on public.analyses
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'query_history' and policyname = 'Service role manages query history'
  ) then
    create policy "Service role manages query history"
    on public.query_history
    for all
    using (auth.role() = 'service_role')
    with check (auth.role() = 'service_role');
  end if;
end $$;
