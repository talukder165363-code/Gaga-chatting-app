import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing, Search, Plus, ChevronLeft } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'
import { auth, db, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from '@/lib/firebase'
import type { QuerySnapshot, FirestoreData, TimestampType } from '@/lib/firebase'
import type { CallRecord } from '@/types'
import { formatTime, formatDuration, cn } from '@/lib/utils'

export default function CallsTab() {
  const navigate = useNavigate()
  const { users, usersMap } = useUsers()
  const currentId = auth.currentUser?.uid || ''
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [filter, setFilter] = useState<'all' | 'missed'>('all')
  const [showNewCall, setShowNewCall] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!currentId) return
    const q = query(
      collection(db, 'calls'),
      where('participants', 'array-contains', currentId),
      orderBy('timestamp', 'desc'),
    )
    const unsub = onSnapshot(q, snap => {
      const qs = snap as QuerySnapshot<FirestoreData>
      setCalls(qs.docs.map(d => {
        const data = d.data() as Record<string, unknown>
        const ts = data.timestamp as TimestampType | undefined
        return {
          id: d.id,
          userId: (data.userId as string) || '',
          type: (data.type as 'voice' | 'video') || 'voice',
          direction: (data.direction as CallRecord['direction']) || 'outgoing',
          timestamp: ts?.toDate?.() ?? new Date(),
          duration: data.duration as number | undefined,
        }
      }))
    })
    return unsub
  }, [currentId])

  const startCall = async (userId: string, type: 'voice' | 'video') => {
    if (!currentId) return
    const ref = await addDoc(collection(db, 'calls'), {
      userId,
      type,
      direction: 'outgoing',
      participants: [currentId, userId],
      from: currentId,
      to: userId,
      status: 'calling',
      timestamp: serverTimestamp(),
    })
    navigate(`/call/${ref.id}`)
  }

  const filtered = calls.filter(c => {
    if (filter === 'missed' && c.direction !== 'missed') return false
    if (searchQuery) {
      const user = usersMap[c.userId]
      return user?.name.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  const DirectionIcon = (dir: string) => {
    switch (dir) {
      case 'missed': return <PhoneMissed size={12} className="text-red-400" />
      case 'incoming': return <PhoneIncoming size={12} className="text-[#00FF7F]" />
      default: return <PhoneOutgoing size={12} className="text-blue-400" />
    }
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="px-5 pt-12 pb-3 flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">Calls</h1>
        <button className="p-2 text-white/60 hover:text-white transition-colors" onClick={() => setShowNewCall(true)}>
          <Plus size={22} />
        </button>
      </div>

      <div className="flex px-5 gap-1 mb-2">
        {(['all', 'missed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all', filter === f ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60')}>
            {f === 'all' ? 'All' : 'Missed'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center pb-20">
            <Phone size={48} className="text-white/20 mb-4" />
            <h2 className="text-white text-[20px] font-bold mb-2">{filter === 'missed' ? 'No missed calls' : 'No calls yet'}</h2>
            <p className="text-white/40 text-[14px]">{filter === 'missed' ? "You're all caught up!" : 'Start a call by tapping the + button'}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(record => {
              const user = usersMap[record.userId]
              if (!user) return null
              return (
                <div key={record.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors">
                  <div className="relative flex-shrink-0">
                    <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                    <div className={cn('absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center', record.type === 'video' ? 'bg-blue-500' : 'bg-[#00CC00]')}>
                      {record.type === 'video' ? <Video size={10} className="text-white" /> : <Phone size={10} className="text-white" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-semibold text-[15px] truncate', record.direction === 'missed' ? 'text-red-400' : 'text-white')}>{user.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {DirectionIcon(record.direction)}
                      <span className="text-[13px] text-white/40 capitalize">
                        {record.direction}{record.duration ? ` · ${formatDuration(record.duration)}` : ''}
                      </span>
                      <span className="text-white/20 text-xs">·</span>
                      <span className="text-[13px] text-white/40">{formatTime(record.timestamp)}</span>
                    </div>
                  </div>
                  <button onClick={() => startCall(user.id, record.type)} className="p-2.5 rounded-full text-white/60 hover:bg-white/10 hover:text-[#00FF7F] transition-colors flex-shrink-0">
                    {record.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showNewCall && (
        <div className="fixed inset-0 z-50 bg-black/70 flex flex-col animate-fade-in">
          <div className="bg-[#111] flex-1 flex flex-col animate-slide-up rounded-t-3xl mt-20">
            <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-white/10">
              <button onClick={() => setShowNewCall(false)}><ChevronLeft size={24} className="text-white" /></button>
              <h2 className="text-white text-lg font-bold flex-1">New Call</h2>
            </div>
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center bg-white/10 rounded-xl px-3 py-2.5 gap-2">
                <Search size={15} className="text-white/40 flex-shrink-0" />
                <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search contacts..." className="flex-1 bg-transparent text-[14px] text-white placeholder-white/30 outline-none" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {users.filter(u => u.id !== currentId && (!searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()))).map(user => (
                <div key={user.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5">
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-[15px] truncate">{user.name}</p>
                    <p className="text-white/40 text-[13px] truncate">{user.statusMessage}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { startCall(user.id, 'voice'); setShowNewCall(false) }} className="p-2.5 rounded-full bg-[#00CC00]/20 text-[#00FF00] hover:bg-[#00CC00]/30 transition-colors">
                      <Phone size={18} />
                    </button>
                    <button onClick={() => { startCall(user.id, 'video'); setShowNewCall(false) }} className="p-2.5 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors">
                      <Video size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
