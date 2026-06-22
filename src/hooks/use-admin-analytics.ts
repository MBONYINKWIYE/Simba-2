import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import type { ShopAnalytics } from '@/types';

async function fetchShopAnalytics(shopId: string | null, isSuperAdmin: boolean): Promise<ShopAnalytics | null> {
  if (!supabase) {
    return null;
  }

  const p_shop_id = isSuperAdmin ? null : shopId;

  const { data, error } = await supabase.rpc('get_shop_analytics', { p_shop_id });

  if (error) {
    throw new Error(error.message);
  }

  return data as ShopAnalytics | null;
}

export function useAdminAnalytics(shopId: string | null, isSuperAdmin = false) {
  const scopeKey = isSuperAdmin ? 'all-shops' : (shopId ?? 'unassigned');
  return useQuery({
    queryKey: queryKeys.adminAnalytics(scopeKey),
    queryFn: () => fetchShopAnalytics(shopId, isSuperAdmin),
    enabled: isSuperAdmin || Boolean(shopId),
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
  });
}
