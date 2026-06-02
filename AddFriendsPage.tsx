import { useState } from 'react';
import { Search, X, Users, QrCode, Plus, ChevronRight, Check } from 'lucide-react';
import type { User } from '@/types';
import { cn } from '@/lib/utils';

interface AddFriendsPageProps {
  onBack: () => void;
  onShowQR: () => void;
  onInvite: () => void;
  onOpenGroups?: () => void;
  users: User[];
  sentRequests: { to: string }[];
  onSendRequest: (userId: string) => void;
}

export const AddFriendsPage = ({
  onBack,
  onShowQR,
  onInvite,
  onOpenGroups,
  users,
  sentRequests,
  onSendRequest
}: AddFriendsPageProps) => {

  const [searchQuery, setSearchQuery] = useState('');
  const filteredUsers = users.filter((user) =>
    !searchQuery ||
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.statusMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    online: 'bg-emerald-400',
    offline: 'bg-gray-500',
    busy: 'bg-red-500',
    away: 'bg-amber-500',
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white p-2 hover:bg-white/5 rounded-full transition-colors" aria-label="Go back">
            <ChevronRight size={22} className="rotate-180" />
          </button>
          <h1 className="text-white text-xl font-bold">Add friends</h1>
        </div>
        <button className="p-2 text-white/50 hover:text-white transition-colors" onClick={onShowQR} aria-label="My QR code">
          <QrCode size={20} />
        </button>
      </div>

      {/* Top Actions */}
      <div className="flex justify-around px-6 py-6 border-b border-white/5">
        {[
          { icon: <Plus size={26} />, label: 'Invite', action: onInvite, color: 'bg-white/5 text-white' },
          { icon: <QrCode size={26} />, label: 'My QR', action: onShowQR, color: 'bg-white/5 text-white' },
          { icon: <Users size={26} />, label: 'Groups', action: onOpenGroups ?? onBack, color: 'bg-white/5 text-white' },
        ].map(item => (
          <button
            key={item.label}
            onClick={item.action}
            className="flex flex-col items-center gap-3 group"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-95", item.color)}>
              {item.icon}
            </div>
            <span className="text-white/40 text-[11px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="px-5 py-4">
        <div className="relative group">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#00FF7F] transition-colors" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-10 pr-10 py-3 text-sm outline-none focus:border-[#00FF7F]/50 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="px-5 mb-2">
          <h2 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">People you may know</h2>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/20 px-8 text-center">
            <Search size={40} className="mb-4 opacity-20" />
            <p className="font-bold text-sm uppercase tracking-widest">No users found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredUsers.map((user) => (
              <div key={user.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors group">
                <div className="relative">
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                  <div className={cn('absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-black', statusColors[user.status])} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-[15px] truncate">{user.name}</p>
                  <p className="text-[12px] text-white/30 truncate italic">{user.statusMessage || 'Available'}</p>
                </div>
                {sentRequests.some(r => r.to === user.id) ? (
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest">
                    <Check size={12} />
                    Sent
                  </div>
                ) : (
                  <button
                    onClick={() => onSendRequest(user.id)}
                    className="px-5 py-2 rounded-full bg-[#00FF7F] text-black text-xs font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#00FF7F]/10"
                  >
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
