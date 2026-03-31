'use client';

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, User } from '@supabase/supabase-js';

let _client: SupabaseClient | undefined;

export function getAuthClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    _client = createClient(url, key);
  }
  return _client;
}

export async function signInWithGoogle() {
  const client = getAuthClient();
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  const client = getAuthClient();
  await client.auth.signOut();
}

export async function getUser(): Promise<User | null> {
  const client = getAuthClient();
  const { data: { user } } = await client.auth.getUser();
  return user;
}

export async function getSession() {
  const client = getAuthClient();
  const { data: { session } } = await client.auth.getSession();
  return session;
}
