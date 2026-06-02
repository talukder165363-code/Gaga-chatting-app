import type { Room, Participant as TwilioParticipant, LocalTrackPublication } from 'twilio-video';

/**
 * Minimal Twilio adapter.
 *
 * The rest of the app expects these symbols from '@/lib/twilio'.
 * For local preview/build this file provides safe stubs that keep the app typecheckable.
 */

export async function getTwilioToken(identity: string, roomName: string): Promise<string> {
  // Stub token for preview/build.
  // Replace with real server-side token generation.
  void identity;
  void roomName;
  return 'STUB_TOKEN';
}

export async function connectToRoom(token: string, roomName: string): Promise<Room> {
  void token;
  void roomName;
  throw new Error(
    "Twilio connection is not configured. Provide a real implementation for '@/lib/twilio' before enabling calling features."
  );
}

export async function disconnectFromRoom(): Promise<void> {
  // no-op stub
}

export function setAudioMuted(muted: boolean): void {
  void muted;
}

export function setVideoEnabled(enabled: boolean): void {
  void enabled;
}

// Optional re-export types for convenience
export type { Room, TwilioParticipant, LocalTrackPublication };

