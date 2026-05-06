-- Fix para habilitar exclusão de chats no Supabase
-- Rodar este script no SQL Editor do Supabase

-- Permite que usuários apaguem mensagens que eles mesmos enviaram
DROP POLICY IF EXISTS "Usuários podem apagar suas próprias mensagens" ON public.chat_messages;
CREATE POLICY "Usuários podem apagar suas próprias mensagens" 
ON public.chat_messages FOR DELETE 
USING (auth.uid() = sender_id);

-- Permite que administradores do chat apaguem qualquer mensagem da conversa
DROP POLICY IF EXISTS "Admins podem apagar mensagens da conversa" ON public.chat_messages;
CREATE POLICY "Admins podem apagar mensagens da conversa" 
ON public.chat_messages FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE conversation_id = chat_messages.conversation_id 
    AND profile_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Permite que usuários saiam do chat (apaguem sua própria participação)
DROP POLICY IF EXISTS "Usuários podem sair da conversa" ON public.chat_participants;
CREATE POLICY "Usuários podem sair da conversa" 
ON public.chat_participants FOR DELETE 
USING (auth.uid() = profile_id);

-- Permite que administradores removam participantes
DROP POLICY IF EXISTS "Admins podem remover participantes" ON public.chat_participants;
CREATE POLICY "Admins podem remover participantes" 
ON public.chat_participants FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants AS admin_check
    WHERE admin_check.conversation_id = chat_participants.conversation_id 
    AND admin_check.profile_id = auth.uid() 
    AND admin_check.role = 'admin'
  )
);

-- Permite que administradores apaguem a conversa inteira
DROP POLICY IF EXISTS "Admins podem apagar a conversa" ON public.chat_conversations;
CREATE POLICY "Admins podem apagar a conversa" 
ON public.chat_conversations FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE conversation_id = chat_conversations.id 
    AND profile_id = auth.uid() 
    AND role = 'admin'
  )
);
