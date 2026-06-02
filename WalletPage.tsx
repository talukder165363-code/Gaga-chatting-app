import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Wallet, Coins, ArrowDownLeft, ArrowUpRight, Gift, Zap, ShoppingBag, Star, Clock, CheckCircle, Send } from 'lucide-react'
import { cn, BD_TK_RATE } from '@/lib/utils'
import { toast } from 'sonner'
import { useWallet } from '@/hooks/useWallet'

const quickActions = [
  { id: 'earn-daily', icon: Gift, label: 'Daily Bonus', desc: 'Login every day', coins: 10, color: 'from-pink-500 to-rose-400', cooldownHours: 24 },
  { id: 'earn-refer', icon: Star, label: 'Refer Friend', desc: 'Invite friends', coins: 50, color: 'from-blue-500 to-cyan-400', cooldownHours: 0 },
  { id: 'earn-sticker', icon: ShoppingBag, label: 'Buy Stickers', desc: 'Premium packs', coins: -30, color: 'from-purple-500 to-violet-400', cooldownHours: 0 },
  { id: 'earn-game', icon: Zap, label: 'Play Games', desc: 'Mini games', coins: 20, color: 'from-amber-500 to-yellow-400', cooldownHours: 1 },
]

const historyFilters = ['All', 'Earned', 'Spent', 'Received', 'Sent'] as const

const promoCodes: Record<string, { coins: number; label: string }> = {
  GAGA10: { coins: 10, label: 'Welcome bonus' },
  MEGA50: { coins: 50, label: 'Seasonal reward' },
  FRIEND20: { coins: 20, label: 'Refer friend bonus' },
}

const coinPacks = [
  { id: 'pack-100', coins: 100, price: 85, label: '100 Coins Pack', desc: 'Best value for everyday use', color: 'from-cyan-500 to-blue-500' },
  { id: 'pack-250', coins: 250, price: 200, label: '250 Coins Pack', desc: 'Save 15% on coins', color: 'from-violet-500 to-fuchsia-500' },
  { id: 'pack-500', coins: 500, price: 390, label: '500 Coins Pack', desc: 'Great for power users', color: 'from-amber-500 to-orange-500' },
]

export default function WalletPage() {
  const navigate = useNavigate()
  const { wallet, loading, earnCoins, spendCoins, sendCoins } = useWallet()
  const [activeFilter, setActiveFilter] = useState<typeof historyFilters[number]>('All')
  const [actionCooldowns, setActionCooldowns] = useState<Record<string, number>>({})
  const [redeemedCodes, setRedeemedCodes] = useState<string[]>([])

  const handleQuickAction = useCallback(async (action: typeof quickActions[0]) => {
    const now = Date.now()
    if (action.cooldownHours && actionCooldowns[action.id] && now < actionCooldowns[action.id]) {
      const remaining = Math.ceil((actionCooldowns[action.id] - now) / 3600000)
      toast.error(`Come back in ${remaining}h for your next ${action.label}!`)
      return
    }

    if (action.coins > 0) {
      const success = await earnCoins(action.coins, action.label)
      if (!success) {
        toast.error('Unable to earn coins right now.')
        return
      }
      toast.success(`+${action.coins} coins earned!`)
    } else {
      const spend = Math.abs(action.coins)
      const success = await spendCoins(spend, action.label)
      if (!success) {
        toast.error('Not enough coins for this action.')
        return
      }
      toast.success(`${spend} coins spent!`)
    }

    if (action.cooldownHours) {
      setActionCooldowns(prev => ({ ...prev, [action.id]: now + action.cooldownHours * 3600 * 1000 }))
    }
  }, [actionCooldowns, earnCoins, spendCoins])

  const handleBuyPack = useCallback(async (pack: { coins: number; price: number; label: string }) => {
    const success = await earnCoins(pack.coins, `Purchased ${pack.label}`)
    if (success) {
      toast.success(`+${pack.coins} coins added to your wallet!`)
    } else {
      toast.error('Unable to buy coins right now.')
    }
  }, [earnCoins])

  const handleRedeemCode = useCallback(async () => {
    const code = window.prompt('Enter your promo code:')?.trim().toUpperCase()
    if (!code) return
    if (redeemedCodes.includes(code)) {
      toast.error('Promo code already redeemed.')
      return
    }

    const promo = promoCodes[code]
    if (!promo) {
      toast.error('Invalid promo code.')
      return
    }

    const success = await earnCoins(promo.coins, `Redeemed ${code}`)
    if (success) {
      setRedeemedCodes(prev => [...prev, code])
      toast.success(`Redeemed ${promo.coins} coins!`)
    } else {
      toast.error('Unable to redeem promo code right now.')
    }
  }, [earnCoins, redeemedCodes])

  const handleSendCoins = useCallback(async () => {
    const recipientId = window.prompt('Enter the recipient Gaga ID:')?.trim()
    if (!recipientId) return
    const amount = Number(window.prompt('Enter coin amount to send:'))
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount.')
      return
    }
    const success = await sendCoins(recipientId, amount)
    if (success) {
      toast.success(`Sent ${amount} coins to ${recipientId}`)
    } else {
      toast.error('Unable to send coins. Check the recipient ID and balance.')
    }
  }, [sendCoins])

  const filteredTransactions = useMemo(() => wallet.transactions.filter(tx => {
    if (activeFilter === 'Earned') return tx.type === 'earn' || tx.type === 'receive'
    if (activeFilter === 'Spent') return tx.type === 'spend' || tx.type === 'send'
    if (activeFilter === 'Received') return tx.type === 'receive'
    if (activeFilter === 'Sent') return tx.type === 'send'
    return true
  }), [wallet.transactions, activeFilter])

  const totalEarned = useMemo(() => wallet.transactions.reduce((sum, tx) => (tx.type === 'earn' || tx.type === 'receive') ? sum + tx.amount : sum, 0), [wallet.transactions])
  const totalSpent = useMemo(() => wallet.transactions.reduce((sum, tx) => (tx.type === 'spend' || tx.type === 'send') ? sum + tx.amount : sum, 0), [wallet.transactions])
  const totalReceived = useMemo(() => wallet.transactions.reduce((sum, tx) => tx.type === 'receive' ? sum + tx.amount : sum, 0), [wallet.transactions])
  const totalSent = useMemo(() => wallet.transactions.reduce((sum, tx) => tx.type === 'send' ? sum + tx.amount : sum, 0), [wallet.transactions])
  const netChange = totalEarned - totalSpent

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const [now] = useState<number>(() => Date.now())
  const displayCoins = wallet.coins ?? 0
  const displayBalance = wallet.balance ?? Math.round(displayCoins * BD_TK_RATE)
  const balanceLabel = loading ? '...' : displayCoins
  const balanceText = loading ? 'Loading...' : `≈ ৳${displayBalance} BDT`

  const typeLabelMap: Record<typeof wallet.transactions[number]['type'], string> = {
    earn: 'Earned',
    spend: 'Spent',
    receive: 'Received',
    send: 'Sent',
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="h-screen bg-black text-white flex flex-col overflow-hidden">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="px-4 pt-12 pb-4 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate(-1)} aria-label="Go back" title="Go back" className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Gaga Wallet</h1>
      </motion.div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-8">
        {/* Balance Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }} className="mt-4 relative rounded-3xl overflow-hidden p-6 mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00FF7F] via-[#00CC66] to-[#22D3EE]" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <Wallet size={20} className="text-black/60" />
              <span className="text-black/60 text-sm font-medium">Balance</span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <Coins size={28} className="text-black" />
              <span className="text-5xl font-black text-black tracking-tight">{balanceLabel}</span>
              <span className="text-black/60 font-bold">GagaCoins</span>
            </div>
            <p className="text-black/50 text-sm font-medium mb-4">{balanceText}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-3xl bg-white/10 p-3 border border-white/10">
                <p className="text-black/50 uppercase text-[10px] tracking-[0.2em]">Earned</p>
                <p className="mt-2 text-black font-semibold">+{totalEarned}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-3 border border-white/10">
                <p className="text-black/50 uppercase text-[10px] tracking-[0.2em]">Spent</p>
                <p className="mt-2 text-black font-semibold">-{totalSpent}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-3 border border-white/10">
                <p className="text-black/50 uppercase text-[10px] tracking-[0.2em]">Received</p>
                <p className="mt-2 text-black font-semibold">+{totalReceived}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-3 border border-white/10">
                <p className="text-black/50 uppercase text-[10px] tracking-[0.2em]">Sent</p>
                <p className="mt-2 text-black font-semibold">-{totalSent}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-3 border border-white/10 col-span-2">
                <p className="text-black/50 uppercase text-[10px] tracking-[0.2em]">Net change</p>
                <p className={cn('mt-2 font-semibold', netChange >= 0 ? 'text-[#00FF7F]' : 'text-red-400')}>{netChange >= 0 ? '+' : ''}{netChange} coins</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-wrap gap-3 mb-6">
          <button disabled={loading} onClick={handleSendCoins} aria-label="Send coins" className={cn('inline-flex items-center gap-2 rounded-3xl border px-4 py-3 text-sm font-semibold transition', loading ? 'border-white/10 bg-white/10 text-white/40 cursor-not-allowed' : 'border-white/10 bg-white/5 text-white hover:bg-white/10')}>
            <Send size={16} /> Send coins
          </button>
          <button disabled={loading} onClick={handleRedeemCode} className={cn('inline-flex items-center gap-2 rounded-3xl border px-4 py-3 text-sm font-semibold transition', loading ? 'border-white/10 bg-white/10 text-white/40 cursor-not-allowed' : 'border-white/10 bg-white/5 text-white hover:bg-white/10')}>
            <Gift size={16} /> Redeem code
          </button>
        </div>
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">Available codes</p>
              <p className="text-white/40 text-sm">Redeem promo codes for extra GagaCoins.</p>
            </div>
            <button disabled={loading} onClick={handleRedeemCode} className={cn('text-[11px] font-bold uppercase tracking-[0.2em] transition', loading ? 'text-white/30' : 'text-[#00FF7F] hover:text-white')}>
              Redeem
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {Object.entries(promoCodes).map(([code, promo]) => (
              <div key={code} className={cn('rounded-2xl border p-3', redeemedCodes.includes(code) ? 'border-[#00FF7F]/30 bg-[#00FF7F]/5' : 'border-white/10 bg-white/5')}>
                <p className="text-white font-semibold">{code}</p>
                <p className="text-xs text-white/40">{promo.label}</p>
                <p className="mt-2 text-sm font-semibold text-[#00FF7F]">+{promo.coins} coins</p>
                {redeemedCodes.includes(code) && <span className="mt-2 inline-block text-[11px] uppercase text-[#00FF7F]">Redeemed</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-white/50 text-xs font-black uppercase tracking-[0.2em] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(action => {
              const isCooling = action.cooldownHours > 0 && !!actionCooldowns[action.id] && now < actionCooldowns[action.id]
              return (
                <motion.button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  disabled={isCooling}
                  whileHover={isCooling ? {} : { y: -4, scale: 1.01 }}
                  whileTap={isCooling ? {} : { scale: 0.99 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className={cn('border rounded-2xl p-4 text-left transition-all group', isCooling ? 'bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed' : 'bg-white/5 border-white/5 hover:bg-white/10')}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <action.icon size={20} className="text-white" />
                  </div>
                  <p className="text-white font-semibold text-sm">{action.label}</p>
                  <p className="text-white/40 text-xs mt-0.5">{isCooling ? 'On cooldown' : action.desc}</p>
                  <p className={cn('text-xs font-bold mt-2', action.coins > 0 ? 'text-[#00FF7F]' : 'text-red-400')}>
                    {action.coins > 0 ? `+${action.coins}` : action.coins} coins
                  </p>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Coin Packs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div>
              <h2 className="text-white/50 text-xs font-black uppercase tracking-[0.2em]">Coin Packs</h2>
              <p className="text-white/40 text-sm">Buy coins instantly and save more.</p>
            </div>
            <button onClick={handleSendCoins} aria-label="Send coins to friend" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
              <Send size={16} /> Send coins
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {coinPacks.map(pack => (
              <motion.button
                key={pack.id}
                onClick={() => handleBuyPack(pack)}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className={cn('rounded-3xl border p-4 text-left bg-white/5 border-white/5 hover:bg-white/10 transition-all')}
              >
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${pack.color} flex items-center justify-center mb-4`}>
                  <Coins size={18} className="text-white" />
                </div>
                <p className="text-white font-semibold text-sm mb-1">{pack.label}</p>
                <p className="text-white/40 text-xs mb-4">{pack.desc}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/80 font-bold">{pack.coins} coins</span>
                  <span className="text-white/30 text-xs">৳{pack.price}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
            <div>
              <h2 className="text-white/50 text-xs font-black uppercase tracking-[0.2em]">History</h2>
              <p className="text-white/40 text-[11px] mt-1">Showing {filteredTransactions.length} of {wallet.transactions.length} records</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {historyFilters.map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} className={cn('px-3 py-1 rounded-full text-xs font-medium transition-all', activeFilter === f ? 'bg-[#00FF7F] text-black' : 'bg-white/5 text-white/40 hover:bg-white/10')}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={32} className="text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: index * 0.04 }}
                  className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5"
                >
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', tx.type === 'earn' || tx.type === 'receive' ? 'bg-[#00FF7F]/10 text-[#00FF7F]' : 'bg-red-500/10 text-red-400')}>
                    {tx.type === 'earn' || tx.type === 'receive' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-white/30 text-xs">{typeLabelMap[tx.type]} · {formatDate(tx.timestamp)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn('text-sm font-bold', tx.type === 'earn' || tx.type === 'receive' ? 'text-[#00FF7F]' : 'text-red-400')}>
                      {tx.type === 'earn' || tx.type === 'receive' ? '+' : '-'}{tx.amount}
                    </p>
                    <CheckCircle size={12} className="text-white/20 inline" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
