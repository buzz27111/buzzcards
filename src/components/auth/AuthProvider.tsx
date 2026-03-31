'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getAuthClient } from '@/lib/auth';

interface AuthCtx {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx>({ user: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getAuthClient();

    // getSession picks up tokens from URL hash after OAuth redirect
    client.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[auth] getSession:', session ? `user=${session.user.email}` : 'no session', error?.message ?? '');
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      console.log('[auth] onAuthStateChange:', event, session ? `user=${session.user.email}` : 'no session');
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
