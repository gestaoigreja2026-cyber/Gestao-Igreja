-- Histórico de pagamentos de assinaturas (para rastrear quem pagou e quando)
-- Execute após church_subscriptions.sql

CREATE TABLE IF NOT EXISTS church_subscription_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES church_subscriptions(id) ON DELETE SET NULL,
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  amount NUMERIC(10, 2) NOT NULL DEFAULT 150.00,
  registered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'hotmart', 'pix', 'boleto', 'transferencia')),
  hotmart_transaction_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_church ON church_subscription_payments(church_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_paid_at ON church_subscription_payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_registered_by ON church_subscription_payments(registered_by);

-- RLS: só SuperAdmin vê
ALTER TABLE church_subscription_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "SuperAdmin full access" ON church_subscription_payments;
CREATE POLICY "SuperAdmin full access" ON church_subscription_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

-- Atualizar register_payment_church para registrar no histórico (quem pagou, quando)
CREATE OR REPLACE FUNCTION register_payment_church(p_church_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sub_id UUID;
  v_amount NUMERIC;
BEGIN
  SELECT id, plan_amount INTO v_sub_id, v_amount
  FROM church_subscriptions WHERE church_id = p_church_id LIMIT 1;

  -- Registrar no histórico (quem registrou = auth.uid())
  INSERT INTO church_subscription_payments (church_id, subscription_id, amount, registered_by, source)
  VALUES (p_church_id, v_sub_id, COALESCE(v_amount, 150), auth.uid(), 'manual');

  -- Atualizar assinatura
  UPDATE church_subscriptions
  SET status = 'ativa', last_payment_at = NOW(),
      next_due_at = (CURRENT_DATE + INTERVAL '30 days')::date, updated_at = NOW()
  WHERE church_id = p_church_id;
END;
$$;

-- Função para listar pagamentos de uma igreja (para SuperAdmin)
CREATE OR REPLACE FUNCTION get_church_subscription_payments(p_church_id UUID)
RETURNS TABLE (
  id UUID,
  paid_at TIMESTAMPTZ,
  amount NUMERIC,
  registered_by UUID,
  registered_by_name TEXT,
  source TEXT,
  hotmart_transaction_id TEXT,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.paid_at,
    p.amount,
    p.registered_by,
    COALESCE(pr.full_name, pr.name, pr.email, 'Sistema')::TEXT AS registered_by_name,
    p.source,
    p.hotmart_transaction_id,
    p.notes
  FROM church_subscription_payments p
  LEFT JOIN profiles pr ON pr.id = p.registered_by
  WHERE p.church_id = p_church_id
  ORDER BY p.paid_at DESC;
END;
$$;
