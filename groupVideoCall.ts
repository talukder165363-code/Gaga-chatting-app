import {
  db, doc, setDoc, updateDoc, onSnapshot, collection,
  addDoc, serverTimestamp, arrayUnion,
} from '@/lib/firebase';
import { sanitizeForLog } from '@/lib/utils';

export type Participant = { userId: string; stream?: MediaStream | null };
export type GroupCallState = 'calling' | 'connected' | 'ended' | 'failed';

type StateCallback = (state: GroupCallState) => void;
type ParticipantCallback = (participants: Participant[]) => void;
type ScreenShareCallback = (stream: MediaStream | null) => void;

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class GroupVideoCall {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private peers = new Map<string, RTCPeerConnection>();
  private remoteStreams = new Map<string, MediaStream>();
  private _state: GroupCallState = 'calling';
  private callDocId: string | null = null;
  private unsubs: Array<() => void> = [];
  private recorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  private readonly localUserId: string;
  private readonly withVideo: boolean;
  private readonly onStateChange: StateCallback;
  private readonly onParticipantUpdate: ParticipantCallback;
  private readonly onScreenShare: ScreenShareCallback;

  constructor(
    localUserId: string,
    withVideo: boolean,
    onStateChange: StateCallback,
    onParticipantUpdate: ParticipantCallback,
    onScreenShare: ScreenShareCallback,
  ) {
    this.localUserId = localUserId;
    this.withVideo = withVideo;
    this.onStateChange = onStateChange;
    this.onParticipantUpdate = onParticipantUpdate;
    this.onScreenShare = onScreenShare;
  }

  private setState(s: GroupCallState) {
    this._state = s;
    this.onStateChange(s);
  }

  private emitParticipants() {
    const parts: Participant[] = [
      { userId: this.localUserId, stream: this.localStream },
      ...Array.from(this.remoteStreams.entries()).map(([userId, stream]) => ({ userId, stream })),
    ];
    this.onParticipantUpdate(parts);
  }

  private async ensureLocalStream(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: this.withVideo });
    } catch (err) {
      console.error('getUserMedia failed:', sanitizeForLog(err instanceof Error ? err.message : String(err)));
      throw err;
    }
    return this.localStream;
  }

  private buildPeer(remoteUserId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.ontrack = (e) => {
      if (e.streams[0]) {
        this.remoteStreams.set(remoteUserId, e.streams[0]);
        this.emitParticipants();
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.setState('connected');
      }
    };

    this.peers.set(remoteUserId, pc);
    return pc;
  }

  async createGroupCall(participantIds: string[]): Promise<void> {
    try {
      await this.ensureLocalStream();
      const callId = doc(collection(db, 'groupCalls')).id;
      this.callDocId = callId;

      await setDoc(doc(db, 'groupCalls', callId), {
        host: this.localUserId,
        participants: arrayUnion(this.localUserId, ...participantIds),
        type: this.withVideo ? 'video' : 'voice',
        status: 'calling',
        createdAt: serverTimestamp(),
      });

      // Listen for participants joining
      const unsub = onSnapshot(doc(db, 'groupCalls', callId), async (snap) => {
        const data = snap.data();
        if (!data) return;
        const parts: string[] = data.participants || [];
        for (const pid of parts) {
          if (pid === this.localUserId || this.peers.has(pid)) continue;
          await this._connectToPeer(pid, callId, true);
        }
        if (data.status === 'ended') this.setState('ended');
      });

      this.unsubs.push(unsub);
      this.emitParticipants();
    } catch (err) {
      console.error('createGroupCall failed:', sanitizeForLog(err instanceof Error ? err.message : String(err)));
      this.setState('failed');
    }
  }

  async joinGroupCall(callDocId: string): Promise<void> {
    try {
      this.callDocId = callDocId;
      await this.ensureLocalStream();

      await updateDoc(doc(db, 'groupCalls', callDocId), {
        participants: arrayUnion(this.localUserId),
        status: 'connected',
      });

      // Listen for offers from host/other peers
      const offersColl = collection(db, 'groupCalls', callDocId, 'offers');
      const unsub = onSnapshot(offersColl, async (snap) => {
        for (const change of snap.docChanges()) {
          if (change.type !== 'added') continue;
          const data = change.doc.data();
          if (data.to !== this.localUserId) continue;
          await this._handleOffer(data.from, callDocId, data.offer);
        }
      });

      this.unsubs.push(unsub);
      this.setState('connected');
      this.emitParticipants();
    } catch (err) {
      console.error('joinGroupCall failed:', sanitizeForLog(err instanceof Error ? err.message : String(err)));
      this.setState('failed');
    }
  }

  private async _connectToPeer(remoteId: string, callDocId: string, isInitiator: boolean): Promise<void> {
    const pc = this.buildPeer(remoteId);
    this.localStream?.getTracks().forEach(t => pc.addTrack(t, this.localStream!));

    pc.onicecandidate = async ({ candidate }) => {
      if (!candidate) return;
      await addDoc(collection(db, 'groupCalls', callDocId, 'ice'), {
        from: this.localUserId,
        to: remoteId,
        candidate: candidate.toJSON(),
      });
    };

    // Listen for ICE candidates addressed to us from this peer
    const iceUnsub = onSnapshot(collection(db, 'groupCalls', callDocId, 'ice'), (snap) => {
      snap.docChanges().forEach(({ type, doc: d }) => {
        if (type !== 'added') return;
        const data = d.data();
        if (data.to === this.localUserId && data.from === remoteId) {
          pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {});
        }
      });
    });
    this.unsubs.push(iceUnsub);

    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await addDoc(collection(db, 'groupCalls', callDocId, 'offers'), {
        from: this.localUserId,
        to: remoteId,
        offer: { sdp: offer.sdp, type: offer.type },
      });

      // Listen for answer
      const answerUnsub = onSnapshot(collection(db, 'groupCalls', callDocId, 'answers'), (snap) => {
        snap.docChanges().forEach(async ({ type, doc: d }) => {
          if (type !== 'added') return;
          const data = d.data();
          if (data.to === this.localUserId && data.from === remoteId && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
        });
      });
      this.unsubs.push(answerUnsub);
    }
  }

  private async _handleOffer(fromId: string, callDocId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.buildPeer(fromId);
    this.localStream?.getTracks().forEach(t => pc.addTrack(t, this.localStream!));

    pc.onicecandidate = async ({ candidate }) => {
      if (!candidate) return;
      await addDoc(collection(db, 'groupCalls', callDocId, 'ice'), {
        from: this.localUserId,
        to: fromId,
        candidate: candidate.toJSON(),
      });
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await addDoc(collection(db, 'groupCalls', callDocId, 'answers'), {
      from: this.localUserId,
      to: fromId,
      answer: { sdp: answer.sdp, type: answer.type },
    });
  }

  async endCall(): Promise<void> {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
    this.recorder?.stop();
    this.screenStream?.getTracks().forEach(t => t.stop());
    this.localStream?.getTracks().forEach(t => t.stop());
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    if (this.callDocId) {
      await updateDoc(doc(db, 'groupCalls', this.callDocId), { status: 'ended', endedAt: serverTimestamp() }).catch(() => {});
    }
    this.setState('ended');
  }

  async toggleAudio(enabled: boolean): Promise<void> {
    this.localStream?.getAudioTracks().forEach(t => { t.enabled = enabled; });
  }

  async toggleVideo(enabled: boolean): Promise<void> {
    this.localStream?.getVideoTracks().forEach(t => { t.enabled = enabled; });
  }

  async startScreenShare(): Promise<void> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = this.screenStream.getVideoTracks()[0];
      this.peers.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack).catch(() => {});
      });
      screenTrack.onended = () => this.stopScreenShare();
      this.onScreenShare(this.screenStream);
    } catch (err) {
      console.error('Screen share failed:', sanitizeForLog(err instanceof Error ? err.message : String(err)));
    }
  }

  async stopScreenShare(): Promise<void> {
    this.screenStream?.getTracks().forEach(t => t.stop());
    this.screenStream = null;
    const camTrack = this.localStream?.getVideoTracks()[0] ?? null;
    if (camTrack) {
      this.peers.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(camTrack).catch(() => {});
      });
    }
    this.onScreenShare(null);
  }

  async startRecording(): Promise<void> {
    if (!this.localStream) return;
    this.recordedChunks = [];
    this.recorder = new MediaRecorder(this.localStream);
    this.recorder.ondataavailable = (e) => { if (e.data.size > 0) this.recordedChunks.push(e.data); };
    this.recorder.start(1000);
  }

  async stopRecording(): Promise<Blob | null> {
    if (!this.recorder) return null;
    return new Promise(resolve => {
      this.recorder!.onstop = () => resolve(new Blob(this.recordedChunks, { type: 'video/webm' }));
      this.recorder!.stop();
      this.recorder = null;
    });
  }

  getLocalStream(): MediaStream | null { return this.localStream; }
  get state(): GroupCallState { return this._state; }
}
