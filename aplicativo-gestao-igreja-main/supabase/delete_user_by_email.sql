-- Deleta o usuário edukadosh@yahoo.com.br e todos os dados vinculados
-- Execute no SQL Editor do Supabase

DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'edukadosh@yahoo.com.br' LIMIT 1;
  IF uid IS NULL THEN
    RAISE NOTICE 'Usuário não encontrado.';
    RETURN;
  END IF;

  -- 1. Deletar profile (pode bloquear o delete em auth.users)
  DELETE FROM public.profiles WHERE id = uid;
  
  -- 2-5. Tabelas opcionais (usa to_regclass para evitar erro de sintaxe)
  IF to_regclass('public.notifications') IS NOT NULL THEN
    DELETE FROM public.notifications WHERE user_id = uid;
  END IF;
  IF to_regclass('public.push_subscriptions') IS NOT NULL THEN
    DELETE FROM public.push_subscriptions WHERE user_id = uid;
  END IF;
  IF to_regclass('public.reading_plan_completions') IS NOT NULL THEN
    DELETE FROM public.reading_plan_completions WHERE user_id = uid;
  END IF;
  IF to_regclass('public.dashboard_config') IS NOT NULL THEN
    DELETE FROM public.dashboard_config WHERE user_id = uid;
  END IF;

  -- 6-8. Set null em colunas que podem referenciar o usuário (ignora se coluna/tabela não existir)
  BEGIN
    UPDATE public.church_subscription_payments SET registered_by = NULL WHERE registered_by = uid;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    UPDATE public.prayer_requests SET requester_id = NULL WHERE requester_id = uid;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    UPDATE public.documents SET uploaded_by = NULL WHERE uploaded_by = uid;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 9. Deletar do auth schema (ordem: refresh_tokens, sessions, identities, users)
  DELETE FROM auth.refresh_tokens WHERE user_id = uid;
  DELETE FROM auth.sessions WHERE user_id = uid;
  DELETE FROM auth.identities WHERE user_id = uid;
  DELETE FROM auth.users WHERE id = uid;
  
  RAISE NOTICE 'Usuário edukadosh@yahoo.com.br deletado com sucesso.';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erro: %', SQLERRM;
END $$;
