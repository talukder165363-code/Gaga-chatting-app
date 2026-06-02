import { useState, useEffect, useCallback } from 'react';
import { db, auth, doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from '@/lib/firebase';

export type Session = {
  id: string;
  device: string;
  lastActive: string;
  current?: boolean;
};

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function detectDevice(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Android')) return 'Android Device';
  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Windows')) return 'Windows PC';
  if (ua.includes('Macintosh')) return 'MacBook';
  return 'Web Browser';
}

export function useAccountSecurity() {
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  const uid = auth.currentUser?.uid;

  // Load security settings from Firestore
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'userSecurity', uid), snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      setTwoFAEnabled(Boolean(data.twoFAEnabled));
      setPinSet(Boolean(data.pinHash));
      setBiometricEnabled(Boolean(data.biometricEnabled));
      setSessions((data.sessions as Session[]) || []);
    });
    return unsub;
  }, [uid]);

  // Register current session on mount
  useEffect(() => {
    if (!uid) return;
    const sessionId = `session_${uid}_${Date.now()}`;
    const currentSession: Session = {
      id: sessionId,
      device: detectDevice(),
      lastActive: new Date().toISOString(),
      current: true,
    };
    setDoc(
      doc(db, 'userSecurity', uid),
      {
        [`sessionMap.${sessionId}`]: currentSession,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch(() => {});
  }, [uid]);

  const startEnable2FA = useCallback(async () => {
    // In production: call a Firebase Function to generate a TOTP secret and QR
    // For now we mark it as pending on the doc
    if (!uid) return { otpSent: false };
    await setDoc(doc(db, 'userSecurity', uid), { twoFAPending: true, updatedAt: serverTimestamp() }, { merge: true });
    return { otpSent: true };
  }, [uid]);

  const verify2FA = useCallback(async (code: string) => {
    // In production: verify code against TOTP secret via Firebase Function
    // Stub: any 6-digit code enables it for now
    if (!uid || code.length !== 6) return { success: false };
    await setDoc(doc(db, 'userSecurity', uid), { twoFAEnabled: true, twoFAPending: false, updatedAt: serverTimestamp() }, { merge: true });
    setTwoFAEnabled(true);
    return { success: true };
  }, [uid]);

  const setupPin = useCallback(async (pin: string) => {
    if (!uid || pin.length < 4) return { success: false };
    const pinHash = await hashPin(pin);
    await setDoc(doc(db, 'userSecurity', uid), { pinHash, updatedAt: serverTimestamp() }, { merge: true });
    setPinSet(true);
    return { success: true };
  }, [uid]);

  const verifyPin = useCallback(async (pin: string) => {
    if (!uid) return false;
    const snap = await import('@/lib/firebase').then(m => m.getDoc(doc(db, 'userSecurity', uid)));
    if (!snap.exists()) return false;
    const stored = snap.data()?.pinHash as string | undefined;
    if (!stored) return false;
    const entered = await hashPin(pin);
    return entered === stored;
  }, [uid]);

  const toggleBiometric = useCallback(async () => {
    if (!uid) return;
    const next = !biometricEnabled;
    setBiometricEnabled(next);
    await setDoc(doc(db, 'userSecurity', uid), { biometricEnabled: next, updatedAt: serverTimestamp() }, { merge: true });
  }, [uid, biometricEnabled]);

  const signOutSession = useCallback(async (sessionId: string) => {
    if (!uid) return;
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    await updateDoc(doc(db, 'userSecurity', uid), {
      [`sessionMap.${sessionId}`]: null,
      updatedAt: serverTimestamp(),
    });
  }, [uid]);

  const signOutAllOther = useCallback(async () => {
    if (!uid) return;
    setSessions(prev => prev.filter(s => s.current));
    // Cloud function would handle invalidating other tokens; mark locally
    await setDoc(doc(db, 'userSecurity', uid), { signOutAllAt: serverTimestamp() }, { merge: true });
  }, [uid]);

  return {
    twoFAEnabled,
    startEnable2FA,
    verify2FA,
    pinSet,
    setupPin,
    verifyPin,
    biometricEnabled,
    toggleBiometric,
    sessions,
    signOutSession,
    signOutAllOther,
  };
}
