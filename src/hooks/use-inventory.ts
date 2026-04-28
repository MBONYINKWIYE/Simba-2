import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import type { InventoryHistoryRecord, InventoryRecord } from '@/types';

type UpsertInventoryArgs = {
  shopId: string;
  productId: number;
  quantity: number;
};

type DeleteInventoryArgs = {
  inventoryId: string;
  scopeKey: string;
};

type UpdateShopPhoneArgs = {
  shopId: string;
  phone: string;
};

type InventoryHistoryLimit = number | 'all';

async function fetchInventory(scopeShopId: string | null, isSuperAdmin: boolean) {
  if (!supabase) {
    return [] as InventoryRecord[];
  }

  const { data, error } = await supabase.rpc('list_inventory_entries', {
    target_shop_id: isSuperAdmin ? scopeShopId : scopeShopId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as InventoryRecord[];
}

async function fetchInventoryHistory(scopeShopId: string | null, isSuperAdmin: boolean, limit: InventoryHistoryLimit) {
  if (!supabase) {
    return [] as InventoryHistoryRecord[];
  }

  const { data, error } = await supabase.rpc('list_inventory_history', {
    target_shop_id: isSuperAdmin ? scopeShopId : scopeShopId,
    row_limit: limit === 'all' ? 10000 : limit,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as InventoryHistoryRecord[];
}

async function upsertInventoryEntry({ shopId, productId, quantity }: UpsertInventoryArgs) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase.rpc('upsert_inventory_entry', {
    target_shop_id: shopId,
    target_product_id: productId,
    target_quantity: quantity,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteInventoryEntry({ inventoryId }: DeleteInventoryArgs) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase.rpc('delete_inventory_entry', {
    target_inventory_id: inventoryId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function updateShopPhone({ shopId, phone }: UpdateShopPhoneArgs) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase.rpc('update_shop_phone', {
    target_shop_id: shopId,
    new_phone: phone,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function useInventory(scopeShopId: string | null, isSuperAdmin = false) {
  const scopeKey = isSuperAdmin ? `super:${scopeShopId ?? 'all'}` : (scopeShopId ?? 'unassigned');

  return useQuery({
    queryKey: queryKeys.inventory(scopeKey),
    queryFn: () => fetchInventory(scopeShopId, isSuperAdmin),
    enabled: isSuperAdmin || Boolean(scopeShopId),
    staleTime: 1000 * 30,
  });
}

export function useInventoryHistory(scopeShopId: string | null, isSuperAdmin = false, limit: InventoryHistoryLimit = 20) {
  const scopeKey = isSuperAdmin ? `super:${scopeShopId ?? 'all'}` : (scopeShopId ?? 'unassigned');

  return useQuery({
    queryKey: queryKeys.inventoryHistory(scopeKey, limit),
    queryFn: () => fetchInventoryHistory(scopeShopId, isSuperAdmin, limit),
    enabled: isSuperAdmin || Boolean(scopeShopId),
    staleTime: 1000 * 30,
  });
}

export function useUpsertInventoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertInventoryEntry,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory(variables.shopId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory(`super:${variables.shopId}`) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory('super:all') }),
        queryClient.invalidateQueries({ queryKey: ['inventory-history'] }),
        queryClient.invalidateQueries({ queryKey: ['available-shops'] }),
      ]);
    },
  });
}

export function useDeleteInventoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInventoryEntry,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory(variables.scopeKey) }),
        queryClient.invalidateQueries({ queryKey: ['inventory-history'] }),
        queryClient.invalidateQueries({ queryKey: ['available-shops'] }),
      ]);
    },
  });
}

export function useUpdateShopPhone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateShopPhone,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.shops }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['available-shops'] }),
      ]);
    },
  });
}
