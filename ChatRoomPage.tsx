import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useChatStore } from '@/hooks/useChatStore'
import { useUsersMap } from '@/hooks/useUsers'
import { useTyping } from '@/hooks/useTyping'
import { useMessagePin } from '@/hooks/useMessagePin'
import { auth, db, addDoc, collection, serverTimestamp } from '@/lib/firebase'
import { uploadMediaBlob } from '@/lib/storage'
import { getChatName, getChatAvatar, sanitizeMediaUrl } from '@/lib/utils'
import { toast } from 'sonner'
import type { Message } from '@/types'

import { ChatHeader } from '@/components/features/chat/ChatHeader'
import { ChatInput } from '@/components/features/chat/ChatInput'
import { ChatInfo } from '@/components/features/chat/ChatInfo'
import { MessageList } from '@/components/features/chat/MessageList'
import TypingIndicator from '@/components/features/TypingIndicator'

export default function ChatRoomPage() {
  const { chatId } = useParams()
  const navigate = useNavigate()

  const {
    chats, archivedChats, messages, subscribeMessages,
    sendMessage, editMessage, deleteMessage, addReaction,
    markAsRead, loadOlderMessages, hasMoreMessages, muteChat, updateChat,
    removeParticipant, promoteAdmin, demoteAdmin,
  } = useChatStore()

  const { usersMap } = useUsersMap()
  const currentId = auth.currentUser?.uid || ''

  const allChats = [...chats, ...archivedChats]
  const chat = allChats.find(c => c.id === chatId)

  const [input, setInput] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null)
  const [, setSelectedMsgId] = useState<string | null>(null) // used by MessageList setter
  const [showReactionsId, setShowReactionsId] = useState<string | null>(null)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { typingUsers, sendTyping, stopTyping } = useTyping(chatId)
  const { pinnedMessages, pinMessage, unpinMessage } = useMessagePin(chatId)

  useEffect(() => {
    if (!chatId) return
    const unsub = subscribeMessages(chatId)
    return unsub
  }, [chatId, subscribeMessages])

  useEffect(() => {
    if (chatId) markAsRead(chatId)
  }, [chatId, markAsRead])

  // When editing, prefill input — derive directly to avoid setState-in-effect
  const inputValue = editingMessage ? editingMessage.content : input

  const chatMessages = (messages[chatId || ''] || []).map((msg, i, arr) => ({
    ...msg,
    showAvatar: i === arr.length - 1 || arr[i + 1]?.senderId !== msg.senderId,
    showSenderName: i === 0 || arr[i - 1]?.senderId !== msg.senderId,
  }))

  const displayedMessages = searchQuery
    ? chatMessages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : chatMessages

  const chatName = chat ? getChatName(chat, usersMap, currentId) : 'Chat'
  const chatAvatar = chat ? getChatAvatar(chat, usersMap, currentId) : '/assets/gaga-logo.jpg'
  const otherId = chat?.type === 'direct' ? chat.participants.find(p => p !== currentId) : undefined
  const otherUser = otherId ? usersMap[otherId] : null
  const isOnline = otherUser?.status === 'online'
  const subtitle = isOnline ? 'Online'
    : chat?.type === 'group' ? `${chat.participants.length} members`
    : 'Offline'

  const participants = chat?.type === 'group'
    ? chat.participants.map(id => usersMap[id]).filter(Boolean)
    : []

  const mediaMessages = chatMessages.filter(m => m.type === 'image' || m.type === 'file')

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed || !chatId) return
    stopTyping()

    if (editingMessage) {
      editMessage(chatId, editingMessage.id, trimmed)
      setEditingMessage(null)
      setInput('')
      return
    }

    const replyData = replyTo
      ? { messageId: replyTo.id, senderId: replyTo.senderId, type: replyTo.type, preview: replyTo.content }
      : undefined
    sendMessage(chatId, trimmed, 'text', replyData)
    setInput('')
    setReplyTo(null)
  }, [inputValue, chatId, editingMessage, replyTo, editMessage, sendMessage, stopTyping])

  const handleStartCall = async (type: 'voice' | 'video') => {
    if (!currentId || !chatId) return
    const targetId = chat?.type === 'direct' ? chat.participants.find(p => p !== currentId) : undefined
    try {
      const ref = await addDoc(collection(db, 'calls'), {
        from: currentId,
        to: targetId || '',
        type,
        status: 'calling',
        participants: [currentId, targetId].filter(Boolean),
        createdAt: serverTimestamp(),
      })
      navigate(`/call/${ref.id}`)
    } catch {
      toast.error('Unable to start the call. Please try again.')
    }
  }

  const handleStickerSelect = useCallback((emoji: string) => {
    if (!chatId) return
    sendMessage(chatId, emoji, 'sticker')
  }, [chatId, sendMessage])

  const handleEmojiSelect = useCallback((emoji: string) => {
    setInput(prev => prev + emoji)
  }, [])

  const handleImagePick = () => imageInputRef.current?.click()
  const handleFileAttach = () => fileInputRef.current?.click()

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !chatId || !currentId) return
    e.target.value = ''
    const isVideo = file.type.startsWith('video/')
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) { toast.error(`File too large (max ${isVideo ? '50' : '10'}MB)`); return }
    try {
      toast.loading('Uploading...', { id: 'media-upload' })
      const url = await uploadMediaBlob({ kind: 'chats', chatId, file, mimeType: file.type })
      toast.dismiss('media-upload')
      sendMessage(chatId, url, isVideo ? 'video' : 'image')
    } catch {
      toast.dismiss('media-upload')
      toast.error('Upload failed')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !chatId || !currentId) return
    e.target.value = ''
    if (file.size > 20 * 1024 * 1024) { toast.error('File too large (max 20MB)'); return }
    try {
      toast.loading('Uploading file...', { id: 'file-upload' })
      const url = await uploadMediaBlob({ kind: 'chats', chatId, file, mimeType: file.type })
      toast.dismiss('file-upload')
      sendMessage(chatId, url, 'file')
    } catch {
      toast.dismiss('file-upload')
      toast.error('Upload failed')
    }
  }

  const handleFilePaste = useCallback(async (file: File) => {
    if (!chatId || !currentId) return
    const isImage = file.type.startsWith('image/')
    if (!isImage) return
    try {
      const url = await uploadMediaBlob({ kind: 'chats', chatId, file, mimeType: file.type })
      sendMessage(chatId, url, 'image')
    } catch {
      toast.error('Paste upload failed')
    }
  }, [chatId, currentId, sendMessage])

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recordingChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) recordingChunksRef.current.push(e.data) }
      recorder.start(200)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      toast.error('Microphone access denied')
    }
  }

  const handleStopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || !chatId || !currentId) return
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null }
    setIsRecording(false)

    await new Promise<void>(resolve => {
      recorder.onstop = () => resolve()
      recorder.stop()
      recorder.stream.getTracks().forEach(t => t.stop())
    })

    const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' })
    if (blob.size < 1000) { toast.error('Recording too short'); return }
    try {
      toast.loading('Sending voice message...', { id: 'voice-upload' })
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
      const url = await uploadMediaBlob({ kind: 'chats', chatId, file, mimeType: 'audio/webm' })
      toast.dismiss('voice-upload')
      sendMessage(chatId, url, 'voice')
    } catch {
      toast.dismiss('voice-upload')
      toast.error('Voice send failed')
    }
  }, [chatId, currentId, sendMessage])

  const handleReact = useCallback((msgId: string, emoji: string) => {
    if (chatId) addReaction(chatId, msgId, emoji)
  }, [chatId, addReaction])

  const handleDelete = useCallback((msgId: string) => {
    if (chatId) { deleteMessage(chatId, msgId); toast.success('Message deleted') }
  }, [chatId, deleteMessage])

  const handlePin = useCallback((msg: Message) => {
    if (pinnedMessages.find(p => p.messageId === msg.id)) {
      unpinMessage(msg.id)
    } else {
      pinMessage({ id: msg.id, content: msg.content, senderId: msg.senderId })
    }
  }, [pinnedMessages, pinMessage, unpinMessage])

  const handleForward = useCallback((msg: Message) => {
    setForwardMsg(msg)
  }, [])

  const handleForwardTo = useCallback((targetChatId: string) => {
    if (!forwardMsg) return
    sendMessage(targetChatId, forwardMsg.content, forwardMsg.type, undefined, currentId)
    setForwardMsg(null)
    toast.success('Message forwarded')
  }, [forwardMsg, sendMessage, currentId])

  const handleScrollToMessage = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const handleToggleSelection = useCallback((id: string) => {
    setIsSelectionMode(true)
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }, [])

  const handleLoadOlder = useCallback(() => {
    if (chatId) loadOlderMessages(chatId)
  }, [chatId, loadOlderMessages])

  const handlePollClick = useCallback(() => {
    toast.info('Poll creation — coming soon')
  }, [])

  if (!chat) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black">
        <p className="text-white/50 mb-4">Chat not found</p>
        <button onClick={() => navigate('/')} className="gchat-btn px-6 py-2 rounded-full text-sm font-bold">Go Back</button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-black">
      <ChatHeader
        chatName={chatName}
        chatAvatar={sanitizeMediaUrl(chatAvatar) || '/assets/gaga-logo.jpg'}
        subtitle={subtitle}
        isOnline={isOnline}
        onBack={() => navigate('/')}
        onShowInfo={() => setShowInfo(true)}
        onStartCall={handleStartCall}
        onSearchToggle={() => setShowSearch(s => { if (s) setSearchQuery(''); return !s })}
      />

      {showSearch && (
        <div className="px-4 pb-3 bg-black border-b border-white/10">
          <div className="relative">
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              placeholder="Search in this chat..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#00FF7F]/60 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pinned message banner */}
      {pinnedMessages.length > 0 && (
        <div
          className="px-4 py-2 bg-[#00FF7F]/10 border-b border-[#00FF7F]/20 flex items-center gap-2 cursor-pointer shrink-0"
          onClick={() => handleScrollToMessage(pinnedMessages[pinnedMessages.length - 1].messageId)}
        >
          <span className="text-[#00FF7F] text-xs">📌</span>
          <p className="text-white/70 text-xs truncate flex-1">{pinnedMessages[pinnedMessages.length - 1].content}</p>
        </div>
      )}

      <MessageList
        chat={chat}
        messages={displayedMessages}
        hasMore={hasMoreMessages(chatId || '')}
        onLoadOlder={handleLoadOlder}
        onScroll={() => {}}
        onReact={handleReact}
        onReply={setReplyTo}
        onEdit={setEditingMessage}
        onDelete={handleDelete}
        onPin={handlePin}
        onForward={handleForward}
        onScrollToMessage={handleScrollToMessage}
        showSearch={showSearch}
        searchQuery={searchQuery}
        setSelectedMsgId={setSelectedMsgId}
        showReactionsId={showReactionsId}
        setShowReactionsId={setShowReactionsId}
        isSelectionMode={isSelectionMode}
        selectedIds={selectedIds}
        onToggleSelection={handleToggleSelection}
      />

      {/* Typing indicators */}
      {Object.entries(typingUsers).length > 0 && (
        <div className="px-4 pb-1 shrink-0">
          {Object.entries(typingUsers).map(([uid, name]) => (
            <TypingIndicator key={uid} name={name} />
          ))}
        </div>
      )}

      <ChatInput
        input={inputValue}
        setInput={setInput}
        onSend={handleSend}
        onTyping={sendTyping}
        onStopTyping={stopTyping}
        replyTo={replyTo}
        setReplyTo={setReplyTo}
        editingMessage={editingMessage}
        setEditingMessage={setEditingMessage}
        onImagePick={handleImagePick}
        onFileAttach={handleFileAttach}
        onPollClick={handlePollClick}
        isRecording={isRecording}
        recordingSeconds={recordingSeconds}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onStickerSelect={handleStickerSelect}
        onEmojiSelect={handleEmojiSelect}
        onFilePaste={handleFilePaste}
      />

      {/* Forward picker sheet */}
      {forwardMsg && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end"
          onClick={() => setForwardMsg(null)}
        >
          <div
            className="bg-[#1a1a1a] border-t border-white/10 rounded-t-3xl w-full max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Forward to</h2>
              <button onClick={() => setForwardMsg(null)} aria-label="Close">
                <span className="text-white/50 text-xl leading-none">&times;</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {[...chats, ...archivedChats].filter(c => c.id !== chatId).map(c => {
                const name = getChatName(c, usersMap, currentId)
                const avatar = getChatAvatar(c, usersMap, currentId)
                return (
                  <button
                    key={c.id}
                    onClick={() => handleForwardTo(c.id)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors border-b border-white/5"
                  >
                    <img src={sanitizeMediaUrl(avatar) || '/assets/gaga-logo.jpg'} alt={name} className="w-10 h-10 rounded-full object-cover" />
                    <span className="text-white font-medium text-sm truncate">{name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImageChange} aria-label="Upload image or video" title="Upload image or video" />
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} aria-label="Upload file" title="Upload file" />

      <ChatInfo
        chat={chat}
        chatName={chatName}
        chatAvatar={sanitizeMediaUrl(chatAvatar) || '/assets/gaga-logo.jpg'}
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        onSearchClick={() => { setShowInfo(false); setShowSearch(true) }}
        isMuted={chat.isMuted}
        onMuteToggle={() => muteChat(chat.id)}
        onClearChat={() => toast.info('Clear chat — coming soon')}
        onConfirmAction={(action) => toast.info(`${action} — coming soon`)}
        onUpdateChat={(data) => updateChat(chat.id, data)}
        onArchive={() => navigate('/')}
        onAddParticipant={() => toast.info('Add member — coming soon')}
        onRemoveParticipant={(uid) => removeParticipant(chat.id, uid)}
        onPromoteAdmin={(uid) => promoteAdmin(chat.id, uid)}
        onDemoteAdmin={(uid) => demoteAdmin(chat.id, uid)}
        otherUser={otherUser}
        participants={participants}
        mediaMessages={mediaMessages}
        currentUserId={currentId}
      />
    </div>
  )
}
