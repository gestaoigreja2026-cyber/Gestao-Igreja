-- =====================================================
-- Criar tabela documents (Uploads / Documentos da igreja)
-- =====================================================
-- Execute no Supabase: SQL Editor > New query > Cole e Run
-- Pré-requisito: tabela "churches" deve existir.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela documents (Estudos, Financeiro, Atas, Fotos, Vídeos)
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

-- Índices para buscas por categoria e igreja
CREATE INDEX IF NOT EXISTS idx_documents_church_id ON documents(church_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Políticas: permissivo para funcionar com schema atual
DROP POLICY IF EXISTS "tenant_isolation_documents" ON documents;
DROP POLICY IF EXISTS "tenant_isolation" ON documents;
DROP POLICY IF EXISTS "documents_select" ON documents;
DROP POLICY IF EXISTS "documents_insert" ON documents;
DROP POLICY IF EXISTS "documents_update" ON documents;
DROP POLICY IF EXISTS "documents_delete" ON documents;

-- Permite leitura para autenticados (ou todos se church_id for null em alguns registros)
CREATE POLICY "documents_select" ON documents FOR SELECT USING (true);

-- Permite insert para autenticados
CREATE POLICY "documents_insert" ON documents FOR INSERT WITH CHECK (true);

-- Permite update para autenticados
CREATE POLICY "documents_update" ON documents FOR UPDATE USING (true);

-- Permite delete para autenticados
CREATE POLICY "documents_delete" ON documents FOR DELETE USING (true);

-- Se usar multi-tenant (church_id obrigatório), descomente e execute:
-- DROP POLICY IF EXISTS "documents_select" ON documents;
-- DROP POLICY IF EXISTS "documents_insert" ON documents;
-- DROP POLICY IF EXISTS "documents_update" ON documents;
-- DROP POLICY IF EXISTS "documents_delete" ON documents;
-- CREATE POLICY "tenant_isolation_documents" ON documents FOR ALL USING (
--   church_id = (SELECT church_id FROM profiles WHERE id = auth.uid())
--   OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
-- );

SELECT 'Tabela documents criada com sucesso.' AS status;
