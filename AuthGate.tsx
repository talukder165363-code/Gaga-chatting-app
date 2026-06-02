import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, ShieldCheck, Loader2, ArrowRight, RefreshCw, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
const logoSrc = '/assets/gaga-logo.jpg';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type Mode = 'signin' | 'signup' | 'reset' | 'verify';

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
}

const evaluatePassword = (pw: string): PasswordStrength => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map: PasswordStrength[] = [
    { score: 0, label: 'Too short', color: 'bg-red-500' },
    { score: 1, label: 'Weak', color: 'bg-orange-500' },
    { score: 2, label: 'Fair', color: 'bg-yellow-500' },
    { score: 3, label: 'Strong', color: 'bg-lime-500' },
    { score: 4, label: 'Excellent', color: 'bg-green-500' },
  ];
  return map[score];
};

const AuthGate = () => {
  const {
    session,
    signIn,
    signInWithGoogle,
    signUp,
    resetPassword,
    resendVerification,
    refreshUser,
    signOut,
  } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const year = new Date().getFullYear();

  useEffect(() => {
    if (!session) return;
    if (session.emailVerified) {
      navigate('/', { replace: true });
    } else if (mode !== 'verify') {
      Promise.resolve().then(() => setMode('verify'));
    }
  }, [session, navigate, mode]);

  const strength = evaluatePassword(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (mode === 'reset') {
      if (!email) return toast.error('Enter your email to reset.');
      setSubmitting(true);
      const { error } = await resetPassword(email);
      setSubmitting(false);
      if (error) return toast.error(error);
      toast.success('Password reset link sent. Check your inbox.');
      setMode('signin');
      return;
    }

    if (mode === 'verify') {
      setSubmitting(true);
      const { error } = await refreshUser();
      setSubmitting(false);
      if (error) return toast.error(error);
      if (session?.emailVerified) {
        toast.success('Email verified! Welcome.');
        navigate('/', { replace: true });
      } else {
        toast.error('Still not verified. Please check your inbox.');
      }
      return;
    }

    if (!email || !password) {
      toast.error('Email and password are required.');
      return;
    }

    if (mode === 'signup') {
      if (!agree) return toast.error('Please accept the Terms to continue.');
      if (strength.score < 2) return toast.error('Please choose a stronger password.');
      if (password !== confirmPassword) return toast.error('Passwords do not match.');
      setSubmitting(true);
      const { error } = await signUp(email, password, displayName || undefined);
      setSubmitting(false);
      if (error) return toast.error(error);
      toast.success('Account created! Please verify your email.');
      setMode('verify');
      return;
    }

    // signin
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) return toast.error(error);

    toast.success('Welcome back!');
  };

  const handleResend = async () => {
    setSubmitting(true);
    const { error } = await resendVerification();
    setSubmitting(false);
    if (error) return toast.error(error);
    toast.success('Verification email resent.');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#05070a]">
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-[#00FF7F] opacity-20 blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 -right-32 w-[24rem] h-[24rem] rounded-full bg-[#00C853] opacity-25 blur-[110px] animate-pulse auth-delay-1500" />
        <div className="absolute -bottom-32 left-1/3 w-[22rem] h-[22rem] rounded-full bg-[#22D3EE] opacity-15 blur-[120px] animate-pulse auth-delay-800" />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.06] auth-grid-bg" />

      <div className="relative z-10 w-full max-w-md px-5 py-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center mb-7"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#00FF7F] blur-2xl opacity-50 animate-pulse" />
            <img
              src={logoSrc}
              alt="GaGa Chat"
              className="relative w-24 h-24 rounded-full object-cover ring-2 ring-[#00FF7F]/60 shadow-[0_0_60px_-10px_rgba(0,255,127,0.7)]"
            />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
            GaGa <span className="text-[#00FF7F]">Chat</span>
          </h1>
          <p className="mt-1 text-sm text-white/50">Encrypted. Effortless. Always at your side.</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          className="relative rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
        >
          {/* Tabs */}
          {mode !== 'reset' && mode !== 'verify' && (
            <div className="grid grid-cols-2 mb-6 p-1 rounded-2xl bg-black/40 border border-white/5">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`relative py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                  mode === 'signin' ? 'text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                {mode === 'signin' && (
                  <motion.div
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00FF7F] to-[#22D3EE]"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`relative py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                  mode === 'signup' ? 'text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                {mode === 'signup' && (
                  <motion.div
                    layoutId="auth-tab"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#00FF7F] to-[#22D3EE]"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">Create Account</span>
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {mode === 'reset' && (
                <div className="text-center mb-2">
                  <h3 className="text-white text-lg font-bold">Reset your password</h3>
                  <p className="text-white/50 text-xs mt-1">We'll email you a secure reset link.</p>
                </div>
              )}

              {mode === 'verify' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-[#00FF7F]/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Mail className="text-[#00FF7F]" size={32} />
                  </div>
                  <h3 className="text-white text-xl font-bold">Verify your email</h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    We've sent a verification link to{' '}
                    <span className="text-white font-medium">{session?.email}</span>. Please click the link in your inbox to activate your account.
                  </p>

                  <div className="pt-2 space-y-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 rounded-xl bg-[#00FF7F] text-black font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#00FF7F]/90 transition"
                    >
                      {submitting ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                      I've verified my email
                    </button>

                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={submitting}
                      className="w-full py-3 rounded-xl bg-white/5 text-white/80 font-medium text-sm hover:bg-white/10 transition"
                    >
                      Resend verification email
                    </button>

                    <button
                      type="button"
                      onClick={() => signOut()}
                      className="w-full py-3 rounded-xl text-white/40 hover:text-white/60 text-sm flex items-center justify-center gap-2 transition"
                    >
                      <LogOut size={16} />
                      Sign out and try another account
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Display name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      autoFocus
                      className="w-full pl-10 pr-3 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-[#00FF7F]/60 focus:ring-2 focus:ring-[#00FF7F]/20 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="w-full pl-10 pr-3 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-[#00FF7F]/60 focus:ring-2 focus:ring-[#00FF7F]/20 transition"
                  />
                </div>
              </div>

              {mode !== 'reset' && mode !== 'verify' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-white/60">Password</label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => setMode('reset')}
                        className="text-xs text-[#00FF7F] hover:underline"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      required
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-white/30 text-sm outline-none focus:border-[#00FF7F]/60 focus:ring-2 focus:ring-[#00FF7F]/20 transition"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {mode === 'signup' && password.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1 h-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`flex-1 rounded-full transition-colors ${
                              i < strength.score ? strength.color : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-white/50">
                        Strength: <span className="text-white/80 font-medium">{strength.label}</span>
                      </p>
                    </div>
                  )}

                  {mode === 'signup' && (
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-white/60 mb-1.5">Confirm Password</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          required
                          className={`w-full pl-10 pr-10 py-3 rounded-xl bg-black/40 border text-white placeholder:text-white/30 text-sm outline-none focus:ring-2 transition ${
                            confirmPassword && confirmPassword !== password
                              ? 'border-red-500/60 focus:ring-red-500/20'
                              : 'border-white/10 focus:border-[#00FF7F]/60 focus:ring-[#00FF7F]/20'
                          }`}
                        />
                        <button
                          type="button"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowConfirmPassword((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {confirmPassword && confirmPassword !== password && (
                        <p className="mt-1 text-[11px] text-red-400">Passwords do not match</p>
                      )}
                      {confirmPassword && confirmPassword === password && (
                        <p className="mt-1 text-[11px] text-[#00FF7F]">Passwords match ✓</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {mode === 'signup' && (
                <label className="flex items-start gap-2.5 text-xs text-white/60 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-[#00FF7F] cursor-pointer"
                  />
                  <span>
                    I agree to the{' '}
                    <Link to="/terms" className="text-[#00FF7F] hover:underline">Terms of Service</Link> and{' '}
                    <Link to="/privacy" className="text-[#00FF7F] hover:underline">Privacy Policy</Link>.
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="group relative w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00FF7F] to-[#22D3EE] text-black font-bold text-sm overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-[0.99] shadow-[0_10px_30px_-10px_rgba(0,255,127,0.6)]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Please wait...
                    </>
                  ) : (
                    <>
                      {mode === 'signin' && 'Sign In Securely'}
                      {mode === 'signup' && 'Create My Account'}
                      {mode === 'reset' && 'Send Reset Link'}
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </span>
              </button>

              {mode === 'reset' && (
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="w-full text-center text-xs text-white/60 hover:text-white pt-1"
                >
                  ← Back to sign in
                </button>
              )}

              {mode !== 'reset' && mode !== 'verify' && (
                <>
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-white/30">or</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setSubmitting(true);
                      const { error } = await signInWithGoogle();
                      setSubmitting(false);
                      if (error) return toast.error(error);
                      // navigation handled by the session useEffect
                      toast.success('Welcome to GaGa Chat!');
                    }}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white text-sm font-medium disabled:opacity-50"
                  >
                    <svg width="18" height="18" viewBox="0 0 48 48">
                      <path
                        fill="#FFC107"
                        d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"
                      />
                      <path
                        fill="#FF3D00"
                        d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                      />
                      <path
                        fill="#4CAF50"
                        d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.6-2.9-11.3-7.1l-6.6 5.1C9.6 39.6 16.3 44 24 44z"
                      />
                      <path
                        fill="#1976D2"
                        d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.6 5.8l6.2 5.2C40.8 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"
                      />
                    </svg>
                    Continue with Google
                  </button>
                </>
              )}

              <div className="flex items-center justify-center gap-2 pt-3 text-[11px] text-white/40">
                <ShieldCheck size={13} className="text-[#00FF7F]" />
                <span>End-to-end encrypted • Powered by Firebase</span>
              </div>
            </motion.form>
          </AnimatePresence>

          <p className="mt-6 text-center text-[11px] text-white/30">© {year} GaGa Chat. All rights reserved.</p>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthGate;

