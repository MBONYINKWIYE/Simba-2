import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import type { ShopAdminAssignment, UnassignedStaffProfile } from '@/types';

async function fetchShopAdminAssignments(): Promise<ShopAdminAssignment[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.rpc('list_shop_admin_assignments');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ShopAdminAssignment[];
}

async function fetchUnassignedStaffProfiles(): Promise<UnassignedStaffProfile[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.rpc('list_unassigned_staff_profiles');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as UnassignedStaffProfile[];
}

export function useShopAdmins(enabled = true) {
  return useQuery({
    queryKey: queryKeys.shopAdmins,
    queryFn: fetchShopAdminAssignments,
    enabled,
    staleTime: 1000 * 60,
  });
}

export function useUnassignedStaff(enabled = true) {
  return useQuery({
    queryKey: queryKeys.unassignedStaff,
    queryFn: fetchUnassignedStaffProfiles,
    enabled,
    staleTime: 1000 * 60,
  });
}
