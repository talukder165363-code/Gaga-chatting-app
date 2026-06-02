import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CallControlsProps {
  isMuted: boolean;
  isVideoOn: boolean;
  onToggleMute: (muted: boolean) => void;
  onToggleVideo: (enabled: boolean) => void;
  onEndCall: () => void;
  onScreenShare?: () => void;
  callDuration: number;
}

export default function CallControls({
  isMuted,
  isVideoOn,
  onToggleMute,
  onToggleVideo,
  onEndCall,
  onScreenShare,
  callDuration,
}: CallControlsProps) {
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-white/10 px-6 py-4">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* Call Timer */}
        <div className="text-white text-lg font-semibold font-mono">
          {formatDuration(callDuration)}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Mute Button */}
          <Button
            variant="ghost"
            size="lg"
            className={`rounded-full transition ${
              isMuted
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            onClick={() => onToggleMute(!isMuted)}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {/* Video Button */}
          <Button
            variant="ghost"
            size="lg"
            className={`rounded-full transition ${
              !isVideoOn
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            onClick={() => onToggleVideo(!isVideoOn)}
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          {/* Screen Share */}
          {onScreenShare && (
            <Button
              variant="ghost"
              size="lg"
              className="rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              onClick={onScreenShare}
            >
              <Share2 className="w-5 h-5" />
            </Button>
          )}

          {/* Expand */}
          <Button
            variant="ghost"
            size="lg"
            className="rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <Maximize2 className="w-5 h-5" />
          </Button>

          {/* End Call */}
          <Button
            size="lg"
            className="rounded-full bg-red-500 hover:bg-red-600 text-white transition"
            onClick={onEndCall}
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>

        {/* Spacer */}
        <div className="w-20" />
      </div>
    </div>
  );
}
