import { useState, useEffect } from 'react';
import type { User } from '@/types';
import { db, collection, onSnapshot, query, limit } from '@/lib/firebase';

let cachedUsersMap: Record<string, User> = {};
let cachedUsers: User[] = [];
const listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

// Global subscription so all hook instances share one Firestore listener
let globalUnsub: (() => void) | null = null;

const MAX_USERS = 500;

function ensureSubscription() {
  if (globalUnsub) return;
  const q = query(collection(db, 'users'), limit(MAX_USERS));
  globalUnsub = onSnapshot(q, snap => {
    const map: Record<string, User> = {};
    const list: User[] = [];
    snap.docs.forEach(d => {
      const data = d.data();
      const user: User = {
        id: d.id,
        name: (data.name as string) || 'User',
        username: (data.username as string) || '',
        displayName: (data.displayName as string) || (data.name as string) || '',
        avatar: (data.avatar as string) || '/logo.jpg',
        email: (data.email as string) || '',
        phone: (data.phone as string) || '',
        statusMessage: (data.statusMessage as string) || '',
        status: (data.status as User['status']) || 'offline',
        lastSeen: data.lastSeen?.toDate?.() || undefined,
        coins: (data.coins as number) || 0,
        verified: (data.verified as boolean) || false,
        bio: (data.bio as string) || '',
        about: (data.about as string) || '',
        location: (data.location as string) || '',
        website: (data.website as string) || '',
        privacy: (data.privacy as User['privacy']) || undefined,
      };
      map[d.id] = user;
      list.push(user);
    });
    cachedUsersMap = map;
    cachedUsers = list;
    notifyListeners();
  });
}

export function useUsersMap() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    ensureSubscription();
    const refresh = () => forceUpdate(n => n + 1);
    listeners.add(refresh);
    return () => { listeners.delete(refresh); };
  }, []);

  return { usersMap: cachedUsersMap };
}

export function useUsers() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    ensureSubscription();
    const refresh = () => forceUpdate(n => n + 1);
    listeners.add(refresh);
    return () => { listeners.delete(refresh); };
  }, []);

  return { usersMap: cachedUsersMap, users: cachedUsers };
}
