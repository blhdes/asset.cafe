-- ============================================================
-- asset-cafe: initial schema
-- ============================================================

-- 0. Helper: auto-update updated_at on row change
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 1. Lists
-- ============================================================
create table public.lists (
  id         uuid        primary key default gen_random_uuid(),
  vault_hash text        not null,
  name       text        not null,
  tags       text[]      default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_lists_vault_hash on public.lists (vault_hash);

create trigger trg_lists_updated_at
  before update on public.lists
  for each row
  execute function public.set_updated_at();

-- 2. Assets
-- ============================================================
create table public.assets (
  id          uuid        primary key default gen_random_uuid(),
  list_id     uuid        not null references public.lists (id) on delete cascade,
  name        text        not null,
  ticker      text        not null,
  summary     text        constraint chk_summary_length check (char_length(summary) <= 250),
  description text        default '',
  tags        text[]      default '{}',
  resources   jsonb       default '[]',
  created_at  timestamptz default now()
);

create index idx_assets_list_id on public.assets (list_id);

-- 3. Row Level Security
-- ============================================================

-- Helper to extract vault hash from the request header Supabase
-- forwards via current_setting.
create or replace function public.requesting_vault_hash()
returns text as $$
  select coalesce(
    current_setting('request.headers', true)::json ->> 'x-vault-hash',
    ''
  );
$$ language sql stable;

-- Lists -------------------------------------------------------
alter table public.lists enable row level security;

create policy "vault_hash_access" on public.lists
  for all
  using  (vault_hash = public.requesting_vault_hash())
  with check (vault_hash = public.requesting_vault_hash());

-- Assets ------------------------------------------------------
alter table public.assets enable row level security;

create policy "vault_hash_access" on public.assets
  for all
  using (
    list_id in (
      select id from public.lists
      where vault_hash = public.requesting_vault_hash()
    )
  )
  with check (
    list_id in (
      select id from public.lists
      where vault_hash = public.requesting_vault_hash()
    )
  );
