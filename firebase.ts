import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import {
  getAuth,
  type User,
  type Auth,
  connectAuthEmulator,
} from 'firebase/auth'
import {
  getFirestore,
  type Firestore as FirestoreType,
  connectFirestoreEmulator,
  doc as firestoreDoc,
  collection as firestoreCollection,
  query as firestoreQuery,
  where as firestoreWhere,
  orderBy as firestoreOrderBy,
  limit as firestoreLimit,
  startAfter as firestoreStartAfter,
  endBefore as firestoreEndBefore,
  limitToLast as firestoreLimitToLast,
  getDoc as firestoreGetDoc,
  getDocs as firestoreGetDocs,
  onSnapshot as firestoreOnSnapshot,
  addDoc as firestoreAddDoc,
  setDoc as firestoreSetDoc,
  updateDoc as firestoreUpdateDoc,
  deleteDoc as firestoreDeleteDoc,
  writeBatch as firestoreWriteBatch,
  arrayUnion as firestoreArrayUnion,
  arrayRemove as firestoreArrayRemove,
  serverTimestamp as firestoreServerTimestamp,
  Timestamp as FirestoreTimestamp,
  collectionGroup as firestoreCollectionGroup,
} from 'firebase/firestore'
import {
  getStorage,
  ref as storageRef,
  uploadBytes as storageUploadBytes,
  getDownloadURL as storageGetDownloadURL,
  connectStorageEmulator,
} from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Initialize Analytics only in browser (not SSR/Node)
if (typeof window !== 'undefined') {
  getAnalytics(app)
}

export const auth: Auth = getAuth(app)
export const db: FirestoreType = getFirestore(app)
export const storage = getStorage(app)

const useFirebaseEmulators = import.meta.env.VITE_FIREBASE_USE_EMULATORS === 'true'

if (useFirebaseEmulators && typeof window !== 'undefined') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}

// Re-export firestore helpers with original names used across the codebase
export const doc = firestoreDoc
export const collection = firestoreCollection
export const query = firestoreQuery
export const where = firestoreWhere
export const orderBy = firestoreOrderBy
export const limit = firestoreLimit
export const startAfter = firestoreStartAfter
export const endBefore = firestoreEndBefore
export const limitToLast = firestoreLimitToLast
export const getDoc = firestoreGetDoc
export const getDocs = firestoreGetDocs
export const onSnapshot = firestoreOnSnapshot
export const addDoc = firestoreAddDoc
export const setDoc = firestoreSetDoc
export const updateDoc = firestoreUpdateDoc
export const deleteDoc = firestoreDeleteDoc
export const writeBatch = () => firestoreWriteBatch(db)
export const arrayUnion = firestoreArrayUnion
export const arrayRemove = firestoreArrayRemove
export const serverTimestamp = firestoreServerTimestamp
export const Timestamp = FirestoreTimestamp
export const collectionGroup = firestoreCollectionGroup

export const ref = storageRef
export const uploadBytes = storageUploadBytes
export const getDownloadURL = storageGetDownloadURL

// Backwards-compatible aliases
export const serverTimestampFn = serverTimestamp
export const serverTimestampValue = serverTimestamp

// Types re-exports for convenience
export type FirestoreData = Record<string, unknown>
export type DocumentSnapshot<T = unknown> = import('firebase/firestore').DocumentSnapshot<T>
export type QuerySnapshot<T = unknown> = import('firebase/firestore').QuerySnapshot<T>
export type QueryDocumentSnapshot<T = unknown> = import('firebase/firestore').QueryDocumentSnapshot<T>
export type TimestampType = import('firebase/firestore').Timestamp
export type MockAuthUser = User | null
export type MockAuth = Auth


