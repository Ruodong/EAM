'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Languages, User } from 'lucide-react';
import clsx from 'clsx';

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isReviewer = pathname !== '/';

  return (
    <header className="h-14 bg-white border-b border-border-light flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        {/* Lenovo Logo */}
        <Link href="/" className="flex items-center">
          <div className="bg-lenovo-red px-3 py-1 rounded-sm">
            <span className="text-white font-bold text-lg tracking-wider">Lenovo.</span>
          </div>
        </Link>
        <span className="text-text-primary font-medium text-base hidden sm:block">
          Enterprise Architecture Management
        </span>
      </div>

      <div className="flex items-center gap-1">
        {/* Navigation Tabs */}
        <Link
          href="/"
          className={clsx(
            'px-4 py-2 text-sm font-medium rounded transition-colors',
            isHome
              ? 'text-lenovo-red border-b-2 border-lenovo-red'
              : 'text-text-primary hover:text-lenovo-red'
          )}
        >
          Home
        </Link>
        <Link
          href="/ea-review/request-summary"
          className={clsx(
            'px-4 py-2 text-sm font-medium rounded transition-colors',
            isReviewer
              ? 'text-lenovo-red border-b-2 border-lenovo-red'
              : 'text-text-primary hover:text-lenovo-red'
          )}
        >
          I&apos;m Reviewer
        </Link>

        {/* Language Switcher */}
        <button className="p-2 hover:bg-gray-100 rounded transition-colors ml-2" title="Switch Language">
          <Languages className="w-5 h-5 text-text-secondary" />
        </button>

        {/* User Avatar */}
        <button className="p-2 hover:bg-gray-100 rounded transition-colors" title="User Profile">
          <User className="w-5 h-5 text-text-secondary" />
        </button>
      </div>
    </header>
  );
}
