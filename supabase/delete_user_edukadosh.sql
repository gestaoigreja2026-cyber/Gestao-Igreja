-- PASSO 1: Verificar se o usuário existe
-- Execute no SQL Editor. Se retornar uma linha, copie o valor da coluna "id"

SELECT id, email, created_at 
FROM auth.users 
WHERE email ILIKE '%edukadosh%yahoo%' 
   OR email = 'edukadosh@yahoo.com.br';
