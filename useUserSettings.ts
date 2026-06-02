import { useState, useEffect, useCallback } from 'react';
import { db, auth, doc, onSnapshot, setDoc, serverTimestamp } from '@/lib/firebase';

type UserSettings = {
  theme: 'dark' | 'midnight' | 'oled';
  fontSize: 'small' | 'medium' | 'large';
  notifications: boolean;
  soundEnabled: boolean;
  readReceiptsEnabled: boolean;
  hideProfilePicture: boolean;
};

const DEFAULTS: UserSettings = {
  theme: 'dark',
  fontSize: 'medium',
  notifications: true,
  soundEnabled: true,
  readReceiptsEnabled: true,
  hideProfilePicture: false,
};

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'userSettings', uid), snap => {
      if (!snap.exists()) return;
      const data = snap.data() as Partial<UserSettings>;
      setSettings(prev => ({ ...prev, ...data }));
    });
    return unsub;
  }, []);

  const updateSettings = useCallback(async (patch: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await setDoc(
      doc(db, 'userSettings', uid),
      { ...patch, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }, []);

  return { settings, updateSettings };
}
