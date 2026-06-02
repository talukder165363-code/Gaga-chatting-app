import { Check, CheckCheck, Play, Pause, CornerUpRight, BarChart2, Download } from 'lucide-react';
import { cn, formatTime, sanitizeMediaUrl, stripHtml } from '@/lib/utils';
import type { Message } from '@/types';
import { useState, useRef, useEffect } from 'react';
import { useUsersMap } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { votePoll } from '@/hooks/usePoll';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: Message & { showAvatar?: boolean; showSenderName?: boolean };
  isOwn: boolean;
  showAvatar?: boolean;
  showSenderName?: boolean;
  isGroup?: boolean;
  onLongPress?: () => void;
  onReact?: (emoji: string) => void;
  onJumpToReply?: (messageId: string) => void;
  searchQuery?: string;
  className?: string;
}

const WAVEFORM = [4, 8, 12, 16, 12, 8, 14, 10, 6, 16, 12, 8, 10, 14, 6, 8, 12, 16, 10, 4];

function VoicePlayer({ src, isOwn }: { src: string; isOwn: boolean }) {
  const safeSrc = sanitizeMediaUrl(src);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!safeSrc) {
      const currentAudio = audioRef.current;
      if (currentAudio) currentAudio.pause();
      audioRef.current = null;
      Promise.resolve().then(() => {
        setPlaying(false);
        setProgress(0);
        setDuration(0);
      });
      return;
    }
    const audio = new Audio(safeSrc);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setDuration(Math.round(audio.duration));
    audio.ontimeupdate = () => setProgress(audio.currentTime / (audio.duration || 1));
    audio.onended = () => { setPlaying(false); setProgress(0); };
    return () => { audio.pause(); audio.src = ''; };
  }, [safeSrc]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().catch(() => { }); setPlaying(true); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Never read refs during render; use derived progress values
  const elapsed = Math.round(progress * (duration || 0));


  return (
    <div className="flex items-center gap-3 py-2 px-1 min-w-[180px]">
      <button
        onClick={toggle}
        className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-white/30 transition-colors"
      >
        {playing ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className="flex items-end gap-0.5 h-6">
          {WAVEFORM.map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-full transition-colors"
              style={{
                height: `${h}px`,
                backgroundColor: i / WAVEFORM.length <= progress
                  ? (isOwn ? '#005500' : '#00FF00')
                  : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>
        <span className="text-xs text-white/60 mt-0.5 block">
          {playing ? fmt(elapsed) : fmt(duration)}
        </span>
      </div>
    </div>
  );
}

const MessageBubble = ({
  message,
  isOwn,
  showAvatar,
  showSenderName,
  isGroup,
  onLongPress,
  onJumpToReply,
  searchQuery,
  className,
}: MessageBubbleProps) => {

  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const { usersMap } = useUsersMap();
  const { user } = useAuth();
  const sender = usersMap[message.senderId];
  const time = formatTime(message.timestamp);

  const replyToSender = message.replyTo ? usersMap[message.replyTo.senderId]?.name || 'Unknown' : null;

  const reactionGroups = (message.reactions || []).reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});
  const hasReactions = Object.keys(reactionGroups).length > 0;

  const isSafeUrl = (url: string) => new RegExp('^https?://', 'i').test(url);

  const renderTextWithLinks = (text: string, color: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = stripHtml(text).split(urlRegex);

    const highlightText = (content: string) => {
      if (!searchQuery?.trim()) return content;
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchParts = content.split(new RegExp(`(${escapedQuery})`, 'gi'));
      return (
        <>
          {searchParts.map((part, i) =>
            part.toLowerCase() === searchQuery.toLowerCase()
              ? <mark key={i} className="bg-yellow-400 text-black px-0.5 rounded-sm">{part}</mark>
              : part
          )}
        </>
      );
    };

    return (
      <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words max-w-[240px]" style={{ color }}>
        {parts.map((part, i) =>
          urlRegex.test(part) && isSafeUrl(part) ? (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer"
              className="underline opacity-80 hover:opacity-100" onClick={e => e.stopPropagation()}>
              {highlightText(part)}
            </a>
          ) : highlightText(part)
        )}
      </p>
    );
  };

  const handleDownload = async (url: string) => {
    const safeUrl = sanitizeMediaUrl(url);
    if (!safeUrl) { toast.error('Invalid media URL'); return; }
    try {
      const response = await fetch(safeUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      // Use stable timestamp captured at click-time (event handler)
      link.download = `gaga-media-${new Date().getTime()}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error('Failed to download media');
    }
  };

  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <>
            <img
              src={sanitizeMediaUrl(message.content)}
              alt="Shared image"
              onClick={() => setShowMediaPreview(true)}
              className="max-w-[220px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
              style={{ maxHeight: '280px' }}
            />
            <Dialog open={showMediaPreview} onOpenChange={setShowMediaPreview}>
              <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none outline-none overflow-hidden flex items-center justify-center">
                <div className="relative w-full h-full flex items-center justify-center group/modal">
                  <img
                    src={sanitizeMediaUrl(message.content)}
                    alt=""
                  />
                  <div className="absolute top-4 right-12 flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(message.content)}
                      className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-sm"
                      title="Download"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        );
      case 'video':
        return (
          <>
            <div className="relative cursor-pointer group" onClick={() => setShowMediaPreview(true)}>
              <video
                src={sanitizeMediaUrl(message.content)}
                className="max-w-[220px] rounded-xl object-cover"
                style={{ maxHeight: '280px' }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all rounded-xl">
                <Play size={32} className="text-white opacity-80" />
              </div>
            </div>
            <Dialog open={showMediaPreview} onOpenChange={setShowMediaPreview}>
              <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none outline-none overflow-hidden flex items-center justify-center">
                <div className="relative w-full h-full flex items-center justify-center group/modal">
                  <video
                    src={sanitizeMediaUrl(message.content)}
                    controls
                    autoPlay
                    className="max-w-full max-h-[85vh] object-contain"
                  />
                  <div className="absolute top-4 right-12 flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(message.content)}
                      className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-sm"
                      title="Download"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        );
      case 'sticker':
        return <span className="sticker text-7xl select-none block py-1">{message.content}</span>;
      case 'voice':
        return <VoicePlayer src={sanitizeMediaUrl(message.content)} isOwn={isOwn} />;
      case 'file':
        return (
          <a href={sanitizeMediaUrl(message.content)} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-[13px] underline opacity-80 hover:opacity-100"
            onClick={e => e.stopPropagation()}>
            📎 {message.content.split('/').pop()?.split('?')[0] || 'File'}
          </a>
        );
      case 'poll': {
        const poll = message.poll;
        if (!poll) return <p className="text-[14px]">{message.content}</p>;
        const uid = user?.id || '';
        const myVote = uid ? poll.votes[uid] : undefined;
        const totalVotes = Object.keys(poll.votes).length;
        return (
          <div className="min-w-[200px]">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart2 size={14} className={isOwn ? 'text-black/60' : 'text-white/60'} />
              <p className="text-[13px] font-semibold" style={{ color: isOwn ? '#001a00' : '#fff' }}>{poll.question}</p>
            </div>
            {poll.options.map(opt => {
              const count = Object.values(poll.votes).filter(v => v === opt).length;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              const voted = myVote === opt;
              return (
                <button key={opt} onClick={() => user?.id && votePoll(message.chatId, message.id, opt, user.id)}
                  className="w-full mb-1.5 text-left">
                  <div className={cn('relative rounded-lg px-3 py-2 border transition-all',
                    voted ? 'border-[#00FF7F] bg-[#00FF7F]/10' : isOwn ? 'border-black/20 bg-black/10' : 'border-white/20 bg-white/5 hover:bg-white/10'
                  )}>
                    <div className="absolute inset-0 rounded-lg bg-[#00FF7F]/10 transition-all" style={{ width: `${pct}%` }} />
                    <div className="relative flex justify-between items-center">
                      <span className="text-[12px]" style={{ color: isOwn ? '#001a00' : '#fff' }}>{opt}</span>
                      <span className="text-[11px] opacity-60" style={{ color: isOwn ? '#001a00' : '#fff' }}>{pct}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
            <p className="text-[10px] opacity-50 mt-1" style={{ color: isOwn ? '#001a00' : '#fff' }}>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
          </div>
        );
      }
      default:
        return renderTextWithLinks(message.content, isOwn ? '#001a00' : '#ffffff');
    }
  };

  if (message.type === 'sticker') {
    return (
      <div className={cn('flex mb-2', isOwn ? 'justify-end' : 'justify-start', className)}>
        {!isOwn && (
          <div className="w-10 flex-shrink-0 flex items-end mr-1">
            {showAvatar && (
              <img src={sanitizeMediaUrl(sender?.avatar)} alt="" className="w-8 h-8 rounded-full object-cover" />
            )}
          </div>
        )}
        <div className="flex flex-col">
          {!isOwn && showSenderName && isGroup && (
            <span className="text-[11px] font-medium text-white/50 mb-1 ml-1">{sender?.name}</span>
          )}
          <button onContextMenu={e => { e.preventDefault(); onLongPress?.(); }}>
            {renderContent()}
          </button>
          {hasReactions && (
            <div className={cn('flex flex-wrap gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
              {Object.entries(reactionGroups).map(([emoji, count]) => (
                <span key={emoji} className="text-xs bg-white/10 border border-white/10 rounded-full px-2 py-0.5">
                  {emoji} {count > 1 && count}
                </span>
              ))}
            </div>
          )}
          <span className={cn('text-[10px] text-white/30 mt-0.5', isOwn ? 'text-right' : 'text-left')}>
            {time}
          </span>
        </div>
        {isOwn && <div className="w-10 flex-shrink-0" />}
      </div>
    );
  }

  return (
    <div className={cn('flex mb-1.5 items-end gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {!isOwn && (
        <div className="flex-shrink-0 w-8">
          {showAvatar && (
            <img src={sanitizeMediaUrl(sender?.avatar)} alt={sender?.name} className="w-8 h-8 rounded-full object-cover" />
          )}
        </div>
      )}
      {isOwn && <div className="w-8 flex-shrink-0" />}

      <div className={cn('flex flex-col max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && showSenderName && isGroup && (
          <span className="text-[11px] font-semibold text-white/50 mb-1">{sender?.name}</span>
        )}

        {message.forwardedFrom && (
          <span className="flex items-center gap-1 text-[10px] text-white/40 italic mb-0.5">
            <CornerUpRight size={10} /> Forwarded
          </span>
        )}

        {message.replyTo && (
          <button
            onClick={() => onJumpToReply?.(message.replyTo!.messageId)}
            className={cn(
              'mb-1 max-w-[240px] text-left rounded-lg px-2.5 py-1.5 border-l-2 text-[11px] hover:opacity-80 transition-opacity',
              isOwn ? 'bg-black/10 border-black/40' : 'bg-white/5 border-[#00FF00]'
            )}
          >
            <p className={cn('font-semibold truncate', isOwn ? 'text-black/70' : 'text-[#00FF00]')}>
              {replyToSender}
            </p>
            <p className={cn('truncate', isOwn ? 'text-black/60' : 'text-white/60')}>
              {message.replyTo.type === 'image' ? '📷 Photo'
                : message.replyTo.type === 'sticker' ? `${message.replyTo.preview} Sticker`
                  : message.replyTo.type === 'voice' ? '🎤 Voice message'
                    : message.replyTo.preview}
            </p>
          </button>
        )}

        <button
          className={cn(
            'px-4 py-2.5 text-left',
            message.type === 'image' ? 'p-1 bg-transparent shadow-none' : '',
            isOwn ? 'chat-bubble-sent' : 'chat-bubble-received',
          )}
          onContextMenu={e => { e.preventDefault(); onLongPress?.(); }}
        >
          {renderContent()}
        </button>

        {hasReactions && (
          <div className={cn('flex flex-wrap gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
            {Object.entries(reactionGroups).map(([emoji, count]) => (
              <span
                key={emoji}
                className="text-xs bg-white/10 border border-white/10 rounded-full px-2 py-0.5 cursor-pointer hover:bg-white/15 transition-colors"
              >
                {emoji}{count > 1 ? ` ${count}` : ''}
              </span>
            ))}
          </div>
        )}

        <div className={cn('flex items-center gap-1 mt-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] text-white/30">{time}{message.edited && <span className="italic"> · edited</span>}</span>
          {isOwn && (
            message.read
              ? <CheckCheck size={12} className="text-[#00FF00]" />
              : <Check size={12} className="text-white/30" />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
