-- Ações e status de assinatura: suspensão automática dia 15, vencimento dia 10
-- Execute após church_subscriptions.sql

-- Adicionar status 'suspensa' (se a tabela já existir com CHECK antigo, precisamos alterar)
ALTER TABLE church_subscriptions DROP CONSTRAINT IF EXISTS church_subscriptions_status_check;
ALTER TABLE church_subscriptions ADD CONSTRAINT church_subscriptions_status_check
  CHECK (status IN ('ativa', 'inadimplente', 'cancelada', 'trial', 'suspensa'));

-- Função: sincronizar status (inadimplente se passou do dia 10, suspensa se passou do dia 15)
CREATE OR REPLACE FUNCTION sync_subscription_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  today_date date := CURRENT_DATE;
  day_of_month int := EXTRACT(DAY FROM today_date);
  sub RECORD;
  next_due date;
  should_suspend boolean;
BEGIN
    FOR sub IN SELECT id, church_id, status, next_due_at FROM church_subscriptions
  WHERE status IN ('ativa', 'inadimplente', 'trial')
  LOOP
    next_due := sub.next_due_at::date;
    -- Se venceu: dia 10 passou. Dia 15+ -> suspensa; antes disso -> inadimplente
    IF next_due < today_date AND (sub.status = 'ativa' OR sub.status = 'trial' OR sub.status = 'inadimplente') THEN
      UPDATE church_subscriptions
      SET status = CASE WHEN day_of_month >= 15 THEN 'suspensa' ELSE 'inadimplente' END,
          updated_at = NOW()
      WHERE id = sub.id;
    END IF;
  END LOOP;
END;
$$;

-- Função: suspender manualmente
CREATE OR REPLACE FUNCTION suspend_church_subscription(p_church_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE church_subscriptions
  SET status = 'suspensa', updated_at = NOW()
  WHERE church_id = p_church_id AND status IN ('ativa', 'inadimplente', 'trial');
END;
$$;

-- Função: retomar serviço
CREATE OR REPLACE FUNCTION resume_church_subscription(p_church_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE church_subscriptions
  SET status = 'ativa', updated_at = NOW()
  WHERE church_id = p_church_id AND status IN ('suspensa', 'inadimplente');
END;
$$;

-- Função: registrar pagamento (volta para ativa, atualiza next_due para dia 10 do próximo mês)
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
    next_due_at = (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '9 days')::date,
    updated_at = NOW()
  WHERE church_id = p_church_id;
END;
$$;

-- Função: cancelar/excluir assinatura (status cancelada)
CREATE OR REPLACE FUNCTION cancel_church_subscription(p_church_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE church_subscriptions
  SET status = 'cancelada', updated_at = NOW()
  WHERE church_id = p_church_id;
END;
$$;

-- RPC para usuário ver se sua igreja está bloqueada (retorna status e blocked)
CREATE OR REPLACE FUNCTION get_my_church_subscription_status()
RETURNS TABLE(status text, blocked boolean)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  my_church_id uuid;
  sub_status text;
BEGIN
  SELECT church_id INTO my_church_id FROM profiles WHERE id = auth.uid();
  IF my_church_id IS NULL THEN
    RETURN QUERY SELECT 'ativa'::text, false;  -- Sem igreja = não bloqueia
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin') THEN
    RETURN QUERY SELECT 'ativa'::text, false;  -- Superadmin nunca bloqueado
    RETURN;
  END IF;
  SELECT cs.status INTO sub_status
  FROM church_subscriptions cs
  WHERE cs.church_id = my_church_id
  LIMIT 1;
  IF sub_status IS NULL THEN
    RETURN QUERY SELECT 'ativa'::text, false;  -- Sem assinatura = não bloqueia (fallback)
    RETURN;
  END IF;
  RETURN QUERY SELECT sub_status, (sub_status IN ('suspensa', 'inadimplente'));
END;
$$;
