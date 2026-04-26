import { supabase } from '@/lib/supabase';
import type {
  CreateCashOrderResult,
  OrderCreatePayload,
  RequestToPayResult,
  RequestToPayStatusResult,
} from '@/types';

function requireSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
}

export async function requestToPay(args: OrderCreatePayload) {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<RequestToPayResult>('payment-collection', {
    body: {
      action: 'requestToPay',
      ...args,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.ok) {
    throw new Error(data?.message ?? 'Failed to initiate Mobile Money payment');
  }

  return data;
}

export async function getRequestToPayStatus(referenceId: string) {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<RequestToPayStatusResult>('payment-collection', {
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

export async function initiatePayment(orderId: string, phone?: string) {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<RequestToPayResult>('payment-collection', {
    body: {
      action: 'initiatePayment',
      orderId,
      phone,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.ok) {
    throw new Error(data?.message ?? 'Failed to initiate Mobile Money payment');
  }

  return data;
}

export async function createCashOrder(args: OrderCreatePayload) {
  const client = requireSupabaseClient();
  const { data, error } = await client.functions.invoke<CreateCashOrderResult>('payment-collection', {
    body: {
      action: 'createCashOrder',
      ...args,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.ok) {
    throw new Error('Failed to create cash-on-pickup order');
  }

  return data;
}
