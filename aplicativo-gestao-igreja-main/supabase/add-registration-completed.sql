-- ===================================================
-- Cadastro na primeira vez: primeiro login → Cadastro; segundo+ → Dashboard
-- ===================================================
-- Execute no Supabase: SQL Editor > New query > Cole e Run
-- ===================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN DEFAULT false;
COMMENT ON COLUMN profiles.registration_completed IS 'Se membro/congregado já completou o formulário de cadastro (primeira vez)';
