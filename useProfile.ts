import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';
import { db, doc, updateDoc, setDoc, onSnapshot } from '@/lib/firebase';

const defaultPrivacy = {
  showStatus: true,
  showLastSeen: true,
  allowFindById: true,
  showEmail: false,
  hideProfilePicture: false,
};

export function useProfile() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser?.id) {
      Promise.resolve().then(() => {
        setProfile(null);
        setLoading(false);
      });
      return;
    }

    const userRef = doc(db, 'users', authUser.id);
    const unsub = onSnapshot(userRef, snap => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          id: authUser.id,
          name: data.name || authUser.name || 'User',
          username: data.username || '',
          displayName: data.displayName || data.name || authUser.name || '',
          avatar: data.avatar || authUser.avatar || '/logo.jpg',
          coverImage: data.coverImage || '',
          email: data.email || authUser.email || '',
          statusMessage: data.statusMessage || '',
          about: data.about || '',
          location: data.location || '',
          website: data.website || '',
          verified: data.verified || false,
          status: data.status || 'online',
          lastSeen: data.lastSeen?.toDate?.() || new Date(),
          coins: data.coins || 0,
          phone: data.phone || '',
          privacy: data.privacy || defaultPrivacy,
          friends: data.friends || [],
          savedPosts: data.savedPosts || [],
          autoAddFriends: data.autoAddFriends ?? true,
          blockedUsers: data.blockedUsers || [],
        });
      } else {
        const newProfile: User = {
          id: authUser.id,
          name: authUser.name || authUser.email?.split('@')[0] || 'User',
          avatar: authUser.avatar || '/logo.jpg',
          email: authUser.email || '',
          statusMessage: 'Hey there! I am using GagaChat.',
          status: 'online',
          coins: 0,
          phone: '',
          privacy: defaultPrivacy,
        };
        setDoc(userRef, { ...newProfile, createdAt: new Date() }).catch(() => {});
        setProfile(newProfile);
      }
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [authUser]);

  const authId = authUser?.id;
  const updateProfileData = useCallback(async (values: Partial<User>) => {
    if (!authId) return;
    await updateDoc(doc(db, 'users', authId), values as Record<string, unknown>);
    setProfile(prev => prev ? { ...prev, ...values } : prev);
  }, [authId]);

  const privacy = profile?.privacy ?? defaultPrivacy;

  return { profile: profile || ({} as User), loading, privacy, updateProfileData, hasPassword: true };
}
