import { storage } from './firebase'
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTask,
} from 'firebase/storage'

type UploadMediaBlobArgs =
  | { kind: 'chats'; chatId: string; file: File; mimeType: string }
  | { kind: 'posts'; postUserId: string; file: File; mimeType: string }
  | { kind: 'avatars'; userId: string; file: File; mimeType: string }

function buildStoragePath(args: UploadMediaBlobArgs): string {
  const ts = Date.now()
  const ext = args.file.name.split('.').pop() || 'bin'
  switch (args.kind) {
    case 'chats':
      return `chats/${args.chatId}/media/${ts}.${ext}`
    case 'posts':
      return `posts/${args.postUserId}/${ts}.${ext}`
    case 'avatars':
      return `avatars/${args.userId}/${ts}.${ext}`
  }
}

export async function uploadMediaBlob(args: UploadMediaBlobArgs): Promise<string> {
  const path = buildStoragePath(args)
  const storageRef = ref(storage, path)
  const snapshot = await uploadBytesResumable(storageRef, args.file, {
    contentType: args.mimeType,
  })
  return getDownloadURL(snapshot.ref)
}

type CreateUploadTaskArgs =
  | { kind: 'posts'; postUserId: string; file: File; mimeType: string }
  | { kind: 'chats'; chatId: string; file: File; mimeType: string }
  | { kind: 'avatars'; userId: string; file: File; mimeType: string }

export function createUploadTask(args: CreateUploadTaskArgs): { task: UploadTask; path: string } {
  const path = buildStoragePath(args as UploadMediaBlobArgs)
  const storageRef = ref(storage, path)
  const task = uploadBytesResumable(storageRef, args.file, {
    contentType: args.mimeType,
  })
  return { task, path }
}
