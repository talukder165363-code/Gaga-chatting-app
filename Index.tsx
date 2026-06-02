import { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNav from '@/components/layout/BottomNav';
import { IncomingCallNotification } from '@/components/features/IncomingCallNotification';
import { IncomingGroupCallNotification } from '@/components/features/IncomingGroupCallNotification';
import CallModal from '@/components/features/CallModal';
import GroupCallModal from '@/components/features/GroupCallModal';
import { useNotifications } from '@/hooks/useNotifications';
const ChatsPage = lazy(() => import('@/pages/ChatsPage'));
const ChatRoomPage = lazy(() => import('@/pages/ChatRoomPage'));
const ContactsPage = lazy(() => import('@/pages/ContactsPage'));
const TimelinePage = lazy(() => import('@/pages/TimelinePage'));
const CallsPage = lazy(() => import('@/pages/CallsPage'));
const MorePage = lazy(() => import('@/pages/MorePage'));
import { useChatStore } from '@/hooks/useChatStore';
import { usePresence } from '@/hooks/usePresence';
import { useUsersMap } from '@/hooks/useUsers';
import { auth, db, doc, getDoc } from '@/lib/firebase';
import type { Chat, User } from '@/types';
import { sanitizeForLog } from '@/lib/utils';

import { GlobalSearch } from '@/components/features/GlobalSearch';

type Tab = 'chats' | 'contacts' | 'timeline' | 'calls' | 'more';

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  const {
    chats,
    archivedChats,
    messages,
    activeChat,
    totalUnread,
    loadingChats,
    setActiveChat,
    subscribeChats,
    subscribeMessages,
    markAsRead,
    pinChat,
    muteChat,
    archiveChat,
    deleteChat,
    createGroupChat,
    createDirectChat,
  } = useChatStore();

  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = subscribeChats(uid);
    return () => unsub();
  }, [subscribeChats]);

  useEffect(() => {
    if (!activeChat?.id) return;
    const unsub = subscribeMessages(activeChat.id);
    return () => unsub();
  }, [activeChat?.id, subscribeMessages]);

  type RouteCall =
    | {
      kind: 'direct';
      id: string;
      type: 'voice' | 'video';
      userId: string;
      isIncoming: boolean;
    }
    | {
      kind: 'group';
      id: string;
      type: 'voice' | 'video';
      participantIds: string[];
      hostId: string;
      isIncoming: boolean;
    };

  const [routeCall, setRouteCall] = useState<RouteCall | null>(null);

  const { chatId, callId } = useParams<{ chatId?: string; callId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { usersMap } = useUsersMap();

  useEffect(() => {
    if (chatId) {
      const allChats = [...chats, ...archivedChats];
      const targetChat = allChats.find((c) => c.id === chatId);
      if (targetChat) {
        setActiveChat(targetChat);
        return;
      }

      if (!loadingChats) {
        navigate('/', { replace: true });
      }
      return;
    }

    if (!chatId && activeChat) {
      setActiveChat(null);
    }
  }, [chatId, chats, archivedChats, activeChat, loadingChats, setActiveChat, navigate]);

  useEffect(() => {
    let canceled = false;

    const loadCall = async () => {
      if (!callId) {
        setRouteCall(null);
        return;
      }

      if (!currentUserId) {
        setRouteCall(null);
        return;
      }

      try {
        const callSnapshot = await getDoc(doc(db, 'calls', callId));
        if (callSnapshot.exists()) {
          type CallDocData = {
            from?: string;
            to?: string;
            participants?: string[];
            type?: 'voice' | 'video' | string;
            status?: string;
          };

          const callData = callSnapshot.data() as CallDocData;
          const fromUser = callData.from;
          const toUser = callData.to;
          const participants = Array.isArray(callData.participants) ? callData.participants : undefined;
          const type = callData.type === 'video' ? 'video' : 'voice';
          const status = callData.status;

          const validParticipant = [fromUser, toUser].includes(currentUserId) || participants?.includes(currentUserId);
          if (!validParticipant || status === 'ended') {
            navigate('/', { replace: true });
            return;
          }

          const otherUserId = fromUser && toUser
            ? currentUserId === fromUser ? toUser : fromUser
            : participants?.find((id) => id !== currentUserId) ?? '';

          if (!otherUserId) {
            navigate('/', { replace: true });
            return;
          }

          const isIncoming = typeof toUser === 'string'
            ? currentUserId === toUser
            : currentUserId !== fromUser;

          if (canceled) return;

          setActiveChat(null);
          setActiveTab('calls');
          setRouteCall({
            kind: 'direct',
            id: callId,
            type,
            userId: otherUserId,
            isIncoming,
          });
          return;
        }

        const groupCallSnapshot = await getDoc(doc(db, 'groupCalls', callId));
        if (!groupCallSnapshot.exists()) {
          navigate('/', { replace: true });
          return;
        }

        type GroupCallDocData = {
          participants?: string[];
          host?: string;
          type?: 'voice' | 'video' | string;
          status?: string;
        };

        const groupCallData = groupCallSnapshot.data() as GroupCallDocData;
        const participants = Array.isArray(groupCallData.participants) ? groupCallData.participants : [];
        const hostId = groupCallData.host;
        const type = groupCallData.type === 'video' ? 'video' : 'voice';
        const status = groupCallData.status;

        const validParticipant = participants.includes(currentUserId) || hostId === currentUserId;
        if (!validParticipant || status === 'ended') {
          navigate('/', { replace: true });
          return;
        }

        if (!hostId) {
          navigate('/', { replace: true });
          return;
        }

        const isIncoming = currentUserId !== hostId;

        if (canceled) return;

        setActiveChat(null);
        setActiveTab('calls');
        setRouteCall({
          kind: 'group',
          id: callId,
          type,
          participantIds: participants,
          hostId,
          isIncoming,
        });
      } catch (error) {
        console.error('Failed to load call route:', sanitizeForLog(error instanceof Error ? error.message : String(error)));
        navigate('/', { replace: true });
      }
    };

    loadCall();

    return () => {
      canceled = true;
    };
  }, [callId, navigate, setActiveChat, currentUserId]);


  const routeCallParticipants = routeCall?.kind === 'group'
    ? Array.from(new Set([...routeCall.participantIds, routeCall.hostId]))
        .map((id) => usersMap[id])
        .filter((user): user is User => !!user)
    : [];

  useEffect(() => {
    if (!activeChat && location.pathname.startsWith('/chat/')) {
      navigate('/', { replace: true });
    }
  }, [activeChat, location.pathname, navigate]);

  usePresence();
  const { enableNotifications, isEnabled } = useNotifications();

  // Auto-enable notifications on first load
  useEffect(() => {
    if (!isEnabled && auth.currentUser) {
      enableNotifications();
    }
    // We intentionally depend on isEnabled and enableNotifications so that
    // notification setup runs when the state or the function reference changes.
  }, [isEnabled, enableNotifications]);

  const handleChatSelect = (chat: Chat) => {
    setActiveChat(chat);
    markAsRead(chat.id);
    navigate(`/chat/${chat.id}`, { replace: true });
  };


  const directRouteCall = routeCall?.kind === 'direct' ? routeCall : null;

  const fallbackRouteUser: User | null = directRouteCall
    ? {
      id: directRouteCall.userId,
      name: 'Unknown user',
      avatar: '/gaga-logo.jpg',
      status: 'offline',
      statusMessage: 'Loading…',
      phone: '',
      email: '',
    }
    : null;

  const activeRouteCallUser = directRouteCall
    ? (usersMap[directRouteCall.userId] || fallbackRouteUser)
    : null;

  const handleStartChatFromContacts = async (userId: string) => {
    if (!currentUserId) return;

    const allChats = [...chats, ...archivedChats];
    const existingChat = allChats.find(c =>
      c.type === 'direct' && c.participants.includes(userId) && c.participants.includes(currentUserId)
    );
    if (existingChat) {
      setActiveChat(existingChat);
      setActiveTab('chats');
      navigate(`/chat/${existingChat.id}`, { replace: true });
      return;
    }

    const newChat = await createDirectChat(userId);
    if (!newChat) return;
    setActiveChat(newChat);
    setActiveTab('chats');
    navigate(`/chat/${newChat.id}`, { replace: true });
  };

  const pageFallback = (
    <div className="flex h-full items-center justify-center bg-[var(--gchat-bg)] text-white/70">
      Loading content...
    </div>
  );

  return (
    <div className="flex justify-center items-stretch min-h-screen bg-[var(--gchat-bg)]">
      {/* Global Search */}
      <GlobalSearch
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        chats={chats}
        messages={messages}
        onChatSelect={handleChatSelect}
        onUserSelect={handleStartChatFromContacts}
      />

      {/* Incoming Call Notifications */}
      <IncomingCallNotification />
      <IncomingGroupCallNotification />
      {routeCall?.kind === 'direct' && activeRouteCallUser && (
        <CallModal
          user={activeRouteCallUser}
          type={routeCall.type}
          callDocId={routeCall.id}
          isIncoming={routeCall.isIncoming}
          onEnd={() => {
            setRouteCall(null);
            navigate('/');
          }}
        />
      )}
      {routeCall?.kind === 'group' && (
        <GroupCallModal
          participants={routeCallParticipants}
          type={routeCall.type}
          callDocId={routeCall.id}
          isHost={routeCall.hostId === currentUserId}
          onEnd={() => {
            setRouteCall(null);
            navigate('/');
          }}
        />
      )}

      <div className="relative w-full max-w-md bg-[var(--gchat-bg)] flex flex-col min-h-screen shadow-2xl overflow-hidden">
        {/* Main Content */}
        <div className={activeChat ? 'h-screen overflow-hidden' : 'flex-1 overflow-hidden pb-[60px]'}>
          {activeChat ? (
            <div className="h-full">
              <Suspense fallback={pageFallback}>
                <ChatRoomPage />
              </Suspense>
            </div>
          ) : (
            <div className="h-full overflow-hidden">
              <Suspense fallback={pageFallback}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    {activeTab === 'chats' && (
                      <ChatsPage
                        chats={chats}
                        archivedChats={archivedChats}
                        loading={loadingChats}
                        onChatSelect={handleChatSelect}
                        onPin={pinChat}
                        onMute={muteChat}
                        onArchive={archiveChat}
                        onDelete={deleteChat}
                        onCreateGroup={createGroupChat}
                        onMarkAllRead={() => chats.forEach(c => c.unreadCount > 0 && markAsRead(c.id))}
                        onStartDirectChat={handleStartChatFromContacts}
                        onSearchClick={() => setShowGlobalSearch(true)}
                      />
                    )}
                    {activeTab === 'contacts' && (
                      <ContactsPage
                        onStartChat={handleStartChatFromContacts}
                        onOpenGroupChats={() => setActiveTab('chats')}
                      />
                    )}
                    {activeTab === 'timeline' && <TimelinePage />}
                    {activeTab === 'calls' && <CallsPage />}
                    {activeTab === 'more' && <MorePage />}
                  </motion.div>
                </AnimatePresence>
              </Suspense>
            </div>
          )}
        </div>

        {/* Bottom Navigation — hidden inside chat room */}
        {!activeChat && (
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            unreadCount={totalUnread}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
