import { useState, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Users, Star, Settings, Bell, Moon, Sun } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function Chat() {
  const { 
    conversations, 
    isLoadingConversations, 
    searchUsers, 
    createGroup, 
    isCreatingGroup, 
    starredMessages, 
    starMessage,
    requestNotificationPermission 
  } = useChat();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSearchingNew, setIsSearchingNew] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showStarredMessagesModal, setShowStarredMessagesModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => {
        requestNotificationPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [requestNotificationPermission]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedUserIds.length === 0) return;
    try {
      const convId = await createGroup({ name: newGroupName, userIds: selectedUserIds });
      setActiveConversationId(convId);
      setShowNewGroupModal(false);
      setNewGroupName('');
      setSelectedUserIds([]);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div 
      className={`w-full flex bg-white shadow-sm md:rounded-xl overflow-hidden border border-gray-200 transition-colors duration-300 ${darkMode ? 'dark bg-gray-900 border-gray-800' : ''}`} 
      style={{ height: 'calc(100vh - 120px)' }}
    >
      {/* Sidebar: hidden on mobile if a chat is active */}
      <div className={`w-full md:w-[350px] lg:w-[400px] h-full shrink-0 border-r ${activeConversationId ? 'hidden md:block' : 'block'} ${darkMode ? 'border-gray-800' : ''}`}>
        <ChatSidebar 
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
          isLoading={isLoadingConversations}
          isSearchingNew={isSearchingNew}
          setIsSearchingNew={setIsSearchingNew}
          onNewGroup={() => setShowNewGroupModal(true)}
          onStarredMessages={() => setShowStarredMessagesModal(true)}
          onSettings={() => setShowSettingsModal(true)}
          isDarkMode={darkMode}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <ChatWindow 
            conversation={activeConversation} 
            onBack={() => setActiveConversationId(null)}
            isDarkMode={darkMode}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#f0f2f5] border-b-8 border-primary/20">
            <div className="text-center max-w-md px-6">
              <div className="w-32 h-32 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <svg viewBox="0 0 24 24" width="64" height="64" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              </div>
              <h2 className="text-3xl font-light text-gray-700 mb-4">Chat</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Envie e receba mensagens sem precisar manter seu celular conectado. Use o Chat em até 4 dispositivos simultaneamente.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Protegido com criptografia de ponta a ponta
                </div>
                <button 
                  onClick={() => setIsSearchingNew(true)}
                  className="mt-4 px-6 py-2.5 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Iniciar Nova Conversa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Group Modal */}
      <Dialog open={showNewGroupModal} onOpenChange={setShowNewGroupModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Novo Grupo
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Grupo</label>
              <Input 
                placeholder="Ex: Ministério de Louvor" 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Adicionar Participantes ({selectedUserIds.length})</label>
              <div className="max-h-[300px] overflow-y-auto space-y-1 border rounded-xl p-1">
                {searchUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4 text-center">Nenhum contato encontrado</p>
                ) : (
                  searchUsers.map(user => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <div 
                        key={user.id}
                        onClick={() => toggleUserSelection(user.id)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/5 border-primary/20' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{user.name}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGroupModal(false)}>Cancelar</Button>
            <Button 
              onClick={handleCreateGroup} 
              disabled={!newGroupName.trim() || selectedUserIds.length === 0 || isCreatingGroup}
            >
              {isCreatingGroup ? 'Criando...' : 'Criar Grupo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Starred Messages Modal */}
      <Dialog open={showStarredMessagesModal} onOpenChange={setShowStarredMessagesModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Mensagens Favoritas
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-[400px] overflow-y-auto space-y-3">
            {starredMessages.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhuma mensagem favoritada ainda.</p>
            ) : (
              starredMessages.map(msg => (
                <div key={msg.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 relative group">
                  <p className="text-[14px] text-gray-800 pr-6">{msg.content}</p>
                  <p className="text-[10px] text-gray-400 mt-2">Enviada em {new Date(msg.created_at).toLocaleString('pt-BR')}</p>
                  <button 
                    onClick={() => starMessage({ messageId: msg.id, star: false })}
                    className="absolute top-2 right-2 p-1 text-gray-300 hover:text-amber-500 transition-colors"
                  >
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  </button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowStarredMessagesModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações do Chat
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Notificações</span>
                </div>
                <p className="text-xs text-gray-500">Receber avisos de novas mensagens</p>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  {darkMode ? <Moon className="w-4 h-4 text-gray-500" /> : <Sun className="w-4 h-4 text-gray-500" />}
                  <span className="text-sm font-medium">Modo Escuro</span>
                </div>
                <p className="text-xs text-gray-500">Alterar tema do chat</p>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettingsModal(false)}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
