import { useEffect, useState } from 'react';
import { Pin, Volume2, VolumeX, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { cn, formatTime, getChatAvatar, getChatName } from '@/lib/utils';
import { useUsersMap } from '@/hooks/useUsers';
import { useTyping } from '@/hooks/useTyping';
import { useAuth } from '@/hooks/useAuth';
import type { Chat } from '@/types';

interface ChatListItemProps {
  chat: Chat;
  onlineUsers?: Set<string> | Record<string, boolean>;
  onClick: () => void;
  onPin?: () => void;
  onMute?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  isArchived?: boolean;
}

const ChatListItem = ({ chat, onlineUsers, onClick, onPin, onMute, onDelete, onArchive, isArchived }: ChatListItemProps) => {
  const [showActions, setShowActions] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const { usersMap } = useUsersMap();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const { typingUsers } = useTyping(chat.id);
  const isTyping = Object.keys(typingUsers).length > 0;
  const typingText = isTyping ? `${Object.values(typingUsers)[0]} is typing...` : '';

  const chatName = getChatName(chat, usersMap, currentUserId);
  const chatAvatar = getChatAvatar(chat, usersMap, currentUserId);
  const otherId = chat.type === 'direct' ? chat.participants.find(p => p !== (currentUserId || '')) : undefined;
  const otherParticipant = otherId ? usersMap[otherId] : null;
  const isOnline = otherId ? (onlineUsers instanceof Set ? onlineUsers.has(otherId) : onlineUsers?.[otherId]) ?? otherParticipant?.status === 'online' : false;
  const lastMsg = chat.lastMessage;
  const lastMsgSender = lastMsg ? usersMap[lastMsg.senderId] : null;

  const getMessagePreview = () => {
    if (!lastMsg) return 'No messages yet';
    if (lastMsg.type === 'image') return '📷 Photo';
    if (lastMsg.type === 'sticker') return `${lastMsg.content} Sticker`;
    if (lastMsg.type === 'voice') return '🎤 Voice message';
    if (lastMsg.type === 'video') return '📹 Video';
    if (lastMsg.type === 'file') return '📄 File';
    return lastMsg.content;
  };

  const senderPrefix = () => {
    if (!lastMsg) return '';
    if (chat.type === 'group' && lastMsg.senderId !== currentUserId) {
      return `${lastMsgSender?.name?.split(' ')[0] || 'Unknown'}: `;
    }
    if (lastMsg.senderId === currentUserId) return 'You: ';
    return '';
  };

  return (
    <div className="relative" onContextMenu={e => { e.preventDefault(); setShowActions(!showActions); }}>
      {showActions && (
        <div className="fixed inset-0 z-[9]" onClick={() => setShowActions(false)} />
      )}
      <div
        onClick={() => { setShowActions(false); onClick(); }}
        className={cn(
          'flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors duration-150 bg-black hover:bg-white/5 active:bg-white/10',
          isArchived && 'opacity-70'
        )}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img src={chatAvatar} alt={chatName} className="w-12 h-12 rounded-full object-cover bg-white/10" />
          {chat.type === 'direct' && (
            <div className={cn(
              'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-black',
              isOnline ? 'bg-emerald-400' : 'bg-gray-600'
            )} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[15px] font-semibold text-white truncate">{chatName}</span>
              {chat.isPinned && <Pin size={10} className="text-white/30 flex-shrink-0" />}
              {chat.isMuted && <VolumeX size={10} className="text-white/30 flex-shrink-0" />}
              {isArchived && <Archive size={10} className="text-white/30 flex-shrink-0" />}
            </div>
            {lastMsg && (
              <span className={cn(
                'text-[12px] flex-shrink-0',
                chat.unreadCount > 0 ? 'text-emerald-400' : 'text-white/30'
              )}>
                {formatTime(lastMsg.timestamp)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            {isTyping ? (
              <p className="text-[13px] truncate flex-1 text-emerald-400 font-medium animate-pulse">
                {typingText}
              </p>
            ) : (
              <p className={cn(
                'text-[13px] truncate flex-1',
                chat.unreadCount > 0 ? 'text-white/80 font-medium' : 'text-white/40'
              )}>
                {senderPrefix()}{getMessagePreview()}
              </p>
            )}
            {chat.unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] bg-emerald-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Context Actions */}
      {showActions && (
        <div className="absolute right-4 top-12 bg-[#222] rounded-xl shadow-xl border border-white/10 z-10 overflow-hidden animate-scale-in min-w-[170px]">
          <button onClick={() => { onPin?.(); setShowActions(false); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors">
            <Pin size={16} />
            {chat.isPinned ? 'Unpin' : 'Pin'}
          </button>
          <button onClick={() => { onMute?.(); setShowActions(false); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors border-t border-white/10">
            {chat.isMuted ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {chat.isMuted ? 'Unmute' : 'Mute'}
          </button>
          {onArchive && (
            <button onClick={() => { onArchive(); setShowActions(false); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white hover:bg-white/10 transition-colors border-t border-white/10">
              {isArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              {isArchived ? 'Unarchive' : 'Archive'}
            </button>
          )}
          <button onClick={() => { onDelete?.(); setShowActions(false); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/10">
            <Trash2 size={16} />
            Delete Chat
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatListItem;
