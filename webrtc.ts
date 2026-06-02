import {
  db, doc, setDoc, updateDoc, onSnapshot, collection,
  addDoc, serverTimestamp,
} from '@/lib/firebase';
import { sanitizeForLog } from '@/lib/utils';

export type CallState = 'calling' | 'ringing' | 'connected' | 'ended' | 'failed';

type StateCallback = (state: CallState) => void;
type StreamCallback = (stream: MediaStream) => void;
type LocalStreamCallback = (stream: MediaStream) => void;

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class WebRTCCall {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private _state: CallState = 'calling';
  private callDocId: string | null = null;
  private iceCandidateUnsub: (() => void) | null = null;
  private callUnsub: (() => void) | null = null;

  private readonly localUserId: string;
  private readonly remoteUserId: string;
  private readonly withVideo: boolean;
  private readonly onStateChange: StateCallback;
  private readonly onRemoteStream: StreamCallback;
  private readonly onLocalStream?: LocalStreamCallback;

  constructor(
    localUserId: string,
    remoteUserId: string,
    withVideo: boolean,
    onStateChange: StateCallback,
    onRemoteStream: StreamCallback,
    onLocalStream?: LocalStreamCallback,
  ) {
    this.localUserId = localUserId;
    this.remoteUserId = remoteUserId;
    this.withVideo = withVideo;
    this.onStateChange = onStateChange;
    this.onRemoteStream = onRemoteStream;
    this.onLocalStream = onLocalStream;
  }

  private setState(state: CallState) {
    this._state = state;
    this.onStateChange(state);
  }

  private async getLocalStream(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: this.withVideo,
      });
    } catch (err) {
      console.error('getUserMedia failed:', sanitizeForLog(err instanceof Error ? err.message : String(err)));
      throw err;
    }
    if (this.onLocalStream) this.onLocalStream(this.localStream);
    return this.localStream;
  }

  private buildPc(): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.setState('connected');
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        this.setState('failed');
      }
    };

    pc.ontrack = (event) => {
      if (event.streams[0]) this.onRemoteStream(event.streams[0]);
    };

    return pc;
  }

  async startCall(callDocId?: string): Promise<void> {
    try {
      const stream = await this.getLocalStream();
      const pc = this.buildPc();
      this.pc = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const id = callDocId ?? doc(collection(db, 'calls')).id;
      this.callDocId = id;

      // Collect ICE candidates
      pc.onicecandidate = async ({ candidate }) => {
        if (!candidate) return;
        await addDoc(collection(db, 'calls', id, 'callerCandidates'), candidate.toJSON());
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await setDoc(doc(db, 'calls', id), {
        from: this.localUserId,
        to: this.remoteUserId,
        type: this.withVideo ? 'video' : 'voice',
        status: 'calling',
        offer: { sdp: offer.sdp, type: offer.type },
        participants: [this.localUserId, this.remoteUserId],
        createdAt: serverTimestamp(),
      });

      // Listen for answer
      this.callUnsub = onSnapshot(doc(db, 'calls', id), async (snap) => {
        const data = snap.data();
        if (!data || !pc.currentRemoteDescription) {
          if (data?.answer) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
        }
        if (data?.status === 'ended') this.setState('ended');
      });

      // Listen for callee ICE candidates
      this.iceCandidateUnsub = onSnapshot(
        collection(db, 'calls', id, 'calleeCandidates'),
        (snap) => {
          snap.docChanges().forEach(({ type, doc: d }) => {
            if (type === 'added') pc.addIceCandidate(new RTCIceCandidate(d.data())).catch(() => {});
          });
        }
      );
    } catch (err) {
      console.error('startCall failed:', sanitizeForLog(err instanceof Error ? err.message : String(err)));
      this.setState('failed');
    }
  }

  async answerCall(callDocId: string): Promise<void> {
    try {
      this.callDocId = callDocId;
      const stream = await this.getLocalStream();
      const pc = this.buildPc();
      this.pc = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = async ({ candidate }) => {
        if (!candidate) return;
        await addDoc(collection(db, 'calls', callDocId, 'calleeCandidates'), candidate.toJSON());
      };

      const callSnap = await import('@/lib/firebase').then(m => m.getDoc(doc(db, 'calls', callDocId)));
      const callData = callSnap.data();
      if (!callData?.offer) { this.setState('failed'); return; }

      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await updateDoc(doc(db, 'calls', callDocId), {
        answer: { sdp: answer.sdp, type: answer.type },
        status: 'connected',
      });

      this.iceCandidateUnsub = onSnapshot(
        collection(db, 'calls', callDocId, 'callerCandidates'),
        (snap) => {
          snap.docChanges().forEach(({ type, doc: d }) => {
            if (type === 'added') pc.addIceCandidate(new RTCIceCandidate(d.data())).catch(() => {});
          });
        }
      );

      this.callUnsub = onSnapshot(doc(db, 'calls', callDocId), (snap) => {
        if (snap.data()?.status === 'ended') this.setState('ended');
      });

      this.setState('connected');
    } catch (err) {
      console.error('answerCall failed:', sanitizeForLog(err instanceof Error ? err.message : String(err)));
      this.setState('failed');
    }
  }

  async endCall(): Promise<void> {
    this.iceCandidateUnsub?.();
    this.callUnsub?.();
    this.localStream?.getTracks().forEach(t => t.stop());
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    if (this.callDocId) {
      await updateDoc(doc(db, 'calls', this.callDocId), { status: 'ended', endedAt: serverTimestamp() }).catch(() => {});
    }
    this.setState('ended');
  }

  async toggleAudio(enabled: boolean): Promise<void> {
    this.localStream?.getAudioTracks().forEach(t => { t.enabled = enabled; });
  }

  async toggleVideo(enabled: boolean): Promise<void> {
    this.localStream?.getVideoTracks().forEach(t => { t.enabled = enabled; });
  }

  async switchCamera(): Promise<void> {
    const videoTrack = this.localStream?.getVideoTracks()[0];
    if (!videoTrack) return;
    const constraints = videoTrack.getConstraints();
    const currentFacing = constraints.facingMode;
    const nextFacing = currentFacing === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: nextFacing }, audio: false });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = this.pc?.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(newVideoTrack);
      videoTrack.stop();
    } catch { /* camera switch not supported on this device */ }
  }

  get state(): CallState { return this._state; }
}
