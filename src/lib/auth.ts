import { supabase } from '@/lib/supabase';
import { SUPER_ADMIN_EMAILS } from '@/lib/constants';
import type { AuthRoleProfile } from '@/types';

const AUTH_CODE_MARKER_PREFIX = 'supabase-auth-code:';

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
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

function clearAuthExchangeMarkers() {
  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);

    if (key?.startsWith(AUTH_CODE_MARKER_PREFIX)) {
      window.sessionStorage.removeItem(key);
    }
  }
}

export async function signOut() {
  const client = requireSupabaseClient();
  clearAuthExchangeMarkers();
  const { error } = await client.auth.signOut({ scope: 'global' });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getUserRoleProfile(userId: string, userEmail?: string | null): Promise<AuthRoleProfile> {
  const client = requireSupabaseClient();
  const normalizedEmail = userEmail?.trim().toLowerCase() ?? null;

  if (normalizedEmail && SUPER_ADMIN_EMAILS.includes(normalizedEmail)) {
    return {
      role: 'super_admin',
      shopId: null,
      shopName: 'All Simba shops',
      adminRole: 'admin',
    };
  }

  const { data, error } = await client
    .from('shop_admins')
    .select('role, shop_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return {
      role: 'customer',
      shopId: null,
      shopName: null,
      adminRole: null,
    };
  }

  let shopName: string | null = null;

  if (data.shop_id) {
    const { data: shop, error: shopError } = await client
      .from('shops')
      .select('name')
      .eq('id', data.shop_id)
      .maybeSingle();

    if (shopError) {
      throw new Error(shopError.message);
    }

    shopName = shop?.name ?? null;
  }

  return {
    role: 'shop_admin',
    shopId: data.shop_id,
    shopName,
    adminRole: data.role,
  };
}

export async function resolvePostSignInPath(userId: string, userEmail: string | null | undefined, nextPath: string) {
  const roleProfile = await getUserRoleProfile(userId, userEmail);

  if (roleProfile.role === 'shop_admin' || roleProfile.role === 'super_admin') {
    return '/admin';
  }

  return nextPath;
}
