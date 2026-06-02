import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, MessageCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/#features' },
  { label: 'Security', href: '/#security' },
  { label: 'Stories', href: '/#stories' },
  { label: 'Privacy', href: '/privacy' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isLanding = location.pathname === '/'

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (href: string) => {
    setMobileMenuOpen(false)
    if (href === '/') {
      if (!isLanding) { navigate('/'); return }
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const id = href.replace('/#', '')
    if (!isLanding) {
      navigate('/', { state: { scrollTo: id } })
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass-strong' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/logo.jpg" alt="GaGa Chat" className="w-8 h-8 rounded-full" />
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-[#00ff88] transition-colors">
              GA GA CHAT
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollToSection(link.href)}
                className="text-sm font-medium uppercase tracking-wider text-white/70 hover:text-white transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#00ff88] transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <Link to="/">
                <Button className="bg-gradient-to-r from-[#00ff88] to-[#00cc6a] text-black font-semibold hover:opacity-90 rounded-full px-6 py-2">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Open App
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                    Log In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-gradient-to-r from-[#00ff88] to-[#00cc6a] text-black font-semibold hover:opacity-90 rounded-full px-6 py-2">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass-strong rounded-b-3xl border-t border-white/10"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollToSection(link.href)}
                  className="block w-full text-left text-sm font-medium uppercase tracking-wider text-white/70 hover:text-white py-2"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                {isAuthenticated ? (
                  <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a] text-black font-semibold rounded-full">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Open App
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full text-white/80 hover:text-white">
                        Log In
                      </Button>
                    </Link>
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full bg-gradient-to-r from-[#00ff88] to-[#00cc6a] text-black font-semibold rounded-full">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
