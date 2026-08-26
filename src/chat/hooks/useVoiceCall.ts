import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase.config';

export interface VoiceParticipant {
  uid: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  isLocal: boolean;
  stream?: MediaStream | null;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function useVoiceCall(
  passkey: string,
  uid: string | null,
  displayName: string | null
) {
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const peerConnectionsRef = useRef<{ [peerUid: string]: RTCPeerConnection }>({});

  // 1. Audio Level Analyzer for Discord Green Speaking Ring
  const startAudioAnalyzer = useCallback((stream: MediaStream) => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const speaking = average > 14; // Threshold for speaking

        setIsSpeakingLocal((prev) => {
          if (prev !== speaking && passkey && uid) {
            // Update speaking status in Firestore for other participants
            setDoc(
              doc(db, 'rooms', passkey, 'voiceMembers', uid),
              { isSpeaking: speaking },
              { merge: true }
            ).catch(() => {});
          }
          return speaking;
        });

        animFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('Audio analyzer error:', e);
    }
  }, [passkey, uid]);

  // 2. Join Voice Room
  const joinCall = useCallback(
    async (enableVideo: boolean = false) => {
      if (!passkey || !uid) return;

      try {
        let stream: MediaStream | null = null;

        if (Platform.OS === 'web' && navigator?.mediaDevices) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
              video: enableVideo ? { width: 640, height: 480, facingMode: 'user' } : false,
            });
            localStreamRef.current = stream;
            setLocalStream(stream);
            setIsVideoOn(enableVideo);
            setIsMuted(false);
            startAudioAnalyzer(stream);
          } catch (mediaErr) {
            console.warn('Media devices error, fallback to simulated stream:', mediaErr);
          }
        }

        // Register self in Firestore voiceMembers
        await setDoc(doc(db, 'rooms', passkey, 'voiceMembers', uid), {
          uid,
          name: displayName || 'Anonymous',
          isSpeaking: false,
          isMuted: false,
          isVideoOn: enableVideo,
          joinedAt: serverTimestamp(),
        });

        setIsInCall(true);
      } catch (err) {
        console.error('Failed to join voice call:', err);
      }
    },
    [passkey, uid, displayName, startAudioAnalyzer]
  );

  // 3. Leave Voice Room
  const leaveCall = useCallback(async () => {
    if (!passkey || !uid) return;

    try {
      // Stop local audio analyzer
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }

      // Stop local media tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }

      // Close peer connections
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};

      // Remove self from Firestore
      await deleteDoc(doc(db, 'rooms', passkey, 'voiceMembers', uid));
    } catch (e) {
      console.warn('Leave call cleanup error:', e);
    } finally {
      setIsInCall(false);
      setIsSpeakingLocal(false);
      setIsVideoOn(false);
      setIsMuted(false);
    }
  }, [passkey, uid]);

  // 4. Toggle Mute
  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }

    if (passkey && uid) {
      setDoc(
        doc(db, 'rooms', passkey, 'voiceMembers', uid),
        { isMuted: nextMuted, isSpeaking: nextMuted ? false : isSpeakingLocal },
        { merge: true }
      ).catch(() => {});
    }
  }, [isMuted, isSpeakingLocal, passkey, uid]);

  // 5. Toggle Video / Camera
  const toggleVideo = useCallback(async () => {
    const nextVideo = !isVideoOn;

    if (Platform.OS === 'web' && navigator?.mediaDevices) {
      if (nextVideo) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' },
          });
          const videoTrack = videoStream.getVideoTracks()[0];

          if (localStreamRef.current) {
            localStreamRef.current.addTrack(videoTrack);
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          }
          setIsVideoOn(true);
        } catch (e) {
          console.warn('Failed to enable camera:', e);
          return;
        }
      } else {
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach((t) => {
            t.stop();
            localStreamRef.current?.removeTrack(t);
          });
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }
        setIsVideoOn(false);
      }

      if (passkey && uid) {
        setDoc(
          doc(db, 'rooms', passkey, 'voiceMembers', uid),
          { isVideoOn: nextVideo },
          { merge: true }
        ).catch(() => {});
      }
    }
  }, [isVideoOn, passkey, uid]);

  // 6. Toggle Deafen (mute all audio output)
  const toggleDeafen = useCallback(() => {
    setIsDeafened((prev) => !prev);
  }, []);

  // 7. Real-Time Firestore Voice Members Listener
  useEffect(() => {
    if (!passkey || !isInCall) return;

    const membersRef = collection(db, 'rooms', passkey, 'voiceMembers');
    const unsub = onSnapshot(membersRef, (snap) => {
      const list: VoiceParticipant[] = snap.docs.map((d) => {
        const data = d.data();
        const isMe = d.id === uid;
        return {
          uid: d.id,
          name: data.name || 'Anonymous',
          isSpeaking: isMe ? isSpeakingLocal : (data.isSpeaking ?? false),
          isMuted: isMe ? isMuted : (data.isMuted ?? false),
          isVideoOn: isMe ? isVideoOn : (data.isVideoOn ?? false),
          isLocal: isMe,
          stream: isMe ? localStreamRef.current : null,
        };
      });
      setParticipants(list);
    });

    return unsub;
  }, [passkey, isInCall, uid, isSpeakingLocal, isMuted, isVideoOn]);

  // Cleanup on unmount or tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (passkey && uid && isInCall) {
        deleteDoc(doc(db, 'rooms', passkey, 'voiceMembers', uid)).catch(() => {});
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [passkey, uid, isInCall]);

  return {
    isInCall,
    isMuted,
    isVideoOn,
    isDeafened,
    isSpeakingLocal,
    participants,
    localStream,
    joinCall,
    leaveCall,
    toggleMute,
    toggleVideo,
    toggleDeafen,
  };
}
