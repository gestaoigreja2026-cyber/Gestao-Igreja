-- Atualiza lógica de vencimento: 30 dias após assinatura + 5 dias de tolerância
-- Execute no Supabase após church_subscriptions.sql e church_subscriptions_actions.sql
-- Referência: vencimento 30 dias após assinatura, tolerância 5 dias após vencimento, suspensão automática após

-- 1. Trigger: criar assinatura ao criar igreja (next_due = hoje + 30 dias)
CREATE OR REPLACE FUNCTION create_subscription_for_new_church()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO church_subscriptions (church_id, status, next_due_at)
  VALUES (NEW.id, 'ativa', (CURRENT_DATE + INTERVAL '30 days')::date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. sync_subscription_status: inadimplente se passou vencimento, suspensa se passou vencimento + 5 dias
CREATE OR REPLACE FUNCTION sync_subscription_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  today_date date := CURRENT_DATE;
  sub RECORD;
  next_due date;
  due_plus_tolerance date;
BEGIN
    FOR sub IN SELECT id, church_id, status, next_due_at FROM church_subscriptions
  WHERE status IN ('ativa', 'inadimplente', 'trial')
  LOOP
    next_due := sub.next_due_at::date;
    due_plus_tolerance := (next_due + INTERVAL '5 days')::date;

    IF today_date > due_plus_tolerance THEN
      -- Passou vencimento + tolerância: suspensa
      UPDATE church_subscriptions
      SET status = 'suspensa', updated_at = NOW()
      WHERE id = sub.id AND status != 'suspensa';
    ELSIF today_date > next_due THEN
      -- Passou vencimento, ainda na tolerância: inadimplente
      UPDATE church_subscriptions
      SET status = 'inadimplente', updated_at = NOW()
      WHERE id = sub.id AND status NOT IN ('inadimplente', 'suspensa');
    END IF;
  END LOOP;
END;
$$;

-- 3. register_payment_church: próximo vencimento = hoje + 30 dias
CREATE OR REPLACE FUNCTION register_payment_church(p_church_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE church_subscriptions
  SET
    status = 'ativa',
    last_payment_at = NOW(),
    next_due_at = (CURRENT_DATE + INTERVAL '30 days')::date,
    updated_at = NOW()
  WHERE church_id = p_church_id;
END;
$$;
