import React, { createContext, useState, useCallback, useEffect } from 'react';

export interface Participant {
  id: string;
  name: string;
  avatar: string;
}

export interface CallData {
  id: string;
  initiator: Participant;
  recipient?: Participant;
  type: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'ended' | 'missed' | 'rejected';
  room: string;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  participants: Participant[];
  duration?: number;
  isGroupCall: boolean;
}

interface CallContextType {
  // Call state
  activeCall: CallData | null;
  incomingCall: CallData | null;
  callHistory: CallData[];
  isCallActive: boolean;

  // Call actions
  initiateCall: (recipient: Participant, type: 'audio' | 'video', isGroup?: boolean) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  muteAudio: (muted: boolean) => void;
  toggleVideo: (enabled: boolean) => void;
  switchCamera: (facingMode: 'user' | 'environment') => void;
  
  // Call controls
  isMuted: boolean;
  isVideoOn: boolean;
  cameraFacing: 'user' | 'environment';
  callDuration: number;
  
  // Group call
  addParticipant: (participant: Participant) => Promise<void>;
  removeParticipant: (participantId: string) => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [activeCall, setActiveCall] = useState<CallData | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [callHistory, setCallHistory] = useState<CallData[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [callDuration, setCallDuration] = useState(0);

  // Timer for call duration
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'accepted') return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCall]);

  const initiateCall = useCallback(
    async (recipient: Participant, type: 'audio' | 'video', isGroup = false): Promise<void> => {
      // TODO: Implement call initiation via Firebase + Twilio
      // 1. Generate Twilio room name
      // 2. Create call document in Firestore
      // 3. Send notification to recipient
      if (import.meta.env.DEV) console.log('Initiating call:', { recipient, type, isGroup });
    },
    []
  );

  const acceptCall = useCallback(async (): Promise<void> => {
    // TODO: Implement call acceptance
    // 1. Get Twilio token
    // 2. Connect to Twilio room
    // 3. Update call status
    if (import.meta.env.DEV) console.log('Accepting call');
  }, []);

  const rejectCall = useCallback(async (): Promise<void> => {
    // TODO: Implement call rejection
    if (incomingCall) {
      setIncomingCall(null);
      // Update Firestore call status to 'rejected'
    }
  }, [incomingCall]);

  const endCall = useCallback(async (): Promise<void> => {
    if (activeCall) {
      // TODO: Disconnect from Twilio room
      // Update call duration
      const duration = callDuration;
      setCallHistory((prev) => [
        ...prev,
        { ...activeCall, duration, endedAt: Date.now(), status: 'ended' },
      ]);
      setActiveCall(null);
      setCallDuration(0);
    }
  }, [activeCall, callDuration]);

  const muteAudio = useCallback((muted: boolean) => {
    setIsMuted(muted);
    // TODO: Mute/unmute Twilio local audio track
  }, []);

  const toggleVideo = useCallback((enabled: boolean) => {
    setIsVideoOn(enabled);
    // TODO: Enable/disable Twilio local video track
  }, []);

  const switchCamera = useCallback((facingMode: 'user' | 'environment') => {
    setCameraFacing(facingMode);
    // TODO: Switch camera via getUserMedia constraints
  }, []);

  const addParticipant = useCallback(async (participant: Participant): Promise<void> => {
    if (activeCall) {
      setActiveCall({
        ...activeCall,
        participants: [...activeCall.participants, participant],
      });
      // TODO: Notify other participants
    }
  }, [activeCall]);

  const removeParticipant = useCallback(async (participantId: string): Promise<void> => {
    if (activeCall) {
      setActiveCall({
        ...activeCall,
        participants: activeCall.participants.filter((p) => p.id !== participantId),
      });
    }
  }, [activeCall]);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        callHistory,
        isCallActive: !!activeCall,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        muteAudio,
        toggleVideo,
        switchCamera,
        isMuted,
        isVideoOn,
        cameraFacing,
        callDuration,
        addParticipant,
        removeParticipant,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

