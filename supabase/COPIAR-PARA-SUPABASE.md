# Scripts para copiar e colar no Supabase SQL Editor

**Recomendado (setup completo em uma vez):** Use o script **APPLY_FULL_SCHEMA.sql**: ele cria/ajusta todas as tabelas, colunas, RLS e o trigger de novo usuário. Depois, no Supabase → Storage, crie o bucket **church-documents** (para a tela de Uploads).

---

**Instrução (scripts individuais):** Abra o Supabase → SQL Editor. Para cada script abaixo:
1. Selecione TODO o bloco de codigo SQL (nao inclua titulos nem linhas com ---)
2. Copie (Ctrl+C)
3. Cole no SQL Editor (Ctrl+V)
4. Execute (Run)

**Importante:** Os scripts nao tem comentarios - copie todo o bloco de cada secao.

---

## 1. add-avatar-url-profiles.sql

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

---

## 2. add-registration-completed.sql

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN DEFAULT false;
COMMENT ON COLUMN profiles.registration_completed IS 'Se membro/congregado ja completou o formulario de cadastro';

---

## 3. add_discipleship_tenant.sql (pular se nao tiver tabela discipleships)

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'discipleships') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'discipleships' AND column_name = 'church_id'
        ) THEN
            ALTER TABLE discipleships ADD COLUMN church_id UUID REFERENCES churches(id);
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'discipleships') THEN
        ALTER TABLE discipleships ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Tenant isolation for discipleships" ON discipleships;
        CREATE POLICY "Tenant isolation for discipleships" ON discipleships
        FOR ALL USING (
            church_id = (SELECT church_id FROM profiles WHERE id = auth.uid()) 
            OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
        );
    END IF;
END $$;

---

## 4. apply-rls-isolation.sql ⭐ OBRIGATÓRIO

DROP FUNCTION IF EXISTS get_my_church_id() CASCADE;
DROP FUNCTION IF EXISTS get_my_role() CASCADE;

CREATE OR REPLACE FUNCTION get_my_church_id()
RETURNS UUID AS $fn1$
BEGIN
  RETURN (SELECT church_id FROM public.profiles WHERE id = auth.uid());
END;
$fn1$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $fn2$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$fn2$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Tenant isolation for profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_isolation" ON profiles;

CREATE POLICY "profiles_isolation" ON profiles
FOR ALL USING (
  id = auth.uid() OR
  church_id = get_my_church_id() OR
  get_my_role() = 'superadmin'
);

DROP POLICY IF EXISTS "Members are viewable by authenticated users" ON members;
DROP POLICY IF EXISTS "Members are insertable by admins and secretaries" ON members;
DROP POLICY IF EXISTS "Members are updatable by admins and secretaries" ON members;
DROP POLICY IF EXISTS "Members are deletable by admins" ON members;
DROP POLICY IF EXISTS "Tenant isolation for members" ON members;

CREATE POLICY "tenant_isolation_members" ON members
FOR ALL USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "Ministries are viewable" ON ministries;
DROP POLICY IF EXISTS "Ministries are insertable" ON ministries;
DROP POLICY IF EXISTS "Ministries are updatable" ON ministries;
DROP POLICY IF EXISTS "Ministries are deletable" ON ministries;
DROP POLICY IF EXISTS "Tenant isolation for ministries" ON ministries;

CREATE POLICY "tenant_isolation_ministries" ON ministries
FOR ALL USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "Cells are viewable by authenticated users" ON cells;
DROP POLICY IF EXISTS "Cells are insertable by admins and leaders" ON cells;
DROP POLICY IF EXISTS "Cells are updatable by admins and leaders" ON cells;
DROP POLICY IF EXISTS "Cells are deletable by admins" ON cells;
DROP POLICY IF EXISTS "Tenant isolation for cells" ON cells;

CREATE POLICY "tenant_isolation_cells" ON cells
FOR ALL USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "Tenant isolation for events" ON events;

CREATE POLICY "tenant_isolation_events" ON events
FOR ALL USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "Financial transactions viewable by admins and treasurers" ON financial_transactions;
DROP POLICY IF EXISTS "Financial transactions insertable by admins and treasurers" ON financial_transactions;
DROP POLICY IF EXISTS "Financial transactions updatable by admins and treasurers" ON financial_transactions;
DROP POLICY IF EXISTS "Financial transactions deletable by admins" ON financial_transactions;
DROP POLICY IF EXISTS "Tenant isolation for financial" ON financial_transactions;

CREATE POLICY "tenant_isolation_financial" ON financial_transactions
FOR ALL USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

ALTER TABLE members ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);
ALTER TABLE ministries ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);
ALTER TABLE cells ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);

SELECT 'RLS de isolamento multi-tenant aplicado com sucesso.' as status;

---

## 5. fix-church-delete-cascade.sql

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_church_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_church_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL;

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_church_id_fkey;
ALTER TABLE members ADD CONSTRAINT members_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

ALTER TABLE ministries DROP CONSTRAINT IF EXISTS ministries_church_id_fkey;
ALTER TABLE ministries ADD CONSTRAINT ministries_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

ALTER TABLE cells DROP CONSTRAINT IF EXISTS cells_church_id_fkey;
ALTER TABLE cells ADD CONSTRAINT cells_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_church_id_fkey;
ALTER TABLE events ADD CONSTRAINT events_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_church_id_fkey;
ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_church_id_fkey;
ALTER TABLE documents ADD CONSTRAINT documents_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

SELECT 'Constraints atualizadas. A remoção de igrejas deve funcionar.' as status;

---

---

## 6. fix-handle-new-user.sql ⭐ CRIAÇÃO DE CONTA

Execute se der "Erro ao criar sua conta" no cadastro/registro.
Cria churches e profiles se não existirem (banco novo).

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

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS church_id UUID;
DO $b1$ BEGIN ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL; EXCEPTION WHEN undefined_column THEN NULL; END $b1$;
DO $b2$ BEGIN ALTER TABLE profiles ALTER COLUMN name DROP NOT NULL; EXCEPTION WHEN undefined_column THEN NULL; END $b2$;
DO $b3$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='name') THEN
    UPDATE profiles SET full_name = COALESCE(full_name, name) WHERE full_name IS NULL;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='email') THEN
    UPDATE profiles SET full_name = COALESCE(full_name, email) WHERE full_name IS NULL;
  END IF;
END $b3$;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
DO $b4$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'pastor', 'secretario', 'tesoureiro', 'membro', 'lider_celula', 'lider_ministerio', 'aluno', 'congregado', 'superadmin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $b4$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE v_full_name TEXT; v_role TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Usuario');
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'membro');
  IF v_role NOT IN ('admin', 'pastor', 'secretario', 'tesoureiro', 'membro', 'lider_celula', 'lider_ministerio', 'aluno', 'congregado', 'superadmin') THEN v_role := 'membro'; END IF;
  BEGIN
    INSERT INTO public.profiles (id, full_name, role, church_id) VALUES (NEW.id, v_full_name, v_role, NULL);
  EXCEPTION WHEN undefined_column OR not_null_violation THEN
    INSERT INTO public.profiles (id, email, name, role) VALUES (NEW.id, COALESCE(NEW.email, ''), v_full_name, v_role);
  END;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

---

**Ordem mínima recomendada:** 1 → 2 → 3 → 4 → 5

**Se der erro ao criar conta:** execute o script **6 (fix-handle-new-user)**.

O script **4 (apply-rls-isolation)** é o mais importante para segurança multi-tenant.

---

## 7. schools.sql – Escolas e alunos

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS schools (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE TABLE IF NOT EXISTS school_students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_schools_church_id ON schools(church_id);
CREATE INDEX IF NOT EXISTS idx_school_students_school_id ON school_students(school_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_school_students_member_unique ON school_students(school_id, member_id) WHERE member_id IS NOT NULL;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schools_tenant" ON schools;
CREATE POLICY "schools_tenant" ON schools FOR ALL USING (church_id = (SELECT church_id FROM profiles WHERE id = auth.uid()) OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');
DROP POLICY IF EXISTS "school_students_via_school" ON school_students;
CREATE POLICY "school_students_via_school" ON school_students FOR ALL USING (school_id IN (SELECT id FROM schools WHERE church_id = (SELECT church_id FROM profiles WHERE id = auth.uid())) OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

CREATE TABLE IF NOT EXISTS school_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  subject TEXT,
  num_present INTEGER NOT NULL DEFAULT 0,
  num_visitors INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_school_reports_school_id ON school_reports(school_id);
ALTER TABLE school_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "school_reports_via_school" ON school_reports;
CREATE POLICY "school_reports_via_school" ON school_reports FOR ALL USING (school_id IN (SELECT id FROM schools WHERE church_id = (SELECT church_id FROM profiles WHERE id = auth.uid())) OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

---

Se o seu banco já tiver schema e outras migrações, você pode precisar executar outros scripts. Veja o `README-SQL.md` para a lista completa.
