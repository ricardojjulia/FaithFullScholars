'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signupScholar, signupInstitution } from '@/lib/auth/auth-actions';
import { TurnstileCaptcha } from '@/components/auth/turnstile-captcha';
import { GraduationCap, Building2, UserPlus, AlertCircle, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<'scholar' | 'institution'>('scholar');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(event.currentTarget);

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    startTransition(async () => {
      if (role === 'scholar') {
        const preferredTitle = formData.get('preferredTitle') as string;
        const result = await signupScholar({
          email,
          password,
          fullName,
          preferredTitle,
          captchaToken,
        });

        if (!result.success) {
          setErrorMessage(result.error || 'Registration failed.');
        } else if (result.redirectUrl) {
          router.push(result.redirectUrl);
        }
      } else {
        const institutionName = formData.get('institutionName') as string;
        const roleTitle = formData.get('roleTitle') as string;
        const result = await signupInstitution({
          email,
          password,
          fullName,
          institutionName,
          roleTitle,
          captchaToken,
        });

        if (!result.success) {
          setErrorMessage(result.error || 'Registration failed.');
        } else if (result.redirectUrl) {
          router.push(result.redirectUrl);
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold font-display text-slate-900 dark:text-white">
          Join FaithFull Scholars
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Create your professional academic profile or seminary recruiter account
        </p>
      </div>

      {/* Role Switcher Tabs */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => {
            setRole('scholar');
            setErrorMessage(null);
          }}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            role === 'scholar'
              ? 'bg-white dark:bg-slate-900 text-indigo-900 dark:text-indigo-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Scholar / Faculty</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRole('institution');
            setErrorMessage(null);
          }}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            role === 'institution'
              ? 'bg-white dark:bg-slate-900 text-indigo-900 dark:text-indigo-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Seminary / Dean</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label
            htmlFor="fullName"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Full Name (with credentials)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              placeholder={role === 'scholar' ? 'Dr. Meredith G. Kline, Ph.D.' : 'Dr. Academic Dean'}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Scholar-specific Title */}
        {role === 'scholar' && (
          <div>
            <label
              htmlFor="preferredTitle"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Academic Title / Rank
            </label>
            <input
              id="preferredTitle"
              name="preferredTitle"
              type="text"
              placeholder="Professor of Old Testament"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>
        )}

        {/* Institution-specific fields */}
        {role === 'institution' && (
          <>
            <div>
              <label
                htmlFor="institutionName"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Seminary / University Name
              </label>
              <input
                id="institutionName"
                name="institutionName"
                type="text"
                required
                placeholder="Westminster Theological Seminary"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="roleTitle"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Your Role at Institution
              </label>
              <input
                id="roleTitle"
                name="roleTitle"
                type="text"
                placeholder="Academic Dean / Provost / Department Chair"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </>
        )}

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            {role === 'institution' ? 'Institutional Work Email' : 'Academic Email Address'}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder={role === 'institution' ? 'dean@seminary.edu' : 'faculty@university.edu'}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
          >
            Password (min. 8 characters)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full pl-9 pr-10 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Cloudflare Turnstile CAPTCHA */}
        <TurnstileCaptcha onVerify={(token) => setCaptchaToken(token)} />

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 bg-indigo-900 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isPending ? (
            <span>Creating account...</span>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>
                {role === 'scholar' ? 'Register as Faculty Member' : 'Register Institution Account'}
              </span>
            </>
          )}
        </button>
      </form>

      {/* Sign In Prompt */}
      <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
