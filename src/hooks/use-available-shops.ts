import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { AvailableShop, CheckoutItemPayload } from '@/types';

type CartItemRpc = {
  productId: number;
  quantity: number;
};

async function fetchAvailableShops(items: CartItemRpc[]): Promise<AvailableShop[]> {
  if (!supabase || items.length === 0) {
    return [];
  }

  const { data, error } = await supabase.rpc('get_available_shops_for_cart', {
    cart_items: items,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as AvailableShop[]).map((shop) => ({
    ...shop,
    average_rating: Number(shop.average_rating ?? 0),
    review_count: Number(shop.review_count ?? 0),
  }));
}

export function useAvailableShops(items: CheckoutItemPayload[]) {
  const normalizedItems = useMemo(
    () =>
      items
        .map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }))
        .sort((left, right) => left.productId - right.productId),
    [items],
  );
  const debouncedItems = useDebouncedValue(normalizedItems, 300);
  const itemsKey = JSON.stringify(debouncedItems);

  return useQuery({
    queryKey: queryKeys.availableShops(itemsKey),
    queryFn: () => fetchAvailableShops(debouncedItems),
    enabled: debouncedItems.length > 0,
    staleTime: 1000 * 30,
  });
}
