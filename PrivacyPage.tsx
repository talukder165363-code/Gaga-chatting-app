import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Shield, Lock, Eye, EyeOff, Database, Trash2 } from 'lucide-react'

export default function PrivacyPage() {
  const navigate = useNavigate()

  const sections = [
    { icon: Shield, title: 'End-to-End Encryption', desc: 'Your messages are encrypted on your device and can only be decrypted by the intended recipient. Not even GagaChat can read your messages.' },
    { icon: Lock, title: 'Data Security', desc: 'We implement industry-standard security measures to protect your personal data against unauthorized access, alteration, or destruction.' },
    { icon: Eye, title: 'What We Collect', desc: 'We collect only the information necessary to provide our service: your name, email, phone number, and the content you choose to share.' },
    { icon: EyeOff, title: 'What We Do Not Do', desc: 'We do not sell your personal data to third parties. We do not track your activity outside of GagaChat. We do not use your data for targeted advertising.' },
    { icon: Database, title: 'Data Storage', desc: 'Your data is stored on secure servers. Messages are stored temporarily and deleted from our servers once delivered. Timeline posts remain until you delete them.' },
    { icon: Trash2, title: 'Your Right to Delete', desc: 'You can delete your account and all associated data at any time. Upon deletion, all your personal information will be permanently removed from our systems.' },
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Privacy Policy</h1>
      </div>
      <div className="px-6 pb-12 max-w-2xl mx-auto">
        <p className="text-white/50 text-sm leading-relaxed mb-8">
          At GagaChat, your privacy is our priority. This Privacy Policy explains how we collect, use, and protect your personal information when you use our service.
        </p>

        <div className="space-y-4">
          {sections.map((section, i) => (
            <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#00FF7F]/10 flex items-center justify-center">
                  <section.icon size={20} className="text-[#00FF7F]" />
                </div>
                <h2 className="text-white font-bold text-base">{section.title}</h2>
              </div>
              <p className="text-white/50 text-sm leading-relaxed">{section.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-[#00FF7F]/5 border border-[#00FF7F]/10 rounded-2xl p-5">
          <h2 className="text-[#00FF7F] font-bold mb-2">Contact Us</h2>
          <p className="text-white/50 text-sm">If you have any questions about this Privacy Policy, please contact us at privacy@gagachat.app</p>
        </div>

        <p className="text-white/30 text-xs mt-8 pt-6 border-t border-white/5">Last updated: June 2026. GagaChat by Omar Faruk OumaGa.</p>
      </div>
    </div>
  )
}
