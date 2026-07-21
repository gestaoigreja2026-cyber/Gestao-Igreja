import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChatMessage, useChat } from '@/hooks/useChat';
import { Pin, MoreHorizontal, Star, FileText, Download, Play, Music, Check, CheckCheck, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface MessageBubbleProps {
  message: ChatMessage;
  isMine: boolean;
  isDarkMode?: boolean;
}

export function MessageBubble({ message, isMine, isDarkMode }: MessageBubbleProps) {
  const { pinMessage, starMessage, deleteMessage } = useChat();

  return (
    <div className={`flex w-full mb-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] md:max-w-[70%] px-3 py-1.5 rounded-xl shadow-sm relative ${
          isMine
            ? isDarkMode 
              ? 'bg-[#005c4b] text-gray-100 rounded-tr-none' 
              : 'bg-[#d9fdd3] text-gray-900 rounded-tr-none'
            : isDarkMode
              ? 'bg-[#202c33] text-gray-100 rounded-tl-none border border-gray-700'
              : 'bg-white text-gray-900 rounded-tl-none border border-gray-100'
        }`}
      >
        {message.pinned_at && (
          <div className={`flex items-center gap-1 text-[10px] mb-1 border-b pb-1 ${isDarkMode ? 'text-gray-400 border-white/10' : 'text-gray-500 border-black/5'}`}>
            <Pin className="w-3 h-3 fill-current" />
            <span>Mensagem fixada</span>
          </div>
        )}
        
        <div className="flex justify-between items-start gap-2 group">
          <div className="text-[15px] break-words whitespace-pre-wrap leading-relaxed flex-1">
            {message.type === 'image' && message.file_url ? (
              <div className="rounded-xl overflow-hidden border border-black/5 mb-1 cursor-pointer">
                <img 
                  src={message.file_url} 
                  alt="Anexo" 
                  className="max-h-[300px] w-full object-cover hover:scale-105 transition-transform duration-300"
                  onClick={() => window.open(message.file_url, '_blank')}
                />
              </div>
            ) : message.type === 'file' && message.file_url ? (
              /* Check if it's audio */
              message.content.includes('[Áudio Gravado') ? (
                <div className="flex items-center gap-3 py-1 min-w-[220px]">
                  <button 
                    onClick={() => {
                      const audio = new Audio(message.file_url);
                      audio.play();
                    }}
                    className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 hover:bg-primary/30 transition-colors"
                  >
                    <Play className="w-5 h-5 text-primary fill-primary ml-1" />
                  </button>
                  <div className="flex-1 space-y-1">
                    <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full w-0 bg-primary rounded-full animate-progress" />
                    </div>
                    <p className="text-[10px] text-gray-500">{message.content.replace('[Áudio Gravado: ', '').replace(']', '')}</p>
                  </div>
                  <Music className="w-4 h-4 text-gray-400" />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-2 bg-black/5 rounded-xl border border-black/5">
                  <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{message.content.replace('[Arquivo: ', '').replace(']', '')}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Documento</p>
                  </div>
                  <button 
                    onClick={() => window.open(message.file_url, '_blank')}
                    className="p-2 hover:bg-black/5 rounded-full transition-colors"
                  >
                    <Download className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )
            ) : (
              message.content
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-black/5 rounded transition-opacity">
                <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isMine ? "end" : "start"} className="w-32">
              <DropdownMenuItem 
                className="cursor-pointer flex items-center gap-2"
                onClick={() => pinMessage({ messageId: message.id, pin: !message.pinned_at })}
              >
                <Pin className="w-3.5 h-3.5" />
                {message.pinned_at ? 'Desafixar' : 'Fixar'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer flex items-center gap-2"
                onClick={() => starMessage({ messageId: message.id, star: !message.is_starred })}
              >
                <Star className={`w-3.5 h-3.5 ${message.is_starred ? 'fill-amber-500 text-amber-500' : ''}`} />
                {message.is_starred ? 'Desfavoritar' : 'Favoritar'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer flex items-center gap-2 text-red-600 focus:text-red-600"
                onClick={() => {
                  if (confirm('Deseja realmente apagar esta mensagem?')) {
                    deleteMessage(message.id);
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Apagar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className={`flex items-center justify-end gap-1 text-[10px] mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
          {isMine && (
            <CheckCheck className={`w-3.5 h-3.5 ${isDarkMode ? 'text-sky-400' : 'text-sky-500'}`} />
          )}
        </div>
      </div>
    </div>
  );
}
