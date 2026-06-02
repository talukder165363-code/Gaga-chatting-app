import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Star, UserPlus, MessageCircle, ChevronRight, Users, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

export default function ContactsTab() {
  const navigate = useNavigate()
  const users = useAppStore(s => s.users)
  const currentUser = useAppStore(s => s.currentUser)
  const friends = useAppStore(s => s.friends)
  const favorites = useAppStore(s => s.favorites)
  const friendRequests = useAppStore(s => s.friendRequests)
  const acceptFriendRequest = useAppStore(s => s.acceptFriendRequest)
  const toggleFavorite = useAppStore(s => s.toggleFavorite)
  const startDirectChat = useAppStore(s => s.startDirectChat)
  const [searchQuery, setSearchQuery] = useState('')
  const currentId = currentUser?.id || 'user_1'
  const usersMap = Object.fromEntries(users.map(u => [u.id, u]))

  const pendingRequests = friendRequests.filter(r => r.to === currentId && r.status === 'pending')

  const friendList = friends
    .map(id => usersMap[id])
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))

  const favoriteList = favorites
    .map(id => usersMap[id])
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))

  const filteredFriends = friendList.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.statusMessage && u.statusMessage.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleStartChat = (userId: string) => {
    const chatId = startDirectChat(userId)
    navigate(`/chat/${chatId}`)
  }

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between bg-black/80 backdrop-blur-md sticky top-0 z-30">
        <h1 className="text-white text-2xl font-bold">Contacts</h1>
        <button className="p-2 text-white/60 hover:text-white transition-colors bg-white/5 rounded-full">
          <UserPlus size={20} />
        </button>
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
        {/* Quick Actions */}
        <div className="px-5 mb-6 space-y-1">
          <button className="w-full flex items-center gap-4 py-3 hover:bg-white/5 rounded-xl transition-colors group">
            <div className="w-10 h-10 rounded-full bg-[#00FF7F]/10 flex items-center justify-center text-[#00FF7F] group-hover:scale-110 transition-transform">
              <UserPlus size={20} />
            </div>
            <span className="text-white font-medium text-[15px]">Add Friends</span>
            {pendingRequests.length > 0 && (
              <span className="ml-auto min-w-5 h-5 bg-red-500 rounded-full text-[10px] font-black text-white flex items-center justify-center px-1">{pendingRequests.length}</span>
            )}
            <ChevronRight size={18} className="ml-2 text-white/20" />
          </button>
          <button className="w-full flex items-center gap-4 py-3 hover:bg-white/5 rounded-xl transition-colors group">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
            <span className="text-white font-medium text-[15px]">Group Chats</span>
            <ChevronRight size={18} className="ml-auto text-white/20" />
          </button>
        </div>

        {/* Friend Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-6 px-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-bold text-[#00FF7F] uppercase tracking-[0.2em]">Pending Requests</h2>
              <span className="text-[10px] bg-[#00FF7F]/10 text-[#00FF7F] px-1.5 py-0.5 rounded-md">{pendingRequests.length}</span>
            </div>
            <div className="space-y-2">
              {pendingRequests.map(req => {
                const sender = usersMap[req.from]
                if (!sender) return null
                return (
                  <div key={req.id} className="bg-white/5 rounded-2xl p-3 flex items-center gap-3 border border-white/5">
                    <img src={sender.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{sender.name}</p>
                      <p className="text-white/30 text-[10px] uppercase tracking-widest font-black">Wants to be friends</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptFriendRequest(req.id)} className="p-2 bg-[#00FF7F] text-black rounded-full hover:opacity-90 active:scale-90 transition-all shadow-lg shadow-[#00FF7F]/10">
                        <MessageCircle size={16} className="fill-current" />
                      </button>
                      <button className="p-2 bg-white/10 text-white/40 rounded-full hover:bg-white/20 active:scale-90 transition-all">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Favorites */}
        {favoriteList.length > 0 && !searchQuery && (
          <div className="mb-6">
            <div className="px-5 mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Favorites</h2>
              <span className="text-[10px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded-md">{favoriteList.length}</span>
            </div>
            <div className="divide-y divide-white/5">
              {favoriteList.map(user => (
                <UserRow key={user.id} user={user} isFavorite={true} onChat={() => handleStartChat(user.id)} onToggleFav={() => toggleFavorite(user.id)} />
              ))}
            </div>
          </div>
        )}

        {/* All Friends */}
        <div>
          <div className="px-5 mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-bold text-white/30 uppercase tracking-widest">All Friends</h2>
            <span className="text-[10px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded-md">{filteredFriends.length}</span>
          </div>

          {filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Users size={32} className="text-white/10" />
              </div>
              <p className="text-white font-bold mb-1">No friends yet</p>
              <p className="text-white/40 text-sm">Add friends to start chatting.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 pb-20">
              {filteredFriends.map(user => (
                <UserRow key={user.id} user={user} isFavorite={favorites.includes(user.id)} onChat={() => handleStartChat(user.id)} onToggleFav={() => toggleFavorite(user.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UserRow({
  user,
  isFavorite,
  onChat,
  onToggleFav,
}: {
  user: { id: string; name: string; avatar: string; status: string; statusMessage?: string };
  isFavorite: boolean;
  onChat: () => void;
  onToggleFav: () => void;
}) {


  return (
    <div onClick={onChat} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/5 transition-colors cursor-pointer group">
      <div className="relative flex-shrink-0">
        <img src={user.avatar} alt={user.name} className="w-11 h-11 rounded-full object-cover border border-white/10" />
        <div className={cn('absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black', user.status === 'online' ? 'bg-[#00FF7F]' : 'bg-gray-500')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-white text-[15px] truncate">{user.name}</p>
          {isFavorite && <Star size={10} className="fill-[#00FF7F] text-[#00FF7F]" />}
        </div>
        <p className="text-[13px] text-white/40 truncate italic">{user.statusMessage || 'Available'}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onToggleFav(); }} className={cn("p-2 rounded-full hover:bg-white/10 transition-colors", isFavorite ? "text-[#00FF7F]" : "text-white/20")}>
          <Star size={18} fill={isFavorite ? "currentColor" : "none"} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onChat(); }} className="p-2 text-white/20 hover:text-[#00FF7F] hover:bg-white/10 rounded-full transition-colors">
          <MessageCircle size={18} />
        </button>
      </div>
    </div>
  )
}
