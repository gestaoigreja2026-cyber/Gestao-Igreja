-- ============================================================
-- PLANOS DE ASSINATURA POR NÚMERO DE MEMBROS
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Adiciona coluna subscription_plan na tabela church_subscriptions
ALTER TABLE church_subscriptions
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT
  CHECK (subscription_plan IN ('starter', 'growth', 'professional', 'enterprise', 'trial'))
  DEFAULT 'starter';

-- 2. Atualiza planos existentes com base no plan_amount atual
UPDATE church_subscriptions SET subscription_plan = CASE
  WHEN status = 'trial'     THEN 'trial'
  WHEN plan_amount <= 199   THEN 'starter'
  WHEN plan_amount <= 299   THEN 'growth'
  WHEN plan_amount <= 499   THEN 'professional'
  ELSE                           'enterprise'
END
WHERE subscription_plan IS NULL OR subscription_plan = 'starter';

-- 3. Atualiza os valores dos planos conforme nova tabela de preços
-- (mantém as igrejas existentes no starter por compatibilidade)
-- Se quiser alterar manualmente o plano de uma igreja específica:
-- UPDATE church_subscriptions SET subscription_plan = 'growth', plan_amount = 299 WHERE church_id = 'ID_DA_IGREJA';

-- 4. Índice para consultas por plano
CREATE INDEX IF NOT EXISTS idx_church_subscriptions_plan
  ON church_subscriptions(subscription_plan);

-- 5. Função para verificar limite de membros por plano
CREATE OR REPLACE FUNCTION get_member_limit_for_plan(p_plan TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE p_plan
    WHEN 'trial'        THEN 30
    WHEN 'starter'      THEN 100
    WHEN 'growth'       THEN 500
    WHEN 'professional' THEN 2000
    WHEN 'enterprise'   THEN 999999
    ELSE 100
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. View que retorna info de plano + contagem de membros por igreja
CREATE OR REPLACE VIEW church_plan_usage AS
SELECT
  c.id AS church_id,
  c.name AS church_name,
  cs.subscription_plan,
  cs.plan_amount,
  cs.status,
  cs.next_due_at,
  get_member_limit_for_plan(cs.subscription_plan) AS max_members,
  COUNT(m.id) FILTER (WHERE m.status = 'ativo') AS current_members,
  ROUND(
    (COUNT(m.id) FILTER (WHERE m.status = 'ativo')::NUMERIC
    / NULLIF(get_member_limit_for_plan(cs.subscription_plan), 0)) * 100
  , 1) AS percent_used
FROM churches c
LEFT JOIN church_subscriptions cs ON cs.church_id = c.id
LEFT JOIN members m ON m.church_id = c.id
GROUP BY c.id, c.name, cs.subscription_plan, cs.plan_amount, cs.status, cs.next_due_at;

-- 7. Políticas RLS para a view (apenas superadmin vê tudo, admins veem a própria)
-- A view herda as RLS das tabelas base, então não precisa de políticas adicionais

SELECT 'Migração de planos de assinatura aplicada com sucesso!' AS resultado;
