-- Auto-confirmar email no cadastro (contorna a exigência de confirmação)
-- Execute no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION public.auto_confirm_email_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Define email_confirmed_at na criação do usuário
  -- Assim o usuário pode fazer login imediatamente sem clicar no link
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  RETURN NEW;
END;
$$;

-- Remove o trigger se já existir (para poder recriar)
DROP TRIGGER IF EXISTS auto_confirm_email_on_signup ON auth.users;

-- Cria o trigger
CREATE TRIGGER auto_confirm_email_on_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_email_on_signup();
