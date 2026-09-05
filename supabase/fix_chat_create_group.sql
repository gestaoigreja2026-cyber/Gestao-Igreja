-- ====================================================================
-- SCRIPT DE CORREÇÃO DO CHAT: CRIAÇÃO DE GRUPOS E PERMISSÕES NO SUPABASE
-- Execute este script completo no SQL Editor do Supabase (Dashboard > SQL Editor)
-- ====================================================================

-- 1. Garante colunas necessárias
ALTER TABLE public.chat_conversations 
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;

ALTER TABLE public.chat_starred_messages 
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;

-- 2. Função RPC com SECURITY DEFINER para criação atômica de grupo
CREATE OR REPLACE FUNCTION public.create_chat_group(
  p_name TEXT, 
  p_user_ids UUID[], 
  p_church_id UUID DEFAULT NULL
)
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
  v_conversation_id UUID;
  v_my_id UUID := auth.uid();
  v_church_id UUID := p_church_id;
  v_uid UUID;
BEGIN
  -- Se o church_id não foi passado, busca no perfil do criador
  IF v_church_id IS NULL AND v_my_id IS NOT NULL THEN
    SELECT church_id INTO v_church_id FROM public.profiles WHERE id = v_my_id;
  END IF;

  -- Insere a conversa do tipo grupo
  INSERT INTO public.chat_conversations (name, type, church_id)
  VALUES (TRIM(p_name), 'group', v_church_id)
  RETURNING id INTO v_conversation_id;

  -- Insere o criador como administrador
  IF v_my_id IS NOT NULL THEN
    INSERT INTO public.chat_participants (conversation_id, profile_id, role)
    VALUES (v_conversation_id, v_my_id, 'admin')
    ON CONFLICT (conversation_id, profile_id) DO UPDATE SET role = 'admin';
  END IF;

  -- Insere os outros participantes selecionados
  IF p_user_ids IS NOT NULL THEN
    FOREACH v_uid IN ARRAY p_user_ids LOOP
      IF v_uid IS NOT NULL AND v_uid <> v_my_id THEN
        INSERT INTO public.chat_participants (conversation_id, profile_id, role)
        VALUES (v_conversation_id, v_uid, 'member')
        ON CONFLICT (conversation_id, profile_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- 3. Políticas de inserção para chat_conversations
DROP POLICY IF EXISTS "chat_conversations_insert" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can create conversations in their church" ON public.chat_conversations;

CREATE POLICY "Users can create conversations in their church" 
ON public.chat_conversations FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 4. Políticas de inserção para chat_participants
DROP POLICY IF EXISTS "chat_participants_insert" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join conversations in their church" ON public.chat_participants;

CREATE POLICY "Users can join conversations in their church" 
ON public.chat_participants FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
