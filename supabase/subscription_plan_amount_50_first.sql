-- Define plan_amount = 75 para as 50 primeiras igrejas, 150 para as demais
-- Execute após church_subscriptions.sql e update_vencimento_30_dias_tolerancia_5.sql

-- Atualizar assinaturas existentes: igrejas 1-50 = R$ 75, 51+ = R$ 150
WITH numbered AS (
  SELECT cs.id, ROW_NUMBER() OVER (ORDER BY c.created_at) AS rn
  FROM church_subscriptions cs
  JOIN churches c ON c.id = cs.church_id
)
UPDATE church_subscriptions
SET plan_amount = CASE WHEN n.rn <= 50 THEN 75 ELSE 150 END
FROM numbered n
WHERE church_subscriptions.id = n.id;

-- Trigger: novas igrejas recebem plan_amount correto (75 se total <= 50, senão 150)
CREATE OR REPLACE FUNCTION create_subscription_for_new_church()
RETURNS TRIGGER AS $$
DECLARE
  church_count INTEGER;
  amount NUMERIC;
BEGIN
  SELECT count(*) INTO church_count FROM churches;
  amount := CASE WHEN church_count <= 50 THEN 75 ELSE 150 END;
  INSERT INTO church_subscriptions (church_id, status, plan_amount, next_due_at)
  VALUES (NEW.id, 'ativa', amount, (CURRENT_DATE + INTERVAL '30 days')::date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
