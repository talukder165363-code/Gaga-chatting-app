import { Video, Phone, X, Users } from 'lucide-react';
import { useIncomingGroupCalls } from '@/hooks/useIncomingGroupCalls';
import { useUsersMap } from '@/hooks/useUsers';
import { useNavigate } from 'react-router-dom';
import { db, doc, updateDoc, serverTimestamp } from '@/lib/firebase';

export function IncomingGroupCallNotification() {
  const { incomingGroupCall } = useIncomingGroupCalls();
  const { usersMap } = useUsersMap();
  const navigate = useNavigate();

  if (!incomingGroupCall) return null;

  const host = usersMap[incomingGroupCall.host];
  const participantUsers = incomingGroupCall.participants
    .map(id => usersMap[id])
    .filter(Boolean);

  if (!host) return null;

  const handleAccept = () => {
    navigate(`/call/${incomingGroupCall.id}`);
  };

  const handleReject = async () => {
    try {
      await updateDoc(doc(db, 'groupCalls', incomingGroupCall.id), {
        status: 'ended',
        endedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error rejecting group call:', error);
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] animate-slide-in">
      <div className="bg-[#1a1a1a] border border-white/20 rounded-2xl shadow-2xl p-4 min-w-[320px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <img
              src={host.avatar}
              alt={host.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#00FF00] rounded-full flex items-center justify-center">
              {incomingGroupCall.type === 'video' ? (
                <Video size={14} className="text-black" />
              ) : (
                <Phone size={14} className="text-black" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold">{host.name}</h3>
            <p className="text-white/60 text-sm flex items-center gap-1">
              <Users size={14} />
              Group {incomingGroupCall.type} call ({incomingGroupCall.participants.length})
            </p>
          </div>
        </div>

        {/* Participant avatars */}
        <div className="flex -space-x-2 mb-4 overflow-hidden">
          {participantUsers.slice(0, 5).map((user) => (
            <img
              key={user.id}
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full border-2 border-[#1a1a1a]"
              title={user.name}
            />
          ))}
          {participantUsers.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-[#1a1a1a] flex items-center justify-center">
              <span className="text-white text-xs">+{participantUsers.length - 5}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReject}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <X size={18} />
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 gchat-btn py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            {incomingGroupCall.type === 'video' ? <Video size={18} /> : <Phone size={18} />}
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
