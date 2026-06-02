import { useState, useEffect, useRef } from 'react';
import { PhoneOff, Mic, MicOff, Camera, CameraOff, Monitor, MonitorOff, Circle, Users, Maximize2 } from 'lucide-react';
import type { User } from '@/types';
import { cn, sanitizeMediaUrl, getDefaultAvatar } from '@/lib/utils';
import { toast } from 'sonner';
import { GroupVideoCall, type GroupCallState, type Participant } from '@/lib/groupVideoCall';
import { useAuth } from '@/hooks/useAuth';
import { useUsersMap } from '@/hooks/useUsers';

interface GroupCallModalProps {
  participants: User[];
  type: 'voice' | 'video';
  onEnd: (duration?: number) => void;
  callDocId?: string;
  isHost?: boolean;
}

const GroupCallModal = ({ participants, type, onEnd, callDocId, isHost = false }: GroupCallModalProps) => {
  const { user: authUser } = useAuth();
  const [callState, setCallState] = useState<GroupCallState>('calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [connectedParticipants, setConnectedParticipants] = useState<Participant[]>([]);
  const [focusedParticipant, setFocusedParticipant] = useState<string | null>(null);
  
  const endedRef = useRef(false);
  const groupCallRef = useRef<GroupVideoCall | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<number>(0);
  const { usersMap } = useUsersMap();

  const currentUserId = authUser?.id;

  useEffect(() => {
    if (!currentUserId) return;

    // Ensure initial local stream is available for first render after mount.
    // (Avoid reading `groupCallRef.current` during render.)


    const handleStateChange = (state: GroupCallState) => {
      setCallState(state);
      if (state === 'connected') {
        startTimeRef.current = Date.now();
      }
    };

    const handleParticipantUpdate = (parts: Participant[]) => {
      setConnectedParticipants(parts);
    };

    const handleScreenShare = (stream: MediaStream | null) => {
      setIsScreenSharing(!!stream);
    };

    groupCallRef.current = new GroupVideoCall(
      currentUserId,
      type === 'video',
      handleStateChange,
      handleParticipantUpdate,
      handleScreenShare
    );

    // Start or join call
    if (isHost) {
      const participantIds = participants.map(p => p.id);
      groupCallRef.current.createGroupCall(participantIds);
    } else if (callDocId) {
      groupCallRef.current.joinGroupCall(callDocId);
    }

    // Set local stream
    const localStream = groupCallRef.current.getLocalStream();
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }

    return () => {
      groupCallRef.current?.endCall();
    };
  }, [currentUserId, participants, type, isHost, callDocId]);

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
    groupCallRef.current?.endCall();
    setCallState('ended');
    setTimeout(() => onEnd(callDuration), 800);
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    groupCallRef.current?.toggleAudio(!newMuted);
  };

  const handleToggleCamera = () => {
    const newCameraOff = !isCameraOff;
    setIsCameraOff(newCameraOff);
    groupCallRef.current?.toggleVideo(!newCameraOff);
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await groupCallRef.current?.stopScreenShare();
      toast.success('Screen sharing stopped');
    } else {
      await groupCallRef.current?.startScreenShare();
      toast.success('Screen sharing started');
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      const blob = await groupCallRef.current?.stopRecording();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `group-call-${Date.now()}.webm`;
        a.click();
        toast.success('Recording saved');
      }
      setIsRecording(false);
    } else {
      await groupCallRef.current?.startRecording();
      setIsRecording(true);
      toast.success('Recording started');
    }
  };

  const allParticipants = [
    { userId: authUser?.id || '', stream: null },
    ...connectedParticipants,
  ];



  const displayedParticipant = focusedParticipant 
    ? allParticipants.find(p => p.userId === focusedParticipant)
    : allParticipants[0];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 bg-black/50">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-white/70" />
          <span className="text-white/70 text-sm">
            Group {type === 'video' ? 'Video' : 'Voice'} Call ({allParticipants.length})
          </span>
        </div>
        {callState === 'connected' && (
          <div className="flex items-center gap-3">
            {isRecording && (
              <div className="flex items-center gap-1 text-red-400 animate-pulse">
                <Circle size={12} className="fill-current" />
                <span className="text-xs font-medium">REC</span>
              </div>
            )}
            <span className="text-white/70 text-sm font-mono">{formatDuration(duration)}</span>
          </div>
        )}
      </div>

      {/* Main Video Area */}
      <div className="flex-1 relative bg-black">
        {type === 'video' && displayedParticipant ? (
          <div className="w-full h-full relative">
            <ParticipantVideo
              participant={displayedParticipant}
              user={usersMap[displayedParticipant.userId]}
              isLocal={displayedParticipant.userId === authUser?.id}
              isFocused={true}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <Users size={64} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/50">
                {callState === 'calling' ? 'Connecting...' : `${allParticipants.length} participants`}
              </p>
            </div>
          </div>
        )}

        {/* Participant Grid */}
        {type === 'video' && allParticipants.length > 1 && (
          <div className="absolute bottom-20 left-4 right-4 flex gap-2 overflow-x-auto scrollbar-hide">
            {allParticipants.map((participant) => (
              <button
                key={participant.userId}
                onClick={() => setFocusedParticipant(participant.userId)}
                className={cn(
                  'flex-shrink-0 w-24 h-32 rounded-xl overflow-hidden border-2 transition-all',
                  focusedParticipant === participant.userId || (!focusedParticipant && participant === allParticipants[0])
                    ? 'border-[#00FF00] scale-105'
                    : 'border-white/20 hover:border-white/40'
                )}
              >
                <ParticipantVideo
                  participant={participant}
                  user={usersMap[participant.userId]}
                  isLocal={participant.userId === authUser?.id}
                  isFocused={false}
                />
              </button>
            ))}
          </div>
        )}

        {/* Voice Call Avatars */}
        {type === 'voice' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="grid grid-cols-2 gap-6 max-w-md">
              {allParticipants.slice(0, 4).map((participant) => {
                const user = usersMap[participant.userId];
                return (
                  <div key={participant.userId} className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <img
                        src={sanitizeMediaUrl(user?.avatar) || getDefaultAvatar(participant.userId)}
                        alt={user?.name || 'User'}
                        className="w-20 h-20 rounded-full border-4 border-white/30"
                      />
                      {callState === 'connected' && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#00FF00] rounded-full border-2 border-gray-900" />
                      )}
                    </div>
                    <span className="text-white text-sm font-medium">
                      {participant.userId === authUser?.id ? 'You' : user?.name || 'User'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="pb-14 px-8 bg-black/50">
        {callState === 'connected' && (
          <div className="grid grid-cols-5 gap-3 mb-8">
            <ControlBtn
              active={isMuted}
              icon={isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              label={isMuted ? 'Unmute' : 'Mute'}
              onClick={handleToggleMute}
            />
            {type === 'video' && (
              <>
                <ControlBtn
                  active={isCameraOff}
                  icon={isCameraOff ? <CameraOff size={22} /> : <Camera size={22} />}
                  label="Camera"
                  onClick={handleToggleCamera}
                />
                <ControlBtn
                  active={isScreenSharing}
                  icon={isScreenSharing ? <MonitorOff size={22} /> : <Monitor size={22} />}
                  label="Share"
                  onClick={handleToggleScreenShare}
                />
              </>
            )}
            <ControlBtn
              active={isRecording}
              icon={<Circle size={22} className={isRecording ? 'fill-current' : ''} />}
              label="Record"
              onClick={handleToggleRecording}
              danger={isRecording}
            />
            <ControlBtn
              icon={<Maximize2 size={22} />}
              label="Expand"
              onClick={() => toast.info('Full screen mode')}
            />
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
  );
};

const ParticipantVideo = ({
  participant,
  user,
  isLocal,
  isFocused,
}: {
  participant: { userId: string; stream?: MediaStream | null };
  user?: User;
  isLocal: boolean;
  isFocused: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="relative w-full h-full bg-gray-800">
      {participant.stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            'w-full h-full object-cover',
            isLocal && !isFocused && 'scale-x-[-1]'
          )}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={sanitizeMediaUrl(user?.avatar) || getDefaultAvatar(participant.userId)}
            alt={user?.name || 'User'}
            className="w-16 h-16 rounded-full"
          />
        </div>
      )}
      <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-xs">
        {isLocal ? 'You' : user?.name || 'User'}
      </div>
    </div>
  );
};

const ControlBtn = ({
  icon,
  label,
  active,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-1 p-3 rounded-2xl transition-all',
      active
        ? danger
          ? 'bg-red-500 text-white'
          : 'bg-white text-gray-900'
        : 'bg-white/20 text-white hover:bg-white/30'
    )}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default GroupCallModal;
