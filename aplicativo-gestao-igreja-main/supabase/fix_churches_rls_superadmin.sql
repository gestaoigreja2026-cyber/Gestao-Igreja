-- =====================================================
-- RLS na tabela churches para o Painel Super Admin
-- =====================================================
-- Execute no Supabase: SQL Editor > New query > Cole e Run
-- Permite que superadmin veja e gerencie todas as igrejas;
-- usuários normais veem só a própria igreja (church_id no profile).
-- =====================================================

-- Habilitar RLS na tabela churches (se ainda não estiver)
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas que possam restringir demais
DROP POLICY IF EXISTS "churches_tenant" ON churches;
DROP POLICY IF EXISTS "churches_superadmin_only" ON churches;
DROP POLICY IF EXISTS "SuperAdmin full access churches" ON churches;
DROP POLICY IF EXISTS "Users see own church" ON churches;
DROP POLICY IF EXISTS "Allow public read" ON churches;

-- SuperAdmin: acesso total (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "churches_superadmin_full"
ON churches
FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- Usuários normais: podem ver só a própria igreja (trocar de contexto, dashboard, etc.)
CREATE POLICY "churches_own_church"
ON churches
FOR SELECT
USING (
  id = (SELECT church_id FROM profiles WHERE id = auth.uid())
);

SELECT 'RLS da tabela churches configurado. Super Admin deve listar todas as igrejas.' AS status;
