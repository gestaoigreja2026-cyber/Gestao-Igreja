-- ===================================================
-- Escolas e Alunos
-- ===================================================
-- Execute no Supabase: SQL Editor > New query
-- Cole TODO o conteúdo e execute (Run)
-- OBRIGATÓRIO: churches e profiles com church_id devem existir.
-- Este script cria churches se não existir (banco antigo sem multi-tenant).
-- ===================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cria churches se não existir (schools depende de churches)
CREATE TABLE IF NOT EXISTS churches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- Garante slug único só se não existir constraint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'churches_slug_key') THEN
    ALTER TABLE churches ADD CONSTRAINT churches_slug_key UNIQUE (slug);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Garante church_id em profiles (necessário para RLS de schools)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
-- Garante role em profiles (políticas RLS usam)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT;
DO $$
BEGIN
  UPDATE profiles SET role = COALESCE(role, 'membro') WHERE role IS NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Garante members existe e tem church_id (school_students referencia members)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='members') THEN
    ALTER TABLE members ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ========== Tabelas de Escolas ==========

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
CREATE INDEX IF NOT EXISTS idx_school_students_member_id ON school_students(member_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_school_students_member_unique ON school_students(school_id, member_id) WHERE member_id IS NOT NULL;

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schools_tenant" ON schools;
CREATE POLICY "schools_tenant" ON schools
  FOR ALL USING (
    church_id = (SELECT church_id FROM profiles WHERE id = auth.uid())
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
  );

DROP POLICY IF EXISTS "school_students_via_school" ON school_students;
CREATE POLICY "school_students_via_school" ON school_students
  FOR ALL USING (
    school_id IN (SELECT id FROM schools WHERE church_id = (SELECT church_id FROM profiles WHERE id = auth.uid()))
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
  );

-- Relatórios de aulas/presença (número de presentes, assunto, etc.)
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
CREATE INDEX IF NOT EXISTS idx_school_reports_date ON school_reports(report_date);

ALTER TABLE school_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_reports_via_school" ON school_reports;
CREATE POLICY "school_reports_via_school" ON school_reports
  FOR ALL USING (
    school_id IN (SELECT id FROM schools WHERE church_id = (SELECT church_id FROM profiles WHERE id = auth.uid()))
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
  );
