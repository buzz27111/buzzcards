'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { signInWithGoogle, signOut } from '@/lib/auth';

export default function UserMenu() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (loading) return <div className="h-8 w-8 animate-pulse rounded-full bg-foreground/10" />;

  if (!user) {
    return (
      <button
        onClick={() => signInWithGoogle()}
        className="rounded-full bg-foreground/10 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-foreground/20"
      >
        Sign in
      </button>
    );
  }

  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2">
        {avatar ? (
          <img src={avatar} alt="" className="h-8 w-8 rounded-full" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white">
            {(name || '?')[0].toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-foreground/10 bg-background/95 p-1.5 shadow-lg backdrop-blur-md">
          <p className="px-3 py-1.5 text-xs text-foreground/50 truncate">{name}</p>
          <Link href="/profile" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/80 hover:bg-foreground/10">
            Profile
          </Link>
          <Link href="/create" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground/80 hover:bg-foreground/10">
            Write Article
          </Link>
          <button onClick={() => { signOut(); setOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-foreground/10">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
