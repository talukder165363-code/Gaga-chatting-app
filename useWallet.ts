import { useState, useEffect, useCallback } from 'react'
import { runTransaction } from 'firebase/firestore'
import { useAuth } from '@/hooks/useAuth'
import { db, doc, onSnapshot, updateDoc, arrayUnion } from '@/lib/firebase'
import { BD_TK_RATE, generateId } from '@/lib/utils'
import type { Wallet, WalletTransaction } from '@/types'

type TimestampLike = { toDate?: () => Date } | string | number | null | undefined

const formatTransaction = (raw: Record<string, unknown>, userId: string): WalletTransaction => {
  const timestampRaw = raw.timestamp as TimestampLike
  const timestamp = timestampRaw && typeof (timestampRaw as { toDate?: unknown })?.toDate === 'function'
    ? (timestampRaw as { toDate: () => Date }).toDate()
    : new Date(String(timestampRaw || Date.now()))

  return {
    id: String(raw.id || generateId()),
    userId,
    type: (raw.type as WalletTransaction['type']) || 'earn',
    amount: Number(raw.amount || 0),
    description: String(raw.description || ''),
    timestamp,
    status: (raw.status as WalletTransaction['status']) || 'completed',
  }
}

const createTransaction = (userId: string, type: WalletTransaction['type'], amount: number, description: string, status: WalletTransaction['status'] = 'completed'): WalletTransaction => ({
  id: generateId(),
  userId,
  type,
  amount: Math.abs(amount),
  description,
  timestamp: new Date(),
  status,
})

const emptyWallet: Wallet = {
  userId: '',
  balance: 0,
  coins: 0,
  transactions: [],
}

export function useWallet() {
  const { user } = useAuth()
  const uid = user?.id
  const [wallet, setWallet] = useState<Wallet>(emptyWallet)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      Promise.resolve().then(() => {
        setWallet(emptyWallet)
        setLoading(false)
      });
      return
    }

    const userRef = doc(db, 'users', uid)
    const unsub = onSnapshot(userRef, snap => {
      if (!snap.exists()) {
        setWallet({ ...emptyWallet, userId: uid })
        setLoading(false)
        return
      }

      const data = snap.data()
      const coins = Number(data.coins || 0)
      const balance = Number(data.balance ?? Math.round(coins * BD_TK_RATE))
      const txRaw = (data.transactions as Record<string, unknown>[]) || []

      setWallet({
        userId: uid,
        balance,
        coins,
        transactions: txRaw
          .map(raw => formatTransaction(raw, uid))
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      })
      setLoading(false)
    }, () => {
      setLoading(false)
    })

    return unsub
  }, [uid])

  const commitTransaction = useCallback(async (tx: WalletTransaction, coinDelta: number): Promise<boolean> => {
    if (!uid) return false
    try {
      await updateDoc(doc(db, 'users', uid), {
        coins: coinDelta,
        transactions: arrayUnion({ ...tx, timestamp: tx.timestamp.toISOString() }),
      })
      return true
    } catch (err) {
      console.warn('Wallet commit failed', err)
      return false
    }
  }, [uid])

  const earnCoins = useCallback(async (amount: number, description: string): Promise<boolean> => {
    if (!uid || amount <= 0) return false
    const tx = createTransaction(uid, 'earn', amount, description)
    return commitTransaction(tx, wallet.coins + amount)
  }, [uid, wallet.coins, commitTransaction])

  const spendCoins = useCallback(async (amount: number, description: string): Promise<boolean> => {
    if (!uid || amount <= 0 || wallet.coins < amount) return false
    const tx = createTransaction(uid, 'spend', amount, description)
    return commitTransaction(tx, wallet.coins - amount)
  }, [uid, wallet.coins, commitTransaction])

  const sendCoins = useCallback(async (recipientId: string, amount: number): Promise<boolean> => {
    if (!uid || !recipientId || amount <= 0 || recipientId === uid || wallet.coins < amount) return false

    try {
      const senderRef = doc(db, 'users', uid)
      const recipientRef = doc(db, 'users', recipientId)

      await runTransaction(db, async transaction => {
        const senderSnapshot = await transaction.get(senderRef)
        const recipientSnapshot = await transaction.get(recipientRef)

        if (!senderSnapshot.exists() || !recipientSnapshot.exists()) {
          throw new Error('Sender or recipient not found')
        }

        const senderCoins = Number(senderSnapshot.data()?.coins || 0)
        if (senderCoins < amount) {
          throw new Error('Insufficient coins')
        }

        const recipientCoins = Number(recipientSnapshot.data()?.coins || 0)
        const outgoing = createTransaction(uid, 'send', amount, `Sent to ${recipientId}`)
        const incoming = createTransaction(recipientId, 'receive', amount, `Received from ${user?.name || 'Friend'}`)

        transaction.update(senderRef, {
          coins: senderCoins - amount,
          transactions: arrayUnion({ ...outgoing, timestamp: outgoing.timestamp.toISOString() }),
        })
        transaction.update(recipientRef, {
          coins: recipientCoins + amount,
          transactions: arrayUnion({ ...incoming, timestamp: incoming.timestamp.toISOString() }),
        })
      })

      return true
    } catch (err) {
      console.warn('Send coins failed', err)
      return false
    }
  }, [uid, wallet.coins, user?.name])

  const canSpend = (amount: number) => amount > 0 && wallet.coins >= amount

  return {
    wallet,
    loading,
    earnCoins,
    spendCoins,
    sendCoins,
    canSpend,
  }
}
