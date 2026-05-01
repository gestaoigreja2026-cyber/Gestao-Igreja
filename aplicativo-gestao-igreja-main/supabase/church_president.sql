-- Adiciona colunas para Página Institucional (dados da igreja)
ALTER TABLE churches ADD COLUMN IF NOT EXISTS president_name TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS about TEXT;
