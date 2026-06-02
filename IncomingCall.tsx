import { Phone, PhoneOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface IncomingCallProps {
  callerName: string;
  callerAvatar: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCall({
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onReject,
}: IncomingCallProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50"
    >
      <div className="text-center max-w-sm w-full mx-4 space-y-8">
        {/* Avatar */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex justify-center"
        >
          <Avatar className="w-32 h-32">
            <AvatarImage src={callerAvatar} alt={callerName} />
            <AvatarFallback className="bg-gradient-to-r from-[#00ff88] to-[#00cc6a] text-black text-2xl">
              {callerName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </motion.div>

        {/* Caller Info */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">{callerName}</h2>
          <p className="text-white/60 text-lg">
            {callType === 'video' ? '📹 Video call' : '📞 Audio call'}
          </p>
          <p className="text-white/40 text-sm">Incoming...</p>
        </div>

        {/* Ringing animation */}
        <div className="flex justify-center gap-2 h-8">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-2 h-8 bg-gradient-to-t from-[#00ff88] to-[#00cc6a] rounded-full"
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-6 justify-center pt-4">
          {/* Reject */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600 text-white shadow-lg"
              onClick={onReject}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
          </motion.div>

          {/* Accept */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="lg"
              className="rounded-full w-16 h-16 bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:opacity-90 text-black font-bold shadow-lg"
              onClick={onAccept}
            >
              <Phone className="w-6 h-6" />
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
