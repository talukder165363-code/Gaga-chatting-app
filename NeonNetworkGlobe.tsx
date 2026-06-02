import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'

export default function NeonNetworkGlobe() {
  const style: CSSProperties = {
    width: 520,
    height: 520,
    maxWidth: '90vw',
    maxHeight: '60vh',
    opacity: 0.35,
    margin: '0 auto',
  }

  return (
    <motion.div
      aria-hidden="true"
      style={style}
      animate={{ rotate: 360 }}
      transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      className="rounded-full border border-[#00ff88]/20 bg-gradient-to-br from-[#00ff88]/10 via-transparent to-[#22D3EE]/10 shadow-[0_0_80px_rgba(34,211,238,0.15)] flex items-center justify-center"
    >
      <div className="w-3/4 h-3/4 rounded-full border border-white/10" />
    </motion.div>
  )
}

