import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  db, auth, collection, doc, query, where,
  onSnapshot, addDoc, updateDoc, deleteDoc,
  arrayUnion, arrayRemove, serverTimestamp, getDocs,
} from '@/lib/firebase';

interface FriendRequest {
  id: string;
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export function useFriends() {
  const uid = auth.currentUser?.uid;
  const navigate = useNavigate();
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);

  // Listen to user doc for friends/favorites/blocked
  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'users', uid), snap => {
      if (!snap.exists()) return;
      const data = snap.data();
      setFriendIds((data.friends as string[]) || []);
      setFavoriteIds((data.favorites as string[]) || []);
      setSavedPosts((data.savedPosts as string[]) || []);
      setBlockedUsers((data.blockedUsers as string[]) || []);
    });
    return unsub;
  }, [uid]);

  // Listen for received friend requests
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'friendRequests'), where('to', '==', uid), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, snap => {
      setReceivedRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as FriendRequest)));
    });
    return unsub;
  }, [uid]);

  // Listen for sent friend requests
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'friendRequests'), where('from', '==', uid), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, snap => {
      setSentRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as FriendRequest)));
    });
    return unsub;
  }, [uid]);

  const sendFriendRequest = useCallback(async (toUserId: string) => {
    if (!uid || toUserId === uid) return;
    // Check for existing
    const q = query(collection(db, 'friendRequests'), where('from', '==', uid), where('to', '==', toUserId));
    const snap = await getDocs(q);
    if (!snap.empty) return;
    await addDoc(collection(db, 'friendRequests'), {
      from: uid, to: toUserId, status: 'pending', createdAt: serverTimestamp(),
    });
  }, [uid]);

  const acceptFriendRequest = useCallback(async (reqId: string, fromId?: string) => {
    if (!uid) return;
    await updateDoc(doc(db, 'friendRequests', reqId), { status: 'accepted' });
    if (fromId) {
      await updateDoc(doc(db, 'users', uid), { friends: arrayUnion(fromId) });
      await updateDoc(doc(db, 'users', fromId), { friends: arrayUnion(uid) });
    }
  }, [uid]);

  const rejectFriendRequest = useCallback(async (reqId: string) => {
    await deleteDoc(doc(db, 'friendRequests', reqId));
  }, []);

  const addFriend = useCallback(async (friendId: string) => {
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid), { friends: arrayUnion(friendId) });
  }, [uid]);

  const removeFriend = useCallback(async (friendId: string) => {
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid), { friends: arrayRemove(friendId) });
  }, [uid]);

  const toggleFavorite = useCallback(async (userId: string) => {
    if (!uid) return;
    const isFav = favoriteIds.includes(userId);
    await updateDoc(doc(db, 'users', uid), {
      favorites: isFav ? arrayRemove(userId) : arrayUnion(userId),
    });
  }, [uid, favoriteIds]);

  const blockUser = useCallback(async (userId: string) => {
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid), {
      blockedUsers: arrayUnion(userId),
      friends: arrayRemove(userId),
    });
  }, [uid]);

  const unblockUser = useCallback(async (userId: string) => {
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid), { blockedUsers: arrayRemove(userId) });
  }, [uid]);

  const startChatWithFriend = useCallback((id: string) => {
    navigate(`/chats?userId=${id}`);
  }, [navigate]);

  return {
    friends: friendIds,
    favorites: favoriteIds,
    savedPosts,
    blockedUsers,
    receivedRequests,
    sentRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    addFriend,
    removeFriend,
    toggleFavorite,
    blockUser,
    unblockUser,
    startChatWithFriend,
  };
}
