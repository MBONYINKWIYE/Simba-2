import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DeliveryPerson } from '@/types';

async function fetchDeliveryPersons(shopId: string | null): Promise<DeliveryPerson[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.rpc('list_delivery_persons', { target_shop_id: shopId });
  if (error) throw new Error(error.message);
  return (data ?? []) as DeliveryPerson[];
}

export function useDeliveryPersons(shopId: string | null, enabled = true) {
  return useQuery<DeliveryPerson[], Error>({
    queryKey: ['delivery-persons', shopId],
    queryFn: () => fetchDeliveryPersons(shopId),
    enabled,
  });
}

type CreateDeliveryPersonArgs = {
  shopId: string;
  name: string;
  phone: string;
  email?: string;
};

async function createDeliveryPerson({ shopId, name, phone, email }: CreateDeliveryPersonArgs) {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase.rpc('create_delivery_person', {
    p_shop_id: shopId,
    p_name: name,
    p_phone: phone,
    p_email: email ?? null,
  });

  if (error) throw new Error(error.message);
}

export function useCreateDeliveryPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDeliveryPerson,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['delivery-persons'] });
    },
  });
}

type DeleteDeliveryPersonArgs = {
  id: string;
};

async function deleteDeliveryPerson({ id }: DeleteDeliveryPersonArgs) {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase.rpc('delete_delivery_person', {
    target_id: id,
  });

  if (error) throw new Error(error.message);
}

export function useDeleteDeliveryPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDeliveryPerson,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['delivery-persons'] });
    },
  });
}
