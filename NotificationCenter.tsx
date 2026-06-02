import { Bell, X, CheckCheck, MessageCircle, Phone, Heart, AtSign, Users } from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import { useNotificationCenter } from '@/hooks/useNotificationCenter';

const typeIcon = {
  message: <MessageCircle size={16} className="text-[#00FF7F]" />,
  call: <Phone size={16} className="text-blue-400" />,
  reaction: <Heart size={16} className="text-red-400" />,
  mention: <AtSign size={16} className="text-amber-400" />,
  group_invite: <Users size={16} className="text-purple-400" />,
  friend_request: <Users size={16} className="text-cyan-400" />,
};

interface NotificationCenterProps {
  onClose: () => void;
  onNavigateToChat?: (chatId: string) => void;
}

const NotificationCenter = ({ onClose, onNavigateToChat }: NotificationCenterProps) => {
  const { notifications, markAllRead, markRead } = useNotificationCenter();

  const handleTap = (n: ReturnType<typeof useNotificationCenter>['notifications'][0]) => {
    markRead(n.id);
    const chatId = n.data?.chatId as string | undefined;
    if (chatId && onNavigateToChat) {
      onNavigateToChat(chatId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#1a1a1a] border-l border-white/10 shadow-2xl flex flex-col animate-scale-in">
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-[#00FF7F]" />
            <h3 className="font-bold text-white">Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={markAllRead} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1">
              <CheckCheck size={14} /> Mark all read
            </button>
            <button onClick={onClose}><X size={20} className="text-white/50" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-white/30">
              <Bell size={32} className="mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleTap(n)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3.5 border-b border-white/5 text-left hover:bg-white/5 transition-colors',
                  !n.read && 'bg-white/[0.03]'
                )}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mt-0.5">
                  {typeIcon[n.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('text-[13px] font-semibold truncate', n.read ? 'text-white/60' : 'text-white')}>
                      {n.title}
                    </p>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-[#00FF7F] flex-shrink-0" />}
                  </div>
                  <p className="text-[12px] text-white/40 truncate mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-white/25 mt-1">{formatTime(n.timestamp)}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export { NotificationCenter };
