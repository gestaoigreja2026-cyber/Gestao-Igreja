-- ===================================================
-- LIMPAR políticas de Planos de Leitura
-- ===================================================
-- Execute este script ANTES de reading_plans.sql
-- se aparecer erro "policy already exists"
-- Cole no SQL Editor e execute (Run)
-- ===================================================

drop policy if exists "Reading plans viewable by church" on reading_plans;
drop policy if exists "Reading plans insert by admins" on reading_plans;
drop policy if exists "Reading plans update by admins" on reading_plans;
drop policy if exists "Reading plans delete by admins" on reading_plans;
drop policy if exists "Reading plan days viewable" on reading_plan_days;
drop policy if exists "Reading plan days manageable" on reading_plan_days;
drop policy if exists "Users manage own progress" on reading_plan_progress;
drop policy if exists "Users manage own completions" on reading_plan_completions;
