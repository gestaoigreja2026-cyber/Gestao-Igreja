-- =========================================================================
-- SCRIPT COMPLETO PARA CRIAR AS TABELAS FALTANTES NO SUPABASE
-- Execute este script no SQL Editor do Supabase para corrigir os erros 
-- em Ministérios, Caixa Diário, Discipulado, Uploads e Planos de Leitura.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. GARANTIR TABELAS BASE (Churches, Members)
CREATE TABLE IF NOT EXISTS churches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. MINISTÉRIOS
CREATE TABLE IF NOT EXISTS ministries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID REFERENCES members(id) ON DELETE SET NULL,
  color TEXT,
  icon TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. DISCIPULADOS
CREATE TABLE IF NOT EXISTS discipleships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  disciple_id UUID REFERENCES members(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES members(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT CHECK (status IN ('em_andamento', 'concluido', 'cancelado')) DEFAULT 'em_andamento',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. CAIXA DIÁRIO (TRANSAÇÕES E ORÇAMENTOS)
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('entrada', 'saida')) NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  payment_method TEXT,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  month TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(church_id, category, month)
);

-- 5. UPLOADS (DOCUMENTOS)
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INT,
  category TEXT DEFAULT 'study',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. PLANOS DE LEITURA
CREATE TABLE IF NOT EXISTS reading_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  days_duration INT NOT NULL DEFAULT 365,
  daily_portions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS reading_plan_completions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_id UUID REFERENCES reading_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(plan_id, user_id, day_number)
);

-- ATIVA RLS NAS TABELAS
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE discipleships ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_plan_completions ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO LIVRE PARA OS MEMBROS LOGADOS DA MESMA IGREJA
DROP POLICY IF EXISTS "tenant_isolation_ministries" ON ministries;
CREATE POLICY "tenant_isolation_ministries" ON ministries FOR ALL USING (
    church_id = (SELECT church_id FROM profiles WHERE id = auth.uid()) 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
);

DROP POLICY IF EXISTS "tenant_isolation_discipleships" ON discipleships;
CREATE POLICY "tenant_isolation_discipleships" ON discipleships FOR ALL USING (
    church_id = (SELECT church_id FROM profiles WHERE id = auth.uid()) 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
);

DROP POLICY IF EXISTS "tenant_isolation_financial" ON financial_transactions;
CREATE POLICY "tenant_isolation_financial" ON financial_transactions FOR ALL USING (
    church_id = (SELECT church_id FROM profiles WHERE id = auth.uid()) 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
);

DROP POLICY IF EXISTS "tenant_isolation_budgets" ON budgets;
CREATE POLICY "tenant_isolation_budgets" ON budgets FOR ALL USING (
    church_id = (SELECT church_id FROM profiles WHERE id = auth.uid()) 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
);

DROP POLICY IF EXISTS "tenant_isolation_documents" ON documents;
CREATE POLICY "tenant_isolation_documents" ON documents FOR ALL USING (
    church_id = (SELECT church_id FROM profiles WHERE id = auth.uid()) 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
);

DROP POLICY IF EXISTS "tenant_isolation_reading_plans" ON reading_plans;
CREATE POLICY "tenant_isolation_reading_plans" ON reading_plans FOR ALL USING (
    church_id = (SELECT church_id FROM profiles WHERE id = auth.uid()) 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
);

DROP POLICY IF EXISTS "reading_plan_completions_policy" ON reading_plan_completions;
CREATE POLICY "reading_plan_completions_policy" ON reading_plan_completions FOR ALL USING (
    user_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
);

-- FIM DO SCRIPT
