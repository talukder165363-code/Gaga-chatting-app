import { useState, useEffect, useRef, useCallback } from 'react';
import { PhoneOff, Mic, MicOff, Camera, CameraOff, Volume2, RotateCcw, Phone } from 'lucide-react';
import type { User } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { db, doc, updateDoc, onSnapshot, serverTimestamp } from '@/lib/firebase';

interface CallModalProps {
  user: User;
  type: 'voice' | 'video';
  callDocId: string;
  isIncoming: boolean;
  onEnd: (duration?: number) => void;
}

const CallModal = ({ user, type, callDocId, isIncoming, onEnd }: CallModalProps) => {
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended' | 'busy' | 'missed'>('ringing');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const endedRef = useRef(false);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Setup ringtone
    const ringtone = new Audio(isIncoming ? '/sounds/incoming-ring.mp3' : '/sounds/outgoing-ring.mp3');
    ringtone.loop = true;
    ringtoneRef.current = ringtone;

    if (callState === 'ringing') {
      ringtone.play().catch(() => {
        if (import.meta.env.DEV) console.log('Autoplay blocked');
      });
    }

    return () => {
      ringtone.pause();
      ringtoneRef.current = null;
    };
  }, [isIncoming, callState]);

  useEffect(() => {
    if (callState !== 'ringing' && ringtoneRef.current) {
      ringtoneRef.current.pause();
    }
  }, [callState]);

  // Sync with Firestore signaling
  const handleEndLocal = useCallback(
    (finalState: 'ended' | 'missed' | 'busy') => {
      if (endedRef.current) return;
      endedRef.current = true;
      setCallState(finalState);

      // Play end sound
      const endSound = new Audio('/sounds/call-end.mp3');
      endSound.play().catch(() => { });

      setTimeout(() => onEnd(duration), 1500);
    },
    [duration, onEnd]
  );

  useEffect(() => {
    if (!callDocId) return;

    const unsub = onSnapshot(doc(db, 'calls', callDocId), (snap: unknown) => {
      const callSnapshot = snap as { exists: () => boolean; data: () => Record<string, unknown> };
      if (!callSnapshot.exists()) {
        handleEndLocal('ended');
        return;
      }
      const data = callSnapshot.data();
      if (data.status === 'ended' || data.status === 'rejected') {
        handleEndLocal('ended');
      } else if (data.status === 'missed') {
        handleEndLocal('missed');
      } else if (data.status === 'busy') {
        handleEndLocal('busy');
      } else if (data.status === 'connected') {
        setCallState('connected');
      }
    });

    return () => unsub();
  }, [callDocId, handleEndLocal]);

  // Timeout for missed call
  useEffect(() => {
    if (callState === 'ringing' && !isIncoming) {
      const timeout = setTimeout(async () => {
        try {
          await updateDoc(doc(db, 'calls', callDocId), { status: 'missed', endedAt: serverTimestamp() });
          handleEndLocal('missed');
        } catch {
          handleEndLocal('missed');
        }
      }, 45000); // 45 seconds timeout
      return () => clearTimeout(timeout);
    }
  }, [callState, isIncoming, callDocId, handleEndLocal]);

  useEffect(() => {
    if (callState !== 'connected') return;
    const id = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(id);
  }, [callState]);

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    if (endedRef.current) return;
    try {
      await updateDoc(doc(db, 'calls', callDocId), {
        status: 'ended',
        duration,
        endedAt: serverTimestamp(),
      });
      handleEndLocal('ended');
    } catch (error) {
      console.error('Failed to end call:', error);
      handleEndLocal('ended');
    }
  };

  const handleAcceptCall = async () => {
    try {
      await updateDoc(doc(db, 'calls', callDocId), {
        status: 'connected',
        connectedAt: serverTimestamp(),
      });
      setCallState('connected');
    } catch (error) {
      console.error('Failed to accept call:', error);
      toast.error('Unable to connect call.');
    }
  };

  const handleRejectCall = async () => {
    try {
      await updateDoc(doc(db, 'calls', callDocId), {
        status: 'rejected',
        endedAt: serverTimestamp(),
      });
      handleEndLocal('ended');
    } catch (error) {
      console.error('Failed to reject call:', error);
      handleEndLocal('ended');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900 animate-fade-in">
      {/* Background */}
      {type === 'video' ? (
        <div className="absolute inset-0">
          <img
            src={user.avatar}
            alt=""
            className="w-full h-full object-cover opacity-25 scale-110"
            style={{ filter: 'blur(20px) brightness(0.4)' }}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      ) : (
        <div className="absolute inset-0 gchat-header opacity-90" />
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <div className="flex items-center gap-2">
            {type === 'video' && <Camera size={16} className="text-white/70" />}
            <span className="text-white/70 text-sm capitalize">{type} Call</span>
          </div>
          {callState === 'connected' && (
            <span className="text-white/70 text-sm font-mono">{formatDuration(duration)}</span>
          )}
        </div>

        {/* User info */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <div className="relative">
            {callState === 'ringing' && (
              <>
                <div className="absolute inset-0 -m-6 rounded-full border-4 border-white/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                <div className="absolute inset-0 -m-12 rounded-full border-2 border-white/10 animate-ping" style={{ animationDuration: '2s' }} />
              </>
            )}
            <img
              src={user.avatar}
              alt={user.name}
              className="w-28 h-28 rounded-full object-cover border-4 border-white/30 shadow-2xl"
            />
            {callState === 'connected' && (
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#00FF00] rounded-full border-2 border-white" />
            )}
          </div>

          <div className="text-center">
            <h2 className="text-white text-2xl font-bold">{user.name}</h2>
            <p className={cn(
              'text-sm mt-1.5 font-medium',
              callState === 'connected' ? 'text-[#00FF00]' :
                callState === 'busy' ? 'text-orange-400' :
                  callState === 'missed' ? 'text-red-400' :
                    'text-white/70'
            )}>
              {callState === 'ringing'
                ? isIncoming ? '📞 Incoming call...' : (type === 'video' ? '📹 Video calling...' : '📞 Calling...')
                : callState === 'connected'
                  ? '● Connected'
                  : callState === 'busy'
                    ? '⚡ Line busy'
                    : callState === 'missed'
                      ? '✕ Call missed'
                      : '✓ Call ended'}
            </p>
          </div>

          {/* Self preview for video */}
          {type === 'video' && callState === 'connected' && (
            <div className="absolute top-20 right-4 w-24 h-36 bg-[#1a1a1a] rounded-2xl border-2 border-white/20 overflow-hidden shadow-xl">
              <div className="w-full h-full flex items-center justify-center flex-col gap-1">
                {isCameraOff
                  ? <CameraOff size={20} className="text-white/30" />
                  : <Camera size={20} className="text-white/30" />}
                <span className="text-white/30 text-[10px]">
                  {isCameraOff ? 'Camera off' : isFrontCamera ? 'Front' : 'Rear'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="pb-14 px-8">
          {callState === 'connected' && (
            <div className={cn('grid gap-4 mb-8', type === 'video' ? 'grid-cols-4' : 'grid-cols-3')}>
              <ControlBtn
                active={isMuted}
                icon={isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                label={isMuted ? 'Unmute' : 'Mute'}
                onClick={() => setIsMuted(m => !m)}
              />
              {type === 'video' && (
                <ControlBtn
                  active={isCameraOff}
                  icon={isCameraOff ? <CameraOff size={22} /> : <Camera size={22} />}
                  label={isCameraOff ? 'Camera off' : 'Camera'}
                  onClick={() => setIsCameraOff(c => !c)}
                />
              )}
              <ControlBtn
                active={isSpeakerOn}
                icon={<Volume2 size={22} />}
                label={isSpeakerOn ? 'Speaker on' : 'Speaker'}
                onClick={() => setIsSpeakerOn(s => !s)}
              />
              <ControlBtn
                icon={<RotateCcw size={22} />}
                label={type === 'video' ? (isFrontCamera ? 'Rear' : 'Front') : 'Chat'}
                onClick={() =>
                  type === 'video'
                    ? setIsFrontCamera(f => !f)
                    : toast.info('In-call chat coming soon!')
                }
              />
            </div>
          )}

          <div className="flex justify-center gap-10">
            {callState === 'ringing' && isIncoming ? (
              <>
                <button
                  aria-label="Reject call"
                  onClick={handleRejectCall}
                  className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-xl hover:bg-red-600 transition-all active:scale-95"
                >
                  <PhoneOff size={26} className="text-white" />
                </button>
                <button
                  aria-label="Accept call"
                  onClick={handleAcceptCall}
                  className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-xl hover:bg-green-600 transition-all active:scale-95 animate-bounce"
                >
                  <Phone size={26} className="text-white" />
                </button>
              </>
            ) : (
              <button
                aria-label="End call"
                onClick={handleEndCall}
                className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-xl hover:bg-red-600 transition-all active:scale-95"
              >
                <PhoneOff size={26} className="text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ControlBtn = ({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-2 p-3 rounded-2xl transition-all',
      active ? 'bg-white text-gray-900' : 'bg-white/20 text-white hover:bg-white/30'
    )}
  >
    {icon}
    <span className="text-xs font-medium">{label}</span>
  </button>
);

export default CallModal;
