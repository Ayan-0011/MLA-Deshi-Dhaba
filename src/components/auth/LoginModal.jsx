import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSupabaseConfig } from '../../lib/supabase';
import { Eye, EyeOff, AlertCircle, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';

// MLA Desi Dhaba logo (image from /public/logo.webp)
const Logo = ({ size = 56 }) => (
  <img
    src={`${import.meta.env.BASE_URL}logo.webp`}
    alt="MLA Desi Dhaba logo"
    width={size}
    height={size}
    className="shrink-0 rounded-full object-cover"
    style={{ width: size, height: size }}
  />
);

export const LoginModal = () => {
  const { signIn, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const configured = getSupabaseConfig().isConfigured;
  const error = localError || authError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setLocalError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full h-12 pl-10 pr-3 bg-white border border-[#D9D3CA] rounded-lg text-sm text-[#2B2623] placeholder:text-[#A39B93] focus:outline-none focus:border-[#C2570C] focus:ring-2 focus:ring-[#C2570C]/20';

  return (
    <div className="min-h-screen bg-[#FAF9F7] lg:grid lg:grid-cols-2">
      {/* Left brand panel: desktop / tablet landscape only */}
      <aside className="hidden lg:flex flex-col justify-between bg-[#FDF3EA] border-r border-[#F0DCC8] p-12 xl:p-16">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <span className="text-lg font-semibold text-[#2B2623]">MLA Desi Dhaba</span>
        </div>

        <div className="max-w-md">
          <div className="mb-8"><Logo size={180} /></div>
          <h2 className="text-3xl xl:text-4xl font-semibold text-[#2B2623] leading-tight">
            Pure desi taste,<br />served with care.
          </h2>
          <p className="mt-4 text-base text-[#6B635C] leading-relaxed">
            Manage tables, orders and bills for the dhaba, all in one place.
          </p>
          <div className="mt-8 h-1 w-14 rounded-full bg-[#C2570C]" />
        </div>

        <p className="text-xs text-[#8A8178]">© {new Date().getFullYear()} MLA Desi Dhaba</p>
      </aside>

      {/* Right: login form (the only thing shown on mobile) */}
      <main className="flex items-center justify-center px-5 py-10 sm:px-8 min-h-screen lg:min-h-0">
        <div className="w-full max-w-sm">
          {/* Mobile / tablet-portrait logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-block mb-3"><Logo size={96} /></div>
            <h1 className="text-xl font-semibold text-[#2B2623]">MLA Desi Dhaba</h1>
          </div>

          <div className="hidden lg:block mb-8">
            <h1 className="text-2xl font-semibold text-[#2B2623]">Welcome back</h1>
            <p className="text-sm text-[#6B635C] mt-1">Sign in to your account to continue</p>
          </div>
          <p className="lg:hidden text-center text-sm text-[#6B635C] -mt-5 mb-6">Sign in to continue</p>

          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {!configured && (
            <div role="alert" className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Service is currently unavailable. Please contact the administrator.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-[#2B2623] mb-1.5">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A39B93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-[#2B2623] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#A39B93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${inputClass} pr-11`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-md text-[#6B635C] hover:text-[#2B2623] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C2570C]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !configured}
              className="w-full h-12 mt-2 bg-[#C2570C] hover:bg-[#A8480A] text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C2570C]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{submitting ? 'Signing in…' : 'Sign in'}</span>
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};