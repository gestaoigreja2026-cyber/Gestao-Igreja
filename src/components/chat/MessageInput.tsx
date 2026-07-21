import { useState, useRef, KeyboardEvent } from 'react';
import { SendHorizontal, Smile, Paperclip, Mic, X, Trash2, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const COMMON_EMOJIS = ['😀', '😂', '😍', '🙌', '🙏', '👍', '❤️', '🔥', '✨', '😊', '🤔', '😢', '👏', '🤝', '⛪', '📖'];

import { ChatConversation, useChat } from '@/hooks/useChat';

interface MessageInputProps {
  conversationId: string;
  onSendMessage: (args: { content: string; type?: 'text' | 'image' | 'file'; fileUrl?: string }) => Promise<void>;
  isLoading: boolean;
}

export function MessageInput({ conversationId, onSendMessage, isLoading }: MessageInputProps) {
  const { uploadFile } = useChat();
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        try {
          setIsUploading(true);
          const publicUrl = await uploadFile(blob, 'voice_message.ogg');
          await onSendMessage({ 
            content: `[Áudio Gravado: ${recordingTime}s]`, 
            type: 'file', 
            fileUrl: publicUrl 
          });
        } catch (error) {
          console.error('Error uploading audio:', error);
        } finally {
          setIsUploading(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error recording audio:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
  };

  const addEmoji = (emoji: string) => {
    setContent(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const type = file.type.startsWith('image/') ? 'image' : 'file';
        const publicUrl = await uploadFile(file, file.name);
        await onSendMessage({ 
          content: `[Arquivo: ${file.name}]`, 
          type, 
          fileUrl: publicUrl 
        });
      } catch (error) {
        console.error('Error uploading file:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSend = async () => {
    if (!content.trim() || isLoading) return;
    
    try {
      await onSendMessage({ content: content.trim() });
      setContent('');
      // Keep focus on input after sending
      setTimeout(() => inputRef.current?.focus(), 10);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="bg-[#f0f2f5] px-4 py-3 flex items-end gap-2 border-t relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
      />

      {!isRecording ? (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-full mb-1">
                <Smile className="w-6 h-6" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 grid grid-cols-4 gap-1">
              {COMMON_EMOJIS.map(emoji => (
                <button 
                  key={emoji} 
                  onClick={() => addEmoji(emoji)}
                  className="text-2xl p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors rounded-full mb-1"
          >
            <Paperclip className="w-6 h-6" />
          </button>
          
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-transparent focus-within:border-primary/30 transition-colors">
            <textarea
              ref={inputRef}
              value={content}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem"
              className="w-full max-h-[120px] bg-transparent outline-none resize-none py-2.5 px-4 text-[15px] placeholder:text-gray-400"
              style={{ height: '44px' }}
              disabled={isLoading || isUploading}
            />
          </div>

          {(content.trim() || isUploading) ? (
            <button
              onClick={handleSend}
              disabled={isLoading || isUploading}
              className="p-2.5 bg-primary text-white hover:bg-primary/90 transition-colors rounded-full flex items-center justify-center mb-0.5 shadow-sm disabled:opacity-50"
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <SendHorizontal className="w-5 h-5 ml-0.5" />
              )}
            </button>
          ) : (
            <button 
              onClick={startRecording}
              className="p-2.5 text-gray-500 hover:text-primary transition-colors rounded-full flex items-center justify-center mb-0.5"
            >
              <Mic className="w-6 h-6" />
            </button>
          )}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-between bg-white rounded-full px-4 py-2 shadow-inner border border-red-100 animate-pulse">
          <div className="flex items-center gap-3 text-red-500 font-medium">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" />
            <span>Gravando... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={cancelRecording} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
            <button onClick={stopRecording} className="p-2.5 bg-primary text-white rounded-full hover:bg-primary/90 shadow-md">
              <StopCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
