import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Plus, MessageSquare, MoreVertical, X, Users as UsersIcon, Shield, Megaphone, Heart } from 'lucide-react';
import { ChatConversation, ChatProfile, useChat } from '@/hooks/useChat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ChatSidebarProps {
  conversations: ChatConversation[];
  isLoading: boolean;
  isSearchingNew: boolean;
  setIsSearchingNew: (val: boolean) => void;
  onNewGroup: () => void;
  onStarredMessages: () => void;
  onSettings: () => void;
  isDarkMode?: boolean;
}

export function ChatSidebar({ conversations, activeConversationId, onSelectConversation, isLoading, isSearchingNew, setIsSearchingNew, onNewGroup, onStarredMessages, onSettings, isDarkMode }: ChatSidebarProps) {
  const { searchUsers, startChat, isStartingChat, createStandardRooms } = useChat();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateRoomsConfirm, setShowCreateRoomsConfirm] = useState(false);

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conv => {
    const name = conv.name || conv.participants[0]?.name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleStartNewChat = async (userId: string) => {
    const convId = await startChat(userId);
    onSelectConversation(convId);
    setIsSearchingNew(false);
    setSearchTerm('');
  };

  const getConversationDetails = (conv: ChatConversation) => {
    let name = conv.name || conv.participants[0]?.name || 'Chat';
    const avatar = conv.participants[0]?.avatar_url || '';
    
    // Default names/icons for special groups
    if (conv.type === 'cell') {
      name = conv.name || 'Minha Célula';
    } else if (conv.type === 'ministry') {
      name = conv.name || 'Meu Ministério';
    } else if (conv.type === 'leaders') {
      name = 'Chat de Líderes';
    } else if (conv.type === 'announcements') {
      name = 'Avisos da Igreja';
    } else if (conv.type === 'prayers') {
      name = 'Pedidos de Oração';
    }

    const initials = name.substring(0, 2).toUpperCase();
    const lastMsg = conv.last_message;
    const time = lastMsg ? format(new Date(lastMsg.created_at), 'HH:mm', { locale: ptBR }) : '';
    
    return { name, avatar, initials, lastMsg, time };
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cell': return <UsersIcon className="w-3 h-3 mr-1" />;
      case 'ministry': return <Shield className="w-3 h-3 mr-1" />;
      case 'leaders': return <Shield className="w-3 h-3 mr-1 text-amber-500" />;
      case 'announcements': return <Megaphone className="w-3 h-3 mr-1 text-red-500" />;
      case 'prayers': return <Heart className="w-3 h-3 mr-1 text-pink-500" />;
      default: return null;
    }
  };

  // Group conversations by category
  const categories = [
    { title: 'Avisos e Pedidos', types: ['announcements', 'prayers'] },
    { title: 'Meus Grupos', types: ['cell', 'ministry', 'leaders'] },
    { title: 'Conversas Privadas', types: ['private', 'group'] }
  ];

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className={`p-4 flex items-center justify-between border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-[#f0f2f5] border-gray-200'}`}>
        <Avatar className="h-10 w-10 border border-gray-300">
          <AvatarImage src="" alt="User" />
          <AvatarFallback className={isDarkMode ? 'bg-gray-700 text-gray-100' : 'bg-primary/10 text-primary'}>
            ME
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsSearchingNew(true)}
            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-black/5'}`}
          >
            <Plus className="w-5 h-5" />
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`p-2 rounded-full transition-colors outline-none ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-black/5'}`}>
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="cursor-pointer" onClick={onNewGroup}>
                Novo grupo
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer text-primary font-medium" 
                onSelect={() => setShowCreateRoomsConfirm(true)}
              >
                Criar Salas Padrão
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={onStarredMessages}>
                Mensagens favoritas
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={onSettings}>
                Configurações
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className={`p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
        <div className={`relative flex items-center rounded-xl px-3 py-1.5 ${isDarkMode ? 'bg-gray-800' : 'bg-[#f0f2f5]'}`}>
          <Search className={`w-4 h-4 mr-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <input 
            type="text" 
            placeholder="Pesquisar ou começar uma nova conversa"
            className={`bg-transparent border-none focus:outline-none text-sm w-full ${isDarkMode ? 'text-gray-100 placeholder:text-gray-600' : 'text-gray-700'}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : isSearchingNew ? (
          <div className="flex flex-col">
            <div className="px-4 py-2 text-xs font-semibold text-primary uppercase tracking-wider bg-gray-50">
              Contatos Disponíveis
            </div>
            {searchUsers.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                Nenhum contato encontrado. Crie outro usuário (membro ou pastor) no sistema para testar o chat.
              </div>
            ) : (
              searchUsers
                .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(user => (
                <div
                  key={user.id}
                  onClick={() => handleStartNewChat(user.id)}
                  className="flex items-center px-4 py-3 hover:bg-[#f5f6f6] cursor-pointer transition-colors border-b border-gray-50"
                >
                  <Avatar className="h-12 w-12 mr-3">
                    <AvatarImage src={user.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="font-medium text-[16px] text-gray-900 truncate">{user.name}</h3>
                    </div>
                    <p className="text-[13px] text-gray-500 truncate">Clique para iniciar uma conversa</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500">
            <MessageSquare className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-[15px]">Nenhuma conversa encontrada</p>
            <p className="text-[13px] mt-1">Clique no + para iniciar uma nova conversa</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {categories.map((cat) => {
              const catConvs = filteredConversations.filter(c => cat.types.includes(c.type));
              if (catConvs.length === 0) return null;

              return (
                <div key={cat.title}>
                  <div className="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase bg-gray-50/50">
                    {cat.title}
                  </div>
                  {catConvs.map(conv => {
                    const { name, avatar, initials, lastMsg, time } = getConversationDetails(conv);
                    const isActive = activeConversationId === conv.id;
                    
                    return (
                      <div
                        key={conv.id}
                        onClick={() => onSelectConversation(conv.id)}
                        className={`flex items-center px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 ${
                          isActive ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'
                        }`}
                      >
                        <Avatar className="h-12 w-12 mr-3 border border-gray-100">
                          <AvatarImage src={avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <h3 className="font-medium text-[16px] text-gray-900 truncate pr-2 flex items-center">
                              {getTypeIcon(conv.type)}
                              {name}
                            </h3>
                            <span className="text-[12px] text-gray-500 whitespace-nowrap">{time}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-[13px] text-gray-600 truncate pr-2">
                              {lastMsg ? lastMsg.content : <span className="italic text-gray-400">Nova conversa</span>}
                            </p>
                            {conv.unread_count > 0 && (
                              <span className="bg-primary text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showCreateRoomsConfirm} onOpenChange={setShowCreateRoomsConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Salas Padrão</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-gray-600">Deseja criar as 4 salas padrão do sistema?</p>
            <p className="text-sm text-gray-500 mt-2">(Pastores, Células, Ministérios, Membros)</p>
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowCreateRoomsConfirm(false)}>Cancelar</Button>
            <Button onClick={() => {
              createStandardRooms()
                .then(() => setShowCreateRoomsConfirm(false))
                .catch(() => alert('Erro ao criar salas padrão.'));
            }}>Sim, Criar Salas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
