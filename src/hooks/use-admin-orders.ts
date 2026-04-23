import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import type { AdminOrderRecord, Shop } from '@/types';

const adminOrderSelect = `
  id,
  created_at,
  pickup_time,
  full_name,
  phone,
  delivery_address,
  notes,
  payment_method,
  payment_status,
  status,
  total_rwf,
  subtotal_rwf,
  delivery_fee_rwf,
  service_fee_rwf,
  user_email,
  shop_id,
  assigned_staff_user_id,
  order_items(id, product_id, product_name, quantity, unit_price_rwf)
`;

async function fetchAdminOrders(shopId: string | null, isSuperAdmin: boolean): Promise<AdminOrderRecord[]> {
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from('orders')
    .select(adminOrderSelect)
    .order('created_at', { ascending: false });

  if (!isSuperAdmin && shopId) {
    query = query.eq('shop_id', shopId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const orders = (data ?? []) as AdminOrderRecord[];
  const shopIds = [...new Set(orders.map((order) => order.shop_id).filter(Boolean))] as string[];

  if (shopIds.length === 0) {
    return orders;
  }

  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select('id, name, address, phone')
    .in('id', shopIds);

  if (shopsError) {
    throw new Error(shopsError.message);
  }

  const shopMap = new Map((shops ?? []).map((shop) => [shop.id, shop as Pick<Shop, 'id' | 'name' | 'address' | 'phone'>]));

  return orders.map((order) => ({
    ...order,
    shops: order.shop_id ? (shopMap.get(order.shop_id) ?? null) : null,
  }));
}

export function useAdminOrders(shopId: string | null, isSuperAdmin = false) {
  return useQuery({
    queryKey: queryKeys.adminOrders(isSuperAdmin ? 'all-shops' : (shopId ?? 'unassigned')),
    queryFn: () => fetchAdminOrders(shopId, isSuperAdmin),
    enabled: isSuperAdmin || Boolean(shopId),
    refetchInterval: 15000,
  });
}
