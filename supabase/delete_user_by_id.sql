-- PASSO 2: Deletar o usuário edukadosh@yahoo.com.br
-- Execute TUDO de uma vez no SQL Editor (selecione todo o conteúdo e Run)

-- 1. Profile
DELETE FROM public.profiles 
WHERE id IN (SELECT id FROM auth.users WHERE email ILIKE '%edukadosh%yahoo%' LIMIT 1);

-- 2. Auth (ordem obrigatória) - usa subquery com cast para compatibilidade
DELETE FROM auth.refresh_tokens 
WHERE user_id = (SELECT id FROM auth.users WHERE email ILIKE '%edukadosh%yahoo%' LIMIT 1);

DELETE FROM auth.sessions 
WHERE user_id = (SELECT id FROM auth.users WHERE email ILIKE '%edukadosh%yahoo%' LIMIT 1);

DELETE FROM auth.identities 
WHERE user_id = (SELECT id FROM auth.users WHERE email ILIKE '%edukadosh%yahoo%' LIMIT 1);

DELETE FROM auth.users 
WHERE email ILIKE '%edukadosh%yahoo%';
