-- Patrimônio (assets) + manutenções
-- Observação: este script é idempotente (pode rodar mais de uma vez).

-- UUID helper (na maioria dos projetos Supabase já vem habilitado, mas garantimos aqui)
create extension if not exists "uuid-ossp";

-- Enum de status (Postgres não suporta CREATE TYPE IF NOT EXISTS para ENUM em todas as versões)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'asset_status') then
    create type asset_status as enum ('ativo', 'inativo', 'em_manutencao');
  end if;
end$$;

create table if not exists public.assets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  category text,
  serial_number text,
  acquisition_date date,
  value numeric(10, 2),
  location text,
  status asset_status default 'ativo',
  photo_url text,
  qr_code text,
  -- Origem / Doação / Docs
  source text, -- compra | doacao | comodato | outro
  donor_name text,
  donation_date date,
  document_ref text,
  -- Depreciação (opcional)
  depreciation_enabled boolean default false,
  depreciation_method text default 'linear',
  depreciation_start_date date,
  useful_life_years integer,
  depreciation_rate numeric(5, 2),
  residual_value numeric(10, 2),
  -- Manutenção preventiva (opcional)
  maintenance_interval_months integer,
  next_maintenance_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Se a tabela já existia sem as colunas acima, garantir que elas existam (idempotente)
alter table public.assets add column if not exists source text;
alter table public.assets add column if not exists donor_name text;
alter table public.assets add column if not exists donation_date date;
alter table public.assets add column if not exists document_ref text;
alter table public.assets add column if not exists depreciation_enabled boolean default false;
alter table public.assets add column if not exists depreciation_method text default 'linear';
alter table public.assets add column if not exists depreciation_start_date date;
alter table public.assets add column if not exists useful_life_years integer;
alter table public.assets add column if not exists depreciation_rate numeric(5, 2);
alter table public.assets add column if not exists residual_value numeric(10, 2);
alter table public.assets add column if not exists maintenance_interval_months integer;
alter table public.assets add column if not exists next_maintenance_date date;

create table if not exists public.asset_maintenance (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid references public.assets(id) on delete cascade,
  description text not null,
  scheduled_date date,
  completion_date date,
  cost numeric(10, 2),
  responsible text,
  status text default 'agendada',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS para assets (Para ambiente com autenticação livre provisória)
alter table public.assets enable row level security;
alter table public.asset_maintenance enable row level security;

drop policy if exists "Assets are viewable by everyone" on public.assets;
create policy "Assets are viewable by everyone" on public.assets for select using (true);
drop policy if exists "Assets are insertable" on public.assets;
create policy "Assets are insertable" on public.assets for insert with check (true);
drop policy if exists "Assets are updatable" on public.assets;
create policy "Assets are updatable" on public.assets for update using (true);
drop policy if exists "Assets are deletable" on public.assets;
create policy "Assets are deletable" on public.assets for delete using (true);

drop policy if exists "Maintenance viewable" on public.asset_maintenance;
create policy "Maintenance viewable" on public.asset_maintenance for select using (true);
drop policy if exists "Maintenance insertable" on public.asset_maintenance;
create policy "Maintenance insertable" on public.asset_maintenance for insert with check (true);
drop policy if exists "Maintenance updatable" on public.asset_maintenance;
create policy "Maintenance updatable" on public.asset_maintenance for update using (true);
drop policy if exists "Maintenance deletable" on public.asset_maintenance;
create policy "Maintenance deletable" on public.asset_maintenance for delete using (true);
