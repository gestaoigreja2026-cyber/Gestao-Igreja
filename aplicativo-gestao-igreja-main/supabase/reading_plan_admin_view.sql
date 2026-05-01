-- Permite admins/pastores/secretários verem progresso e conclusões de todos os membros no plano
-- Execute no SQL Editor do Supabase

create policy "Admins view church plan progress"
  on reading_plan_progress for select
  using (
    (select role from profiles where id = auth.uid()) in ('admin', 'pastor', 'secretario', 'superadmin')
    and (
      exists (
        select 1 from reading_plans rp
        where rp.id = plan_id
        and (rp.church_id = (select church_id from profiles where id = auth.uid())
             or (select role from profiles where id = auth.uid()) = 'superadmin'
             or (rp.church_id is null and (select church_id from profiles where id = auth.uid()) is not null))
      )
    )
  );

create policy "Admins view church plan completions"
  on reading_plan_completions for select
  using (
    (select role from profiles where id = auth.uid()) in ('admin', 'pastor', 'secretario', 'superadmin')
    and (
      exists (
        select 1 from reading_plans rp
        where rp.id = plan_id
        and (rp.church_id = (select church_id from profiles where id = auth.uid())
             or (select role from profiles where id = auth.uid()) = 'superadmin'
             or (rp.church_id is null and (select church_id from profiles where id = auth.uid()) is not null))
      )
    )
  );
