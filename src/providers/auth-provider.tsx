import type { PropsWithChildren } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AuthContext } from '@/providers/auth-context';
import type { AuthContextValue } from '@/providers/auth-context';
import { completeAuthSessionFromCurrentUrl, syncProfileRecord } from '@/lib/auth';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(hasSupabaseEnv);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setSession(null);
        setUser(null);
      } else {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }

      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void completeAuthSessionFromCurrentUrl();
  }, []);

  const currentUserId = user?.id ?? null;
  const currentUserEmail = user?.email ?? null;
  const currentUserFullName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null;
  const currentUserAvatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null;

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    void syncProfileRecord({
      userId: currentUserId,
      email: currentUserEmail,
      fullName: currentUserFullName,
      avatarUrl: currentUserAvatarUrl,
    });
  }, [currentUserAvatarUrl, currentUserEmail, currentUserFullName, currentUserId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      isConfigured: hasSupabaseEnv,
    }),
    [isLoading, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
