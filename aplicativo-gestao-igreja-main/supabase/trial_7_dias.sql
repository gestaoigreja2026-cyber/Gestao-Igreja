-- Período de teste de 7 dias para novas igrejas
-- Execute no SQL Editor do Supabase após update_vencimento_30_dias_tolerancia_5.sql e subscription_plan_amount_50_first.sql

-- Novas igrejas recebem 7 dias de teste gratuito (status trial), depois vencimento normal
CREATE OR REPLACE FUNCTION create_subscription_for_new_church()
RETURNS TRIGGER AS $$
DECLARE
  church_count INTEGER;
  amount NUMERIC;
BEGIN
  SELECT count(*) INTO church_count FROM churches;
  amount := CASE WHEN church_count <= 50 THEN 75 ELSE 150 END;
  INSERT INTO church_subscriptions (church_id, status, plan_amount, next_due_at)
  VALUES (NEW.id, 'trial', amount, (CURRENT_DATE + INTERVAL '7 days')::date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
