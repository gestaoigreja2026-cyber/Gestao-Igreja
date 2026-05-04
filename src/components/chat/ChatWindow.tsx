import { useState, useRef, useMemo, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { ChatConversation, useChat } from '@/hooks/useChat';
import { ArrowLeft, MoreVertical, Phone, Video, Pin, X, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatWindowProps {
  conversation: ChatConversation;
  onBack: () => void;
  isDarkMode?: boolean;
}

export function ChatWindow({ conversation, onBack, isDarkMode }: ChatWindowProps) {
  const { currentUser, useMessages, sendMessage, isSending, pinMessage, clearMessages, deleteConversation } = useChat();
  const { data: messages, isLoading } = useMessages(conversation.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [callType, setCallType] = useState<'video' | 'audio'>('video');
  const [isSearching, setIsSearching] = useState(false);
  const [messageSearchTerm, setMessageSearchTerm] = useState('');

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    if (!messageSearchTerm.trim()) return messages;
    return messages.filter(m => 
      m.content.toLowerCase().includes(messageSearchTerm.toLowerCase())
    );
  }, [messages, messageSearchTerm]);

  // Scroll to bottom on new messages (single effect)
  useEffect(() => {
    if (scrollRef.current && !messageSearchTerm) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, messageSearchTerm]);

  const pinnedMessages = messages?.filter(m => m.pinned_at) || [];

  const handleSendMessage = async (args: { content: string; type?: 'text' | 'image' | 'file'; fileUrl?: string }) => {
    try {
      await sendMessage({ 
        conversationId: conversation.id, 
        content: args.content,
        type: args.type || 'text',
        fileUrl: args.fileUrl
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const otherParticipant = conversation.participants[0];
  const chatName = conversation.name || otherParticipant?.name || 'Chat';
  const chatAvatar = otherParticipant?.avatar_url || '';
  const initials = chatName.substring(0, 2).toUpperCase();

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-gray-900' : 'bg-[#efeae2]'}`}>
      {/* Header */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-[#f0f2f5] border-b'} px-3 md:px-4 py-2 flex items-center justify-between shadow-sm z-10`}>
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button 
            onClick={onBack}
            className="md:hidden p-2 -ml-2 rounded-full hover:bg-black/5 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <Avatar className="h-10 w-10 border border-gray-200 shadow-sm cursor-pointer">
            <AvatarImage src={chatAvatar} alt={chatName} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">{initials}</AvatarFallback>
          </Avatar>
          
          <div 
            className="flex flex-col cursor-pointer min-w-0"
            onClick={() => setShowContactInfo(true)}
          >
            <span className={`font-semibold text-[16px] leading-tight truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{chatName}</span>
            <span className={`text-[13px] leading-tight mt-0.5 hover:underline truncate ${isDarkMode ? 'text-gray-400 decoration-gray-500' : 'text-gray-500 decoration-gray-400'}`}>Clique para ver os dados do contato</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsSearching(!isSearching)}
            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-black/5'}`}
          >
            <Search className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              setCallType('video');
              setShowVideoCall(true);
            }} 
            className="p-2 rounded-full text-gray-500 hover:bg-black/5 transition-colors"
          >
            <Video className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              setCallType('audio');
              setShowVideoCall(true);
            }} 
            className="p-2 rounded-full text-gray-500 hover:bg-black/5 transition-colors"
          >
            <Phone className="w-5 h-5" />
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full text-gray-500 hover:bg-black/5 transition-colors outline-none">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="cursor-pointer" onClick={() => setShowContactInfo(true)}>
                Dados do contato
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={async () => {
                if (confirm('Deseja limpar todas as mensagens desta conversa?')) {
                  await clearMessages(conversation.id);
                }
              }}>
                Limpar conversa
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={async () => {
                if (confirm('Deseja APAGAR esta conversa inteira?')) {
                  await deleteConversation(conversation.id);
                  onBack();
                }
              }}>
                Apagar conversa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search Bar */}
      {isSearching && (
        <div className={`px-4 py-2 border-b flex items-center gap-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <Search className="w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Pesquisar mensagens..."
            value={messageSearchTerm}
            onChange={(e) => setMessageSearchTerm(e.target.value)}
            className="flex-1 h-8 text-sm bg-transparent border-none focus-visible:ring-0"
            autoFocus
          />
          <button onClick={() => { setIsSearching(false); setMessageSearchTerm(''); }}>
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      )}

      {/* Pinned Messages Header */}
      {messages?.some(m => m.pinned_at) && (
        <div className={`px-4 py-2 border-b flex items-center justify-between cursor-pointer hover:bg-opacity-80 transition-all ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-primary/5 border-primary/10'}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <Pin className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold text-primary tracking-wider">Mensagem Fixada</p>
              <p className={`text-xs truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {messages.find(m => m.pinned_at)?.content}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div 
        className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-1 ${isDarkMode ? 'bg-[#0b141a]' : 'bg-[#efeae2]'}`}
        style={{ 
          backgroundImage: isDarkMode ? 'none' : 'url("https://w0.peakpx.com/wallpaper/580/630/HD-wallpaper-whatsapp-background-whatsapp-pattern-whatsapp-texture.jpg")',
          backgroundSize: '400px',
          backgroundBlendMode: 'soft-light'
        }}
      >
        <div className="flex flex-col min-h-full justify-end">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-20 text-gray-500 italic">
              {messageSearchTerm ? 'Nenhuma mensagem encontrada para sua busca.' : 'Inicie uma conversa!'}
            </div>
          ) : (
            filteredMessages.map((msg, index) => {
              const isMine = msg.sender_id === currentUser?.id;
              const prevMsg = index > 0 ? filteredMessages[index - 1] : null;
              const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;
              return (
                <div key={msg.id} className={isFirstInGroup ? 'mt-2' : ''}>
                  <MessageBubble message={msg} isMine={isMine} isDarkMode={isDarkMode} />
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input Area */}
      <MessageInput 
        conversationId={conversation.id}
        onSendMessage={handleSendMessage} 
        isLoading={isSending} 
      />

      {/* Contact Info Modal */}
      <Dialog open={showContactInfo} onOpenChange={setShowContactInfo}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Dados do Contato</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6 space-y-4">
            <Avatar className="h-24 w-24 border-2 border-gray-100 shadow-md">
              <AvatarImage src={chatAvatar} alt={chatName} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900">{chatName}</h3>
              <p className="text-gray-500">{otherParticipant?.email || 'Sem email'}</p>
            </div>
            <div className="w-full space-y-3 pt-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400">Cargo / Função</p>
                <p className="text-sm font-medium text-gray-700 capitalize">{otherParticipant?.name || 'Membro'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-[10px] uppercase font-bold text-gray-400">Tipo de Chat</p>
                <p className="text-sm font-medium text-gray-700 capitalize">{conversation.type === 'private' ? 'Privado' : 'Grupo'}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setShowContactInfo(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Call Modal */}
      <Dialog open={showVideoCall} onOpenChange={setShowVideoCall}>
        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0 overflow-hidden bg-black border-none">
          <DialogHeader className="p-4 bg-gray-900 text-white flex-row items-center justify-between space-y-0">
            <DialogTitle className="flex items-center gap-2">
              {callType === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
              {callType === 'video' ? 'Chamada de Vídeo' : 'Chamada de Voz'} - {chatName}
            </DialogTitle>
          </DialogHeader>
          <div className="w-full aspect-video md:aspect-[16/9] bg-gray-800">
            <iframe
              src={`https://meet.jit.si/${conversation.id.replace(/-/g, '')}#userInfo.displayName="${chatName}"&config.startWithAudioMuted=false&config.startWithVideoMuted=${callType === 'audio'}`}
              allow="camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write; autoplay"
              className="w-full h-full border-none"
            />
          </div>
          <div className="p-4 bg-gray-900 flex justify-center">
            <Button variant="destructive" className="rounded-full px-8" onClick={() => setShowVideoCall(false)}>
              Encerrar Chamada
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
