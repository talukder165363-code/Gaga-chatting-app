export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-white/10 py-12 text-white/70">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr] items-center">
          <div className="space-y-3 text-center md:text-left">
            <p className="text-base font-semibold text-white">GAGA CHAT</p>
            <p className="text-sm text-white/60">Secure messaging, voice, and video that connects friends, teams, and creators.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 md:justify-end text-xs uppercase tracking-[0.18em] text-white/60">
            <a href="/#features" className="hover:text-white transition-colors">Features</a>
            <a href="/#security" className="hover:text-white transition-colors">Security</a>
            <a href="/#stories" className="hover:text-white transition-colors">Stories</a>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-white/40">
          <div>© {year} GaGa Chat. All rights reserved.</div>
          <div className="mt-2">Made for secure conversations, everywhere you go.</div>
        </div>
      </div>
    </footer>
  )
}

