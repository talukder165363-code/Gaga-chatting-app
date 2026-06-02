import { useRef, useEffect, useState, type UIEvent } from 'react';

import { ChevronUp, Search, ChevronDown, Check, Reply, Edit2, Trash2, Share2, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, Chat } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import MessageBubble from '@/components/features/MessageBubble';

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '😡'];

interface MessageListProps {
  chat: Chat;
  messages: Message[];
  hasMore: boolean;
  onLoadOlder: () => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onReact: (msgId: string, emoji: string) => void;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (id: string) => void;
  onPin: (msg: Message) => void;
  onForward: (msg: Message) => void;
  onScrollToMessage: (id: string) => void;
  showSearch?: boolean;
  searchQuery?: string;
  setSelectedMsgId: (id: string | null) => void;
  showReactionsId: string | null;
  setShowReactionsId: (id: string | null) => void;
  isSelectionMode: boolean;
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
}

export function MessageList({
  chat,
  messages,
  hasMore,
  onLoadOlder,
  onScroll,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onForward,
  onScrollToMessage,
  showSearch,
  searchQuery,
  // selectedMsgId intentionally omitted — not needed in this component
  setSelectedMsgId,
  showReactionsId,
  setShowReactionsId,
  isSelectionMode,
  selectedIds,

  onToggleSelection,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);
  const prevFirstMessageIdRef = useRef<string | null>(messages[0]?.id ?? null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Only auto-scroll when a new message is appended (count increases),
  // not when older messages are prepended (loadOlderMessages).
  useEffect(() => {
    const prevCount = prevMessageCountRef.current;
    const prevFirstId = prevFirstMessageIdRef.current;
    const currCount = messages.length;
    const currFirstId = messages[0]?.id ?? null;

    const container = containerRef.current;
    if (currCount > prevCount && container) {
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 200;
      const appendedNewMessage = currFirstId === prevFirstId;
      if (isAtBottom || appendedNewMessage) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }

    prevMessageCountRef.current = currCount;
    prevFirstMessageIdRef.current = currFirstId;
  }, [messages]);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    onScroll(e);
    const container = e.currentTarget;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
    setShowScrollToBottom(!isAtBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toDate = (ts: Message['timestamp']): Date =>
    ts instanceof Date ? ts : (ts as { toDate(): Date }).toDate();

  const shouldShowDate = (msg: Message, prev?: Message) =>
    !prev || toDate(msg.timestamp).toDateString() !== toDate(prev.timestamp).toDateString();

  const { user } = useAuth();
  const currentUserId = user?.id;


  return (
    <div className="relative flex-1 flex flex-col overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide bg-[linear-gradient(180deg,_#0d0d0d_0%,_#111_100%)]"
        onScroll={handleScroll}
        onClick={() => { setSelectedMsgId(null); setShowReactionsId(null); }}
      >
        {hasMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={onLoadOlder}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-colors"
            >
              <ChevronUp size={14} /> Load older messages
            </button>
          </div>
        )}

        {messages.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center h-40 text-white/30">
            <Search size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No messages found</p>
          </div>
        ) : messages.length === 0 && !showSearch ? (
          <div className="flex flex-col items-center justify-center h-40 text-white/30">
            <p className="text-sm">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            // Compute popup position using the message index to avoid reading refs during render
            const popupPositionToUse: 'above' | 'below' = i < Math.ceil(messages.length * 0.3) ? 'below' : 'above';
            const isOwn = msg.senderId === currentUserId;

            return (
              <div key={msg.id}>
                {shouldShowDate(msg, messages[i - 1]) && (
                  <div className="flex justify-center my-3">
                    <span className="bg-white/10 text-white/60 text-[11px] px-3 py-1 rounded-full">
                      {toDate(msg.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}

                <div
                  id={msg.id}
                  className={cn(
                    "relative group transition-all duration-200",
                    isSelectionMode && "px-8 cursor-pointer active:scale-[0.99]"
                  )}
                  onContextMenu={e => {
                    if (isSelectionMode) return;
                    e.preventDefault();
                    setSelectedMsgId(msg.id);
                    setShowReactionsId(msg.id);
                  }}
                  onClick={(e) => {
                    if (isSelectionMode) {
                      e.stopPropagation();
                      onToggleSelection(msg.id);
                    }
                  }}
                >
                  {/* Selection checkbox */}
                  {isSelectionMode && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center",
                        selectedIds.includes(msg.id)
                          ? "bg-[#00FF7F] border-[#00FF7F]"
                          : "border-white/20 bg-black/20"
                      )}>
                        {selectedIds.includes(msg.id) && <Check size={12} className="text-black" />}
                      </div>
                    </div>
                  )}

                  {/* Context menu popup */}
                  {showReactionsId === msg.id && !isSelectionMode && (
                    <div
                      className={cn(
                        'absolute z-20 flex flex-col gap-1 bg-[#2a2a2a] border border-white/10 rounded-2xl p-2 shadow-2xl animate-scale-in w-52',
                        isOwn ? 'right-0' : 'left-8',
                        popupPositionToUse === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'

                      )}
                      onClick={e => e.stopPropagation()}
                    >
                      {/* Quick reactions */}
                      <div className="flex gap-1 px-1 pb-1">
                        {QUICK_REACTIONS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => { onReact(msg.id, emoji); setShowReactionsId(null); setSelectedMsgId(null); }}
                            className="text-2xl hover:scale-125 transition-transform active:scale-110 p-1"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <div className="h-px bg-white/5 mx-1" />

                      {/* Action buttons */}
                      <button
                        onClick={() => { onReply(msg); setShowReactionsId(null); setSelectedMsgId(null); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Reply size={15} /> Reply
                      </button>

                      {isOwn && msg.type === 'text' && (
                        <button
                          onClick={() => { onEdit(msg); setShowReactionsId(null); setSelectedMsgId(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Edit2 size={15} /> Edit
                        </button>
                      )}

                      <button
                        onClick={() => { onForward(msg); setShowReactionsId(null); setSelectedMsgId(null); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Share2 size={15} /> Forward
                      </button>

                      <button
                        onClick={() => { onPin(msg); setShowReactionsId(null); setSelectedMsgId(null); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Pin size={15} /> {chat.pinnedMessage?.messageId === msg.id ? 'Unpin' : 'Pin'}
                      </button>

                      <button
                        onClick={() => { onToggleSelection(msg.id); setShowReactionsId(null); setSelectedMsgId(null); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <Check size={15} /> Select
                      </button>

                      <div className="h-px bg-white/5 mx-1" />

                      <button
                        onClick={() => { onDelete(msg.id); setShowReactionsId(null); setSelectedMsgId(null); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  )}

                  <MessageBubble
                    message={msg}
                    isOwn={isOwn}
                    showAvatar={msg.showAvatar}
                    showSenderName={msg.showSenderName}
                    isGroup={chat.type === 'group'}
                    onLongPress={() => {
                      if (isSelectionMode) return;
                      setSelectedMsgId(msg.id);
                      setShowReactionsId(msg.id);
                    }}
                    onReact={(emoji: string) => onReact(msg.id, emoji)}
                    onJumpToReply={onScrollToMessage}
                    searchQuery={searchQuery}
                    className={cn(isSelectionMode && selectedIds.includes(msg.id) && "brightness-125")}
                  />
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {showScrollToBottom && (
        <button
          onClick={scrollToBottom}
          title="Scroll to latest message"
          aria-label="Scroll to latest message"
          className="absolute bottom-6 right-6 p-2.5 bg-[#00FF00] text-black rounded-full shadow-lg animate-bounce hover:scale-110 transition-transform z-10"
        >
          <ChevronDown size={20} />
        </button>
      )}
    </div>
  );
}
