-- =====================================================
-- LIMPAR DADOS DE TESTE - App Gestão Igreja
-- =====================================================
-- Execute este script no Supabase SQL Editor para remover
-- todos os dados de teste e deixar o app pronto para dados reais.
--
-- ATENÇÃO: Esta operação é IRREVERSÍVEL. Faça backup se necessário.
-- =====================================================

-- 1. Transações financeiras (Relatórios, Caixa Diário)
DELETE FROM financial_transactions;

-- 2. Orçamentos (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budgets') THEN
    DELETE FROM budgets;
  END IF;
END $$;

-- 3. Tabelas de junção e dependentes
DELETE FROM cell_members;
DELETE FROM ministry_members;
DELETE FROM cell_reports;
DELETE FROM discipleships;

-- 4. Escalas de serviço e checklists de eventos (se existirem)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_scales') THEN
    DELETE FROM service_scales;
  END IF;
END $$;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_checklists') THEN
    DELETE FROM event_checklists;
  END IF;
END $$;

-- 5. Documentos/Uploads (Secretaria)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
    DELETE FROM documents;
  END IF;
END $$;

-- 6. Pastores da igreja (Página Institucional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'church_pastors') THEN
    DELETE FROM church_pastors;
  END IF;
END $$;

-- 7. Anular FKs antes de deletar entidades principais
UPDATE cells SET leader_id = NULL, host_id = NULL;
UPDATE ministries SET leader_id = NULL;
UPDATE events SET responsible_id = NULL;

-- 8. Deletar entidades principais
DELETE FROM cells;
DELETE FROM ministries;
DELETE FROM events;
DELETE FROM members;

-- Confirmação
SELECT 'Dados de teste removidos com sucesso!' as status;

-- =====================================================
-- OPCIONAL: Limpar arquivos do Storage
-- =====================================================
-- Os arquivos em Storage (fotos, documentos) NÃO são removidos
-- por este script. Para limpar manualmente:
-- 1. Acesse Supabase > Storage > church-documents
-- 2. Delete as pastas avatars/ e documentes/ se desejar
-- =====================================================
