import type { LucideIcon } from 'lucide-react'

export default function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
  delay?: number
}) {
  return (
    <div className="glass rounded-3xl p-6 border border-white/5">
      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Icon className="w-6 h-6 text-[#00ff88]" />
      </div>
      <div className="mt-4 text-xl font-bold text-white">{title}</div>
      <div className="mt-2 text-sm text-white/60 leading-relaxed">{description}</div>
    </div>
  )
}

