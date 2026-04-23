import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from '../_shared/cors.ts';

type CheckoutItem = {
  productId: number;
  productName: string;
  quantity: number;
  unitPriceRwf: number;
};

type RequestToPayBody = {
  action: 'requestToPay';
  checkout: {
    fullName: string;
    phone: string;
    address: string;
    notes?: string;
    pickupTime: string;
    paymentMethod: 'momo';
  };
  items: CheckoutItem[];
  subtotalRwf: number;
  deliveryFeeRwf: number;
  serviceFeeRwf: number;
  totalRwf: number;
  shopId: string;
};

type CreateCashOrderBody = {
  action: 'createCashOrder';
  checkout: {
    fullName: string;
    phone: string;
    address: string;
    notes?: string;
    pickupTime: string;
    paymentMethod: 'cash';
  };
  items: CheckoutItem[];
  subtotalRwf: number;
  deliveryFeeRwf: number;
  serviceFeeRwf: number;
  totalRwf: number;
  shopId: string;
};

type StatusBody = {
  action: 'getRequestToPayStatus';
  referenceId: string;
};

type AuthenticatedUser = {
  id: string;
  email: string | null;
};

type RequestBody =
  | RequestToPayBody
  | CreateCashOrderBody
  | StatusBody;

const baseUrl = 'https://payments.paypack.rw/api';
const clientId = Deno.env.get('PAYPACK_CLIENT_ID') ?? '';
const clientSecret = Deno.env.get('PAYPACK_CLIENT_SECRET') ?? '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function createAccessToken() {
  if (!clientId || !clientSecret) {
    throw new Error('Missing Paypack configuration: PAYPACK_CLIENT_ID or PAYPACK_CLIENT_SECRET');
  }

  const response = await fetch(`${baseUrl}/auth/agents/authorize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Paypack access token: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  return json.access as string;
}

async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser> {
  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    throw new Error('Authentication is required to place an order.');
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    throw new Error('Unable to verify the authenticated user.');
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}

async function assertOrderOwnership(referenceId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('momo_reference', referenceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to verify order ownership: ${error.message}`);
  }

  if (!data) {
    throw new Error('Order not found for the current user.');
  }
}

async function insertOrder(
  payload: RequestToPayBody,
  user: AuthenticatedUser,
  referenceId: string,
  paypackStatus: string,
) {
  const { data, error } = await supabaseAdmin.rpc('create_order_with_inventory', {
    p_user_id: user.id,
    p_user_email: user.email,
    p_shop_id: payload.shopId,
    p_pickup_time: payload.checkout.pickupTime,
    p_full_name: payload.checkout.fullName,
    p_phone: payload.checkout.phone,
    p_delivery_address: payload.checkout.address,
    p_payment_method: payload.checkout.paymentMethod,
    p_payment_status: 'pending',
    p_status: 'pending',
    p_fulfillment_status: 'pending',
    p_subtotal_rwf: payload.subtotalRwf,
    p_delivery_fee_rwf: payload.deliveryFeeRwf,
    p_service_fee_rwf: payload.serviceFeeRwf,
    p_total_rwf: payload.totalRwf,
    p_notes: payload.checkout.notes ?? null,
    p_items: payload.items,
    p_momo_reference: referenceId,
    p_momo_external_id: referenceId, // Paypack uses one ref
    p_momo_account_holder_status: 'active',
    p_momo_status: paypackStatus.toUpperCase(),
    p_payment_provider: 'paypack',
    p_payment_payload: { provider: 'paypack' },
  });

  if (error || !data) {
    throw new Error(`Failed to insert order: ${error?.message ?? 'unknown'}`);
  }

  return data as string;
}

async function createCashOrder(payload: CreateCashOrderBody, user: AuthenticatedUser) {
  const { data, error } = await supabaseAdmin.rpc('create_order_with_inventory', {
    p_user_id: user.id,
    p_user_email: user.email,
    p_shop_id: payload.shopId,
    p_pickup_time: payload.checkout.pickupTime,
    p_full_name: payload.checkout.fullName,
    p_phone: payload.checkout.phone,
    p_delivery_address: payload.checkout.address,
    p_payment_method: payload.checkout.paymentMethod,
    p_payment_status: 'pending',
    p_status: 'pending',
    p_fulfillment_status: 'pending',
    p_subtotal_rwf: payload.subtotalRwf,
    p_delivery_fee_rwf: payload.deliveryFeeRwf,
    p_service_fee_rwf: payload.serviceFeeRwf,
    p_total_rwf: payload.totalRwf,
    p_notes: payload.checkout.notes ?? null,
    p_items: payload.items,
    p_momo_reference: null,
    p_momo_external_id: null,
    p_momo_account_holder_status: null,
    p_momo_status: null,
    p_payment_provider: 'cash',
    p_payment_payload: {
      mode: 'cash-on-delivery',
    },
  });

  if (error || !data) {
    throw new Error(`Failed to insert cash order: ${error?.message ?? 'unknown'}`);
  }

  return data as string;
}

async function updateOrderStatus(referenceId: string, status: string, providerPayload: unknown) {
  const normalizedStatus = status.toLowerCase();
  const paymentStatus = normalizedStatus === 'success' ? 'paid' : normalizedStatus === 'failed' ? 'failed' : 'pending';

  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      momo_status: normalizedStatus.toUpperCase(),
      payment_status: paymentStatus,
      payment_payload: providerPayload,
      paid_at: normalizedStatus === 'success' ? new Date().toISOString() : null,
    })
    .eq('momo_reference', referenceId);

  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }
}

async function requestToPay(payload: RequestToPayBody, user: AuthenticatedUser) {
  const accessToken = await createAccessToken();

  const response = await fetch(`${baseUrl}/transactions/cashin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: payload.totalRwf,
      number: payload.checkout.phone,
    }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: responseData?.message ?? 'Paypack cashin failed',
      providerPayload: responseData,
    };
  }

  const orderId = await insertOrder(payload, user, responseData.ref, responseData.status);

  return {
    ok: true,
    status: response.status,
    orderId,
    referenceId: responseData.ref,
    providerPayload: responseData,
  };
}

async function getRequestToPayStatus(referenceId: string, user: AuthenticatedUser) {
  await assertOrderOwnership(referenceId, user.id);
  const accessToken = await createAccessToken();
  const response = await fetch(`${baseUrl}/transactions/find/${referenceId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      payload,
    };
  }

  const status = payload?.status ?? 'pending';
  await updateOrderStatus(referenceId, status, payload);

  return {
    ok: true,
    status: response.status,
    payload: {
      status: status.toUpperCase() === 'SUCCESS' ? 'SUCCESSFUL' : status.toUpperCase() === 'FAILED' ? 'FAILED' : 'PENDING',
      ...payload
    },
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await request.json()) as RequestBody;

    switch (body.action) {
      case 'requestToPay': {
        const user = await getAuthenticatedUser(request);
        const result = await requestToPay(body, user);
        return jsonResponse(result, result.ok ? 200 : result.status);
      }
      case 'createCashOrder': {
        const user = await getAuthenticatedUser(request);
        const orderId = await createCashOrder(body, user);
        return jsonResponse({ ok: true, orderId }, 201);
      }
      case 'getRequestToPayStatus': {
        const user = await getAuthenticatedUser(request);
        const result = await getRequestToPayStatus(body.referenceId, user);
        return jsonResponse(result, result.ok ? 200 : result.status);
      }
      default:
        return jsonResponse({ error: 'Unsupported action' }, 400);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
