import { Room, Participant as TwilioParticipant } from 'twilio-video';
import CallControls from './CallControls';
import VideoParticipant from './VideoParticipant';

interface CallInterfaceProps {
  room: Room | null;
  participants: TwilioParticipant[];
  isMuted: boolean;
  isVideoOn: boolean;
  callDuration: number;
  onToggleMute: (muted: boolean) => void;
  onToggleVideo: (enabled: boolean) => void;
  onEndCall: () => void;
  onScreenShare?: () => void;
}

export default function CallInterface({
  room,
  participants,
  isMuted,
  isVideoOn,
  callDuration,
  onToggleMute,
  onToggleVideo,
  onEndCall,
  onScreenShare,
}: CallInterfaceProps) {
  const localParticipant = room?.localParticipant;
  const remoteParticipants = participants;

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4">
        {/* Remote Participants Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {remoteParticipants.map((participant) => (
            <VideoParticipant
              key={participant.sid}
              participant={participant}
              videoTrack={Array.from(participant.videoTracks.values())[0]?.track}
              audioTrack={Array.from(participant.audioTracks.values())[0]?.track}
              isLocal={false}
            />
          ))}

          {/* Empty State */}
          {remoteParticipants.length === 0 && (
            <div className="flex items-center justify-center bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] rounded-lg">
              <div className="text-center space-y-3">
                <div className="text-4xl">⏳</div>
                <p className="text-white/70">Waiting for participants...</p>
              </div>
            </div>
          )}
        </div>

        {/* Local Participant (Picture in Picture) */}
        {localParticipant && isVideoOn && (
          <div className="w-40 h-52">
            <VideoParticipant
              participant={localParticipant}
              videoTrack={Array.from(localParticipant.videoTracks.values())[0]?.track}
              audioTrack={Array.from(localParticipant.audioTracks.values())[0]?.track}
              isLocal={true}
              isPiP={true}
            />
          </div>
        )}
      </div>

      {/* Call Controls */}
      <CallControls
        isMuted={isMuted}
        isVideoOn={isVideoOn}
        onToggleMute={onToggleMute}
        onToggleVideo={onToggleVideo}
        onEndCall={onEndCall}
        onScreenShare={onScreenShare}
        callDuration={callDuration}
      />
    </div>
  );
}
