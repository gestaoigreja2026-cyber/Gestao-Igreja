-- Adiciona as colunas para o banner e a cor de tema da igreja
ALTER TABLE churches ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS theme_color TEXT;

-- Atualizar o cache de schema da API (PostgREST)
NOTIFY pgrst, 'reload schema';
