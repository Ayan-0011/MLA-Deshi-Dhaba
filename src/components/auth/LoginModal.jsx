import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSupabaseConfig } from '../../lib/supabase';
import { Eye, EyeOff, AlertCircle, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { notify } from '../../lib/notifications';

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
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const configured = getSupabaseConfig().isConfigured;
  const error = localError || authError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    const nextEmailError = !email.trim()
      ? 'Email is required.'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? 'Enter a valid email address.'
        : '';
    const nextPasswordError = !password ? 'Password is required.' : password.length < 6 ? 'Password must be at least 6 characters.' : '';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      notify.warning('Check the highlighted fields and try again.', 'login-validation');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email, password);
      notify.success('Welcome back. You are signed in.', 'login-success');
    } catch (err) {
      console.error('Sign in failed:', err);
      setLocalError('Unable to sign in. Check your email and password, then try again.');
      notify.error('Sign in failed. Check your details and try again.', 'login-error');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'min-h-12 w-full rounded-md border border-border bg-surface pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15';

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,.95fr)]">
      <aside className="relative hidden min-h-dvh flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex xl:p-16">
        <div aria-hidden="true" className="login-pattern pointer-events-none absolute inset-0 opacity-[.08]" />
        <div className="relative flex items-center gap-3">
          <Logo size={42} />
          <span className="font-display text-lg font-bold">MLA Desi Dhaba</span>
        </div>

        <div className="relative max-w-lg">
          <div className="mb-8 inline-flex rounded-xl border border-primary-foreground/15 bg-primary-foreground/10 p-4"><Logo size={72} /></div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-primary-foreground/70">The daily rhythm of the dhaba</p>
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">Good service starts with a clear view.</h2>
          <p className="mt-5 max-w-md text-base leading-7 text-primary-foreground/75">Tables, orders and bills, thoughtfully brought together for your team.</p>
          <div className="mt-8 h-1 w-12 rounded-full bg-accent" />
        </div>

        <p className="relative text-xs text-primary-foreground/65">© {new Date().getFullYear()} MLA Desi Dhaba</p>
      </aside>

      <main className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-8 lg:min-h-0">
        <div className="w-full max-w-md">
          <div className="mb-7 text-center lg:hidden">
            <div className="mb-3 inline-flex rounded-xl border border-border bg-surface p-3 shadow-sm"><Logo size={64} /></div>
            <h1 className="font-display text-xl font-bold text-foreground">MLA Desi Dhaba</h1>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 shadow-md sm:p-8">
          <div className="mb-7">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Team sign-in</p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to continue to your workspace.</p>
          </div>

          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-danger/20 bg-danger-soft p-3 text-sm text-danger-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {!configured && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-md border border-warning/20 bg-warning-soft p-3 text-sm text-warning-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Service is currently unavailable. Please contact the administrator.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-foreground">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? 'login-email-error' : undefined}
                  required
                />
              </div>
              {emailError && <p id="login-email-error" className="mt-1.5 text-xs text-danger-foreground" role="alert">{emailError}</p>}
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-foreground">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${inputClass} pr-11`}
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={passwordError ? 'login-password-error' : undefined}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && <p id="login-password-error" className="mt-1.5 text-xs text-danger-foreground" role="alert">{passwordError}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting || !configured}
              className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-primary bg-primary text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{submitting ? 'Signing in…' : 'Sign in'}</span>
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
          </div>
        </div>
      </main>
    </div>
  );
};