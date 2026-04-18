-- =====================================================
-- Criar tabela ministries (e ministry_members) se não existir
-- =====================================================
-- Execute no Supabase: SQL Editor > New query > Cole e Run
-- Pré-requisito: tabela "members" deve existir (rode schema.sql antes se precisar).
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela ministries
CREATE TABLE IF NOT EXISTS ministries (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  leader_id uuid REFERENCES members(id) ON DELETE SET NULL,
  color text,
  icon text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Coluna church_id (multi-tenant) se a tabela churches existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'churches') THEN
    ALTER TABLE ministries ADD COLUMN IF NOT EXISTS church_id uuid REFERENCES churches(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Tabela ministry_members (membro x ministério)
CREATE TABLE IF NOT EXISTS ministry_members (
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  ministry_id uuid REFERENCES ministries(id) ON DELETE CASCADE,
  role text,
  joined_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (member_id, ministry_id)
);

-- RLS
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_members ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (igual ao schema base)
DROP POLICY IF EXISTS "Ministries are viewable" ON ministries;
CREATE POLICY "Ministries are viewable" ON ministries FOR SELECT USING (true);
DROP POLICY IF EXISTS "Ministries are insertable" ON ministries;
CREATE POLICY "Ministries are insertable" ON ministries FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Ministries are updatable" ON ministries;
CREATE POLICY "Ministries are updatable" ON ministries FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Ministries are deletable" ON ministries;
CREATE POLICY "Ministries are deletable" ON ministries FOR DELETE USING (true);

DROP POLICY IF EXISTS "Ministry members viewable" ON ministry_members;
CREATE POLICY "Ministry members viewable" ON ministry_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Ministry members insertable" ON ministry_members;
CREATE POLICY "Ministry members insertable" ON ministry_members FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Ministry members deletable" ON ministry_members;
CREATE POLICY "Ministry members deletable" ON ministry_members FOR DELETE USING (true);

SELECT 'Tabela ministries (e ministry_members) criada ou já existente.' AS status;
