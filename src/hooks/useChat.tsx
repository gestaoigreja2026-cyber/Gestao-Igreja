import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatProfile {
  id: string;
  name: string;
  avatar_url?: string;
  email?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'file';
  file_url?: string;
  is_announcement?: boolean;
  pinned_at?: string;
  is_starred?: boolean;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  type: 'private' | 'group' | 'cell' | 'ministry' | 'leaders' | 'prayers' | 'announcements';
  name?: string;
  description?: string;
  entity_id?: string;
  created_at: string;
  updated_at: string;
  participants: ChatProfile[];
  last_message?: ChatMessage;
  unread_count: number;
}

interface ChatContextType {
  currentUser: { id: string } | null;
  conversations: ChatConversation[];
  isLoadingConversations: boolean;
  useMessages: (conversationId: string | null) => UseQueryResult<ChatMessage[], Error>;
  sendMessage: (args: { conversationId: string; content: string; type?: 'text' | 'image' | 'file'; fileUrl?: string }) => Promise<any>;
  uploadFile: (file: File | Blob, path: string) => Promise<string>;
  isSending: boolean;
  searchUsers: ChatProfile[];
  startChat: (otherUserId: string) => Promise<string>;
  isStartingChat: boolean;
  pinMessage: (args: { messageId: string; pin: boolean }) => Promise<any>;
  createGroup: (args: { name: string; userIds: string[] }) => Promise<string>;
  isCreatingGroup: boolean;
  starMessage: (args: { messageId: string; star: boolean }) => Promise<any>;
  starredMessages: ChatMessage[];
  clearMessages: (conversationId: string) => Promise<string>;
  deleteConversation: (conversationId: string) => Promise<string>;
  deleteMessage: (messageId: string) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  createStandardRooms: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { churchId, viewingChurch, user } = useAuth();
  const effectiveChurchId = viewingChurch?.id ?? churchId ?? user?.churchId;
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(user?.id ? { id: user.id } : null);

  useEffect(() => {
    if (user?.id) {
      setCurrentUser({ id: user.id });
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setCurrentUser({ id: data.session.user.id });
      } else if (user?.id) {
        setCurrentUser({ id: user.id });
      }
    });
  }, [user?.id]);

  useEffect(() => {
    if (!currentUser || !effectiveChurchId) return;

    const channel = supabase.channel(`chat-church-${effectiveChurchId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: currentUser.id },
      }
    })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `church_id=eq.${effectiveChurchId}`
      }, (payload) => {
        const newMessage = payload.new as ChatMessage;
        
        // Show notification if app is in background or not looking at this chat
        if (document.hidden && newMessage.sender_id !== currentUser.id) {
          showNotification('Nova mensagem', {
            body: newMessage.content,
            icon: '/logo-192.png'
          });
        }

        queryClient.invalidateQueries({ queryKey: ['chat-messages', effectiveChurchId] });
        queryClient.invalidateQueries({ queryKey: ['chat-conversations', effectiveChurchId] });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `church_id=eq.${effectiveChurchId}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-messages', effectiveChurchId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, queryClient, effectiveChurchId]);

  const uploadFile = async (file: File | Blob, path: string): Promise<string> => {
    const fileExt = path.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${currentUser!.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat_attachments')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('chat_attachments')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const conversationsQuery = useQuery({
    queryKey: ['chat-conversations', effectiveChurchId],
    queryFn: async (): Promise<ChatConversation[]> => {
      if (!currentUser || !effectiveChurchId) return [];
      try {
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('conversation_id')
          .eq('profile_id', currentUser.id);
        
        const ids = participants?.map(p => p.conversation_id) || [];
        if (ids.length === 0) return [];

        const { data: convs, error } = await supabase
          .from('chat_conversations')
          .select(`
            *,
            participants:chat_participants(profile:profiles(*)),
            messages:chat_messages(*)
          `)
          .in('id', ids)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        return convs.map(c => ({
          ...c,
          participants: (c.participants || [])
            .map((p: any) => p.profile ? ({
              id: p.profile.id,
              name: p.profile.full_name || p.profile.name || 'Membro',
              avatar_url: p.profile.avatar_url,
              email: p.profile.email
            }) : null)
            .filter(Boolean),
          last_message: c.messages?.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0],
          unread_count: 0
        }));
      } catch (err) {
        console.error('Chat error:', err);
        return [];
      }
    },
    enabled: !!currentUser,
  });

  const useMessages = (conversationId: string | null) => useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content, type = 'text', fileUrl }: { conversationId: string; content: string; type?: 'text' | 'image' | 'file'; fileUrl?: string }) => {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({ 
          conversation_id: conversationId, 
          content, 
          sender_id: currentUser!.id,
          type,
          file_url: fileUrl
        })
        .select().single();
      if (error) throw error;
      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    }
  });

  const startChatMutation = useMutation({
    mutationFn: async (otherUserId: string) => {
      const myId = currentUser?.id || (await supabase.auth.getUser()).data.user?.id;
      if (!myId) throw new Error('Usuário não autenticado.');

      // 1. Tentar RPC primeiro
      try {
        const { data, error } = await supabase.rpc('get_or_create_chat', { 
          other_user_id: otherUserId, 
          p_church_id: effectiveChurchId || '00000000-0000-0000-0000-000000000000' 
        });
        if (!error && data) return data;
      } catch (rpcErr) {
        console.warn('RPC get_or_create_chat falhou, usando fallback direto:', rpcErr);
      }

      // 2. Fallback direto: verificar se já existe conversa privada entre os dois
      try {
        const { data: myConvs } = await supabase
          .from('chat_participants')
          .select('conversation_id')
          .eq('profile_id', myId);

        const myConvIds = (myConvs || []).map((c: any) => c.conversation_id);

        if (myConvIds.length > 0) {
          const { data: existing } = await supabase
            .from('chat_participants')
            .select('conversation_id')
            .in('conversation_id', myConvIds)
            .eq('profile_id', otherUserId);

          if (existing && existing.length > 0) {
            return existing[0].conversation_id;
          }
        }

        // 3. Criar nova conversa privada diretamente
        const { data: newConv, error: convErr } = await (supabase.from('chat_conversations') as any)
          .insert({ type: 'private' })
          .select()
          .single();

        if (convErr || !newConv) throw convErr || new Error('Não foi possível criar conversa.');

        // 4. Inserir participantes
        const participants = [
          { conversation_id: newConv.id, profile_id: myId, role: 'member' },
          { conversation_id: newConv.id, profile_id: otherUserId, role: 'member' }
        ];

        await (supabase.from('chat_participants') as any).insert(participants);

        return newConv.id;
      } catch (err: any) {
        console.error('Erro ao criar conversa privada:', err);
        throw err;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
  });

  const pinMessageMutation = useMutation({
    mutationFn: async ({ messageId, pin }: { messageId: string; pin: boolean }) => {
      await supabase.from('chat_messages').update({ pinned_at: pin ? new Date().toISOString() : null }).eq('id', messageId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
  });

  const starMessageMutation = useMutation({
    mutationFn: async ({ messageId, star }: { messageId: string, star: boolean }) => {
      if (star) await supabase.from('chat_starred_messages').insert({ message_id: messageId, profile_id: currentUser!.id });
      else await supabase.from('chat_starred_messages').delete().eq('message_id', messageId).eq('profile_id', currentUser!.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['starred-messages'] })
  });

  const starredMessagesQuery = useQuery({
    queryKey: ['starred-messages'],
    queryFn: async () => {
      const { data } = await supabase.from('chat_starred_messages').select('chat_messages(*)').eq('profile_id', currentUser!.id);
      return (data || []).map((item: any) => item.chat_messages).filter(Boolean) as ChatMessage[];
    },
    enabled: !!currentUser,
  });

  const createGroupMutation = useMutation({
    mutationFn: async ({ name, userIds }: { name: string, userIds: string[] }) => {
      const myId = currentUser?.id || user?.id || (await supabase.auth.getUser()).data.user?.id;
      if (!myId) throw new Error('Usuário não autenticado.');

      // Inserção da conversa do grupo
      const { data: conv, error: convErr } = await (supabase.from('chat_conversations') as any)
        .insert({ name: name.trim(), type: 'group' })
        .select()
        .single();

      if (convErr || !conv) {
        console.error('Erro ao criar grupo:', convErr);
        throw convErr || new Error('Não foi possível criar o grupo.');
      }

      const convId = conv.id;

      // Inserir criador como admin
      await (supabase.from('chat_participants') as any).insert({
        conversation_id: convId,
        profile_id: myId,
        role: 'admin'
      }).catch((e: any) => console.warn('Aviso ao registrar criador:', e));

      // Inserir os outros participantes
      const otherUserIds = userIds.filter(id => id !== myId);
      if (otherUserIds.length > 0) {
        const otherParticipants = otherUserIds.map(id => ({
          conversation_id: convId,
          profile_id: id,
          role: 'member'
        }));

        const { error: batchErr } = await (supabase.from('chat_participants') as any).insert(otherParticipants);
        if (batchErr) {
          console.warn('Inserção em lote falhou, inserindo participantes individualmente:', batchErr);
          for (const uid of otherUserIds) {
            await (supabase.from('chat_participants') as any).insert({
              conversation_id: convId,
              profile_id: uid,
              role: 'member'
            }).catch(() => {});
          }
        }
      }

      return convId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      await queryClient.refetchQueries({ queryKey: ['chat-conversations'] });
    }
  });

  const clearMessagesMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await supabase.from('chat_messages').delete().eq('conversation_id', conversationId).eq('church_id', effectiveChurchId).select();
      if (error) throw error;
      if (!data || data.length === 0) {
        // Pode ser que não houvesse mensagens, o que não é um erro fatal, mas logamos
        console.log('Nenhuma mensagem apagada (talvez vazio ou sem permissão)');
      }
      return conversationId;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat-messages', effectiveChurchId] })
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      // 1. Delete all messages first
      const { error: msgError } = await supabase.from('chat_messages').delete().eq('conversation_id', conversationId).eq('church_id', effectiveChurchId);
      if (msgError) console.error("Erro ao apagar mensagens:", msgError);

      // 2. Tentar apagar a conversa ANTES dos participantes (para não perder o RLS de admin)
      const { data: convData, error: convError } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('church_id', effectiveChurchId)
        .select();
        
      if (convError) throw convError;
      
      // Se convData for vazio, o RLS bloqueou silenciosamente (não tem permissão global)
      if (!convData || convData.length === 0) {
        // Fallback: Apenas sai da conversa apagando a própria participação
        const { error: leaveError } = await supabase
          .from('chat_participants')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('profile_id', (await supabase.auth.getUser()).data.user?.id);
          
        if (leaveError) throw leaveError;
        return conversationId; // Conclui com sucesso (vai sumir da lista)
      }

      // 3. Se apagou a conversa com sucesso, apaga os participantes restantes
      await supabase.from('chat_participants').delete().eq('conversation_id', conversationId);

      return conversationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations', effectiveChurchId] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages', effectiveChurchId] });
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase.from('chat_messages').delete().eq('id', messageId).eq('church_id', effectiveChurchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', effectiveChurchId] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations', effectiveChurchId] });
    }
  });

  const createStandardRoomsMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) return;
      const rooms = [
        { name: 'Pastores', type: 'leaders' },
        { name: 'Células', type: 'cell' },
        { name: 'Ministérios', type: 'ministry' },
        { name: 'Membros', type: 'group' }
      ];

      for (const room of rooms) {
        const { data: conv, error } = await supabase.from('chat_conversations').insert({ ...room, church_id: effectiveChurchId }).select().single();
        if (error || !conv) continue;
        
        await supabase.from('chat_participants').insert({
          conversation_id: conv.id,
          profile_id: currentUser.id,
          role: 'admin'
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat-conversations', effectiveChurchId] })
  });

  const searchUsersQuery = useQuery({
    queryKey: ['chat-users-search', effectiveChurchId, currentUser?.id, user?.id],
    queryFn: async () => {
      if (!effectiveChurchId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('church_id', effectiveChurchId)
        .order('full_name', { ascending: true });
      if (error) {
        console.error('Erro ao buscar usuários do chat:', error);
        return [];
      }
      const myId = currentUser?.id || user?.id;
      return (data || [])
        .filter(u => u.id !== myId)
        .map(u => ({
          id: u.id,
          name: u.full_name || u.name || 'Membro',
          avatar_url: u.avatar_url,
          email: u.email
        }));
    },
    enabled: !!effectiveChurchId,
  });

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      new Notification(title, options);
      // Play a subtle sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      audio.play().catch(() => {});
    }
  };

  return (
    <ChatContext.Provider value={{
      currentUser,
      conversations: conversationsQuery.data || [],
      isLoadingConversations: conversationsQuery.isLoading,
      useMessages,
      sendMessage: sendMessageMutation.mutateAsync,
      uploadFile,
      isSending: sendMessageMutation.isPending,
      searchUsers: searchUsersQuery.data || [],
      startChat: startChatMutation.mutateAsync,
      isStartingChat: startChatMutation.isPending,
      pinMessage: pinMessageMutation.mutateAsync,
      createGroup: createGroupMutation.mutateAsync,
      isCreatingGroup: createGroupMutation.isPending,
      starMessage: starMessageMutation.mutateAsync,
      starredMessages: starredMessagesQuery.data || [],
      clearMessages: clearMessagesMutation.mutateAsync,
      deleteConversation: deleteConversationMutation.mutateAsync,
      deleteMessage: deleteMessageMutation.mutateAsync,
      requestNotificationPermission,
      createStandardRooms: createStandardRoomsMutation.mutateAsync
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
