-- ===================================================
-- FIX: handle_new_user para tabela profiles atualizada
-- ===================================================
-- A tabela profiles usa full_name (não name) e church_id.
-- O trigger antigo inseria (id, email, name, role) e falhava
-- com "Database error saving new user".
--
-- Execute no Supabase: SQL Editor > New query > Cole e Run
-- ===================================================

-- 0. Cria churches e profiles se não existirem (banco novo)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS churches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'membro' CHECK (role IN ('admin', 'pastor', 'secretario', 'tesoureiro', 'membro', 'lider_celula', 'lider_ministerio', 'aluno', 'congregado', 'superadmin')),
  church_id UUID REFERENCES churches(id) ON DELETE SET NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_own" ON profiles;
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);

-- 1. Garante colunas e flexibilidade para todos os perfis (incl. superadmin)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS church_id UUID;
DO $b1$ BEGIN
  ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL; END $b1$;
DO $b2$ BEGIN
  ALTER TABLE profiles ALTER COLUMN name DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL; END $b2$;
DO $b3$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='name') THEN
    UPDATE profiles SET full_name = COALESCE(full_name, name) WHERE full_name IS NULL;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='email') THEN
    UPDATE profiles SET full_name = COALESCE(full_name, email) WHERE full_name IS NULL;
  END IF;
END $b3$;

-- 2. Garante que constraint de role aceita superadmin e pastor
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
DO $b4$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('admin', 'pastor', 'secretario', 'tesoureiro', 'membro', 'lider_celula', 'lider_ministerio', 'aluno', 'congregado', 'superadmin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $b4$;

-- 3. Atualiza a função (tenta schema novo, fallback para antigo)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_full_name TEXT;
  v_role TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Usuário');
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'membro');
  
  IF v_role NOT IN ('admin', 'pastor', 'secretario', 'tesoureiro', 'membro', 'lider_celula', 'lider_ministerio', 'aluno', 'congregado', 'superadmin') THEN
    v_role := 'membro';
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, full_name, role, church_id)
    VALUES (NEW.id, v_full_name, v_role, NULL);
  EXCEPTION WHEN undefined_column OR not_null_violation THEN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (NEW.id, COALESCE(NEW.email, ''), v_full_name, v_role);
  END;
  RETURN NEW;
END;
$fn$;

-- 4. Recria o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
