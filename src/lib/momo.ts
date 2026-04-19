import { supabase } from '@/lib/supabase';
import type {
  CheckoutFormValues,
  CreateCashOrderResult,
  CheckoutItemPayload,
  RequestToPayResult,
  RequestToPayStatusResult,
} from '@/types';

type RequestToPayArgs = {
  checkout: CheckoutFormValues;
  items: CheckoutItemPayload[];
  subtotalRwf: number;
  deliveryFeeRwf: number;
  serviceFeeRwf: number;
  totalRwf: number;
};

function requireSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
}

export async function requestToPay(args: RequestToPayArgs) {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<RequestToPayResult>('momo-collection', {
    body: {
      action: 'requestToPay',
      ...args,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.ok) {
    throw new Error(data?.message ?? 'Failed to initiate MoMo payment');
  }

  return data;
}

export async function getRequestToPayStatus(referenceId: string) {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<RequestToPayStatusResult>('momo-collection', {
    body: {
      action: 'getRequestToPayStatus',
      referenceId,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createCashOrder(args: RequestToPayArgs) {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<CreateCashOrderResult>('momo-collection', {
    body: {
      action: 'createCashOrder',
      ...args,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.ok) {
    throw new Error('Failed to create cash-on-delivery order');
  }

  return data;
}
