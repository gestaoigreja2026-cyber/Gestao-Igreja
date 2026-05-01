-- Corrige erro "Database error deleting user" ao deletar usuários no Supabase Auth
-- Execute no SQL Editor do Supabase

-- 1. Profiles: recria FK com CASCADE
DO $$
DECLARE conname text;
BEGIN
  FOR conname IN 
    SELECT tc.constraint_name FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema='public' AND tc.table_name='profiles' 
      AND tc.constraint_type='FOREIGN KEY' AND kcu.column_name='id'
  LOOP
    EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT IF EXISTS %I', conname);
  END LOOP;
  ALTER TABLE profiles ADD CONSTRAINT profiles_id_auth_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
