-- Garante que profiles tem avatar_url (para foto de perfil persistir)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
