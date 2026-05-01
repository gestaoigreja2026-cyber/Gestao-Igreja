-- =====================================================
-- IGREJA FICTÍCIA COM 100 MEMBROS + AMBIENTES COMPLETOS
-- Para testar todo o sistema (10 membros com tudo criado)
-- =====================================================
-- Execute no Supabase: SQL Editor > New query > Cole e Execute (Run)
-- Pré-requisito: schema base (schema.sql) aplicado.
-- Se usar multi-tenant: execute antes schools.sql ou apply-rls-isolation.sql
-- para ter tabela churches e coluna church_id onde necessário.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Garantir tabela churches
CREATE TABLE IF NOT EXISTS churches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'churches_slug_key') THEN
    ALTER TABLE churches ADD CONSTRAINT churches_slug_key UNIQUE (slug);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Garantir church_id nas tabelas principais (se não existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='members') THEN
    ALTER TABLE members ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ministries') THEN
    ALTER TABLE ministries ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cells') THEN
    ALTER TABLE cells ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='events') THEN
    ALTER TABLE events ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='financial_transactions') THEN
    ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='discipleships') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='discipleships' AND column_name='church_id') THEN
      ALTER TABLE discipleships ADD COLUMN church_id UUID REFERENCES churches(id) ON DELETE SET NULL;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- UUID fixo da igreja de teste (para reexecução: deletar na ordem das dependências)
DO $$
DECLARE
  cid uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
BEGIN
  DELETE FROM cell_reports WHERE cell_id IN (SELECT id FROM cells WHERE church_id = cid);
  DELETE FROM cell_members WHERE cell_id IN (SELECT id FROM cells WHERE church_id = cid);
  DELETE FROM ministry_members WHERE ministry_id IN (SELECT id FROM ministries WHERE church_id = cid);
  DELETE FROM cells WHERE church_id = cid;
  DELETE FROM ministries WHERE church_id = cid;
  DELETE FROM events WHERE church_id = cid;
  DELETE FROM financial_transactions WHERE church_id = cid;
  DELETE FROM discipleships WHERE church_id = cid;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='school_students') THEN
    DELETE FROM school_students WHERE school_id IN (SELECT id FROM schools WHERE church_id = cid);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='school_reports') THEN
    DELETE FROM school_reports WHERE school_id IN (SELECT id FROM schools WHERE church_id = cid);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='schools') THEN
    DELETE FROM schools WHERE church_id = cid;
  END IF;
  DELETE FROM members WHERE church_id = cid;
  DELETE FROM churches WHERE id = cid;
END $$;

-- 3) Inserir igreja fictícia
INSERT INTO churches (id, name, slug)
VALUES (
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'Igreja Batista Esperança (Teste 100)',
  'igreja-teste-100'
);

-- 4) Inserir 100 membros (dados variados)
INSERT INTO members (
  name, email, phone, birth_date, address, city, state, zip_code,
  marital_status, gender, baptized, baptism_date, member_since, status, notes, church_id
)
SELECT
  'Membro ' || i,
  'membro' || i || '@igreja-teste.local',
  '(11) 9' || lpad((9000 + (i % 1000))::text, 4, '0') || '-0000',
  (current_date - (18 + (i % 50)) * 365)::date,
  'Rua Teste, ' || (i % 100) || ' - Bairro Central',
  'São Paulo',
  'SP',
  lpad((1000 + (i % 900))::text, 5, '0') || '-000',
  (array['solteiro','casado','casado','divorciado','viuvo'])[1 + (i % 5)],
  (array['masculino','feminino'])[1 + (i % 2)],
  (i % 3) <> 0,
  case when (i % 3) <> 0 then (current_date - (i % 10) * 365)::date else null end,
  (current_date - (i % 5) * 365)::date,
  'ativo',
  case when i <= 10 then 'Membro de teste com ambiente completo #' || i else null end,
  'a0000000-0000-4000-8000-000000000001'::uuid
FROM generate_series(1, 100) i;

-- 5) Criar ministérios (líderes = primeiros 10 membros)
DO $$
DECLARE
  cid uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
  mid uuid;
  lid uuid;
  i int;
  names text[] := ARRAY['Louvor','Crianças','Jovens','Mulheres','Homens','Evangelismo','Intercessão','Diaconia','Mídia','Receção'];
  colors text[] := ARRAY['#E91E63','#2196F3','#4CAF50','#9C27B0','#FF9800','#F44336','#795548','#607D8B','#00BCD4','#8BC34A'];
  icons text[] := ARRAY['music','users','zap','heart','target','send','shield','package','film','smile'];
BEGIN
  FOR i IN 1..10 LOOP
    SELECT id INTO lid FROM members WHERE church_id = cid ORDER BY created_at LIMIT 1 OFFSET (i-1);
    IF lid IS NOT NULL THEN
      INSERT INTO ministries (name, description, leader_id, color, icon, active, church_id)
      VALUES (names[i], 'Ministério de teste #' || i, lid, colors[i], icons[i], true, cid);
    END IF;
  END LOOP;
END $$;

-- 6) Células (3 células; líder e anfitrião entre os 10 primeiros)
DO $$
DECLARE
  cid uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
  l1 uuid; l2 uuid; l3 uuid; h1 uuid; h2 uuid; h3 uuid;
  cell1 uuid; cell2 uuid; cell3 uuid;
BEGIN
  SELECT id INTO l1 FROM members WHERE church_id = cid ORDER BY created_at LIMIT 1 OFFSET 0;
  SELECT id INTO h1 FROM members WHERE church_id = cid ORDER BY created_at LIMIT 1 OFFSET 1;
  SELECT id INTO l2 FROM members WHERE church_id = cid ORDER BY created_at LIMIT 1 OFFSET 2;
  SELECT id INTO h2 FROM members WHERE church_id = cid ORDER BY created_at LIMIT 1 OFFSET 3;
  SELECT id INTO l3 FROM members WHERE church_id = cid ORDER BY created_at LIMIT 1 OFFSET 4;
  SELECT id INTO h3 FROM members WHERE church_id = cid ORDER BY created_at LIMIT 1 OFFSET 5;
  IF l1 IS NOT NULL AND h1 IS NOT NULL THEN
    INSERT INTO cells (name, description, leader_id, host_id, meeting_day, meeting_time, address, city, active, church_id)
    VALUES ('Célula Centro', 'Célula região central', l1, h1, 'Quarta', '19:30', 'Rua A, 100', 'São Paulo', true, cid);
  END IF;
  IF l2 IS NOT NULL AND h2 IS NOT NULL THEN
    INSERT INTO cells (name, description, leader_id, host_id, meeting_day, meeting_time, address, city, active, church_id)
    VALUES ('Célula Norte', 'Célula zona norte', l2, h2, 'Quinta', '20:00', 'Av. Norte, 200', 'São Paulo', true, cid);
  END IF;
  IF l3 IS NOT NULL AND h3 IS NOT NULL THEN
    INSERT INTO cells (name, description, leader_id, host_id, meeting_day, meeting_time, address, city, active, church_id)
    VALUES ('Célula Sul', 'Célula zona sul', l3, h3, 'Sexta', '19:00', 'Rua Sul, 300', 'São Paulo', true, cid);
  END IF;
END $$;

-- 7) Vincular membros às células (10 membros por célula nas 3 células)
DO $$
DECLARE
  cid uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
  mem_ids uuid[];
  cell_ids uuid[];
  i int; j int;
BEGIN
  SELECT array_agg(id ORDER BY created_at) INTO mem_ids FROM (SELECT id, created_at FROM members WHERE church_id = cid ORDER BY created_at LIMIT 30) t;
  SELECT array_agg(id ORDER BY created_at) INTO cell_ids FROM cells WHERE church_id = cid;
  IF mem_ids IS NOT NULL AND cell_ids IS NOT NULL AND array_length(mem_ids,1) >= 30 THEN
    FOR i IN 1..least(array_length(cell_ids,1), 3) LOOP
      FOR j IN 1..10 LOOP
        INSERT INTO cell_members (cell_id, member_id)
        VALUES (cell_ids[i], mem_ids[(i-1)*10 + j])
        ON CONFLICT (cell_id, member_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END IF;
END $$;

-- 8) Eventos (cultos e reuniões; responsáveis = primeiros 10)
DO $$
DECLARE
  cid uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
  rid uuid;
  i int;
BEGIN
  SELECT id INTO rid FROM members WHERE church_id = cid ORDER BY created_at LIMIT 1;
  IF rid IS NOT NULL THEN
    FOR i IN 0..6 LOOP
      INSERT INTO events (title, description, type, date, time, location, responsible_id, status, estimated_attendees, church_id)
      VALUES (
        'Culto de Celebração',
        'Culto dominical',
        'culto',
        current_date + (i * 7),
        '10:00',
        'Sede Central',
        rid,
        'confirmado',
        150,
        cid
      );
      INSERT INTO events (title, description, type, date, time, location, responsible_id, status, estimated_attendees, church_id)
      VALUES (
        'Reunião de Oração',
        'Reunião semanal de oração',
        'reuniao',
        current_date + (i * 7) + 2,
        '19:00',
        'Sede Central',
        rid,
        'confirmado',
        40,
        cid
      );
    END LOOP;
  END IF;
END $$;

-- 9) Transações financeiras (entradas e saídas; alguns com member_id dos 10)
DO $$
DECLARE
  cid uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
  mid uuid;
  i int;
BEGIN
  SELECT id INTO mid FROM members WHERE church_id = cid ORDER BY created_at LIMIT 1;
  FOR i IN 1..12 LOOP
    INSERT INTO financial_transactions (type, category, amount, date, description, payment_method, member_id, church_id)
    VALUES ('entrada', 'Dízimos e ofertas', 5000 + (i * 200), (date_trunc('month', current_date) + (i-1) * interval '1 month')::date, 'Ofertas do mês', 'Dinheiro', mid, cid);
    INSERT INTO financial_transactions (type, category, amount, date, description, payment_method, church_id)
    VALUES ('saida', 'Contas e manutenção', 2000 + (i * 100), (date_trunc('month', current_date) + (i-1) * interval '1 month')::date, 'Despesas gerais', 'Transferência', cid);
    INSERT INTO financial_transactions (type, category, amount, date, description, payment_method, church_id)
    VALUES ('saida', 'Missões', 500, (date_trunc('month', current_date) + (i-1) * interval '1 month')::date + 5, 'Apoio missionário', 'Transferência', cid);
  END LOOP;
END $$;

-- 10) Vincular membros a ministérios (primeiros 10 em todos os ministérios)
DO $$
DECLARE
  cid uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
  mem_ids uuid[];
  min_ids uuid[];
  i int; j int;
BEGIN
  SELECT array_agg(id ORDER BY created_at) INTO mem_ids FROM (SELECT id, created_at FROM members WHERE church_id = cid ORDER BY created_at LIMIT 10) t;
  SELECT array_agg(id ORDER BY name) INTO min_ids FROM ministries WHERE church_id = cid;
  IF mem_ids IS NOT NULL AND min_ids IS NOT NULL THEN
    FOR i IN 1..array_length(mem_ids,1) LOOP
      FOR j IN 1..array_length(min_ids,1) LOOP
        INSERT INTO ministry_members (member_id, ministry_id, role)
        VALUES (mem_ids[i], min_ids[j], 'membro')
        ON CONFLICT (member_id, ministry_id) DO NOTHING;
      END LOOP;
    END LOOP;
  END IF;
END $$;

-- 11) Discipulados (mentor e discípulo entre os 10)
DO $$
DECLARE
  cid uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
  m1 uuid; m2 uuid; m3 uuid; m4 uuid; m5 uuid;
BEGIN
  SELECT id INTO m1 FROM members WHERE church_id = cid ORDER BY created_at LIMIT 1 OFFSET 0;
  SELECT id INTO m2 FROM members WHERE church_id = cid ORDER BY created_at LIMIT 1 OFFSET 1;
  SELECT id INTO m3 FROM members WHERE church_id = cid ORDER BY created_at LIMIT 1 OFFSET 2;
  SELECT id INTO m4 FROM members WHERE church_id = cid ORDER BY created_at LIMIT 1 OFFSET 3;
  SELECT id INTO m5 FROM members WHERE church_id = cid ORDER BY created_at LIMIT 1 OFFSET 4;
  IF m1 IS NOT NULL AND m2 IS NOT NULL THEN INSERT INTO discipleships (disciple_id, mentor_id, start_date, status, church_id) VALUES (m2, m1, current_date - 90, 'em_andamento', cid); END IF;
  IF m1 IS NOT NULL AND m3 IS NOT NULL THEN INSERT INTO discipleships (disciple_id, mentor_id, start_date, status, church_id) VALUES (m3, m1, current_date - 60, 'em_andamento', cid); END IF;
  IF m2 IS NOT NULL AND m4 IS NOT NULL THEN INSERT INTO discipleships (disciple_id, mentor_id, start_date, status, church_id) VALUES (m4, m2, current_date - 45, 'em_andamento', cid); END IF;
  IF m2 IS NOT NULL AND m5 IS NOT NULL THEN INSERT INTO discipleships (disciple_id, mentor_id, start_date, status, church_id) VALUES (m5, m2, current_date - 30, 'em_andamento', cid); END IF;
END $$;

-- 12) Relatórios de células (só colunas que existem na sua tabela cell_reports)
DO $$
DECLARE
  cell_ids uuid[];
  i int; cid uuid;
  cols text[];
  has_mp boolean; has_vis boolean; has_st boolean; has_notes boolean; has_np boolean;
BEGIN
  SELECT array_agg(column_name) INTO cols FROM information_schema.columns WHERE table_schema='public' AND table_name='cell_reports';
  has_mp := cols @> ARRAY['members_present'];
  has_np := cols @> ARRAY['num_present'];
  has_vis := cols @> ARRAY['visitors'];
  has_st := cols @> ARRAY['study_topic'];
  has_notes := cols @> ARRAY['notes'];
  SELECT array_agg(id) INTO cell_ids FROM cells WHERE church_id = 'a0000000-0000-4000-8000-000000000001'::uuid;
  IF cell_ids IS NOT NULL AND cols IS NOT NULL THEN
    FOREACH cid IN ARRAY cell_ids LOOP
      FOR i IN 0..3 LOOP
        IF has_mp AND has_vis AND has_st AND has_notes THEN
          INSERT INTO cell_reports (cell_id, date, members_present, visitors, study_topic, notes)
          VALUES (cid, current_date - (i * 7), 6 + (i % 4), (i % 2), 'Estudo bíblico – tema ' || i, 'Relatório automático de teste');
        ELSIF has_np AND has_st AND has_notes THEN
          INSERT INTO cell_reports (cell_id, date, num_present, study_topic, notes)
          VALUES (cid, current_date - (i * 7), 6 + (i % 4), 'Estudo bíblico – tema ' || i, 'Relatório automático de teste');
        ELSIF has_notes THEN
          INSERT INTO cell_reports (cell_id, date, notes)
          VALUES (cid, current_date - (i * 7), 'Relatório automático de teste');
        ELSE
          INSERT INTO cell_reports (cell_id, date)
          VALUES (cid, current_date - (i * 7));
        END IF;
      END LOOP;
    END LOOP;
  END IF;
END $$;

-- 13) Escolas e alunos (se as tabelas existirem)
DO $$
DECLARE
  cid uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
  mem_ids uuid[];
  sid uuid;
  i int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='schools') THEN RETURN; END IF;
  INSERT INTO schools (church_id, name, description, active)
  VALUES (cid, 'EDB – Escola de Bíblia', 'Curso básico de discipulado', true);
  GET DIAGNOSTICS i = ROW_COUNT;
  SELECT id INTO sid FROM schools WHERE church_id = cid ORDER BY created_at DESC LIMIT 1;
  IF sid IS NOT NULL THEN
    SELECT array_agg(id ORDER BY created_at) INTO mem_ids FROM (SELECT id, created_at FROM members WHERE church_id = cid ORDER BY created_at LIMIT 10) t;
    IF mem_ids IS NOT NULL THEN
      FOR i IN 1..array_length(mem_ids,1) LOOP
        INSERT INTO school_students (school_id, member_id, name, email, notes)
        SELECT sid, mem_ids[i], m.name, m.email, 'Aluno teste #' || i
        FROM members m WHERE m.id = mem_ids[i]
        ON CONFLICT (school_id, member_id) WHERE member_id IS NOT NULL DO NOTHING;
      END LOOP;
    END IF;
  END IF;
  INSERT INTO schools (church_id, name, description, active)
  VALUES (cid, 'ETED – Escola de Líderes', 'Formação de líderes', true);
  SELECT id INTO sid FROM schools WHERE church_id = cid AND name = 'ETED – Escola de Líderes' LIMIT 1;
  IF sid IS NOT NULL AND mem_ids IS NOT NULL THEN
    FOR i IN 1..least(5, array_length(mem_ids,1)) LOOP
      INSERT INTO school_students (school_id, member_id, name, email, notes)
      SELECT sid, mem_ids[i], m.name, m.email, 'Líder em formação'
      FROM members m WHERE m.id = mem_ids[i]
      ON CONFLICT (school_id, member_id) WHERE member_id IS NOT NULL DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- Resumo (para conferência)
DO $$
DECLARE
  cid uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
  nchurch int; nmem int; nmin int; ncell int; nevt int; nfin int; ndisc int;
BEGIN
  SELECT count(*) INTO nchurch FROM churches WHERE id = cid;
  SELECT count(*) INTO nmem FROM members WHERE church_id = cid;
  SELECT count(*) INTO nmin FROM ministries WHERE church_id = cid;
  SELECT count(*) INTO ncell FROM cells WHERE church_id = cid;
  SELECT count(*) INTO nevt FROM events WHERE church_id = cid;
  SELECT count(*) INTO nfin FROM financial_transactions WHERE church_id = cid;
  SELECT count(*) INTO ndisc FROM discipleships WHERE church_id = cid;
  RAISE NOTICE 'Igreja: % | Membros: % | Ministérios: % | Células: % | Eventos: % | Transações: % | Discipulados: %',
    nchurch, nmem, nmin, ncell, nevt, nfin, ndisc;
END $$;
