import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

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
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setCurrentUser({ id: data.session.user.id });
      }
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel('chat_global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const newMessage = payload.new as ChatMessage;
        
        // Show notification if app is in background or not looking at this chat
        if (document.hidden && newMessage.sender_id !== currentUser.id) {
          showNotification('Nova mensagem', {
            body: newMessage.content,
            icon: '/logo-192.png'
          });
        }

        queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
        queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, queryClient]);

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
    queryKey: ['chat-conversations'],
    queryFn: async (): Promise<ChatConversation[]> => {
      if (!currentUser) return [];
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
          participants: (c.participants || []).map((p: any) => p.profile).filter(Boolean),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
  });

  const startChatMutation = useMutation({
    mutationFn: async (otherUserId: string) => {
      const { data, error } = await supabase.rpc('get_or_create_chat', { other_user_id: otherUserId });
      if (error) throw error;
      return data;
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
      const { data: conv, error } = await supabase.from('chat_conversations').insert({ name, type: 'group' }).select().single();
      if (error) throw error;
      if (!conv) throw new Error('Não foi possível criar o grupo.');

      const participants = [...new Set([currentUser!.id, ...userIds])].map(id => ({ 
        conversation_id: conv.id, 
        profile_id: id, 
        role: id === currentUser!.id ? 'admin' : 'member' 
      }));
      
      const { error: partError } = await supabase.from('chat_participants').insert(participants);
      if (partError) throw partError;
      
      return conv.id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
  });

  const clearMessagesMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await supabase.from('chat_messages').delete().eq('conversation_id', conversationId).select();
      if (error) throw error;
      if (!data || data.length === 0) {
        // Pode ser que não houvesse mensagens, o que não é um erro fatal, mas logamos
        console.log('Nenhuma mensagem apagada (talvez vazio ou sem permissão)');
      }
      return conversationId;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      // 1. Delete all messages first
      const { error: msgError } = await supabase.from('chat_messages').delete().eq('conversation_id', conversationId);
      if (msgError) console.error("Erro ao apagar mensagens:", msgError);

      // 2. Tentar apagar a conversa ANTES dos participantes (para não perder o RLS de admin)
      const { data: convData, error: convError } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId)
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
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase.from('chat_messages').delete().eq('id', messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
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
        const { data: conv, error } = await supabase.from('chat_conversations').insert(room).select().single();
        if (error || !conv) continue;
        
        await supabase.from('chat_participants').insert({
          conversation_id: conv.id,
          profile_id: currentUser.id,
          role: 'admin'
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
  });

  const searchUsersQuery = useQuery({
    queryKey: ['chat-users-search'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').limit(20);
      return (data || []).filter(u => u.id !== currentUser?.id);
    },
    enabled: !!currentUser,
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
