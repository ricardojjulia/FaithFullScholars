'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Inbox,
  FileText,
  BarChart3,
  Eye,
  Video,
  FileCode,
  Calendar,
  BookOpen,
  User,
  LayoutDashboard,
} from 'lucide-react';

export function ScholarDashboardNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: '/dashboard/profile',
      label: 'Profile & Doctrinal',
      icon: User,
      exact: false,
    },
    {
      href: '/dashboard/courses',
      label: 'Courses & Syllabi',
      icon: BookOpen,
      exact: false,
    },
    {
      href: '/dashboard/availability',
      label: 'Availability',
      icon: Calendar,
      exact: false,
    },
    {
      href: '/dashboard/media',
      label: 'Media Showcase',
      icon: Video,
      exact: false,
    },
    {
      href: '/dashboard/licensing',
      label: 'Course Licensing',
      icon: FileCode,
      exact: false,
    },
    {
      href: '/dashboard/inquiries',
      label: 'Inquiries',
      icon: Inbox,
      exact: false,
    },
    {
      href: '/dashboard/contracts',
      label: 'Contracts',
      icon: FileText,
      exact: false,
    },
    {
      href: '/dashboard/analytics',
      label: 'Analytics',
      icon: BarChart3,
      exact: false,
    },
    {
      href: '/dashboard/preview',
      label: 'Draft Preview',
      icon: Eye,
      exact: false,
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-16 z-30 shadow-2xs print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-display font-bold tracking-tight text-slate-900 dark:text-white">
            Scholar Workspace
          </span>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-indigo-900 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 stroke-[2]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
