import { useState, useMemo } from 'react';
import { Search, Star, UserPlus, MessageCircle, ChevronRight, Users, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import QRScannerPage from '@/pages/QRScannerPage';
import { useUsersMap } from '@/hooks/useUsers';
import { useFriends } from '@/hooks/useFriends';
import { useOnlineUsers } from '@/hooks/usePresence';
import { AddFriendsPage } from '@/components/features/contacts/AddFriendsPage';

interface ContactsPageProps {
  onStartChat: (userId: string) => void;
  onOpenGroupChats?: () => void;
}

const ContactsPage = ({ onStartChat, onOpenGroupChats }: ContactsPageProps) => {
  const [subView, setSubView] = useState<null | 'addFriends' | 'qrScanner'>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { usersMap } = useUsersMap();
  const {
    friends,
    favorites,
    receivedRequests,
    sentRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    addFriend,
    toggleFavorite
  } = useFriends();
  const { onlineUsers } = useOnlineUsers();
  const { user } = useAuth();

  const currentUserId = user?.id;

  const contactsList = useMemo(() => {
    return friends
      .map(id => usersMap[id])
      .filter((u): u is User => Boolean(u))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [friends, usersMap]);

  const favoriteList = useMemo(() => {
    return favorites
      .map(id => usersMap[id])
      .filter((u): u is User => Boolean(u))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [favorites, usersMap]);

  const filteredContacts = contactsList.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.statusMessage && u.statusMessage.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (subView === 'qrScanner') {
    return <QRScannerPage onBack={() => setSubView(null)} onAddFriend={addFriend} />;
  }

  if (subView === 'addFriends') {
    return (
      <AddFriendsPage
        onBack={() => setSubView(null)}
        onShowQR={() => setSubView('qrScanner')}
        onOpenGroups={onOpenGroupChats}
        onInvite={() => {
          navigator.clipboard.writeText(`Check out GaGa Chat! Add me by ID: ${currentUserId}`);
          toast.success('Invite link copied to clipboard');
        }}
        users={Object.values(usersMap).filter(u => u.id !== currentUserId && !friends.includes(u.id))}
        sentRequests={sentRequests}
        onSendRequest={(id) => {
          sendFriendRequest(id);
          setSubView(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between bg-black/80 backdrop-blur-md sticky top-0 z-30">
        <h1 className="text-white text-2xl font-bold">Contacts</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubView('addFriends')}
            className="p-2 text-white/60 hover:text-white transition-colors bg-white/5 rounded-full"
          >
            <UserPlus size={20} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 mb-4">
        <div className="relative group">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#00FF7F] transition-colors" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-[#00FF7F]/50 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {/* Actions */}
        <div className="px-5 mb-6 space-y-1">
          <button
            onClick={() => setSubView('addFriends')}
            className="w-full flex items-center gap-4 py-3 hover:bg-white/5 rounded-xl transition-colors group relative"
          >
            <div className="w-10 h-10 rounded-full bg-[#00FF7F]/10 flex items-center justify-center text-[#00FF7F] group-hover:scale-110 transition-transform">
              <UserPlus size={20} />
            </div>
            <span className="text-white font-medium text-[15px]">Add Friends</span>
            {receivedRequests.length > 0 && (
              <div className="absolute left-12 top-3 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-black animate-bounce">
                {receivedRequests.length}
              </div>
            )}
            <ChevronRight size={18} className="ml-auto text-white/20" />
          </button>
          <button
            onClick={onOpenGroupChats ?? (() => toast.info('Group chats are available in your main Chats tab.'))}
            className="w-full flex items-center gap-4 py-3 hover:bg-white/5 rounded-xl transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
            <span className="text-white font-medium text-[15px]">Group Chats</span>
            <ChevronRight size={18} className="ml-auto text-white/20" />
          </button>
        </div>

        {/* Friend Requests Section */}
        {receivedRequests.length > 0 && (
          <div className="mb-6 px-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-bold text-[#00FF7F] uppercase tracking-[0.2em]">Pending Requests</h2>
              <span className="text-[10px] bg-[#00FF7F]/10 text-[#00FF7F] px-1.5 py-0.5 rounded-md">{receivedRequests.length}</span>
            </div>
            <div className="space-y-2">
              {receivedRequests.map((req) => {
                const sender = usersMap[req.from];
                if (!sender) return null;
                return (
                  <div key={req.id} className="bg-white/5 rounded-2xl p-3 flex items-center gap-3 border border-white/5">
                    <img src={sender.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{sender.name}</p>
                      <p className="text-white/30 text-[10px] uppercase tracking-widest font-black">Wants to be friends</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptFriendRequest(req.id, req.from)}
                        className="p-2 bg-[#00FF7F] text-black rounded-full hover:opacity-90 active:scale-90 transition-all shadow-lg shadow-[#00FF7F]/10"
                      >
                        <MessageCircle size={16} className="fill-current" />
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(req.id)}
                        className="p-2 bg-white/10 text-white/40 rounded-full hover:bg-white/20 active:scale-90 transition-all"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Favorites */}
        {favoriteList.length > 0 && (
          <div className="mb-6">
            <div className="px-5 mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Favorites</h2>
              <span className="text-[10px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded-md">{favoriteList.length}</span>
            </div>
            <div className="divide-y divide-white/5">
              {favoriteList.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  isOnline={Boolean(onlineUsers[user.id])}
                  isFavorite={true}
                  onChat={() => onStartChat(user.id)}
                  onToggleFavorite={() => toggleFavorite(user.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Contacts */}
        <div>
          <div className="px-5 mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-bold text-white/30 uppercase tracking-widest">All Friends</h2>
            <span className="text-[10px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded-md">{filteredContacts.length}</span>
          </div>

          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Users size={32} className="text-white/10" />
              </div>
              <p className="text-white font-bold mb-1">No friends yet</p>
              <p className="text-white/40 text-sm">Add friends to start chatting and seeing their updates.</p>
              <button
                onClick={() => setSubView('addFriends')}
                className="mt-6 gchat-btn px-6 py-2.5 rounded-full text-sm font-bold"
              >
                Find People
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5 pb-20">
              {filteredContacts.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  isOnline={Boolean(onlineUsers[user.id])}
                  isFavorite={favorites.includes(user.id)}
                  onChat={() => onStartChat(user.id)}
                  onToggleFavorite={() => toggleFavorite(user.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const UserRow = ({
  user, isOnline, isFavorite, onChat, onToggleFavorite
}: {
  user: User,
  isOnline: boolean,
  isFavorite: boolean,
  onChat: () => void,
  onToggleFavorite: () => void,
}) => (
  <div
    onClick={onChat}
    className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors cursor-pointer group"
  >
    <div className="relative flex-shrink-0">
      <img src={user.avatar} alt={user.name} className="w-11 h-11 rounded-full object-cover border border-white/10" />
      <div className={cn(
        'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black',
        isOnline ? 'bg-[#00FF7F]' : 'bg-gray-500'
      )} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <p className="font-semibold text-white text-[15px] truncate">{user.name}</p>
        {isFavorite && <Star size={10} className="fill-[#00FF7F] text-[#00FF7F]" />}
      </div>
      <p className="text-[13px] text-white/40 truncate italic">{user.statusMessage || 'Available'}</p>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className={cn("p-2 rounded-full hover:bg-white/10 transition-colors", isFavorite ? "text-[#00FF7F]" : "text-white/20")}
      >
        <Star size={18} fill={isFavorite ? "currentColor" : "none"} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onChat(); }}
        className="p-2 text-white/20 hover:text-[#00FF7F] hover:bg-white/10 rounded-full transition-colors"
      >
        <MessageCircle size={18} />
      </button>
    </div>
  </div>
);

export default ContactsPage;
