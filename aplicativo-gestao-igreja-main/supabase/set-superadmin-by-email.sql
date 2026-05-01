-- ===================================================
-- Define usuário como superadmin pelo e-mail
-- ===================================================
-- Execute no Supabase: SQL Editor > New query
-- Substitua o e-mail abaixo pelo desejado.
-- ===================================================

-- Atualiza o perfil para superadmin (email em minúsculas)
UPDATE public.profiles p
SET role = 'superadmin', church_id = NULL, updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND LOWER(TRIM(u.email)) = 'edukadoshmda@gmail.com';
