-- Planos de leitura diaria (Biblia, devocionais, etc.)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS reading_plans (
  id uuid default uuid_generate_v4() primary key,
  church_id uuid references churches(id) on delete cascade,
  name text not null,
  description text,
  total_days integer not null check (total_days > 0),
  cover_image_url text,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS reading_plan_days (
  id uuid default uuid_generate_v4() primary key,
  plan_id uuid references reading_plans(id) on delete cascade not null,
  day_number integer not null check (day_number > 0),
  title text,
  reference text not null,
  content text,
  created_at timestamptz default now(),
  unique (plan_id, day_number)
);

CREATE TABLE IF NOT EXISTS reading_plan_progress (
  user_id uuid references auth.users(id) on delete cascade,
  plan_id uuid references reading_plans(id) on delete cascade,
  current_day integer default 1,
  started_at timestamptz default now(),
  last_read_at timestamptz default now(),
  primary key (user_id, plan_id)
);

alter table reading_plans enable row level security;
alter table reading_plan_days enable row level security;
alter table reading_plan_progress enable row level security;

-- Políticas: planos visíveis para usuários da igreja; progresso do próprio usuário
-- (usa DO blocks para ignorar "policy already exists" ao re-executar o script)
do $$
begin
  drop policy if exists "Reading plans viewable by church" on reading_plans;
  create policy "Reading plans viewable by church" on reading_plans for select
    using (church_id is null or church_id = (select church_id from profiles where id = auth.uid()) or (select role from profiles where id = auth.uid()) = 'superadmin');
exception when duplicate_object then
  drop policy if exists "Reading plans viewable by church" on reading_plans;
  create policy "Reading plans viewable by church" on reading_plans for select
    using (church_id is null or church_id = (select church_id from profiles where id = auth.uid()) or (select role from profiles where id = auth.uid()) = 'superadmin');
end $$;

do $$
begin
  drop policy if exists "Reading plans insert by admins" on reading_plans;
  create policy "Reading plans insert by admins" on reading_plans for insert
  with check ((select role from profiles where id = auth.uid()) in ('admin', 'pastor', 'secretario', 'superadmin') and (church_id = (select church_id from profiles where id = auth.uid()) or (select role from profiles where id = auth.uid()) = 'superadmin'));
exception when duplicate_object then
  drop policy if exists "Reading plans insert by admins" on reading_plans;
  create policy "Reading plans insert by admins" on reading_plans for insert
  with check ((select role from profiles where id = auth.uid()) in ('admin', 'pastor', 'secretario', 'superadmin') and (church_id = (select church_id from profiles where id = auth.uid()) or (select role from profiles where id = auth.uid()) = 'superadmin'));
end $$;

drop policy if exists "Reading plans update by admins" on reading_plans;
create policy "Reading plans update by admins"
  on reading_plans for update
  using (
    (select role from profiles where id = auth.uid()) in ('admin', 'pastor', 'secretario', 'superadmin')
    and (church_id = (select church_id from profiles where id = auth.uid()) or (select role from profiles where id = auth.uid()) = 'superadmin')
  );

drop policy if exists "Reading plans delete by admins" on reading_plans;
create policy "Reading plans delete by admins"
  on reading_plans for delete
  using (
    (select role from profiles where id = auth.uid()) in ('admin', 'pastor', 'secretario', 'superadmin')
    and (church_id = (select church_id from profiles where id = auth.uid()) or (select role from profiles where id = auth.uid()) = 'superadmin')
  );

drop policy if exists "Reading plan days viewable" on reading_plan_days;
create policy "Reading plan days viewable"
  on reading_plan_days for select
  using (
    exists (
      select 1 from reading_plans rp
      where rp.id = plan_id
      and (rp.church_id is null or rp.church_id = (select church_id from profiles where id = auth.uid()) or (select role from profiles where id = auth.uid()) = 'superadmin')
    )
  );

drop policy if exists "Reading plan days manageable" on reading_plan_days;
create policy "Reading plan days manageable"
  on reading_plan_days for all
  using (
    (select role from profiles where id = auth.uid()) in ('admin', 'pastor', 'secretario', 'superadmin')
  )
  with check (true);

drop policy if exists "Users manage own progress" on reading_plan_progress;
create policy "Users manage own progress"
  on reading_plan_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Índices
create index if not exists idx_reading_plan_days_plan_id on reading_plan_days(plan_id);
create index if not exists idx_reading_plans_church_id on reading_plans(church_id);

-- Registro de conclusão (cada dia marcado como lido)
CREATE TABLE IF NOT EXISTS reading_plan_completions (
  user_id uuid references auth.users(id) on delete cascade,
  plan_id uuid references reading_plans(id) on delete cascade,
  day_number integer not null check (day_number > 0),
  completed_at timestamptz default now(),
  primary key (user_id, plan_id, day_number)
);
alter table reading_plan_completions enable row level security;
drop policy if exists "Users manage own completions" on reading_plan_completions;
create policy "Users manage own completions"
  on reading_plan_completions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create index if not exists idx_reading_plan_completions_plan_user on reading_plan_completions(plan_id, user_id);
