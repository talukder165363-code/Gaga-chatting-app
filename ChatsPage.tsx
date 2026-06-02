import { useState } from 'react';
import { Search, X, Users, Plus, MessageCircle, Archive, Bell, CheckCheck } from 'lucide-react';
import ChatListItem from '@/components/features/ChatListItem';
import StoryCircle from '@/components/features/StoryCircle';
import { NotificationCenter } from '@/components/features/NotificationCenter';
import type { Chat } from '@/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useOnlineUsers } from '@/hooks/usePresence';
import { useUsersMap } from '@/hooks/useUsers';
import { useNotificationCenter } from '@/hooks/useNotificationCenter';
import { useAuth } from '@/hooks/useAuth';

interface ChatsPageProps {
  chats: Chat[];
  archivedChats: Chat[];
  loading?: boolean;
  onChatSelect: (chat: Chat) => void;
  onPin: (chatId: string) => void;
  onMute: (chatId: string) => void;
  onArchive: (chatId: string) => void;
  onDelete: (chatId: string) => void;
  onCreateGroup: (name: string, participants: string[]) => void;
  onMarkAllRead: () => void;
  onStartDirectChat: (userId: string) => void;
  onSearchClick: () => void;
}

const ChatsPage = ({
  chats, archivedChats, loading, onChatSelect, onPin, onMute, onArchive, onDelete, onCreateGroup, onMarkAllRead, onStartDirectChat, onSearchClick
}: ChatsPageProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { usersMap } = useUsersMap();
  const { unreadCount: notifCount } = useNotificationCenter();
  const { user } = useAuth();

  // Collect all participant IDs across chats for online presence tracking
  const allParticipantIds = Array.from(
    new Set([...chats, ...archivedChats].flatMap(c => c.participants))
  ).filter(id => id !== user?.id);
  const { onlineUsers } = useOnlineUsers(allParticipantIds);

  const displayChats = showArchived ? archivedChats : chats;

  const sortedChats = [...displayChats].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const aTime = a.lastMessage?.timestamp?.getTime() || 0;
    const bTime = b.lastMessage?.timestamp?.getTime() || 0;
    return bTime - aTime;
  });

  const currentUserId = user?.id;
  const filteredChats = sortedChats.filter(chat => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (chat.type === 'group') return chat.name?.toLowerCase().includes(q) || chat.lastMessage?.content?.toLowerCase().includes(q);
    const otherId = chat.participants.find(p => p !== currentUserId);
    const otherUser = otherId ? usersMap[otherId] : null;
    return otherUser?.name.toLowerCase().includes(q) || chat.lastMessage?.content?.toLowerCase().includes(q);
  });

  const handleCreateGroup = () => {
    if (!groupName.trim() || selectedParticipants.length === 0) return;
    onCreateGroup(groupName.trim(), selectedParticipants);
    setShowNewGroup(false);
    setGroupName('');
    setSelectedParticipants([]);
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between bg-black/80 backdrop-blur-md sticky top-0 z-30">
        <h1 className="text-white text-2xl font-bold">Chats</h1>
        <div className="flex items-center gap-2">
          {!showArchived && chats.some(c => c.unreadCount > 0) && (
            <button
              onClick={onMarkAllRead}
              className="p-2 text-white/60 hover:text-[#00FF7F] transition-colors bg-white/5 rounded-full"
              title="Mark all as read"
            >
              <CheckCheck size={20} />
            </button>
          )}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-2 text-white/60 hover:text-white transition-colors bg-white/5 rounded-full"
          >
            <Bell size={20} />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              onSearchClick();
              setShowSearch(true);
            }}
            className="p-2 text-white/60 hover:text-white transition-colors bg-white/5 rounded-full"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 text-white/60 hover:text-white transition-colors bg-white/5 rounded-full"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="px-4 pb-3 animate-slide-in">
          <div className="flex items-center bg-white/10 rounded-xl px-3 py-2.5 gap-2">
            <Search size={15} className="text-white/40 flex-shrink-0" />
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="flex-1 bg-transparent text-[14px] text-white placeholder-white/30 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} aria-label="Clear search">
                <X size={14} className="text-white/40" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Archive Toggle */}
      <div className="px-4 pb-2 flex items-center gap-2">
        <button
          onClick={() => { setShowArchived(false); setShowSearch(false); }}
          className={cn(
            'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
            !showArchived ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
          )}
        >
          Chats
        </button>
        <button
          onClick={() => setShowArchived(true)}
          className={cn(
            'px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1',
            showArchived ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
          )}
        >
          <Archive size={14} />
          Archived {archivedChats.length > 0 && `(${archivedChats.length})`}
        </button>
      </div>

      {/* Stories */}
      {!showSearch && !showArchived && (
        <StoryCircle />
      )}

      {/* Main List */}
      <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide bg-black">
        {loading ? (
          <div className="divide-y divide-white/5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="w-14 h-14 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-32 bg-white/10" />
                    <Skeleton className="h-3 w-12 bg-white/10" />
                  </div>
                  <Skeleton className="h-3 w-full max-w-[200px] bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-white/30 px-8 text-center">
            {showArchived ? <Archive size={44} className="opacity-30 mb-3" /> : <MessageCircle size={44} className="opacity-30 mb-3" />}
            <p className="text-base font-semibold text-white/40 mt-1">
              {showArchived ? 'No archived chats' : searchQuery ? 'No chats found' : 'No conversations yet'}
            </p>
            {!showArchived && !searchQuery && (
              <p className="text-sm mt-1 text-white/25">Tap the pencil icon to start a new chat</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredChats.map(chat => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                onlineUsers={onlineUsers}
                onClick={() => onChatSelect(chat)}
                onPin={() => onPin(chat.id)}
                onMute={() => onMute(chat.id)}
                onArchive={() => onArchive(chat.id)}
                onDelete={() => onDelete(chat.id)}
                isArchived={showArchived}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB — new chat */}
      {!showArchived && (
        <button
          onClick={() => setShowNewChat(true)}
          className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[#00FF7F] to-[#22D3EE] flex items-center justify-center shadow-[0_8px_24px_rgba(0,255,127,0.4)] hover:opacity-90 transition active:scale-95"
          aria-label="New chat or group"
        >
          <Plus size={26} className="text-black" />
        </button>
      )}

      {showNotifications && (
        <NotificationCenter
          onClose={() => setShowNotifications(false)}
          onNavigateToChat={(chatId) => {
            const chat = chats.find(c => c.id === chatId);
            if (chat) onChatSelect(chat);
          }}
        />
      )}

      {/* New Chat Picker */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end animate-fade-in" onClick={e => { if (e.target === e.currentTarget) setShowNewChat(false); }}>
          <div className="bg-[#1a1a1a] border-t border-white/10 rounded-t-3xl w-full max-h-[85vh] flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">New Chat</h2>
              <button onClick={() => setShowNewChat(false)} aria-label="Close"><X size={20} className="text-gray-500" /></button>
            </div>
            <button
              onClick={() => { setShowNewChat(false); setShowNewGroup(true); }}
              className="flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors border-b border-white/10"
            >
              <div className="w-10 h-10 rounded-full gchat-btn flex items-center justify-center flex-shrink-0">
                <Users size={18} className="text-black" />
              </div>
              <div className="text-left">
                <p className="text-white font-medium">New Group</p>
                <p className="text-white/40 text-xs">Create a group conversation</p>
              </div>
            </button>
            <p className="px-5 py-2 text-xs text-white/40 font-medium">START DIRECT CHAT</p>
            <div className="flex-1 overflow-y-auto">
              {Object.values(usersMap).filter(u => u.id !== currentUserId).map(user => (
                <div
                  key={user.id}
                  onClick={() => { onStartDirectChat(user.id); setShowNewChat(false); }}
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5"
                >
                  <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <p className="text-xs text-white/40 truncate">{user.statusMessage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Group Modal */}
      {showNewGroup && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end animate-fade-in" onClick={e => { if (e.target === e.currentTarget) setShowNewGroup(false); }}>
          <div className="bg-[#1a1a1a] border-t border-white/10 rounded-t-3xl w-full max-h-[85vh] flex flex-col animate-slide-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">New Group</h2>
              <button onClick={() => setShowNewGroup(false)} aria-label="Close group creation">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="px-5 py-4 border-b border-white/10">
              <input
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Group name"
                className="w-full text-sm bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 outline-none focus:border-line-green transition-colors placeholder-white/30"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              <p className="px-5 py-2 text-xs text-white/40 font-medium">SELECT MEMBERS</p>
              {Object.values(usersMap).filter(user => user.id !== currentUserId).map(user => (
                <div
                  key={user.id}
                  onClick={() => setSelectedParticipants(prev =>
                    prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                  )}
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-white/40">{user.statusMessage}</p>
                  </div>
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                    selectedParticipants.includes(user.id)
                      ? 'bg-[#00FF00] border-[#00FF00]'
                      : 'border-gray-300'
                  )}>
                    {selectedParticipants.includes(user.id) && (
                      <span className="text-white text-xs">✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-white/10">
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedParticipants.length === 0}
                className="w-full gchat-btn py-3.5 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
              >
                Create Group ({selectedParticipants.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatsPage;
