import { useQuery } from '@tanstack/react-query';
import { getUserRoleProfile } from '@/lib/auth';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/use-auth';

export function useAuthRole() {
  const { user, isConfigured } = useAuth();

  return useQuery({
    queryKey: queryKeys.authRole(user?.id ?? 'guest'),
    queryFn: () => getUserRoleProfile(user!.id, user?.email),
    enabled: Boolean(isConfigured && user),
    staleTime: 1000 * 60 * 5,
  });
}
