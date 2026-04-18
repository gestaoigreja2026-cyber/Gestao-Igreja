-- =========================================================================
-- APPLY_FULL_SCHEMA.sql - Script mestre para o App Gestão Igreja
-- =========================================================================
-- Execute UMA VEZ no Supabase: SQL Editor > New query > Cole todo o conteúdo > Run
--
-- O que este script faz:
-- 1. Cria extensão e tabela churches (com logo_url e campos usados pelo app)
-- 2. Cria ou ajusta profiles (church_id, full_name, role, avatar_url, etc.)
-- 3. Cria ou ajusta todas as tabelas usadas pelo app, com church_id onde necessário
-- 4. Adiciona colunas faltantes (cells: latitude/longitude; events: registration_fee, tipo ensaio)
-- 5. Cria views financial_summary e member_statistics
-- 6. Configura RLS com funções get_my_church_id() e get_my_role() e políticas por tabela
-- 7. Atualiza o trigger handle_new_user para multi-tenant
--
-- STORAGE (manual): No Supabase, vá em Storage e crie o bucket "church-documents"
-- (público ou privado conforme sua política) para a tela de Uploads funcionar.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1. IGREJAS (dependência base)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS churches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  about TEXT,
  logo_url TEXT,
  president_name TEXT,
  active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  facebook_url TEXT,
  instagram_url TEXT,
  youtube_url TEXT,
  twitter_url TEXT,
  whatsapp TEXT,
  tiktok_url TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  pix_key TEXT,
  pix_key_type TEXT,
  pix_beneficiary_name TEXT,
  pix_city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- 2. PROFILES (ajustes para multi-tenant; tabela pode já existir do Auth)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'membro',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN DEFAULT false;

DO $$
BEGIN
  UPDATE profiles SET full_name = COALESCE(full_name, name, email) WHERE full_name IS NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Constraint de role (aceita todos os roles do app)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'pastor', 'secretario', 'tesoureiro', 'membro', 'lider_celula', 'lider_ministerio', 'aluno', 'congregado', 'superadmin'));

-- ---------------------------------------------------------------------------
-- 3. MEMBERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  marital_status TEXT CHECK (marital_status IN ('solteiro', 'casado', 'divorciado', 'viuvo')),
  gender TEXT CHECK (gender IN ('masculino', 'feminino')),
  baptized BOOLEAN DEFAULT false,
  baptism_date DATE,
  member_since DATE,
  status TEXT CHECK (status IN ('ativo', 'inativo', 'visitante')) DEFAULT 'ativo',
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE members ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 4. MINISTRIES e MINISTRY_MEMBERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ministries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID REFERENCES members(id) ON DELETE SET NULL,
  color TEXT,
  icon TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE ministries ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
ALTER TABLE ministries ADD COLUMN IF NOT EXISTS meetings_count INTEGER;
ALTER TABLE ministries ADD COLUMN IF NOT EXISTS monthly_activity_report TEXT;

CREATE TABLE IF NOT EXISTS ministry_members (
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  role TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (member_id, ministry_id)
);

-- ---------------------------------------------------------------------------
-- 5. EVENTS, EVENT_CHECKLISTS, SERVICE_SCALES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('culto', 'evento', 'reuniao', 'especial', 'ensaio')),
  date DATE NOT NULL,
  time TIME NOT NULL,
  location TEXT,
  responsible_id UUID REFERENCES members(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('planejado', 'confirmado', 'realizado', 'cancelado')) DEFAULT 'planejado',
  estimated_attendees INTEGER,
  actual_attendees INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE events ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_fee NUMERIC(10,2);

CREATE TABLE IF NOT EXISTS event_checklists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  responsible_id UUID REFERENCES members(id) ON DELETE SET NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE event_checklists ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS service_scales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  confirmed BOOLEAN DEFAULT false,
  declined BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE service_scales ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 6. CELLS, CELL_MEMBERS, CELL_REPORTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cells (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID REFERENCES members(id) ON DELETE SET NULL,
  host_id UUID REFERENCES members(id) ON DELETE SET NULL,
  meeting_day TEXT,
  meeting_time TIME,
  address TEXT,
  city TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE cells ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
ALTER TABLE cells ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE cells ADD COLUMN IF NOT EXISTS longitude NUMERIC;

CREATE TABLE IF NOT EXISTS cell_members (
  cell_id UUID REFERENCES cells(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (cell_id, member_id)
);

CREATE TABLE IF NOT EXISTS cell_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cell_id UUID REFERENCES cells(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  members_present INTEGER DEFAULT 0,
  visitors INTEGER DEFAULT 0,
  study_topic TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE cell_reports ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 7. FINANCIAL_TRANSACTIONS, BUDGETS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT CHECK (type IN ('entrada', 'saida')) NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  payment_method TEXT,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(church_id, category, month)
);

-- ---------------------------------------------------------------------------
-- 8. DISCIPLESHIPS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discipleships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  disciple_id UUID REFERENCES members(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES members(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT CHECK (status IN ('em_andamento', 'concluido', 'cancelado')) DEFAULT 'em_andamento',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE discipleships ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 9. DOCUMENTS (Uploads)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INT,
  category TEXT DEFAULT 'study',
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_church_id ON documents(church_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- ---------------------------------------------------------------------------
-- 10. READING PLANS (estrutura usada por readingPlans.service.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reading_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  total_days INTEGER NOT NULL CHECK (total_days > 0),
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS reading_plan_days (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_id UUID REFERENCES reading_plans(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number > 0),
  title TEXT,
  reference TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (plan_id, day_number)
);

CREATE TABLE IF NOT EXISTS reading_plan_progress (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES reading_plans(id) ON DELETE CASCADE,
  current_day INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, plan_id)
);

CREATE TABLE IF NOT EXISTS reading_plan_completions (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES reading_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number > 0),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, plan_id, day_number)
);
CREATE INDEX IF NOT EXISTS idx_reading_plan_completions_plan_user ON reading_plan_completions(plan_id, user_id);
CREATE INDEX IF NOT EXISTS idx_reading_plan_days_plan_id ON reading_plan_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_reading_plans_church_id ON reading_plans(church_id);

-- ---------------------------------------------------------------------------
-- 11. SCHOOLS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schools (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS school_students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS school_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  subject TEXT,
  num_present INTEGER NOT NULL DEFAULT 0,
  num_visitors INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_schools_church_id ON schools(church_id);
CREATE INDEX IF NOT EXISTS idx_school_students_school_id ON school_students(school_id);
CREATE INDEX IF NOT EXISTS idx_school_reports_school_id ON school_reports(school_id);

-- ---------------------------------------------------------------------------
-- 12. PRAYER_REQUESTS, PUSH_SUBSCRIPTIONS, NOTIFICATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_name TEXT,
  prayed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_church_id ON prayer_requests(church_id);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'warning', 'success', 'error')),
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ---------------------------------------------------------------------------
-- 13. VIEWS
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS financial_summary;
CREATE VIEW financial_summary AS
SELECT
  to_char(date, 'YYYY-MM') AS month,
  sum(amount) FILTER (WHERE type = 'entrada') AS total_income,
  sum(amount) FILTER (WHERE type = 'saida') AS total_expenses,
  (sum(amount) FILTER (WHERE type = 'entrada') - sum(amount) FILTER (WHERE type = 'saida')) AS balance
FROM financial_transactions
GROUP BY to_char(date, 'YYYY-MM');

DROP VIEW IF EXISTS member_statistics;
CREATE VIEW member_statistics AS
SELECT
  count(*) AS total_members,
  count(*) FILTER (WHERE status = 'ativo') AS active_members,
  count(*) FILTER (WHERE baptized = true) AS baptized_members,
  count(*) FILTER (WHERE gender = 'masculino') AS male_members,
  count(*) FILTER (WHERE gender = 'feminino') AS female_members,
  count(*) FILTER (WHERE date_part('year', age(birth_date)) < 12) AS children,
  count(*) FILTER (WHERE date_part('year', age(birth_date)) BETWEEN 12 AND 18) AS youth,
  count(*) FILTER (WHERE date_part('year', age(birth_date)) > 18) AS adults
FROM members;

-- ---------------------------------------------------------------------------
-- 14. FUNÇÕES RLS (SECURITY DEFINER para evitar recursão)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_my_church_id() CASCADE;
DROP FUNCTION IF EXISTS get_my_role() CASCADE;

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

-- ---------------------------------------------------------------------------
-- 15. RLS - Habilitar em todas as tabelas
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE discipleships ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_plan_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_plan_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 16. POLÍTICAS RLS
-- ---------------------------------------------------------------------------

-- Churches: superadmin vê todas; usuário vê só a própria igreja
DROP POLICY IF EXISTS "churches_tenant" ON churches;
DROP POLICY IF EXISTS "churches_superadmin_only" ON churches;
DROP POLICY IF EXISTS "SuperAdmin full access churches" ON churches;
DROP POLICY IF EXISTS "Users see own church" ON churches;
DROP POLICY IF EXISTS "Allow public read" ON churches;
DROP POLICY IF EXISTS "churches_superadmin_full" ON churches;
DROP POLICY IF EXISTS "churches_own_church" ON churches;

CREATE POLICY "churches_superadmin_full" ON churches FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin'));

CREATE POLICY "churches_own_church" ON churches FOR SELECT
  USING (id = (SELECT church_id FROM profiles WHERE id = auth.uid()));

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Tenant isolation for profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_isolation" ON profiles;
DROP POLICY IF EXISTS "profiles_own" ON profiles;

CREATE POLICY "profiles_isolation" ON profiles FOR ALL
  USING (id = auth.uid() OR church_id = get_my_church_id() OR get_my_role() = 'superadmin');

-- Members, Ministries, Cells, Events, Financial, Budgets, Documents, Discipleships
-- Padrão: church_id = get_my_church_id() OR superadmin
DROP POLICY IF EXISTS "Members are viewable by authenticated users" ON members;
DROP POLICY IF EXISTS "Members are insertable by admins and secretaries" ON members;
DROP POLICY IF EXISTS "Members are updatable by admins and secretaries" ON members;
DROP POLICY IF EXISTS "Members are deletable by admins" ON members;
DROP POLICY IF EXISTS "Tenant isolation for members" ON members;
CREATE POLICY "tenant_isolation_members" ON members FOR ALL
  USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "Ministries are viewable" ON ministries;
DROP POLICY IF EXISTS "Ministries are insertable" ON ministries;
DROP POLICY IF EXISTS "Ministries are updatable" ON ministries;
DROP POLICY IF EXISTS "Ministries are deletable" ON ministries;
DROP POLICY IF EXISTS "tenant_isolation_ministries" ON ministries;
CREATE POLICY "tenant_isolation_ministries" ON ministries FOR ALL
  USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "Cell members viewable" ON cell_members;
DROP POLICY IF EXISTS "Cell members insertable" ON cell_members;
DROP POLICY IF EXISTS "Cell members deletable" ON cell_members;
DROP POLICY IF EXISTS "cell_members_all" ON cell_members;
CREATE POLICY "cell_members_all" ON cell_members FOR ALL USING (true);

DROP POLICY IF EXISTS "Ministry members viewable" ON ministry_members;
DROP POLICY IF EXISTS "Ministry members insertable" ON ministry_members;
DROP POLICY IF EXISTS "Ministry members deletable" ON ministry_members;
CREATE POLICY "ministry_members_all" ON ministry_members FOR ALL USING (true);

DROP POLICY IF EXISTS "Cells are viewable by authenticated users" ON cells;
DROP POLICY IF EXISTS "Cells are insertable by admins and leaders" ON cells;
DROP POLICY IF EXISTS "Cells are updatable by admins and leaders" ON cells;
DROP POLICY IF EXISTS "Cells are deletable by admins" ON cells;
DROP POLICY IF EXISTS "Tenant isolation for cells" ON cells;
CREATE POLICY "tenant_isolation_cells" ON cells FOR ALL
  USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');
DROP POLICY IF EXISTS "Cell reports viewable" ON cell_reports;
DROP POLICY IF EXISTS "Tenant isolation for cell_reports" ON cell_reports;
CREATE POLICY "tenant_isolation_cell_reports" ON cell_reports FOR ALL
  USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "Financial transactions viewable by admins and treasurers" ON financial_transactions;
DROP POLICY IF EXISTS "Financial transactions insertable by admins and treasurers" ON financial_transactions;
DROP POLICY IF EXISTS "Financial transactions updatable by admins and treasurers" ON financial_transactions;
DROP POLICY IF EXISTS "Financial transactions deletable by admins" ON financial_transactions;
DROP POLICY IF EXISTS "Tenant isolation for financial" ON financial_transactions;
CREATE POLICY "tenant_isolation_financial" ON financial_transactions FOR ALL
  USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "tenant_isolation" ON budgets;
DROP POLICY IF EXISTS "tenant_isolation_budgets" ON budgets;
CREATE POLICY "tenant_isolation_budgets" ON budgets FOR ALL
  USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "Tenant isolation for discipleships" ON discipleships;
CREATE POLICY "tenant_isolation_discipleships" ON discipleships FOR ALL
  USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "tenant_isolation_documents" ON documents;
DROP POLICY IF EXISTS "tenant_isolation" ON documents;
CREATE POLICY "tenant_isolation_documents" ON documents FOR ALL
  USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

-- Documents: policy might have been created with different name
DROP POLICY IF EXISTS "documents_select" ON documents;
DROP POLICY IF EXISTS "documents_insert" ON documents;
DROP POLICY IF EXISTS "documents_update" ON documents;
DROP POLICY IF EXISTS "documents_delete" ON documents;

-- Reading plans
DROP POLICY IF EXISTS "Reading plans viewable by church" ON reading_plans;
DROP POLICY IF EXISTS "Reading plans insert by admins" ON reading_plans;
DROP POLICY IF EXISTS "Reading plans update by admins" ON reading_plans;
DROP POLICY IF EXISTS "Reading plans delete by admins" ON reading_plans;
DROP POLICY IF EXISTS "tenant_isolation_reading_plans" ON reading_plans;
CREATE POLICY "tenant_isolation_reading_plans" ON reading_plans FOR ALL
  USING (church_id IS NULL OR church_id = get_my_church_id() OR get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "Reading plan days viewable" ON reading_plan_days;
DROP POLICY IF EXISTS "Reading plan days manageable" ON reading_plan_days;
CREATE POLICY "reading_plan_days_all" ON reading_plan_days FOR ALL USING (true);

DROP POLICY IF EXISTS "Users manage own progress" ON reading_plan_progress;
CREATE POLICY "reading_plan_progress_own" ON reading_plan_progress FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own completions" ON reading_plan_completions;
DROP POLICY IF EXISTS "reading_plan_completions_policy" ON reading_plan_completions;
CREATE POLICY "reading_plan_completions_own" ON reading_plan_completions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Schools
DROP POLICY IF EXISTS "schools_tenant" ON schools;
CREATE POLICY "schools_tenant" ON schools FOR ALL
  USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "school_students_via_school" ON school_students;
CREATE POLICY "school_students_via_school" ON school_students FOR ALL
  USING (school_id IN (SELECT id FROM schools WHERE church_id = get_my_church_id()) OR get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "school_reports_via_school" ON school_reports;
CREATE POLICY "school_reports_via_school" ON school_reports FOR ALL
  USING (school_id IN (SELECT id FROM schools WHERE church_id = get_my_church_id()) OR get_my_role() = 'superadmin');

-- Prayer requests
DROP POLICY IF EXISTS "Prayer requests viewable by church" ON prayer_requests;
DROP POLICY IF EXISTS "Prayer requests insert by authenticated" ON prayer_requests;
DROP POLICY IF EXISTS "Prayer requests update prayed_count" ON prayer_requests;
DROP POLICY IF EXISTS "Prayer requests delete own or admin" ON prayer_requests;
CREATE POLICY "prayer_requests_select" ON prayer_requests FOR SELECT
  USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');
CREATE POLICY "prayer_requests_insert" ON prayer_requests FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (church_id = get_my_church_id() OR get_my_role() = 'superadmin'));
CREATE POLICY "prayer_requests_update" ON prayer_requests FOR UPDATE
  USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');
CREATE POLICY "prayer_requests_delete" ON prayer_requests FOR DELETE
  USING (requester_id = auth.uid() OR get_my_role() IN ('admin', 'pastor', 'secretario', 'superadmin'));

-- Push subscriptions: usuário só acessa as próprias
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "push_subscriptions_own" ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notifications: permissivo (usuário vê as suas; em produção pode restringir por church_id)
DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid() OR get_my_role() = 'superadmin');

-- Event checklists e service scales (via event church_id)
DROP POLICY IF EXISTS "Tenant isolation for event_checklists" ON event_checklists;
DROP POLICY IF EXISTS "Tenant isolation for events" ON events;
CREATE POLICY "tenant_isolation_events" ON events FOR ALL
  USING (church_id = get_my_church_id() OR get_my_role() = 'superadmin');

DROP POLICY IF EXISTS "Tenant isolation for event_checklists" ON event_checklists;
CREATE POLICY "tenant_isolation_event_checklists" ON event_checklists FOR ALL
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_checklists.event_id AND (e.church_id = get_my_church_id() OR get_my_role() = 'superadmin')));

DROP POLICY IF EXISTS "Tenant isolation for service_scales" ON service_scales;
CREATE POLICY "tenant_isolation_service_scales" ON service_scales FOR ALL
  USING (EXISTS (SELECT 1 FROM events e WHERE e.id = service_scales.event_id AND (e.church_id = get_my_church_id() OR get_my_role() = 'superadmin')));

-- ---------------------------------------------------------------------------
-- 17. TRIGGER handle_new_user (multi-tenant)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_role TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'Usuário');
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'membro');
  IF v_role NOT IN ('admin', 'pastor', 'secretario', 'tesoureiro', 'membro', 'lider_celula', 'lider_ministerio', 'aluno', 'congregado', 'superadmin') THEN
    v_role := 'membro';
  END IF;
  BEGIN
    INSERT INTO public.profiles (id, full_name, role, church_id, email, name)
    VALUES (NEW.id, v_full_name, v_role, NULL, NEW.email, v_full_name);
  EXCEPTION WHEN undefined_column OR not_null_violation THEN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (NEW.id, COALESCE(NEW.email, ''), v_full_name, v_role);
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Fim do script
-- ---------------------------------------------------------------------------
SELECT 'APPLY_FULL_SCHEMA concluído. Crie o bucket Storage "church-documents" em Storage se ainda não existir.' AS status;
