export default function StatCard({
  value,
  label,
  suffix,
}: {
  value: string | number
  label: string
  suffix?: string
  delay?: number
}) {
  return (
    <div className="glass rounded-2xl p-5 text-center border border-white/5">
      <div className="text-3xl font-extrabold">
        {value}
        {suffix ? <span className="text-[#00ff88]">{suffix}</span> : null}
      </div>
      <div className="text-xs text-white/50 mt-1 uppercase tracking-wider">{label}</div>
    </div>
  )
}

