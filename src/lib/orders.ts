import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import type { OrderHistoryRecord } from '@/types';

const baseOrderSelect =
  'id, created_at, total_rwf, payment_method, payment_status, delivery_address, full_name, phone, order_items(id, product_id, product_name, quantity, unit_price_rwf)';

async function fetchOrders() {
  if (!supabase) {
    return [] as OrderHistoryRecord[];
  }

  const { data, error } = await supabase
    .from('orders')
    .select(`${baseOrderSelect}, fulfillment_status`)
    .order('created_at', { ascending: false });

  if (error && error.message.includes('fulfillment_status')) {
    const fallbackResult = await supabase
      .from('orders')
      .select(baseOrderSelect)
      .order('created_at', { ascending: false });

    if (fallbackResult.error) {
      throw new Error(fallbackResult.error.message);
    }

    return ((fallbackResult.data ?? []) as OrderHistoryRecord[]).map((order) => ({
      ...order,
      fulfillment_status: null,
    }));
  }

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OrderHistoryRecord[];
}

export const ordersQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.orders(userId),
    queryFn: fetchOrders,
  });
