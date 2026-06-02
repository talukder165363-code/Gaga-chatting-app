import { Phone, Video } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface CallButtonProps {
  participantName: string;
  onAudioCall: () => void;
  onVideoCall: () => void;
  isLoading?: boolean;
}

export default function CallButton({
  participantName,
  onAudioCall,
  onVideoCall,
  isLoading = false,
}: CallButtonProps) {
  return (
    <div className="flex gap-2">
      {/* Audio Call Button */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg border-white/20 hover:border-[#00ff88]/50 hover:bg-[#00ff88]/10 text-white"
          onClick={onAudioCall}
          disabled={isLoading}
          title={`Start audio call with ${participantName}`}
        >
          <Phone className="w-4 h-4 mr-2" />
          Audio
        </Button>
      </motion.div>

      {/* Video Call Button */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg border-white/20 hover:border-[#00ff88]/50 hover:bg-[#00ff88]/10 text-white"
          onClick={onVideoCall}
          disabled={isLoading}
          title={`Start video call with ${participantName}`}
        >
          <Video className="w-4 h-4 mr-2" />
          Video
        </Button>
      </motion.div>
    </div>
  );
}
