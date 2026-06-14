import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { OrderHistoryRecord } from '@/types';

const baseSelect =
  'id, created_at, subtotal_rwf, total_rwf, status, shop_id, order_items(id, product_id, product_name, quantity, unit_price_rwf)';

async function fetchPastOrders(userId: string): Promise<OrderHistoryRecord[]> {
  if (!supabase) return [];

  const completedStatuses = ['picked_up', 'delivered'];

  const { data, error } = await supabase
    .from('orders')
    .select(baseSelect)
    .eq('user_id', userId)
    .in('status', completedStatuses)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw new Error(error.message);

  return (data ?? []) as OrderHistoryRecord[];
}

export function usePastOrders(userId: string | undefined) {
  return useQuery({
    queryKey: ['past-orders', userId],
    queryFn: () => fetchPastOrders(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
