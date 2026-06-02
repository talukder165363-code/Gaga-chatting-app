import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PhoneOff, Mic, MicOff, Camera, CameraOff, Volume2, RotateCcw } from 'lucide-react'
import { useUsersMap } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { db, doc, getDoc } from '@/lib/firebase'
import { cn, formatDuration } from '@/lib/utils'
import { WebRTCCall, type CallState } from '@/lib/webrtc'

export default function CallPage() {
  const { callId } = useParams()
  const navigate = useNavigate()
  const { usersMap } = useUsersMap()
  const { user: authUser } = useAuth()
  const [callType, setCallType] = useState<'voice' | 'video'>('voice')
  const [otherUserId, setOtherUserId] = useState<string | null>(null)
  const [callState, setCallState] = useState<CallState>('calling')
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)
  const isIncomingRef = useRef(false)
  const webrtcRef = useRef<WebRTCCall | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const startTimeRef = useRef(0)
  const currentId = authUser?.id

  // Load call doc and init WebRTC
  useEffect(() => {
    if (!callId || !currentId) return
    let canceled = false

    getDoc(doc(db, 'calls', callId)).then(snap => {
      if (canceled || !snap.exists()) { navigate('/'); return }
      const data = snap.data() as Record<string, unknown>
      const type = data.type === 'video' ? 'video' : 'voice'
      const from = data.from as string
      const to = data.to as string
      const incoming = to === currentId
      const otherId = incoming ? from : to
      if (!otherId) { navigate('/'); return }

      setCallType(type)
      setOtherUserId(otherId)
      isIncomingRef.current = incoming

      const rtc = new WebRTCCall(
        currentId, otherId, type === 'video',
        (state) => {
          setCallState(state)
          if (state === 'connected') startTimeRef.current = Date.now()
        },
        (stream) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream },
        (stream) => { if (localVideoRef.current) localVideoRef.current.srcObject = stream },
      )
      webrtcRef.current = rtc

      if (isIncomingRef.current) {
        rtc.answerCall(callId)
      } else {
        rtc.startCall(callId)
      }
    }).catch(() => navigate('/'))

    return () => { canceled = true; webrtcRef.current?.endCall() }
  }, [callId, currentId, navigate])

  useEffect(() => {
    if (callState !== 'connected') return
    const id = setInterval(() => setDuration(d => d + 1), 1000)
    return () => clearInterval(id)
  }, [callState])

  const handleEnd = () => {
    webrtcRef.current?.endCall()
    navigate(-1)
  }

  const user = otherUserId ? usersMap[otherUserId] : undefined
  const isVideo = callType === 'video'

  if (!user && callState === 'calling') {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-[#00FF7F] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900">
      {isVideo ? (
        <div className="absolute inset-0">
          <img src={user?.avatar} alt="" className="w-full h-full object-cover opacity-25 scale-110" style={{ filter: 'blur(20px) brightness(0.4)' }} />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      ) : (
        <div className="absolute inset-0 gchat-header opacity-90" />
      )}

      {/* Remote video */}
      {isVideo && callState === 'connected' && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover z-0" />
      )}

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <div className="flex items-center gap-2">
            {isVideo && <Camera size={16} className="text-white/70" />}
            <span className="text-white/70 text-sm capitalize">{callType} Call</span>
          </div>
          {callState === 'connected' && (
            <span className="text-white/70 text-sm font-mono">{formatDuration(duration)}</span>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <div className="relative">
            {callState === 'ringing' && (
              <>
                <div className="absolute inset-0 -m-6 rounded-full border-4 border-white/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                <div className="absolute inset-0 -m-12 rounded-full border-2 border-white/10 animate-ping" style={{ animationDuration: '2s' }} />
              </>
            )}
            <img src={user?.avatar} alt={user?.name} className="w-28 h-28 rounded-full object-cover border-4 border-white/30 shadow-2xl" />
            {callState === 'connected' && <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#00FF00] rounded-full border-2 border-white" />}
          </div>
          <div className="text-center">
            <h2 className="text-white text-2xl font-bold">{user?.name || 'Connecting...'}</h2>
            <p className={cn('text-sm mt-1.5 font-medium', callState === 'connected' ? 'text-[#00FF00]' : 'text-white/70')}>
              {callState === 'calling' ? (isVideo ? '📹 Video calling...' : '📞 Calling...')
                : callState === 'ringing' ? (isVideo ? '📹 Incoming video call...' : '📞 Incoming call...')
                : callState === 'connected' ? '● Connected'
                : '✓ Call ended'}
            </p>
          </div>

          {/* Self preview */}
          {isVideo && callState === 'connected' && (
            <div className="absolute top-20 right-4 w-24 h-36 bg-[#1a1a1a] rounded-2xl border-2 border-white/20 overflow-hidden shadow-xl">
              {isCameraOff ? (
                <div className="w-full h-full flex items-center justify-center"><CameraOff size={20} className="text-white/30" /></div>
              ) : (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              )}
            </div>
          )}
        </div>

        <div className="pb-14 px-8">
          {callState === 'connected' && (
            <div className={cn('grid gap-4 mb-8', isVideo ? 'grid-cols-4' : 'grid-cols-3')}>
              <ControlBtn active={isMuted} icon={isMuted ? <MicOff size={22} /> : <Mic size={22} />} label={isMuted ? 'Unmute' : 'Mute'}
                onClick={() => { const m = !isMuted; setIsMuted(m); webrtcRef.current?.toggleAudio(!m) }} />
              {isVideo && <ControlBtn active={isCameraOff} icon={isCameraOff ? <CameraOff size={22} /> : <Camera size={22} />} label="Camera"
                onClick={() => { const c = !isCameraOff; setIsCameraOff(c); webrtcRef.current?.toggleVideo(!c) }} />}
              <ControlBtn active={isSpeakerOn} icon={<Volume2 size={22} />} label="Speaker" onClick={() => setIsSpeakerOn(s => !s)} />
              {isVideo && <ControlBtn icon={<RotateCcw size={22} />} label="Flip" onClick={() => webrtcRef.current?.switchCamera()} />}
            </div>
          )}
          <div className="flex justify-center">
            <button onClick={handleEnd} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-xl hover:bg-red-600 transition-all active:scale-95">
              <PhoneOff size={26} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ControlBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('flex flex-col items-center gap-2 p-3 rounded-2xl transition-all', active ? 'bg-white text-gray-900' : 'bg-white/20 text-white hover:bg-white/30')}>
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}
