-- Adiciona coluna logo_url na tabela churches (usada pelo app ao criar/editar igreja)
ALTER TABLE churches ADD COLUMN IF NOT EXISTS logo_url TEXT;

SELECT 'Coluna logo_url adicionada à tabela churches.' AS status;
