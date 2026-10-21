-- Função pública segura para contagem de igrejas da promoção
-- Permite que visitantes da Landing Page vejam as vagas restantes da promoção
-- sem expor nenhum dado confidencial das igrejas cadastradas.
CREATE OR REPLACE FUNCTION public.get_church_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM churches;
$$;

GRANT EXECUTE ON FUNCTION public.get_church_count() TO anon, authenticated, service_role;
