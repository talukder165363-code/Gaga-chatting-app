import { ChevronLeft, Phone, Video, MoreVertical, Search } from 'lucide-react';

interface ChatHeaderProps {
  chatName: string;
  chatAvatar: string;
  subtitle: string;
  isOnline?: boolean;
  isTyping?: boolean;
  onBack: () => void;
  onShowInfo: () => void;
  onStartCall: (type: 'voice' | 'video') => void;
  onSearchToggle: () => void;
}

export function ChatHeader({
  chatName,
  chatAvatar,
  subtitle,
  isOnline,
  isTyping,
  onBack,
  onShowInfo,
  onStartCall,
  onSearchToggle,
}: ChatHeaderProps) {
  return (
    <div className="gchat-header flex items-center gap-2 px-3 py-2.5 sticky top-0 z-40">
      <button
        onClick={onBack}
        className="p-1.5 text-black/70 hover:bg-black/10 rounded-full transition-colors -ml-1"
        aria-label="Back"
      >
        <ChevronLeft size={24} />
      </button>

      <div className="relative flex-shrink-0 cursor-pointer" onClick={onShowInfo}>
        <img
          src={chatAvatar}
          alt={chatName}
          className="w-9 h-9 rounded-full object-cover bg-white/20"
        />
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-300 rounded-full border-2 border-transparent" />
        )}
      </div>

      <div className="flex-1 cursor-pointer min-w-0" onClick={onShowInfo}>
        <p className="text-black font-bold text-[15px] leading-tight truncate">{chatName}</p>
        <p className="text-black/60 text-[11px] truncate">
          {isTyping ? <span className="text-emerald-600 font-medium">typing...</span> : subtitle}
        </p>
      </div>

      <div className="flex items-center">
        <button
          onClick={onSearchToggle}
          className="p-2 text-black/70 hover:bg-black/10 rounded-full transition-colors"
          aria-label="Search messages"
        >
          <Search size={20} />
        </button>
        <button
          onClick={() => onStartCall('voice')}
          className="p-2 text-black/70 hover:bg-black/10 rounded-full transition-colors"
          aria-label="Voice call"
        >
          <Phone size={20} />
        </button>
        <button
          onClick={() => onStartCall('video')}
          className="p-2 text-black/70 hover:bg-black/10 rounded-full transition-colors"
          aria-label="Video call"
        >
          <Video size={20} />
        </button>
        <button
          onClick={onShowInfo}
          className="p-2 text-black/70 hover:bg-black/10 rounded-full transition-colors"
          aria-label="Chat info"
        >
          <MoreVertical size={20} />
        </button>
      </div>
    </div>
  );
}
