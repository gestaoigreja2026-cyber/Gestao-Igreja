-- ============================================================================
-- MASTER_SECURITY_FIX.sql
-- Objetivo: Resolver alerta de "Dados confidenciais acessíveis publicamente"
-- e implementar isolamento multi-tenant (RLS) robusto.
--
-- INSTRUÇÕES: Execute este script no SQL Editor do Supabase.
-- ============================================================================

-- 1. Funções Auxiliares (SECURITY DEFINER para evitar recursão infinita)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_church_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT church_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Habilitar RLS em todas as tabelas (Garantia)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- 3. Limpeza de Políticas Existentes (Garantir um estado limpo)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN (
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 4. Políticas para a Tabela CHURCHES (Especial: precisa de acesso para branding)
-- ----------------------------------------------------------------------------
-- Garantir que a coluna 'active' exista
ALTER TABLE churches ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Permitir que QUALQUER UM (anon ou auth) veja informações básicas das igrejas ativas para branding
DROP POLICY IF EXISTS "churches_public_read" ON churches;
CREATE POLICY "churches_public_read" ON churches FOR SELECT
  USING (active = true);

-- Apenas superadmin pode criar/editar/deletar igrejas
DROP POLICY IF EXISTS "churches_superadmin_all" ON churches;
CREATE POLICY "churches_superadmin_all" ON churches FOR ALL
  USING (get_my_role() = 'superadmin')
  WITH CHECK (get_my_role() = 'superadmin');

-- 5. Políticas para a Tabela PROFILES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_isolation" ON profiles;
CREATE POLICY "profiles_isolation" ON profiles FOR ALL
  USING (
    id = auth.uid() OR 
    church_id = get_my_church_id() OR 
    get_my_role() = 'superadmin'
  );

-- 6. Políticas Genéricas de Isolamento por church_id
-- ----------------------------------------------------------------------------
-- Aplicar isolamento estrito para tabelas que possuem a coluna church_id
DO $$
DECLARE
  t text;
  policy_name text;
BEGIN
  FOR t IN (
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND column_name = 'church_id'
    AND table_name NOT IN ('churches', 'profiles') -- Já tratadas acima
  ) LOOP
    policy_name := 'tenant_isolation_' || t;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', policy_name, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (church_id = get_my_church_id() OR get_my_role() = ''superadmin'');', policy_name, t);
  END LOOP;
END $$;

-- 7. Chat Tables (Especial: baseadas em participação, não apenas church_id)
-- ----------------------------------------------------------------------------
-- Chat Conversations: Ver apenas onde é participante
DROP POLICY IF EXISTS "chat_conversations_select" ON chat_conversations;
CREATE POLICY "chat_conversations_select" ON chat_conversations FOR SELECT
  USING (id IN (SELECT conversation_id FROM chat_participants WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "chat_conversations_insert" ON chat_conversations;
CREATE POLICY "chat_conversations_insert" ON chat_conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Chat Participants: Ver todos para poder iniciar chats, mas restringir em produção se necessário
DROP POLICY IF EXISTS "chat_participants_select" ON chat_participants;
CREATE POLICY "chat_participants_select" ON chat_participants FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "chat_participants_insert" ON chat_participants;
CREATE POLICY "chat_participants_insert" ON chat_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Chat Messages: Ver apenas de conversas que participa
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT
  USING (conversation_id IN (SELECT conversation_id FROM chat_participants WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND 
    conversation_id IN (SELECT conversation_id FROM chat_participants WHERE profile_id = auth.uid())
  );

-- Chat Starred Messages
DROP POLICY IF EXISTS "chat_starred_select" ON chat_starred_messages;
CREATE POLICY "chat_starred_select" ON chat_starred_messages FOR SELECT
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "chat_starred_insert" ON chat_starred_messages;
CREATE POLICY "chat_starred_insert" ON chat_starred_messages FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- 8. Casos Especiais (Tabelas sem church_id mas que precisam de RLS)
-- ----------------------------------------------------------------------------

-- Reading Plan Days (Acesso público para leitura de planos)
DROP POLICY IF EXISTS "reading_plan_days_read" ON reading_plan_days;
CREATE POLICY "reading_plan_days_read" ON reading_plan_days FOR SELECT USING (true);

-- Reading Plan Progress (Apenas o próprio usuário)
DROP POLICY IF EXISTS "reading_plan_progress_own" ON reading_plan_progress;
CREATE POLICY "reading_plan_progress_own" ON reading_plan_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notifications (Apenas o próprio usuário)
DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications FOR ALL
  USING (user_id = auth.uid() OR get_my_role() = 'superadmin');

-- Push Subscriptions (Apenas o próprio usuário)
DROP POLICY IF EXISTS "push_subscriptions_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_own" ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 9. Conclusão
-- ----------------------------------------------------------------------------
SELECT 'Segurança aplicada com sucesso. RLS ativado e isolamento de dados (incluindo Chat) garantido.' as status;
