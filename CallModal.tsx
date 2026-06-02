import { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Camera, CameraOff, Volume2, RotateCcw } from 'lucide-react';
import type { User } from '@/types';
import { cn } from '@/lib/utils';
import { WebRTCCall, type CallState } from '@/lib/webrtc';
import { useAuth } from '@/hooks/useAuth';


interface CallModalProps {
  user: User;
  type: 'voice' | 'video';
  onEnd: (duration?: number) => void;
  callDocId?: string; // If answering an incoming call
  isIncoming?: boolean;
}

const CallModal = ({ user, type, onEnd, callDocId, isIncoming = false }: CallModalProps) => {
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id;
  const [callState, setCallState] = useState<CallState>(isIncoming ? 'ringing' : 'calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const endedRef = useRef(false);
  const webrtcRef = useRef<WebRTCCall | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!currentUserId) return;

    const handleStateChange = (state: CallState) => {
      setCallState(state);
      if (state === 'connected') {
        startTimeRef.current = Date.now();
      }
    };

    const handleRemoteStream = (stream: MediaStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    const handleLocalStream = (stream: MediaStream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    };

    webrtcRef.current = new WebRTCCall(
      currentUserId,
      user.id,
      type === 'video',
      handleStateChange,
      handleRemoteStream,
      handleLocalStream
    );

    const initializeCall = async () => {
      if (!webrtcRef.current) return;

      if (callDocId) {
        if (isIncoming) {
          await webrtcRef.current.answerCall(callDocId);
        } else {
          await webrtcRef.current.startCall(callDocId);
        }
      } else {
        await webrtcRef.current.startCall();
      }
    };

    initializeCall();

    return () => {
      webrtcRef.current?.endCall();
    };
  }, [currentUserId, user.id, type, isIncoming, callDocId]);

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

  const handleEnd = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    const callDuration = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
    webrtcRef.current?.endCall();
    setCallState('ended');
    setTimeout(() => onEnd(callDuration), 800);
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    webrtcRef.current?.toggleAudio(!newMuted);
  };

  const handleToggleCamera = () => {
    const newCameraOff = !isCameraOff;
    setIsCameraOff(newCameraOff);
    webrtcRef.current?.toggleVideo(!newCameraOff);
  };

  const handleSwitchCamera = () => {
    setIsFrontCamera(f => !f);
    webrtcRef.current?.switchCamera();
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
            <p className={cn('text-sm mt-1.5 font-medium', callState === 'connected' ? 'text-[#00FF00]' : 'text-white/70')}>
              {callState === 'calling'
                ? (type === 'video' ? '📹 Video calling...' : '📞 Calling...')
                : callState === 'ringing'
                  ? (type === 'video' ? '📹 Incoming video call...' : '📞 Incoming call...')
                  : callState === 'connected'
                    ? '● Connected'
                    : '✓ Call ended'}
            </p>
          </div>

          {/* Remote video for video calls */}
          {type === 'video' && callState === 'connected' && (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Self preview for video */}
          {type === 'video' && callState === 'connected' && (
            <div className="absolute top-20 right-4 w-24 h-36 bg-[#1a1a1a] rounded-2xl border-2 border-white/20 overflow-hidden shadow-xl">
              {isCameraOff ? (
                <div className="w-full h-full flex items-center justify-center flex-col gap-1">
                  <CameraOff size={20} className="text-white/30" />
                  <span className="text-white/30 text-[10px]">Camera off</span>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="pb-14 px-8">
          {callState === 'connected' && (
            <div className={cn('grid gap-4 mb-8', type === 'video' ? 'grid-cols-4' : 'grid-cols-2')}>
              <ControlBtn
                active={isMuted}
                icon={isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                label={isMuted ? 'Unmute' : 'Mute'}
                onClick={handleToggleMute}
              />
              {type === 'video' && (
                <ControlBtn
                  active={isCameraOff}
                  icon={isCameraOff ? <CameraOff size={22} /> : <Camera size={22} />}
                  label={isCameraOff ? 'Camera off' : 'Camera'}
                  onClick={handleToggleCamera}
                />
              )}
              <ControlBtn
                active={isSpeakerOn}
                icon={<Volume2 size={22} />}
                label={isSpeakerOn ? 'Speaker on' : 'Speaker'}
                onClick={() => setIsSpeakerOn(s => !s)}
              />
              {type === 'video' && (
                <ControlBtn
                  icon={<RotateCcw size={22} />}
                  label={isFrontCamera ? 'Rear' : 'Front'}
                  onClick={handleSwitchCamera}
                />
              )}
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={handleEnd}
              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-xl hover:bg-red-600 transition-all active:scale-95"
            >
              <PhoneOff size={26} className="text-white" />
            </button>
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
