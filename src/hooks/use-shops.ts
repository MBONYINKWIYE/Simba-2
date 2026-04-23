import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import type { Shop } from '@/types';

async function fetchShops(): Promise<Shop[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('shops')
    .select('id, name, address, latitude, longitude, phone, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Shop[];
}

export function useShops() {
  return useQuery({
    queryKey: queryKeys.shops,
    queryFn: fetchShops,
    staleTime: 1000 * 60 * 10,
  });
}
