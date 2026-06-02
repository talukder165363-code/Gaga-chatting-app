import { useNavigate } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-black text-white px-6 text-center">
      <img src="/assets/gaga-logo.jpg" alt="GagaChat" className="w-20 h-20 rounded-full mb-6 opacity-50" />
      <h1 className="text-4xl font-black mb-2">404</h1>
      <p className="text-white/50 mb-8">This page doesn't exist in GagaChat.</p>
      <button onClick={() => navigate('/')} className="gchat-btn px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2">
        <Home size={18} />
        Go Home
      </button>
    </div>
  )
}
