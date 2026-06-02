import { motion } from 'framer-motion'

export default function DeviceMockupCarousel() {
  return (
    <div className="glass rounded-3xl p-8 flex items-center justify-center w-full max-w-xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative w-[340px] h-[560px]"
      >
        <div className="absolute inset-0 rounded-[40px] border border-white/10 bg-gradient-to-br from-[#0b111d] via-[#0f1a2e] to-[#071012] shadow-[0_30px_120px_rgba(0,255,136,0.18)]" />
        <div className="absolute inset-x-6 top-6 bottom-6 rounded-[32px] border border-white/10 bg-[#020617] overflow-hidden">
          <div className="h-12 px-4 flex items-center justify-between text-[10px] uppercase tracking-[0.4em] text-white/50">
            <span>GAGA</span>
            <span>5G</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="h-16 rounded-3xl bg-gradient-to-br from-[#00ff88]/15 via-transparent to-transparent border border-white/10" />
            <div className="h-28 rounded-3xl bg-[#071012] border border-white/10 p-4 text-white/80 text-xs space-y-3">
              <div className="flex items-center justify-between text-white/60 text-[11px] uppercase tracking-[0.3em]">
                <span>Chats</span>
                <span>Active</span>
              </div>
              <div className="h-12 rounded-3xl bg-white/5 p-3 flex items-center justify-between">
                <span className="text-[11px] text-white/60">Friends</span>
                <span className="text-sm font-semibold text-white">Online</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#00ff88]" />
                <span>Secure voice and video</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 rounded-3xl bg-white/5 border border-white/10" />
              <div className="h-16 rounded-3xl bg-white/5 border border-white/10" />
            </div>
          </div>
        </div>
        <div className="absolute left-1/2 top-10 -translate-x-1/2 w-[260px] h-[260px] rounded-full bg-[#00ff88]/5 blur-3xl" />
      </motion.div>
    </div>
  )
}

