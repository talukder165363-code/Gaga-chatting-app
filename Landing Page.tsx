import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  MessageCircle,
  Video,
  Users,
  Shield,
  Smartphone,
  Monitor,
  Download,
  Quote,
  Lock,
  EyeOff,
  Fingerprint,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import NeonNetworkGlobe from '@/components/NeonNetworkGlobe';
import DeviceMockupCarousel from '@/components/DeviceMockupCarousel';
import StatCard from '@/components/StatCard';
import FeatureCard from '@/components/FeatureCard';
import Navbar from '@/components/Navbar';
import { features, stats, testimonials, trustBadges } from '@/data/mockData';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const ctaTarget = isAuthenticated ? '/' : '/auth';

  useEffect(() => {
    const scrollTo = (location.state as { scrollTo?: string } | null)?.scrollTo
    if (scrollTo) {
      // Clear the state so back-navigation doesn't re-scroll
      window.history.replaceState({}, '')
      setTimeout(() => document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth' }), 80)
    }
  }, [location.state])

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Navbar />
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-24">
        {/* 3D Globe Background */}
        <NeonNetworkGlobe />

        {/* Spotlight gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(0, 255, 136, 0.15) 0%, rgba(0,0,0,0) 60%)',
          }}
        />

        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0.12, scale: 0.95, x: -20, y: -10 }}
          animate={{ opacity: [0.12, 0.24, 0.12], x: [-20, 0, -20], y: [-10, -20, -10] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] rounded-full bg-[#00ff88]/10 blur-3xl"
        />
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0.1, scale: 1, x: 0, y: 0 }}
          animate={{ opacity: [0.1, 0.18, 0.1], x: [0, 20, 0], y: [0, 16, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-[#22d3ee]/10 blur-3xl"
        />
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0.06, scale: 1, x: 0, y: 0 }}
          animate={{ opacity: [0.06, 0.14, 0.06], x: [0, -18, 0], y: [0, 18, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-10 w-40 h-40 rounded-full bg-white/10 blur-3xl"
        />

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto pt-20">
          {/* Version Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
              v2.0 Now Available
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1] mb-6"
          >
            Messaging,
            <br />
            <span className="gradient-text">voice</span> and
            <br />
            <span className="gradient-text">video</span> made secure.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-white/60 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            A privacy-first communication platform for friends, groups, and creators who want
            fast, reliable conversations without compromise.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Button
              onClick={() => navigate(ctaTarget)}
              className="bg-white text-black font-semibold hover:scale-105 transition-transform rounded-full px-8 py-6 text-base"
            >
              {isAuthenticated ? 'Open App' : 'Get Started'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-transparent text-white border-white/20 hover:bg-white/10 hover:border-white/40 rounded-full px-8 py-6 text-base"
            >
              Explore Features
            </Button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4 mb-16"
          >
            {trustBadges.map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-2 glass rounded-full px-4 py-2"
              >
                <badge.icon className="w-3.5 h-3.5 text-[#00ff88]" />
                <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
                  {badge.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Stats Bar - at bottom of hero */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="relative z-10 w-full max-w-4xl mx-auto px-4 pb-8"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <StatCard
                key={stat.label}
                value={stat.value}
                label={stat.label}
                suffix={stat.suffix}
                delay={i * 200}
              />
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 px-4">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(13,13,13,0) 0%, rgba(13,13,13,1) 10%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              EVERYTHING
              <br />
              <span className="gradient-text">INTEGRATED.</span>
            </h2>
            <p className="text-white/50 max-w-lg mx-auto">
              We&apos;ve combined messaging, social timelines, and HD calling into one seamless,
              high-performance experience.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Feature Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((feature, i) => (
                <FeatureCard
                  key={feature.id}
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.description}
                  delay={i * 0.1}
                />
              ))}
            </div>

            {/* 3D Device Carousel */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <DeviceMockupCarousel />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Available Everywhere Section */}
      <section className="py-28 px-4 bg-gradient-to-b from-transparent via-white/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              AVAILABLE EVERYWHERE
            </h2>
            <p className="text-white/50 mb-10">
              One account across mobile and desktop. Always synced, always private.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {([
                { icon: Smartphone, label: 'App Store', href: 'https://apps.apple.com' },
                { icon: Download, label: 'Google Play', href: 'https://play.google.com' },
                { icon: Monitor, label: 'Desktop App', href: '#' },
              ] as const).map((platform) => (
                <motion.a
                  key={platform.label}
                  href={platform.href}
                  target={platform.href !== '#' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-3 glass rounded-xl px-6 py-4 hover:border-[#00ff88]/30 transition-all"
                >
                  <platform.icon className="w-5 h-5 text-[#00ff88]" />
                  <span className="text-sm font-medium text-white">{platform.label}</span>
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why GaGa Chat Section */}
      <section className="py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              WHY GAGA CHAT?
            </h2>
            <p className="text-white/50">Everything you need, nothing you don&apos;t.</p>
          </motion.div>

          {/* Feature rows */}
          <div className="space-y-16">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-8 items-center"
            >
              <div>
                <MessageCircle className="w-10 h-10 text-[#00ff88] mb-4" />
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  FREE MESSAGES, VOICE &amp; VIDEO CALLS
                </h3>
                <p className="text-white/50 leading-relaxed mb-6">
                  Send one-on-one and group texts, and enjoy free international voice and video calls
                  with your friends, anytime and anywhere.
                </p>
                <Button
                  onClick={() => navigate(ctaTarget)}
                  variant="link"
                  className="text-[#00ff88] hover:text-[#00cc6a] p-0"
                >
                  Get Started <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="glass rounded-3xl p-8 flex items-center justify-center">
                <div className="w-64 h-96 bg-gradient-to-b from-[#1a1a2e] to-[#0d0d0d] rounded-2xl border border-white/10 flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-white/10 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#00ff88]/20" />
                    <span className="text-xs text-white/60">Sarah Kim</span>
                  </div>
                  <div className="flex-1 p-3 space-y-2">
                    <div className="flex justify-end">
                      <div className="bg-[#00ff88]/20 rounded-xl rounded-tr-sm px-3 py-2 max-w-[80%]">
                        <p className="text-xs text-white/80">Hey! How are you?</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-white/5 rounded-xl rounded-tl-sm px-3 py-2 max-w-[80%]">
                        <p className="text-xs text-white/80">I&apos;m great! Just finished work 🎉</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-[#00ff88]/20 rounded-xl rounded-tr-sm px-3 py-2 max-w-[80%]">
                        <p className="text-xs text-white/80">Want to grab dinner?</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-8 items-center"
            >
              <div className="order-2 md:order-1 glass rounded-3xl p-8 flex items-center justify-center">
                <div className="w-64 h-96 bg-gradient-to-b from-[#16213e] to-[#0d0d0d] rounded-2xl border border-white/10 flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-white/10 text-center">
                    <span className="text-xs text-white/60 font-medium">Stickers & Themes</span>
                  </div>
                  <div className="flex-1 p-4 grid grid-cols-3 gap-2 content-start">
                    {['🎭', '🎨', '🌈', '✨', '🔥', '💫', '🌟', '💖', '🎪'].map((emoji, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-xl bg-white/5 flex items-center justify-center text-2xl hover:bg-[#00ff88]/20 transition-colors cursor-pointer"
                      >
                        {emoji}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <Video className="w-10 h-10 text-[#00ff88] mb-4" />
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  STICKERS, EMOJI, THEMES
                </h3>
                <p className="text-white/50 leading-relaxed mb-6">
                  Express yourself exactly the way you want with thousands of expressive stickers
                  and colorful themes.
                </p>
                <Button
                  onClick={() => navigate(ctaTarget)}
                  variant="link"
                  className="text-[#00ff88] hover:text-[#00cc6a] p-0"
                >
                  Get Started <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-8 items-center"
            >
              <div>
                <Users className="w-10 h-10 text-[#00ff88] mb-4" />
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  OPENCHAT &amp; COMMUNITY
                </h3>
                <p className="text-white/50 leading-relaxed mb-6">
                  Meet new friends with similar interests and share fun news and information in
                  secure, moderated spaces.
                </p>
                <Button
                  onClick={() => navigate(ctaTarget)}
                  variant="link"
                  className="text-[#00ff88] hover:text-[#00cc6a] p-0"
                >
                  Get Started <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="glass rounded-3xl p-8 flex items-center justify-center">
                <div className="w-64 h-96 bg-gradient-to-b from-[#0f3460] to-[#0d0d0d] rounded-2xl border border-white/10 flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-white/10 text-center">
                    <span className="text-xs text-white/60 font-medium">OpenChat</span>
                  </div>
                  <div className="flex-1 p-3 space-y-2">
                    {['Photography', 'Tech Talk', 'Gaming', 'Music'].map((topic, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-white/5 hover:bg-[#00ff88]/10 transition-colors cursor-pointer"
                      >
                        <p className="text-xs text-white/80 font-medium">#{topic}</p>
                        <p className="text-[10px] text-white/40 mt-1">{1000 + i * 500} members</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-20 px-4 border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/40 mb-8">Trusted by creators & communities</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center justify-items-center">
              {['Tech Leaders', 'Creators', 'Teams', 'Educators', 'Communities'].map((brand, i) => (
                <motion.div
                  key={brand}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-center h-12 px-4 rounded-lg bg-white/5 border border-white/10 hover:border-[#00ff88]/30 transition-all cursor-pointer"
                >
                  <span className="text-sm font-semibold text-white/60 text-center">{brand}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="stories" className="py-32 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              STORIES OF CONNECTION
            </h2>
            <p className="text-white/50 text-lg">
              Join a global community of 50,000+ users building meaningful relationships and trusted spaces.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02, y: -8 }}
                className="glass rounded-2xl p-8 relative border border-white/5 hover:border-[#00ff88]/20 transition-all"
              >
                <Quote className="w-8 h-8 text-[#00ff88]/40 mb-4" />
                <p className="text-white/70 text-base leading-relaxed mb-8 font-medium">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00ff88]/40 to-[#00cc6a]/40 flex items-center justify-center text-sm font-bold text-[#00ff88]">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{testimonial.name}</p>
                    <p className="text-xs text-white/50">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Section */}
      <section id="security" className="py-32 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-8 md:p-12"
          >
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <Shield className="w-10 h-10 text-[#00ff88] mb-6" />
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  PRIVACY IS
                  <br />
                  <span className="gradient-text">DEFAULT.</span>
                </h2>
                <div className="space-y-6 mt-8">
                  {[
                    {
                      icon: Lock,
                      title: 'E2E Encryption',
                      desc: 'Your messages are for your eyes only. Not even we can read them.',
                    },
                    {
                      icon: EyeOff,
                      title: 'Zero Data Selling',
                      desc: 'We never monetize your personal info. Your data belongs to you.',
                    },
                    {
                      icon: Fingerprint,
                      title: 'Anonymous Mode',
                      desc: 'Chat without revealing your phone number to strangers.',
                    },
                  ].map((feature) => (
                    <div key={feature.title} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#00ff88]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-[#00ff88]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
                        <p className="text-xs text-white/50 leading-relaxed">{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'SOC 2', icon: Shield },
                  { label: 'GDPR', icon: Lock },
                  { label: 'ISO 27001', icon: Fingerprint },
                  { label: 'HIPAA', icon: EyeOff },
                ].map((cert, i) => (
                  <motion.div
                    key={cert.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className="glass rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[#00ff88]/30 transition-all"
                  >
                    <cert.icon className="w-8 h-8 text-[#00ff88]" />
                    <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                      {cert.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <div className="relative rounded-[32px] overflow-hidden p-12 md:p-16 text-center">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88] to-[#00cc6a]" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/50 to-transparent animate-pulse" />

            {/* Content */}
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-extrabold text-black mb-8">
                READY TO
                <br />
                SWITCH?
              </h2>
              <Button
                onClick={() => navigate(ctaTarget)}
                className="bg-black text-white hover:bg-black/80 font-semibold rounded-full px-10 py-7 text-lg"
              >
                {isAuthenticated ? 'Go to App' : 'Join GaGa Chat Now'}
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

