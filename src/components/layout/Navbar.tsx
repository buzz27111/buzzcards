'use client';

import Link from 'next/link';
import ThemeToggle from '@/components/common/ThemeToggle';
import UserMenu from '@/components/auth/UserMenu';

interface NavbarProps {
  onSwipeModeToggle?: () => void;
  isSwipeMode?: boolean;
  onCompose?: () => void;
}

export default function Navbar({ onSwipeModeToggle, isSwipeMode, onCompose }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-foreground/10 bg-background/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Link href="/" className="text-xl font-bold tracking-tight text-foreground">
          ⚡ BuzzCards
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {/* Swipe mode toggle — mobile only */}
        {onSwipeModeToggle && (
          <button
            onClick={onSwipeModeToggle}
            className={`block rounded-full p-2 transition-colors md:hidden ${
              isSwipeMode
                ? 'bg-foreground/15 text-foreground'
                : 'text-foreground/60 hover:bg-foreground/10'
            }`}
            aria-label={isSwipeMode ? 'Exit swipe mode' : 'Enter swipe mode'}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        )}

        <ThemeToggle />
        {onCompose && (
          <button onClick={onCompose}
            className="hidden rounded-full bg-purple-500 px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 md:block">
            + Article
          </button>
        )}
        <UserMenu />
      </div>
    </nav>
  );
}
