-- =====================================================
-- APLICAR ISOLAMENTO MULTI-TENANT (RLS)
-- =====================================================
-- Execute no Supabase SQL Editor para garantir que cada
-- igreja só acesse seus próprios dados.
--
-- Remove políticas permissivas antigas (using true) e
-- aplica filtro por church_id + superadmin.
-- =====================================================

-- 1. Funções auxiliares (SECURITY DEFINER para evitar recursão)
DROP FUNCTION IF EXISTS get_my_church_id() CASCADE;
DROP FUNCTION IF EXISTS get_my_role() CASCADE;

CREATE OR REPLACE FUNCTION get_my_church_id()
RETURNS UUID AS $fn1$
BEGIN
  RETURN (SELECT church_id FROM public.profiles WHERE id = auth.uid());
END;
$fn1$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $fn2$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$fn2$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Remover políticas antigas (permissivas) e criar isolamento

-- PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Tenant isolation for profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_isolation" ON profiles;

CREATE POLICY "profiles_isolation" ON profiles
FOR ALL USING (
  id = auth.uid() OR
  church_id = get_my_church_id() OR
  get_my_role() = 'superadmin'
);

-- MEMBERS
DROP POLICY IF EXISTS "Members are viewable by authenticated users" ON members;
DROP POLICY IF EXISTS "Members are insertable by admins and secretaries" ON members;
DROP POLICY IF EXISTS "Members are updatable by admins and secretaries" ON members;
DROP POLICY IF EXISTS "Members are deletable by admins" ON members;
DROP POLICY IF EXISTS "Tenant isolation for members" ON members;

CREATE POLICY "tenant_isolation_members" ON members
FOR ALL USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

-- MINISTRIES
DROP POLICY IF EXISTS "Ministries are viewable" ON ministries;
DROP POLICY IF EXISTS "Ministries are insertable" ON ministries;
DROP POLICY IF EXISTS "Ministries are updatable" ON ministries;
DROP POLICY IF EXISTS "Ministries are deletable" ON ministries;
DROP POLICY IF EXISTS "Tenant isolation for ministries" ON ministries;

CREATE POLICY "tenant_isolation_ministries" ON ministries
FOR ALL USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

-- CELLS
DROP POLICY IF EXISTS "Cells are viewable by authenticated users" ON cells;
DROP POLICY IF EXISTS "Cells are insertable by admins and leaders" ON cells;
DROP POLICY IF EXISTS "Cells are updatable by admins and leaders" ON cells;
DROP POLICY IF EXISTS "Cells are deletable by admins" ON cells;
DROP POLICY IF EXISTS "Tenant isolation for cells" ON cells;

CREATE POLICY "tenant_isolation_cells" ON cells
FOR ALL USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

-- EVENTS
DROP POLICY IF EXISTS "Tenant isolation for events" ON events;

CREATE POLICY "tenant_isolation_events" ON events
FOR ALL USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

-- FINANCIAL_TRANSACTIONS
DROP POLICY IF EXISTS "Financial transactions viewable by admins and treasurers" ON financial_transactions;
DROP POLICY IF EXISTS "Financial transactions insertable by admins and treasurers" ON financial_transactions;
DROP POLICY IF EXISTS "Financial transactions updatable by admins and treasurers" ON financial_transactions;
DROP POLICY IF EXISTS "Financial transactions deletable by admins" ON financial_transactions;
DROP POLICY IF EXISTS "Tenant isolation for financial" ON financial_transactions;

CREATE POLICY "tenant_isolation_financial" ON financial_transactions
FOR ALL USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

-- NOTIFICATIONS (comente se a tabela não existir)
-- ALTER TABLE notifications ADD COLUMN IF NOT EXISTS church_id UUID;
-- DROP POLICY IF EXISTS "tenant_isolation_notifications" ON notifications;
-- CREATE POLICY "tenant_isolation_notifications" ON notifications FOR ALL USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin' OR user_id = auth.uid());

-- Garantir que tables tenham church_id (se não tiverem, policies podem falhar)
-- members, ministries, cells, events, financial_transactions devem ter church_id
ALTER TABLE members ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);
ALTER TABLE ministries ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);
ALTER TABLE cells ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id);

SELECT 'RLS de isolamento multi-tenant aplicado com sucesso.' as status;
