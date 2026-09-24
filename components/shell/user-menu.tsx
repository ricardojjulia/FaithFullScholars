import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { signOutAction } from '@/lib/auth/auth-actions';
import { User, ChevronDown, LogOut, LogIn, UserPlus, Shield } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/i18n-context';

interface AuthState {
  isLoggedIn: boolean;
  email?: string;
  fullName?: string;
  role?: string;
}

export function UserMenu() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState>({ isLoggedIn: false });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAuth({
            isLoggedIn: true,
            email: user.email,
            fullName: user.user_metadata?.full_name || user.email?.split('@')[0],
            role: user.user_metadata?.role || 'scholar',
          });
        } else {
          setAuth({ isLoggedIn: false });
        }
      } catch {
        setAuth({ isLoggedIn: false });
      }
    }

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuth({
          isLoggedIn: true,
          email: session.user.email,
          fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          role: session.user.user_metadata?.role || 'scholar',
        });
      } else {
        setAuth({ isLoggedIn: false });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="User account and profile menu"
        className="flex flex-col items-center justify-center text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 rounded-lg"
      >
        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
          <User className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] font-medium hidden sm:flex items-center gap-0.5 mt-0.5">
          <span>{auth.isLoggedIn ? (t('nav.account') || 'Account') : (t('nav.me') || 'Me')}</span>
          <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="User navigation menu"
          className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {auth.isLoggedIn ? (
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-indigo-900 text-amber-300 font-display font-bold text-xs flex items-center justify-center shadow-xs tracking-tight">
                  {auth.fullName ? auth.fullName.slice(0, 2).toUpperCase() : 'FS'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {auth.fullName || 'Academic User'}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {auth.email}
                  </p>
                  <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {auth.role === 'institution_user' ? 'Seminary Dean' : auth.role === 'admin' ? 'Admin' : 'Scholar'}
                  </span>
                </div>
              </div>

              <div className="mt-3">
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('nav.sign_out') || 'Sign Out'}</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-indigo-900 text-amber-300 font-display font-bold text-xs flex items-center justify-center shadow-xs tracking-tight">
                  FS
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {t('user_menu.welcome_title') || 'Welcome to FaithFull Scholars'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {t('user_menu.welcome_sub') || 'Theological Academic Network'}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-1.5 px-2 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors text-center flex items-center justify-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('nav.sign_in') || 'Sign In'}</span>
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-1.5 px-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors text-center flex items-center justify-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('nav.register') || 'Register'}</span>
                </Link>
              </div>
            </div>
          )}

          <div className="py-2 space-y-1 text-xs text-slate-600 dark:text-slate-400 max-h-[70vh] overflow-y-auto">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('user_menu.academic_discovery') || 'Academic Discovery'}
            </div>
            <Link
              href="/scholars"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>{t('user_menu.faculty_directory') || 'Faculty Directory'}</span>
              <span className="text-[10px] text-slate-400">Browse</span>
            </Link>
            <Link
              href="/courses"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>{t('user_menu.course_catalog') || 'Course Catalog'}</span>
              <span className="text-[10px] text-slate-400">Syllabi</span>
            </Link>
            <Link
              href="/speakers"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>{t('user_menu.speaking_bureau') || 'Speaking Bureau'}</span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">Keynotes</span>
            </Link>
            <Link
              href="/opportunities"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>{t('user_menu.academic_postings') || 'Academic Postings'}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Calls</span>
            </Link>

            <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('user_menu.faculty_workspace') || 'Faculty Workspace'}
            </div>
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>{t('user_menu.scholar_workspace') || 'Scholar Workspace'}</span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Overview</span>
            </Link>
            <Link
              href="/dashboard/contracts"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>{t('user_menu.contracts_inbox') || 'Contracts Inbox'}</span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Agreements</span>
            </Link>
            <Link
              href="/dashboard/licensing"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>{t('user_menu.course_licensing') || 'Course Licensing'}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Royalties</span>
            </Link>

            <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('user_menu.institution_portal') || 'Institution Portal'}
            </div>
            <Link
              href="/institution"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>{t('user_menu.institution_portal') || 'Institution Portal'}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Seminary</span>
            </Link>
            <Link
              href="/institution/contracts"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>{t('user_menu.engagement_contracts') || 'Engagement Contracts'}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Drafts & Active</span>
            </Link>
            <Link
              href="/institution/licensing"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>{t('user_menu.syllabi_licensing') || 'Syllabi Licensing'}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Curriculum</span>
            </Link>
            <Link
              href="/institution/subscription"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>{t('user_menu.subscriptions_quotas') || 'Subscriptions & Quotas'}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Plans</span>
            </Link>
            <Link
              href="/institution/consortium"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>Seminary Consortium</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Sister Campuses</span>
            </Link>

            <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('user_menu.platform_health') || 'Platform & Health'}
            </div>
            <Link
              href="/admin/reviews"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>{t('user_menu.admin_hub') || 'Admin Trust Hub'}</span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Moderation</span>
            </Link>
            <Link
              href="/dev/status"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <span>{t('user_menu.system_health') || 'System Health'}</span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">Diagnostics</span>
            </Link>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
            <Shield className="w-3 h-3 text-emerald-600" />
            <span>{t('user_menu.confessional_badge') || 'Dedicated to Confessional Scholarship'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
