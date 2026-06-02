import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing, Plus, Search, X, ChevronLeft, Trash2, MoreVertical } from 'lucide-react';
import type { User, CallRecord } from '@/types';
import { cn, formatTime, formatDuration } from '@/lib/utils';
import { db, collection, query, orderBy, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, writeBatch, getDocs } from '@/lib/firebase';
import type { FirestoreData, QuerySnapshot, TimestampType } from '@/lib/firebase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// Firestore call documents historically used slightly different schemas.
// Keep the shared `CallRecord` type strict, but tolerate extra fields at the page level.
// Also, Firestore `timestamp` is `Timestamp`, but our UI model uses `Date`.
type CallRecordWithOptionalFrom = Omit<CallRecord, 'timestamp'> & {
  from?: string;
  timestamp?: TimestampType | Date;
};

import { useUsersMap } from '@/hooks/useUsers';

const CallsPage = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNewCall, setShowNewCall] = useState(false);
  const [newCallSearch, setNewCallSearch] = useState('');
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const { usersMap } = useUsersMap();
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  const contacts = Object.values(usersMap).filter((u) => u.id !== currentUserId);

  const filteredContacts = contacts.filter(u => !newCallSearch || u.name.toLowerCase().includes(newCallSearch.toLowerCase()));

  const handleDeleteRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'calls', id));
      toast.success('Call record deleted');
    } catch (error) {
      console.error('Failed to delete call record', error);
      toast.error('Failed to delete call record');
    }
  };

  const handleClearHistory = async () => {
    if (!currentUserId) return;
    if (!window.confirm('Are you sure you want to clear your entire call history?')) return;

    try {
      const q = query(
        collection(db, 'calls'),
        where('participants', 'array-contains', currentUserId)
      );
      const snap = await getDocs(q);
      const batch = writeBatch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      toast.success('Call history cleared');
      setShowOptions(false);
    } catch (error) {
      console.error('Failed to clear call history', error);
      toast.error('Failed to clear call history');
    }
  };



  const startCall = async (target: User, type: 'voice' | 'video') => {
    if (!currentUserId) return;

    try {
      const docRef = await addDoc(collection(db, 'calls'), {
        userId: target.id,
        type,
        direction: 'outgoing',
        timestamp: serverTimestamp(),
        duration: null,
        from: currentUserId,
        to: target.id,
        participants: [currentUserId, target.id],
        status: 'calling',
      });
      navigate(`/call/${docRef.id}`, { replace: true });
    } catch (error) {
      console.error('Failed to start call', error);
      toast.error('Unable to start call.');
    }
  };

  const filtered = callRecords.filter(record => {
    if (filter === 'missed' && record.direction !== 'missed') return false;
    if (searchQuery) {
      const user = usersMap[record.userId];
      return user?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  useEffect(() => {
    if (!currentUserId) return;
    const q = query(
      collection(db, 'calls'),
      where('participants', 'array-contains', currentUserId),
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const querySnapshot = snap as QuerySnapshot<FirestoreData>;
      const records = querySnapshot.docs
        .map((doc) => {
          const data = doc.data() as Partial<CallRecordWithOptionalFrom>;
          return {
            id: doc.id,
            userId: data.userId as string,
            // tolerate historical schema field; we only use it for resolution
            from: data.from as string | undefined,
            type: data.type as 'voice' | 'video',
            direction: data.direction as 'incoming' | 'outgoing' | 'missed',
            timestamp:
              (() => {
                const ts = data.timestamp as unknown;
                if (typeof ts === 'object' && ts && 'toDate' in ts) {
                  const toDate = (ts as { toDate?: unknown }).toDate;
                  if (typeof toDate === 'function') return (toDate as () => Date)();
                }
                const maybeDate = ts as Date;
                return typeof (maybeDate as Date).getTime === 'function'
                  ? maybeDate
                  : new Date();
              })(),
            duration: data.duration as number | undefined,
          } satisfies CallRecordWithOptionalFrom;
        })
        // Strip optional page-level fields before storing in strict state.
        .map(({ from: _from, ...record }: CallRecordWithOptionalFrom) => {
          void _from;
          return record as CallRecord;
        });

      setCallRecords(records);
    });

    return unsub;
  }, [currentUserId]);


  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex items-center justify-between relative">
        <h1 className="text-white text-xl font-bold">Calls</h1>
        <div className="flex items-center gap-1">
          <button
            className="p-2 text-white/60 hover:text-white transition-colors"
            onClick={() => { setShowSearch(s => !s); setSearchQuery(''); }}
            aria-label="Toggle call search"
          >
            <Search size={20} />
          </button>
          <button
            className="p-2 text-white/60 hover:text-white transition-colors"
            onClick={() => setShowNewCall(true)}
            aria-label="Start new call"
          >
            <Plus size={22} />
          </button>
          <div className="relative">
            <button
              className="p-2 text-white/60 hover:text-white transition-colors"
              onClick={() => setShowOptions(!showOptions)}
              aria-label="More options"
            >
              <MoreVertical size={20} />
            </button>
            {showOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in duration-200">
                <button
                  onClick={handleClearHistory}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors"
                >
                  <Trash2 size={16} />
                  Clear History
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="px-4 pb-3 animate-slide-in">
          <div className="flex items-center bg-white/10 rounded-xl px-3 py-2.5 gap-2">
            <Search size={15} className="text-white/40 flex-shrink-0" />
            <input
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search call history..."
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

      {/* Filter tabs */}
      <div className="flex px-5 gap-1 mb-2">
        {(['all', 'missed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
              filter === f ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
            )}
          >
            {f === 'all' ? 'All' : 'Missed'}
          </button>
        ))}
      </div>

      {/* Call list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center pb-20">
            {filter === 'missed'
              ? <PhoneMissed size={48} className="text-red-400/40 mb-4" />
              : <Phone size={48} className="text-white/20 mb-4" />}
            <h2 className="text-white text-[20px] font-bold mb-2">
              {filter === 'missed' ? 'No missed calls' : 'No calls yet'}
            </h2>
            <p className="text-white/40 text-[14px] leading-relaxed">
              {filter === 'missed' ? "You're all caught up!" : 'Start a call by tapping the + button above'}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => setShowNewCall(true)}
                className="mt-5 flex items-center gap-2 gchat-btn px-6 py-2.5 rounded-full text-sm font-semibold"
              >
                <Phone size={16} /> New Call
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(record => {
              // Prefer the “other participant” (recipient) when rendering.
              // Since `CallRecord` doesn't include `from`, we only have `userId`.
              // - For historical docs that stored the other side in `userId`, this works.
              // - For docs that stored the current user in `userId`, we fall back to showing nothing.
              const otherId = record.userId !== currentUserId ? record.userId : '';
              const user = otherId ? usersMap[otherId] : undefined;
              if (!user) return null;
              const DirectionIcon =
                record.direction === 'missed' ? PhoneMissed
                  : record.direction === 'incoming' ? PhoneIncoming
                    : PhoneOutgoing;
              return (
                <div key={record.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors">
                  <div className="relative flex-shrink-0">
                    <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                    <div className={cn(
                      'absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-black flex items-center justify-center',
                      record.type === 'video' ? 'bg-blue-500' : 'bg-[#00CC00]'
                    )}>
                      {record.type === 'video'
                        ? <Video size={10} className="text-white" />
                        : <Phone size={10} className="text-white" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-semibold text-[15px] truncate', record.direction === 'missed' ? 'text-red-400' : 'text-white')}>
                      {user.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <DirectionIcon size={12} className={cn(
                        record.direction === 'missed' ? 'text-red-400'
                          : record.direction === 'incoming' ? 'text-emerald-400'
                            : 'text-blue-400'
                      )} />
                      <span className="text-[13px] text-white/40 capitalize">
                        {record.direction}{record.duration ? ` · ${formatDuration(record.duration)}` : ''}
                      </span>
                      <span className="text-white/20 text-xs">·</span>
                      <span className="text-[13px] text-white/40">{formatTime(record.timestamp)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/call/${record.id}`)}
                      className="p-2.5 rounded-full text-white/60 hover:bg-white/10 hover:text-white transition-colors flex-shrink-0"
                    >
                      {record.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
                    </button>
                    <button
                      onClick={() => handleDeleteRecord(record.id)}
                      className="p-2.5 rounded-full text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
                      aria-label="Delete call record"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Call Modal */}
      {showNewCall && (
        <div className="fixed inset-0 z-50 bg-black/70 flex flex-col animate-fade-in">
          <div className="bg-[#111] flex-1 flex flex-col animate-slide-in">
            <div className="flex items-center gap-3 px-4 pt-12 pb-4 border-b border-white/10">
              <button onClick={() => { setShowNewCall(false); setNewCallSearch(''); }} aria-label="Close new call">
                <ChevronLeft size={24} className="text-white" />
              </button>
              <h2 className="text-white text-lg font-bold flex-1">New Call</h2>
            </div>
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center bg-white/10 rounded-xl px-3 py-2.5 gap-2">
                <Search size={15} className="text-white/40 flex-shrink-0" />
                <input
                  autoFocus
                  value={newCallSearch}
                  onChange={e => setNewCallSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="flex-1 bg-transparent text-[14px] text-white placeholder-white/30 outline-none"
                />
                {newCallSearch && <button onClick={() => setNewCallSearch('')} aria-label="Clear contact search"><X size={14} className="text-white/40" /></button>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-white/30">
                  <p className="text-sm">No contacts found</p>
                </div>
              ) : (
                filteredContacts.map(user => (
                  <div key={user.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5">
                    <div className="relative flex-shrink-0">
                      <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                      <div className={cn(
                        'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-black',
                        user.status === 'online' ? 'bg-emerald-400' : 'bg-gray-600'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-[15px] truncate">{user.name}</p>
                      <p className="text-white/40 text-[13px] truncate">{user.statusMessage}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { startCall(user, 'voice'); setShowNewCall(false); }}
                        className="p-2.5 rounded-full bg-[#00CC00]/20 text-[#00FF00] hover:bg-[#00CC00]/30 transition-colors"
                        aria-label="Start audio call"
                      >
                        <Phone size={18} />
                      </button>
                      <button
                        onClick={() => { startCall(user, 'video'); setShowNewCall(false); }}
                        className="p-2.5 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                        aria-label="Start video call"
                      >
                        <Video size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CallsPage;
