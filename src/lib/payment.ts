import { supabase } from '@/lib/supabase';
import { PAYPACK_RECEIVER_NUMBER } from '@/lib/constants';
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

type CreateManualPaymentOrderArgs = {
  userId: string;
  userEmail: string | null | undefined;
  order: OrderCreatePayload;
};

function encodeUssdCode(ussdCode: string) {
  return ussdCode.replace('#', '%23');
}

export function buildMomoUssdCode(totalAmountRwf: number) {
  return `*182*1*1*${PAYPACK_RECEIVER_NUMBER}*${totalAmountRwf}#`;
}

export function buildMomoDialerUrl(totalAmountRwf: number) {
  return `tel:${encodeUssdCode(buildMomoUssdCode(totalAmountRwf))}`;
}

export function openMomoDialer(totalAmountRwf: number) {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.href = buildMomoDialerUrl(totalAmountRwf);
}

export async function createManualPaymentOrder({ userId, userEmail, order }: CreateManualPaymentOrderArgs) {
  const client = requireSupabaseClient();
  const isMomoOrder = order.checkout.paymentMethod === 'momo';
  const { data, error } = await client.rpc('create_order_with_inventory', {
    p_user_id: userId,
    p_user_email: userEmail ?? '',
    p_shop_id: order.shopId,
    p_pickup_time: order.checkout.pickupTime,
    p_full_name: order.checkout.fullName,
    p_phone: order.checkout.phone,
    p_delivery_address: order.checkout.address,
    p_payment_method: order.checkout.paymentMethod,
    p_payment_status: 'pending',
    p_status: 'pending',
    p_fulfillment_status: 'pending',
    p_subtotal_rwf: order.subtotalRwf,
    p_delivery_fee_rwf: order.deliveryFeeRwf,
    p_service_fee_rwf: order.serviceFeeRwf,
    p_total_rwf: order.totalRwf,
    p_notes: order.checkout.notes,
    p_items: order.items,
    p_momo_reference: null,
    p_momo_external_id: null,
    p_momo_account_holder_status: null,
    p_momo_status: isMomoOrder ? 'manual-pending' : null,
    p_payment_provider: isMomoOrder ? 'manual-momo' : 'cash-on-pickup',
    p_payment_payload: {
      ...(isMomoOrder
        ? {
            collectionMethod: 'ussd',
            receiverNumber: PAYPACK_RECEIVER_NUMBER,
            ussdCode: buildMomoUssdCode(order.totalRwf),
            paymentInstructions: 'Customer completes MoMo payment separately. Shop confirms after receiving payment.',
          }
        : {
            collectionMethod: 'cash-on-pickup',
            paymentInstructions: 'Customer pays at pickup after shop confirmation.',
          }),
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Failed to create order');
  }

  return {
    ok: true,
    orderId: data as string,
  };
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
