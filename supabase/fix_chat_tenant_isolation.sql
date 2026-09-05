-- Isola o chat por igreja. Execute no SQL Editor do Supabase.

ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;
ALTER TABLE public.chat_starred_messages
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;

UPDATE public.chat_conversations c
SET church_id = p.church_id
FROM public.chat_participants cp
JOIN public.profiles p ON p.id = cp.profile_id
WHERE c.id = cp.conversation_id AND c.church_id IS NULL AND p.church_id IS NOT NULL;

UPDATE public.chat_messages m
SET church_id = c.church_id
FROM public.chat_conversations c
WHERE c.id = m.conversation_id AND m.church_id IS NULL AND c.church_id IS NOT NULL;

UPDATE public.chat_starred_messages sm
SET church_id = cm.church_id
FROM public.chat_messages cm
WHERE sm.message_id = cm.id AND sm.church_id IS NULL AND cm.church_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS chat_conversations_church_id_idx ON public.chat_conversations(church_id);
CREATE INDEX IF NOT EXISTS chat_messages_church_id_idx ON public.chat_messages(church_id);
CREATE INDEX IF NOT EXISTS chat_starred_messages_church_id_idx ON public.chat_starred_messages(church_id);

-- Evita recursão entre as políticas de conversas e participantes.
CREATE OR REPLACE FUNCTION public.chat_user_can_access_conversation(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    JOIN public.chat_participants cp ON cp.conversation_id = c.id
    WHERE c.id = p_conversation_id
      AND c.church_id = public.get_my_church_id()
      AND cp.profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.chat_user_belongs_to_my_church(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_profile_id AND church_id = public.get_my_church_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.chat_conversation_belongs_to_my_church(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_conversations
    WHERE id = p_conversation_id AND church_id = public.get_my_church_id()
  );
$$;

DROP POLICY IF EXISTS "Users can view conversations they are part of" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_select" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_insert" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can view conversations in their church" ON public.chat_conversations;
CREATE POLICY "Users can view conversations in their church" ON public.chat_conversations FOR SELECT
USING (church_id = public.get_my_church_id() AND public.chat_user_can_access_conversation(id));

DROP POLICY IF EXISTS "Users can create conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can create conversations in their church" ON public.chat_conversations;
CREATE POLICY "Users can create conversations in their church" ON public.chat_conversations FOR INSERT
WITH CHECK (church_id = public.get_my_church_id());

DROP POLICY IF EXISTS "Users can delete conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can delete conversations in their church" ON public.chat_conversations;
CREATE POLICY "Users can delete conversations in their church" ON public.chat_conversations FOR DELETE
USING (church_id = public.get_my_church_id() AND public.chat_user_can_access_conversation(id));

DROP POLICY IF EXISTS "Users can view participants" ON public.chat_participants;
DROP POLICY IF EXISTS "chat_participants_select" ON public.chat_participants;
DROP POLICY IF EXISTS "chat_participants_insert" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view participants in their church" ON public.chat_participants;
CREATE POLICY "Users can view participants in their church" ON public.chat_participants FOR SELECT
USING (public.chat_conversation_belongs_to_my_church(conversation_id));

DROP POLICY IF EXISTS "Users can join conversations" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join conversations in their church" ON public.chat_participants;
CREATE POLICY "Users can join conversations in their church" ON public.chat_participants FOR INSERT
WITH CHECK (
  public.chat_conversation_belongs_to_my_church(conversation_id)
  AND public.chat_user_belongs_to_my_church(profile_id)
);
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their church conversations" ON public.chat_messages;
CREATE POLICY "Users can view messages in their church conversations" ON public.chat_messages FOR SELECT
USING (church_id = public.get_my_church_id() AND public.chat_user_can_access_conversation(conversation_id));

DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can send messages in their church" ON public.chat_messages;
CREATE POLICY "Participants can send messages in their church" ON public.chat_messages FOR INSERT
WITH CHECK (sender_id = auth.uid() AND church_id = public.get_my_church_id() AND public.chat_user_can_access_conversation(conversation_id));

DROP POLICY IF EXISTS "Participants can update messages" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_update" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can update messages in their church" ON public.chat_messages;
CREATE POLICY "Participants can update messages in their church" ON public.chat_messages FOR UPDATE
USING (church_id = public.get_my_church_id() AND public.chat_user_can_access_conversation(conversation_id))
WITH CHECK (church_id = public.get_my_church_id());

DROP POLICY IF EXISTS "Participants can delete messages" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can delete messages in their church" ON public.chat_messages;
CREATE POLICY "Participants can delete messages in their church" ON public.chat_messages FOR DELETE
USING (church_id = public.get_my_church_id() AND public.chat_user_can_access_conversation(conversation_id));

-- RLS para chat_starred_messages
DROP POLICY IF EXISTS "Users can view starred messages in their church" ON public.chat_starred_messages;
DROP POLICY IF EXISTS "chat_starred_select" ON public.chat_starred_messages;
DROP POLICY IF EXISTS "Users can view starred messages in their church" ON public.chat_starred_messages;
CREATE POLICY "Users can view starred messages in their church" ON public.chat_starred_messages FOR SELECT
USING (church_id = public.get_my_church_id() AND profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can star messages in their church" ON public.chat_starred_messages;
DROP POLICY IF EXISTS "chat_starred_insert" ON public.chat_starred_messages;
DROP POLICY IF EXISTS "Users can star messages in their church" ON public.chat_starred_messages;
CREATE POLICY "Users can star messages in their church" ON public.chat_starred_messages FOR INSERT
WITH CHECK (church_id = public.get_my_church_id() AND profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can unstar messages in their church" ON public.chat_starred_messages;
DROP POLICY IF EXISTS "chat_starred_delete" ON public.chat_starred_messages;
DROP POLICY IF EXISTS "Users can unstar messages in their church" ON public.chat_starred_messages;
CREATE POLICY "Users can unstar messages in their church" ON public.chat_starred_messages FOR DELETE
USING (church_id = public.get_my_church_id() AND profile_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_or_create_chat(other_user_id UUID, p_church_id UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conversation_id UUID;
  v_my_id UUID := auth.uid();
  v_church_id UUID := COALESCE(p_church_id, public.get_my_church_id());
BEGIN
  IF v_church_id IS NULL OR v_church_id <> public.get_my_church_id() THEN
    RAISE EXCEPTION 'Igreja inválida para esta conversa';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = other_user_id AND church_id = v_church_id) THEN
    RAISE EXCEPTION 'Usuário não pertence à mesma igreja';
  END IF;
  SELECT p1.conversation_id INTO v_conversation_id
  FROM public.chat_participants p1
  JOIN public.chat_participants p2 ON p1.conversation_id = p2.conversation_id
  JOIN public.chat_conversations c ON c.id = p1.conversation_id
  WHERE c.type = 'private' AND c.church_id = v_church_id AND p1.profile_id = v_my_id AND p2.profile_id = other_user_id
  LIMIT 1;
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.chat_conversations (type, church_id) VALUES ('private', v_church_id) RETURNING id INTO v_conversation_id;
    INSERT INTO public.chat_participants (conversation_id, profile_id) VALUES (v_conversation_id, v_my_id), (v_conversation_id, other_user_id);
  END IF;
  RETURN v_conversation_id;
END;
$$;