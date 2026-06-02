import { Phone, Video, X } from 'lucide-react';
import { useIncomingCalls } from '@/hooks/useIncomingCalls';
import { useUsersMap } from '@/hooks/useUsers';
import { useNavigate } from 'react-router-dom';
import { db, doc, updateDoc, serverTimestamp } from '@/lib/firebase';

export function IncomingCallNotification() {
  const { incomingCall } = useIncomingCalls();
  const { usersMap } = useUsersMap();
  const navigate = useNavigate();

  if (!incomingCall) return null;

  const caller = usersMap[incomingCall.from];
  if (!caller) return null;

  const handleAccept = () => {
    navigate(`/call/${incomingCall.id}`);
  };

  const handleReject = async () => {
    try {
      await updateDoc(doc(db, 'calls', incomingCall.id), {
        status: 'ended',
        endedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[150] animate-slide-in">
      <div className="bg-[#1a1a1a] border border-white/20 rounded-2xl shadow-2xl p-4 min-w-[320px]">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <img
              src={caller.avatar}
              alt={caller.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#00FF00] rounded-full flex items-center justify-center">
              {incomingCall.type === 'video' ? (
                <Video size={14} className="text-black" />
              ) : (
                <Phone size={14} className="text-black" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold">{caller.name}</h3>
            <p className="text-white/60 text-sm">
              Incoming {incomingCall.type} call...
            </p>
          </div>
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
            {incomingCall.type === 'video' ? <Video size={18} /> : <Phone size={18} />}
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
