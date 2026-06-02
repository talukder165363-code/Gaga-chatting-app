import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, MessageCircle } from 'lucide-react'
import { useChatStore } from '@/hooks/useChatStore'
import { useUsersMap } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { formatTime } from '@/lib/utils'

export default function ChatsTab() {
  const navigate = useNavigate()
  const { chats, markAsRead } = useChatStore()
  const { usersMap } = useUsersMap()
  const { user } = useAuth()
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const currentId = user?.id || ''

  const filtered = searchQuery
    ? chats.filter(chat => {
        const otherId = chat.type === 'direct' ? chat.participants.find(p => p !== currentId) : undefined
        const name = chat.type === 'group' ? chat.name : usersMap[otherId || '']?.name || ''
        return name?.toLowerCase().includes(searchQuery.toLowerCase())
      })
    : chats

  const handleChatClick = (chatId: string) => {
    markAsRead(chatId)
    navigate(`/chat/${chatId}`)
  }

  return (
    <div className="flex flex-col bg-black" style={{ height: 'calc(100vh - 4rem)' }}>
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/assets/gaga-logo.jpg" alt="GagaChat" className="w-8 h-8 rounded-full" />
          <h1 className="text-white text-2xl font-bold">Chats</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-white/60 hover:text-white bg-white/5 rounded-full">
            <Bell size={20} />
          </button>
          <button onClick={() => setShowSearch(!showSearch)} className="p-2 text-white/60 hover:text-white bg-white/5 rounded-full">
            <Search size={20} />
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="px-4 pb-3">
          <div className="flex items-center bg-white/10 rounded-xl px-3 py-2 gap-2">
            <Search size={15} className="text-white/40" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-white/30">
            <MessageCircle size={40} className="mb-2" />
            <p>No conversations yet</p>
          </div>
        ) : (
          <div>
            {filtered.map(chat => {
              const otherId = chat.participants.find(p => p !== currentId)
              const otherUser = otherId ? usersMap[otherId] : null
              const name = chat.type === 'group' ? (chat.name || 'Group') : (otherUser?.name || 'Unknown')
              const avatar = chat.avatar || otherUser?.avatar || '/assets/gaga-logo.jpg'
              return (
                <div
                  key={chat.id}
                  onClick={() => handleChatClick(chat.id)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer"
                >
                  <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold truncate">{name}</span>
                      {chat.lastMessage && (
                        <span className="text-xs text-white/40">{formatTime(chat.lastMessage.timestamp)}</span>
                      )}
                    </div>
                    <p className="text-sm text-white/50 truncate">
                      {chat.lastMessage?.content || 'No messages'}
                    </p>
                  </div>
                  {chat.unreadCount > 0 && (
                    <span className="min-w-5 h-5 bg-[#00FF7F] text-black text-xs font-bold rounded-full flex items-center justify-center px-1">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
