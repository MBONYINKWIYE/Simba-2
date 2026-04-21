import { supabase } from '@/lib/supabase';

function requireSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
}

export async function signInWithGoogle(nextPath = '/checkout') {
  const client = requireSupabaseClient();
  const redirectBase = import.meta.env.VITE_AUTH_REDIRECT_URL || new URL('/auth/callback', window.location.origin).toString();
  const redirectTo = new URL(redirectBase);
  redirectTo.searchParams.set('next', nextPath);

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo.toString(),
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut() {
  const client = requireSupabaseClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}
