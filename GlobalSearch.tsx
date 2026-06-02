import { useState, useMemo } from 'react';
import { Search, X, MessageCircle, ChevronRight, History } from 'lucide-react';
import { cn, getDefaultAvatar } from '@/lib/utils';
import type { Chat, Message } from '@/types';
import { useUsersMap } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Chat[];
  messages: Record<string, Message[]>;
  onChatSelect: (chat: Chat) => void;
  onUserSelect: (userId: string) => void;
}

export function GlobalSearch({
  isOpen,
  onClose,
  chats,
  messages,
  onChatSelect,
  onUserSelect
}: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'chats' | 'messages' | 'people'>('all');
  const { usersMap } = useUsersMap();
  const { user } = useAuth();
  const myId = user?.id;

  const results = useMemo(() => {
    if (!query.trim()) return { chats: [], messages: [], people: [] };
    const q = query.toLowerCase();

    const matchedChats = chats.filter(c => {
      if (c.type === 'group' && c.name?.toLowerCase().includes(q)) return true;
      if (c.type === 'direct') {
        const otherId = c.participants.find(p => p !== myId);
        const other = otherId ? usersMap[otherId] : null;
        return other?.name.toLowerCase().includes(q) || other?.displayName?.toLowerCase().includes(q);
      }
      return false;
    });

    const matchedMessages: { msg: Message, chat: Chat }[] = [];
    Object.entries(messages).forEach(([chatId, msgs]) => {
      const chat = chats.find(c => c.id === chatId);
      if (!chat) return;
      msgs.forEach(m => {
        if (m.type === 'text' && m.content.toLowerCase().includes(q)) {
          matchedMessages.push({ msg: m, chat });
        }
      });
    });

    const matchedPeople = Object.values(usersMap).filter(u => 
      u.id !== myId && 
      (u.name.toLowerCase().includes(q) || u.displayName?.toLowerCase().includes(q))
    );

    return { chats: matchedChats, messages: matchedMessages, people: matchedPeople };
  }, [query, chats, messages, usersMap, myId]);

  if (!isOpen) return null;

  const getChatDisplay = (chat: Chat) => {
    if (chat.type === 'group') return { name: chat.name || 'Group', avatar: chat.avatar || '/assets/gaga-logo.jpg' };
    const otherId = chat.participants.find(p => p !== myId);
    const other = otherId ? usersMap[otherId] : null;
    return { name: other?.name || 'Chat', avatar: other?.avatar || getDefaultAvatar(otherId || 'unknown') };
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl animate-fade-in flex flex-col">
      {/* Search Header */}
      <div className="px-4 pt-12 pb-4 flex items-center gap-3 border-b border-white/5">
        <div className="flex-1 relative group">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#00FF7F] transition-colors" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search messages, people, groups..."
            className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-12 pr-12 py-4 text-sm outline-none focus:border-[#00FF7F]/50 transition-all"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
              <X size={20} />
            </button>
          )}
        </div>
        <button onClick={onClose} className="p-2 text-white/60 hover:text-white font-bold text-sm">
          Cancel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-white/5">
        {(['all', 'chats', 'people', 'messages'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === tab ? "bg-[#00FF7F] text-black" : "bg-white/5 text-white/40 hover:bg-white/10"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4">
        {!query ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/20">
            <History size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-[0.2em]">Recent searches will appear here</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Chats Section */}
            {(activeTab === 'all' || activeTab === 'chats') && results.chats.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 px-2">Chats & Groups</h3>
                <div className="space-y-1">
                  {results.chats.map(chat => {
                    const { name, avatar } = getChatDisplay(chat);
                    return (
                      <button
                        key={chat.id}
                        onClick={() => { onChatSelect(chat); onClose(); }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl transition-colors group"
                      >
                        <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        <div className="flex-1 text-left">
                          <p className="text-white font-semibold text-sm">{name}</p>
                          <p className="text-white/40 text-xs truncate">{chat.type === 'group' ? `${chat.participants.length} members` : 'Direct message'}</p>
                        </div>
                        <ChevronRight size={16} className="text-white/20 group-hover:translate-x-1 transition-transform" />
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* People Section */}
            {(activeTab === 'all' || activeTab === 'people') && results.people.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 px-2">People</h3>
                <div className="space-y-1">
                  {results.people.map(user => (
                    <button 
                      key={user.id} 
                      onClick={() => { onUserSelect(user.id); onClose(); }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl transition-colors group"
                    >
                      <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      <div className="flex-1 text-left">
                        <p className="text-white font-semibold text-sm">{user.name}</p>
                        <p className="text-white/40 text-xs truncate">{user.statusMessage || 'Available'}</p>
                      </div>
                      <ChevronRight size={16} className="text-white/20 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Messages Section */}
            {(activeTab === 'all' || activeTab === 'messages') && results.messages.length > 0 && (
              <section>
                <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 px-2">Messages</h3>
                <div className="space-y-1">
                  {results.messages.map(({ msg, chat }) => (
                    <button 
                      key={msg.id} 
                      onClick={() => { onChatSelect(chat); onClose(); }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                        <MessageCircle size={20} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <p className="text-white font-semibold text-sm">{chat.name || 'Chat'}</p>
                          <span className="text-[10px] text-white/20">{msg.timestamp.toLocaleDateString()}</span>
                        </div>
                        <p className="text-white/60 text-xs truncate italic">"{msg.content}"</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* No Results */}
            {query && results.chats.length === 0 && results.people.length === 0 && results.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-white/20">
                <Search size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-[0.2em]">No results found for "{query}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
