-- =====================================================
-- CORRIGIR REMOÇÃO DE IGREJAS (Super Admin)
-- =====================================================
-- Execute no Supabase SQL Editor para permitir que a 
-- exclusão de uma igreja remova ou atualize os dados vinculados.
--
-- Se alguma linha der erro (tabela/constraint inexistente), 
-- comente essa linha e execute o restante.
-- =====================================================

-- 1. Notifications: ao excluir igreja, excluir notificações
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_church_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

-- 2. Profiles: ao excluir igreja, desvincular usuários (SET NULL)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_church_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL;

-- 3. Members
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_church_id_fkey;
ALTER TABLE members ADD CONSTRAINT members_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

-- 4. Ministries
ALTER TABLE ministries DROP CONSTRAINT IF EXISTS ministries_church_id_fkey;
ALTER TABLE ministries ADD CONSTRAINT ministries_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

-- 5. Cells
ALTER TABLE cells DROP CONSTRAINT IF EXISTS cells_church_id_fkey;
ALTER TABLE cells ADD CONSTRAINT cells_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

-- 6. Events
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_church_id_fkey;
ALTER TABLE events ADD CONSTRAINT events_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

-- 7. Financial transactions
ALTER TABLE financial_transactions DROP CONSTRAINT IF EXISTS financial_transactions_church_id_fkey;
ALTER TABLE financial_transactions ADD CONSTRAINT financial_transactions_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

-- 8. Documents (comente se a tabela não existir)
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_church_id_fkey;
ALTER TABLE documents ADD CONSTRAINT documents_church_id_fkey 
  FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE;

SELECT 'Constraints atualizadas. A remoção de igrejas deve funcionar.' as status;
