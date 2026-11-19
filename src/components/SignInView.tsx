import { AlertTriangle, Eye, EyeOff, ExternalLink, Lock, LogIn, User } from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';
import { loginWithCredentials, WorkspaceApiError } from '../services/workspaceApi';
import { TeamMember } from '../types/kyc';

interface SignInViewProps {
  onAuthenticated: (user: TeamMember) => void;
}

export function SignInView({ onAuthenticated }: SignInViewProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCookieBlocked, setIsCookieBlocked] = useState(false);

  // Guard against browser extension auto-submit firing immediately upon mount after logout
  const mountTimeRef = useRef(Date.now());
  const userInteractedRef = useRef(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // If an external autofill script triggers submit instantly upon mount without user interaction, ignore it
    const elapsed = Date.now() - mountTimeRef.current;
    if (elapsed < 1000 && !userInteractedRef.current) {
      console.warn('[SignInView] Prevented automatic background form submission right after logout.');
      return;
    }

    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      setErrorMessage('Please enter your username and password.');
      setIsCookieBlocked(false);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setIsCookieBlocked(false);

    try {
      const user = await loginWithCredentials(cleanId, password);
      onAuthenticated(user);
    } catch (err) {
      if (err instanceof WorkspaceApiError && err.kind === 'cookie_blocked') {
        setIsCookieBlocked(true);
      }
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to sign in. Please check your credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/85 bg-white/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm">
            <img
              src="/assets/aistudio/logo__1__12f0c258.png"
              alt="Passary Refractories Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#0D4F3C]">
            Passary Refractories
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
            KYC System Sign In
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Sign in with your Admin or Team Login account credentials
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50/95 p-3.5 text-xs text-rose-800 space-y-2"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              {isCookieBlocked && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 font-semibold text-[#0D4F3C] border border-rose-200 hover:bg-emerald-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open in New Tab</span>
                </a>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="signin-identifier"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Username / Email / Mobile
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="signin-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onFocus={() => {
                  userInteractedRef.current = true;
                }}
                onKeyDown={() => {
                  userInteractedRef.current = true;
                }}
                onChange={(e) => {
                  userInteractedRef.current = true;
                  setIdentifier(e.target.value);
                }}
                placeholder="e.g. Admin or team username"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0D4F3C] focus:outline-hidden focus:ring-2 focus:ring-emerald-900/10"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="signin-password"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onFocus={() => {
                  userInteractedRef.current = true;
                }}
                onKeyDown={() => {
                  userInteractedRef.current = true;
                }}
                onChange={(e) => {
                  userInteractedRef.current = true;
                  setPassword(e.target.value);
                }}
                placeholder="Enter your password"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-10 pr-11 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0D4F3C] focus:outline-hidden focus:ring-2 focus:ring-emerald-900/10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            onClick={() => {
              userInteractedRef.current = true;
            }}
            className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D4F3C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#093b2d] disabled:opacity-60 shadow-[0_10px_22px_-6px_rgba(13,79,60,0.45)] transition-all"
          >
            <LogIn className="h-4 w-4" />
            <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
