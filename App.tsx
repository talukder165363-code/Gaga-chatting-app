import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/useAuth'

import LandingPage from '@/pages/Landing Page'
import AuthGate from '@/pages/AuthGate'
import MainApp from '@/pages/MainApp'
import ChatRoomPage from '@/pages/ChatRoomPage'
import CallPage from '@/pages/CallPage'
import ProfilePage from '@/pages/ProfilePage'
import WalletPage from '@/pages/WalletPage'
import TermsPage from '@/pages/TermsPage'
import PrivacyPage from '@/pages/PrivacyPage'
import NotFound from '@/pages/NotFound'

function App() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm text-white/70">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-screen bg-black text-white">
      <Routes>
        <Route path="/" element={
          isAuthenticated ? <MainApp /> : <LandingPage />
        } />
        <Route path="/auth" element={
          isAuthenticated ? <Navigate to="/" replace /> : <AuthGate />
        } />
        <Route path="/chat/:chatId" element={
          isAuthenticated ? <ChatRoomPage /> : <Navigate to="/auth" replace />
        } />
        <Route path="/call/:callId" element={
          isAuthenticated ? <CallPage /> : <Navigate to="/auth" replace />
        } />
        <Route path="/profile" element={
          isAuthenticated ? <ProfilePage /> : <Navigate to="/auth" replace />
        } />
        <Route path="/wallet" element={
          isAuthenticated ? <WalletPage /> : <Navigate to="/auth" replace />
        } />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </div>
  )
}

export default App
