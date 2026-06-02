import { useEffect, useState, useCallback } from 'react';
import { Room, Participant as TwilioParticipant } from 'twilio-video';
import {
  connectToRoom,
  disconnectFromRoom,
  setAudioMuted,
  setVideoEnabled,
  getTwilioToken,
} from '@/lib/twilio';

interface UseCallOptions {
  onRoomConnected?: (room: Room) => void;
  onRoomDisconnected?: () => void;
  onParticipantConnected?: (participant: TwilioParticipant) => void;
  onParticipantDisconnected?: (participant: TwilioParticipant) => void;
  onError?: (error: Error) => void;
}

export function useCall(options?: UseCallOptions) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<TwilioParticipant[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Connect to room
  const connect = useCallback(
    async (token: string, roomName: string) => {
      try {
        setIsConnecting(true);
        setError(null);
        const connectedRoom = await connectToRoom(token, roomName);
        setRoom(connectedRoom);
        options?.onRoomConnected?.(connectedRoom);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Connection failed');
        setError(error);
        options?.onError?.(error);
      } finally {
        setIsConnecting(false);
      }
    },
    [options]
  );

  // Disconnect from room
  const disconnect = useCallback(async () => {
    try {
      await disconnectFromRoom();
      setRoom(null);
      setParticipants([]);
      options?.onRoomDisconnected?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Disconnection failed');
      setError(error);
      options?.onError?.(error);
    }
  }, [options]);

  // Mute audio
  const muteAudio = useCallback((muted: boolean) => {
    setAudioMuted(muted);
  }, []);

  // Toggle video
  const toggleVideo = useCallback((enabled: boolean) => {
    setVideoEnabled(enabled);
  }, []);

  // Get token and connect
  const startCall = useCallback(
    async (identity: string, roomName: string) => {
      try {
        const token = await getTwilioToken(identity, roomName);
        await connect(token, roomName);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Call start failed');
        setError(error);
        options?.onError?.(error);
      }
    },
    [connect, options]
  );

  // Subscribe to room events
  useEffect(() => {
    if (!room) return;

    const handleParticipantConnected = (participant: TwilioParticipant) => {
      setParticipants((prevParticipants) => [...prevParticipants, participant]);
      options?.onParticipantConnected?.(participant);
    };

    const handleParticipantDisconnected = (participant: TwilioParticipant) => {
      setParticipants((prevParticipants) =>
        prevParticipants.filter((p) => p !== participant)
      );
      options?.onParticipantDisconnected?.(participant);
    };

    room.on('participantConnected', handleParticipantConnected);
    room.on('participantDisconnected', handleParticipantDisconnected);

    // Get existing participants
    setParticipants(Array.from(room.participants.values()));

    return () => {
      // Cleanup handled by Twilio SDK
    };
  }, [room, options]);

  return {
    room,
    participants,
    isConnecting,
    error,
    connect,
    disconnect,
    startCall,
    muteAudio,
    toggleVideo,
  };
}
