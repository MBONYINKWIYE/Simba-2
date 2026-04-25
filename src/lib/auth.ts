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

function getAuthRedirectUrl(nextPath: string) {
  const redirectUrl = new URL('/auth/callback', window.location.origin);
  redirectUrl.searchParams.set('next', nextPath);
  return redirectUrl.toString();
}

export async function completeAuthSessionFromCurrentUrl() {
  const client = requireSupabaseClient();

  if (window.location.pathname === '/auth/callback') {
    return false;
  }

  const currentUrl = new URL(window.location.href);
  const authCode = currentUrl.searchParams.get('code');

  if (!authCode) {
    return false;
  }

  const nextPath = currentUrl.searchParams.get('next') ?? '/checkout';
  const exchangeMarkerKey = `${AUTH_CODE_MARKER_PREFIX}${authCode}`;
  const existingExchangeState = window.sessionStorage.getItem(exchangeMarkerKey);

  const redirectAfterSignIn = async (userId: string | null | undefined, userEmail: string | null | undefined) => {
    const redirectPath = userId ? await resolvePostSignInPath(userId, userEmail, nextPath) : nextPath;
    window.location.replace(redirectPath);
  };

  if (existingExchangeState === 'done') {
    const {
      data: { user },
    } = await client.auth.getUser();

    await redirectAfterSignIn(user?.id, user?.email);
    return true;
  }

  if (existingExchangeState === 'in_progress') {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (session?.user) {
        window.sessionStorage.setItem(exchangeMarkerKey, 'done');
        await redirectAfterSignIn(session.user.id, session.user.email);
        return true;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }

    window.sessionStorage.removeItem(exchangeMarkerKey);
  }

  window.sessionStorage.setItem(exchangeMarkerKey, 'in_progress');

  try {
    const { data, error } = await client.auth.exchangeCodeForSession(authCode);

    if (error) {
      window.sessionStorage.removeItem(exchangeMarkerKey);
      return false;
    }

    window.sessionStorage.setItem(exchangeMarkerKey, 'done');
    await redirectAfterSignIn(data.user?.id, data.user?.email);
    return true;
  } catch (err) {
    window.sessionStorage.removeItem(exchangeMarkerKey);
    console.warn('Failed to complete auth session from URL:', err);
    return false;
  }
}

export async function syncProfileRecord(params: {
  userId: string;
  email: string | null | undefined;
  fullName?: string | null;
  avatarUrl?: string | null;
}) {
  const client = requireSupabaseClient();
  const normalizedEmail = params.email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return;
  }

  const { error } = await client.from('profiles').upsert(
    {
      id: params.userId,
      email: normalizedEmail,
      full_name: params.fullName?.trim() || null,
      avatar_url: params.avatarUrl?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.warn('Error syncing user profile:', error.message);
  }
}

export async function signInWithGoogle(nextPath = '/checkout') {
  const client = requireSupabaseClient();

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthRedirectUrl(nextPath),
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signInWithEmail(email: string, password: string) {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.user) {
    await syncProfileRecord({
      userId: data.user.id,
      email: data.user.email,
      fullName: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null,
      avatarUrl: data.user.user_metadata?.avatar_url ?? data.user.user_metadata?.picture ?? null,
    });
  }

  return data;
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.session?.user) {
    await syncProfileRecord({
      userId: data.session.user.id,
      email: data.session.user.email,
      fullName: fullName,
      avatarUrl: data.session.user.user_metadata?.avatar_url ?? data.session.user.user_metadata?.picture ?? null,
    });
  }

  return data;
}

export async function requestPasswordReset(email: string) {
  const client = requireSupabaseClient();
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl('/auth/reset-password'),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePassword(password: string) {
  const client = requireSupabaseClient();
  const { data, error } = await client.auth.updateUser({
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
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

  try {
    const { data, error } = await client
      .from('shop_admins')
      .select('role, shop_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching user role profile:', error.message);
      return {
        role: 'customer',
        shopId: null,
        shopName: null,
        adminRole: null,
      };
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
        console.warn('Error fetching shop name:', shopError.message);
      } else {
        shopName = shop?.name ?? null;
      }
    }

    return {
      role: 'shop_admin',
      shopId: data.shop_id,
      shopName,
      adminRole: data.role,
    };
  } catch (err) {
    console.warn('Exception in getUserRoleProfile:', err);
    return {
      role: 'customer',
      shopId: null,
      shopName: null,
      adminRole: null,
    };
  }
}

export async function resolvePostSignInPath(userId: string, userEmail: string | null | undefined, nextPath: string) {
  await syncProfileRecord({
    userId,
    email: userEmail,
  });

  const roleProfile = await getUserRoleProfile(userId, userEmail);

  if (roleProfile.role === 'shop_admin' || roleProfile.role === 'super_admin') {
    return '/admin';
  }

  return nextPath;
}
