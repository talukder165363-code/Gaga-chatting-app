import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function TermsPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Terms of Service</h1>
      </div>
      <div className="px-6 pb-12 max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#00FF7F] mb-2">1. Acceptance of Terms</h2>
          <p className="text-white/60 text-sm leading-relaxed">By accessing or using GagaChat, you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service. GagaChat is created by Omar Faruk OumaGa.</p>
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#00FF7F] mb-2">2. Description of Service</h2>
          <p className="text-white/60 text-sm leading-relaxed">GagaChat provides messaging, voice and video calling, social timeline features, and a digital wallet system (GagaCoins) for users primarily in Bangladesh.</p>
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#00FF7F] mb-2">3. User Accounts</h2>
          <p className="text-white/60 text-sm leading-relaxed">You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information and to update it as necessary.</p>
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#00FF7F] mb-2">4. Acceptable Use</h2>
          <p className="text-white/60 text-sm leading-relaxed">You agree not to use GagaChat for any unlawful purpose, to harass others, to spread harmful content, or to attempt to breach the security of the Service.</p>
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#00FF7F] mb-2">5. GagaCoins & Wallet</h2>
          <p className="text-white/60 text-sm leading-relaxed">GagaCoins are virtual credits within the GagaChat ecosystem. They hold no real-world monetary value and cannot be redeemed for cash. GagaCoins may be earned through activities or purchased through authorized channels.</p>
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#00FF7F] mb-2">6. Privacy</h2>
          <p className="text-white/60 text-sm leading-relaxed">Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.</p>
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#00FF7F] mb-2">7. Modifications</h2>
          <p className="text-white/60 text-sm leading-relaxed">We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.</p>
        </div>
        <p className="text-white/30 text-xs pt-6 border-t border-white/5">Last updated: June 2026. GagaChat by Omar Faruk OumaGa.</p>
      </div>
    </div>
  )
}
