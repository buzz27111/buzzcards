import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '@/lib/env';

/**
 * Server-side Supabase client.
 * Uses getEnv() to read validated environment variables.
 * Should only be used in server components, route handlers, and server actions.
 */
let _serverClient: SupabaseClient | undefined;

export function getServerSupabase(): SupabaseClient {
  if (!_serverClient) {
    const env = getEnv();
    _serverClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  }
  return _serverClient;
}

/**
 * Browser-side Supabase client.
 * Reads NEXT_PUBLIC_ env vars exposed to the browser by Next.js.
 * Should only be used in client components.
 */
let _browserClient: SupabaseClient | undefined;

export function getBrowserSupabase(): SupabaseClient {
  if (!_browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
          'Ensure these are set in your environment for client-side usage.'
      );
    }

    _browserClient = createClient(url, key);
  }
  return _browserClient;
}
