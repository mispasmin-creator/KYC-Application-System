import {
  AlertCircle,
  ArrowRight,
  Building2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MapPin,
  RefreshCw,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { ApiErrorKind, loginWithCredentials, WorkspaceApiError } from '../services/workspaceApi';
import { TeamMember } from '../types/kyc';

interface LoginViewProps {
  authError: string;
  onLoginSuccess: (member: TeamMember) => void;
}

const INPUT_CLASS =
  'w-full min-h-[44px] rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-400 focus:border-[#0D4F3C] focus:outline-none focus:ring-2 focus:ring-[#0D4F3C]/20';

export function LoginView({ authError, onLoginSuccess }: LoginViewProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [errorKind, setErrorKind] = useState<ApiErrorKind | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawId = identifier.trim();
    if (!rawId) {
      setLoginError('Please enter your Admin ID, username, email, or mobile number.');
      setErrorKind(null);
      return;
    }
    if (!password) {
      setLoginError('Please enter your password.');
      setErrorKind(null);
      return;
    }

    setLoginError('');
    setErrorKind(null);
    setIsSubmitting(true);
    try {
      const user = await loginWithCredentials(rawId, password);
      onLoginSuccess(user);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Sign in failed.');
      setErrorKind(err instanceof WorkspaceApiError ? err.kind : null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-3 sm:p-8 pb-safe">
      <div className="w-full max-w-5xl rounded-3xl glass-surface overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-[0_28px_70px_-22px_rgba(13,79,60,0.28)]">
        {/* Showcase Panel */}
        <div className="lg:col-span-5 mobile-hero-emerald p-6 sm:p-9 text-white flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 border border-white/25 backdrop-blur-xs">
                <Building2 className="h-5 w-5 text-[#A3F046]" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight">KYC System</span>
            </div>

            <h1 className="mt-6 lg:mt-8 font-display text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
              Company KYC & Sales Team Directory
            </h1>
          </div>

          <div className="hidden sm:block space-y-3.5">
            <div className="flex items-start gap-3 rounded-2xl bg-white/10 border border-white/15 p-3.5 backdrop-blur-xs">
              <ShieldCheck className="h-4 w-4 text-[#A3F046] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold">15-Character GSTIN Validation</div>
                <div className="text-[11px] text-emerald-50/80 mt-0.5">
                  Instant format verification and automatic Indian state mapping
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-white/10 border border-white/15 p-3.5 backdrop-blur-xs">
              <MapPin className="h-4 w-4 text-[#A3F046] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold">Multi-Branch & Contact Vault</div>
                <div className="text-[11px] text-emerald-50/80 mt-0.5">
                  Save managers, team leaders, emails, and plant locations cleanly
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-white/10 border border-white/15 p-3.5 backdrop-blur-xs">
              <Users className="h-4 w-4 text-[#A3F046] shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold">GM, MM & TSE Team Directory</div>
                <div className="text-[11px] text-emerald-50/80 mt-0.5">
                  Three-tier team ownership and role-based login access
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:block pt-2 border-t border-white/15 text-[11px] text-emerald-100/80">
            Secure Workspace Access
          </div>
        </div>

        {/* Form Panel */}
        <div className="lg:col-span-7 bg-white/94 backdrop-blur-md p-5 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Sign in to workspace
            </h2>
          </div>

          {authError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-identifier"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Admin ID / Username
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setLoginError('');
                  }}
                  placeholder="Enter Admin ID, username, email, or mobile"
                  autoComplete="username"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setLoginError('');
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`${INPUT_CLASS} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
                {(errorKind === 'cookie_blocked' ||
                  errorKind === 'static_host' ||
                  errorKind === 'server_warming') && (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <a
                      href={typeof window !== 'undefined' ? window.location.href : '/'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#0D4F3C] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#093b2d]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open in New Tab</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-800 hover:bg-rose-100/60"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Reload Session</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D4F3C] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#093b2d] active:scale-[0.98] transition-all shadow-md disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="pt-2 text-center text-[11px] text-slate-500">
              Sign in with Admin credentials to add and manage team users inside the app.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
