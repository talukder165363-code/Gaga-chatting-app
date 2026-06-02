import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import {
  Smile, Image, Paperclip, Mic, Send, X, Reply, BarChart2

} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';

import StickerPicker from '@/components/features/StickerPicker';
import EmojiPicker from '@/components/features/EmojiPicker';

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  onTyping: (name?: string) => void;
  onStopTyping: () => void;
  replyTo: Message | null;
  setReplyTo: (msg: Message | null) => void;
  editingMessage: Message | null;
  setEditingMessage: (msg: Message | null) => void;
  onImagePick: () => void;
  onFileAttach: () => void;
  onPollClick: () => void;
  isRecording: boolean;
  recordingSeconds: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onStickerSelect: (url: string) => void;
  onEmojiSelect: (emoji: string) => void;
  onFilePaste?: (file: File) => void;
}

const MAX_CHARS = 4000;

export function ChatInput({
  input,
  setInput,
  onSend,
  onTyping,
  onStopTyping,
  replyTo,
  setReplyTo,
  editingMessage,
  setEditingMessage,
  onImagePick,
  onFileAttach,
  onPollClick,
  isRecording,
  recordingSeconds,
  onStartRecording,
  onStopRecording,
  onStickerSelect,
  onEmojiSelect,
  onFilePaste
}: ChatInputProps) {
  const [showStickers, setShowStickers] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingMessage || replyTo) {
      textareaRef.current?.focus();
    }
  }, [editingMessage, replyTo]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && !isRecording) {
      textarea.style.height = 'inherit';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [input, isRecording]);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_CHARS) {
      setInput(val);
      if (val.trim()) {
        onTyping();
      } else {
        onStopTyping();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() || editingMessage) {
        onSend();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = e.clipboardData.items[0];
    if (item?.kind === 'file' && onFilePaste) {
      const file = item.getAsFile();
      if (file) onFilePaste(file);
    }
  };

  const cancelEditOrReply = () => {
    setEditingMessage(null);
    setReplyTo(null);
    if (editingMessage) setInput('');
  };

  const remainingChars = MAX_CHARS - input.length;
  const showCharCount = input.length > MAX_CHARS * 0.8;

  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className="bg-[#111] border-t border-white/5 pb-safe animate-slide-up">
      {(replyTo || editingMessage) && (
        <div className="px-4 py-2 bg-white/5 flex items-center gap-3 border-b border-white/5 animate-slide-in">
          <div className="w-1 bg-[#00FF7F] self-stretch rounded-full" />
          <div className="flex-1 min-w-0 py-1">
            <div className="flex items-center gap-1.5 text-[#00FF7F] font-bold text-xs uppercase tracking-wider">
              {editingMessage ? (
                <>Edit Message</>
              ) : (
                <>
                  <Reply size={12} className="rotate-180" />
                  Replying to
                </>
              )}
            </div>
            <p className="text-white/60 text-sm truncate">
              {editingMessage ? editingMessage.content : replyTo?.content}
            </p>
          </div>
          <button onClick={cancelEditOrReply} className="p-1.5 text-white/30 hover:text-white/60 transition-colors">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-3">
        <div className="flex items-center gap-0.5 pb-1">
          <button
            onClick={() => { setShowEmoji(!showEmoji); setShowStickers(false); }}
            className={cn('p-2 rounded-full transition-colors', showEmoji ? 'text-[#00FF7F] bg-white/10' : 'text-white/40 hover:text-white/70')}
            title="Emoji"
          >
            <Smile size={22} />
          </button>
          <button
            onClick={() => { setShowStickers(!showStickers); setShowEmoji(false); }}
            className={cn('p-2 rounded-full transition-colors', showStickers ? 'text-[#00FF7F] bg-white/10' : 'text-white/40 hover:text-white/70')}
            title="Stickers"
          >
            <Reply size={20} className="rotate-90" />
          </button>
          <button
            onClick={onImagePick}
            className="p-2 text-white/40 hover:text-white/70 rounded-full transition-colors"
            title="Gallery"
          >
            <Image size={22} />
          </button>
          <button
            onClick={onFileAttach}
            className="p-2 text-white/40 hover:text-white/70 rounded-full transition-colors"
            title="File"
          >
            <Paperclip size={22} />
          </button>
          <button
            onClick={onPollClick}
            className="p-2 text-white/40 hover:text-white/70 rounded-full transition-colors"
            title="Poll"
          >
            <BarChart2 size={22} />
          </button>
        </div>

        <div className="flex-1 relative bg-white/5 rounded-2xl border border-white/10 overflow-hidden min-h-[44px] flex items-end">
          {isRecording ? (
            <div className="flex-1 flex items-center justify-between px-4 h-[44px] animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-500 text-sm font-bold tracking-tight">Recording {recordingSeconds}s</span>
              </div>
              <button
                onClick={onStopRecording}
                className="text-[#00FF7F] text-[11px] font-black uppercase tracking-[0.2em] bg-[#00FF7F]/10 px-3 py-1 rounded-full border border-[#00FF7F]/20"
              >
                Stop
              </button>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={editingMessage ? "Edit message..." : "Type a message..."}
              className="w-full bg-transparent px-4 py-3 text-white text-[15px] outline-none placeholder-white/20 resize-none max-h-[120px] scrollbar-hide"
              rows={1}
              aria-label="Message input"
            />
          )}
          {showCharCount && !isRecording && (
            <div className={cn(
              "absolute right-2 bottom-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/40",
              remainingChars < 50 ? "text-red-400" : "text-white/40"
            )}>
              {remainingChars}
            </div>
          )}
        </div>

        <div className="pb-1">
          {input.trim() || editingMessage ? (
            <button
              onClick={() => { triggerHaptic(); onSend(); }}
              className="p-3 bg-[#00FF7F] text-black rounded-full shadow-lg shadow-[#00FF7F]/20 active:scale-90 transition-transform"
              aria-label="Send message"
            >
              <Send size={20} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={() => { triggerHaptic(); onStartRecording(); }}
              className={cn(
                'p-3 rounded-full transition-all active:scale-90 shadow-lg',
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-white/70 hover:bg-white/20'
              )}
              aria-label={isRecording ? "Stop recording" : "Record voice message"}
            >
              <Mic size={22} />
            </button>
          )}
        </div>
      </div>

      {showStickers && (
        <div className="h-[280px] border-t border-white/5 animate-slide-up">
          <StickerPicker
            onSelect={(url) => { onStickerSelect(url); setShowStickers(false); }}
            onClose={() => setShowStickers(false)}
          />
        </div>
      )}

      {showEmoji && (
        <div className="h-[280px] border-t border-white/5 animate-slide-up">
          <EmojiPicker
            onSelect={(emoji) => { onEmojiSelect(emoji); setShowEmoji(false); }}
            onClose={() => setShowEmoji(false)}
          />
        </div>
      )}
    </div>
  );
}
