import { useAuthRole } from '@/hooks/use-auth-role';

export function useUserRole() {
  return useAuthRole();
}
