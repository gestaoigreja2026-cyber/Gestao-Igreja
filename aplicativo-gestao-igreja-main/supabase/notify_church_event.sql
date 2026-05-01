-- Envia notificação para todos os usuários da igreja sobre um evento
-- Execute no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION notify_church_about_event(
  p_church_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
  prof RECORD;
BEGIN
  FOR prof IN SELECT id FROM profiles WHERE church_id = p_church_id
  LOOP
    INSERT INTO notifications (user_id, church_id, title, message, type, read, link)
    VALUES (prof.id, p_church_id, p_title, p_message, 'info', false, p_link);
    inserted_count := inserted_count + 1;
  END LOOP;
  RETURN inserted_count;
END;
$$;
