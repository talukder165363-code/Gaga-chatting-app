import { useState, useCallback } from 'react';
import { db, auth, doc, setDoc, serverTimestamp } from '@/lib/firebase';

export function useNotifications() {
  const [isEnabled, setIsEnabled] = useState(
    () => 'Notification' in window && Notification.permission === 'granted'
  );

  const enableNotifications = useCallback(async () => {
    if (!('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setIsEnabled(granted);

      if (granted) {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        // Store FCM token if firebase/messaging is available
        try {
          const { getMessaging, getToken } = await import('firebase/messaging');
          const messaging = getMessaging();
          const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          });
          if (token) {
            await setDoc(doc(db, 'fcmTokens', uid), {
              token,
              updatedAt: serverTimestamp(),
            }, { merge: true });
          }
        } catch {
          // FCM not configured — notifications still work via browser API
        }
      }
    } catch {
      setIsEnabled(false);
    }
  }, []);

  return { isEnabled, enableNotifications };
}
