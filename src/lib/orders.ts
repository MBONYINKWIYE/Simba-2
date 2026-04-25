import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import type { OrderHistoryRecord, ReviewRecord, Shop } from '@/types';

const baseOrderSelect =
  'id, created_at, pickup_time, subtotal_rwf, delivery_fee_rwf, service_fee_rwf, total_rwf, payment_method, payment_status, delivery_address, full_name, phone, shop_id, status, momo_reference, momo_status, payment_provider, payment_payload, paid_at, order_items(id, product_id, product_name, quantity, unit_price_rwf)';

async function attachShops(records: OrderHistoryRecord[]) {
  if (!supabase || records.length === 0) {
    return records;
  }

  const shopIds = [...new Set(records.map((order) => order.shop_id).filter(Boolean))] as string[];

  if (shopIds.length === 0) {
    return records;
  }

  const { data: shops, error } = await supabase
    .from('shops')
    .select('id, name, address, phone')
    .in('id', shopIds);

  if (error) {
    throw new Error(error.message);
  }

  const shopMap = new Map((shops ?? []).map((shop) => [shop.id, shop as Pick<Shop, 'id' | 'name' | 'address' | 'phone'>]));

  return records.map((order) => ({
    ...order,
    shops: order.shop_id ? (shopMap.get(order.shop_id) ?? null) : null,
  }));
}

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

    const orders = (await attachShops((fallbackResult.data ?? []) as OrderHistoryRecord[])).map((order) => ({
      ...order,
      fulfillment_status: null,
    }));

    return attachReviews(orders);
  }

  if (error) {
    throw new Error(error.message);
  }

  return attachReviews(await attachShops((data ?? []) as OrderHistoryRecord[]));
}

async function attachReviews(records: OrderHistoryRecord[]) {
  if (!supabase || records.length === 0) {
    return records;
  }

  const orderIds = records.map((order) => order.id);
  const { data, error } = await supabase
    .from('reviews')
    .select('id, order_id, user_id, shop_id, rating, comment, created_at')
    .in('order_id', orderIds);

  if (error) {
    throw new Error(error.message);
  }

  const reviewMap = new Map((data ?? []).map((review) => [review.order_id, review as ReviewRecord]));

  return records.map((order) => ({
    ...order,
    review: reviewMap.get(order.id) ?? null,
  }));
}

export const ordersQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.orders(userId),
    queryFn: fetchOrders,
  });

export const orderQueryOptions = (orderId: string) =>
  queryOptions({
    queryKey: queryKeys.order(orderId),
    queryFn: async () => {
      if (!supabase) {
        return null;
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`${baseOrderSelect}, fulfillment_status`)
        .eq('id', orderId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return null;
      }

      const [withShop] = await attachShops([data as OrderHistoryRecord]);
      const records = await attachReviews([withShop]);
      return records[0] ?? null;
    },
  });
