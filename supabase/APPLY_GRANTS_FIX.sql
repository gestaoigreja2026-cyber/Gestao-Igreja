-- Correção de Permissões (GRANTS) para o Supabase Data API
-- Este script garante que todas as tabelas e views no esquema "public"
-- tenham as permissões corretas para os papéis anon, authenticated e service_role.
-- Isso previne o erro 42501 do PostgREST devido à mudança de segurança do Supabase.

-- 1. Conceder uso do esquema public
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Conceder permissão de leitura (SELECT) para o papel anon em TODAS as tabelas e views
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 3. Conceder permissões totais para os papéis authenticated e service_role em TODAS as tabelas e views
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;

-- 4. Conceder permissões em todas as sequências (necessário para inserts em colunas serial/auto-incremento)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Configurar privilégios padrão para que NOVAS tabelas criadas no futuro herdem essas permissões automaticamente
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

-- Nota: Como o Row Level Security (RLS) já está habilitado em suas tabelas,
-- as políticas (Policies) continuarão protegendo seus dados corretamente.
-- O GRANT apenas permite que a API do Supabase (PostgREST) acesse as tabelas,
-- enquanto o RLS decide QUAIS linhas podem ser lidas ou modificadas.
