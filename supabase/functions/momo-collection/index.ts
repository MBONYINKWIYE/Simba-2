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
    paymentMethod: 'momo';
  };
  items: CheckoutItem[];
  subtotalRwf: number;
  deliveryFeeRwf: number;
  serviceFeeRwf: number;
  totalRwf: number;
};

type CreateCashOrderBody = {
  action: 'createCashOrder';
  checkout: {
    fullName: string;
    phone: string;
    address: string;
    notes?: string;
    paymentMethod: 'cash';
  };
  items: CheckoutItem[];
  subtotalRwf: number;
  deliveryFeeRwf: number;
  serviceFeeRwf: number;
  totalRwf: number;
};

type StatusBody = {
  action: 'getRequestToPayStatus';
  referenceId: string;
};

type ValidateBody = {
  action: 'validateAccountHolder';
  phone: string;
};

type RegisterNotificationBody = {
  action: 'registerDeliveryNotification';
  referenceId: string;
  callbackUrl?: string;
};

type RequestBody =
  | RequestToPayBody
  | CreateCashOrderBody
  | StatusBody
  | ValidateBody
  | RegisterNotificationBody;

type MomoStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED';

const baseUrl = Deno.env.get('MTN_MOMO_BASE_URL') ?? 'https://sandbox.momodeveloper.mtn.com';
const targetEnvironment = Deno.env.get('MTN_MOMO_TARGET_ENVIRONMENT') ?? 'sandbox';
const callbackUrl = Deno.env.get('MTN_MOMO_CALLBACK_URL') ?? '';
const collectionSubscriptionKey = Deno.env.get('MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY') ?? '';
const apiUser = Deno.env.get('MTN_MOMO_API_USER') ?? '';
const apiKey = Deno.env.get('MTN_MOMO_API_KEY') ?? '';
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase runtime environment for Edge Function');
}

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

function requireConfig() {
  const missing = [
    ['MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY', collectionSubscriptionKey],
    ['MTN_MOMO_API_USER', apiUser],
    ['MTN_MOMO_API_KEY', apiKey],
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Missing MTN MoMo configuration: ${missing.map(([name]) => name).join(', ')}`);
  }
}

async function createAccessToken() {
  requireConfig();
  const basicAuth = btoa(`${apiUser}:${apiKey}`);
  const response = await fetch(`${baseUrl}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Ocp-Apim-Subscription-Key': collectionSubscriptionKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create MTN access token: ${response.status} ${errorText}`);
  }

  const json = await response.json();
  const accessToken = json.access_token as string | undefined;

  if (!accessToken) {
    throw new Error('MTN token response did not include access_token');
  }

  return accessToken;
}

async function validateAccountHolder(phone: string) {
  const accessToken = await createAccessToken();
  const response = await fetch(
    `${baseUrl}/collection/v1_0/accountholder/msisdn/${encodeURIComponent(phone)}/active`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Target-Environment': targetEnvironment,
        'Ocp-Apim-Subscription-Key': collectionSubscriptionKey,
      },
    },
  );

  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    body: text ? JSON.parse(text) : null,
  };
}

async function insertOrder(payload: RequestToPayBody, referenceId: string, externalId: string, accountHolderStatus: string) {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .insert({
      full_name: payload.checkout.fullName,
      phone: payload.checkout.phone,
      delivery_address: payload.checkout.address,
      payment_method: payload.checkout.paymentMethod,
      payment_status: 'pending',
      subtotal_rwf: payload.subtotalRwf,
      delivery_fee_rwf: payload.deliveryFeeRwf,
      service_fee_rwf: payload.serviceFeeRwf,
      total_rwf: payload.totalRwf,
      notes: payload.checkout.notes ?? null,
      momo_reference: referenceId,
      momo_external_id: externalId,
      momo_account_holder_status: accountHolderStatus,
      momo_status: 'PENDING',
    })
    .select('id')
    .single();

  if (error || !order) {
    throw new Error(`Failed to insert order: ${error?.message ?? 'unknown'}`);
  }

  const { error: itemsError } = await supabaseAdmin.from('order_items').insert(
    payload.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price_rwf: item.unitPriceRwf,
    })),
  );

  if (itemsError) {
    throw new Error(`Failed to insert order items: ${itemsError.message}`);
  }

  return order.id as string;
}

async function createCashOrder(payload: CreateCashOrderBody) {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .insert({
      full_name: payload.checkout.fullName,
      phone: payload.checkout.phone,
      delivery_address: payload.checkout.address,
      payment_method: payload.checkout.paymentMethod,
      payment_status: 'pending',
      subtotal_rwf: payload.subtotalRwf,
      delivery_fee_rwf: payload.deliveryFeeRwf,
      service_fee_rwf: payload.serviceFeeRwf,
      total_rwf: payload.totalRwf,
      notes: payload.checkout.notes ?? null,
      momo_status: null,
      payment_payload: {
        mode: 'cash-on-delivery',
      },
    })
    .select('id')
    .single();

  if (error || !order) {
    throw new Error(`Failed to insert cash order: ${error?.message ?? 'unknown'}`);
  }

  const { error: itemsError } = await supabaseAdmin.from('order_items').insert(
    payload.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit_price_rwf: item.unitPriceRwf,
    })),
  );

  if (itemsError) {
    throw new Error(`Failed to insert cash order items: ${itemsError.message}`);
  }

  return order.id as string;
}

async function updateOrderStatus(referenceId: string, status: string, providerPayload: unknown) {
  const normalizedStatus = status.toUpperCase();
  const paymentStatus = normalizedStatus === 'SUCCESSFUL' ? 'paid' : normalizedStatus === 'FAILED' ? 'failed' : 'pending';

  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      momo_status: normalizedStatus,
      payment_status: paymentStatus,
      payment_payload: providerPayload,
      paid_at: normalizedStatus === 'SUCCESSFUL' ? new Date().toISOString() : null,
    })
    .eq('momo_reference', referenceId);

  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }
}

async function requestToPay(payload: RequestToPayBody) {
  const validation = await validateAccountHolder(payload.checkout.phone);
  const accountHolderStatus = validation.ok ? 'active' : 'unknown';

  const accessToken = await createAccessToken();
  const referenceId = crypto.randomUUID();
  const externalId = crypto.randomUUID();

  const requestBody = {
    amount: payload.totalRwf.toString(),
    currency: 'RWF',
    externalId,
    payer: {
      partyIdType: 'MSISDN',
      partyId: payload.checkout.phone,
    },
    payerMessage: `Simba order payment for ${payload.checkout.fullName}`,
    payeeNote: `Simba supermarket order ${externalId}`,
  };

  const headers: HeadersInit = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Reference-Id': referenceId,
    'X-Target-Environment': targetEnvironment,
    'Ocp-Apim-Subscription-Key': collectionSubscriptionKey,
  };

  if (callbackUrl) {
    headers['X-Callback-Url'] = callbackUrl;
  }

  const response = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  const providerPayload = responseText ? safeJsonParse(responseText) : null;

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: 'MTN requestToPay failed',
      providerPayload,
    };
  }

  const orderId = await insertOrder(payload, referenceId, externalId, accountHolderStatus);

  return {
    ok: true,
    status: response.status,
    orderId,
    referenceId,
    externalId,
    accountHolderStatus,
    providerPayload,
  };
}

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    return { raw: input };
  }
}

async function getRequestToPayStatus(referenceId: string) {
  const accessToken = await createAccessToken();
  const response = await fetch(`${baseUrl}/collection/v1_0/requesttopay/${referenceId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Target-Environment': targetEnvironment,
      'Ocp-Apim-Subscription-Key': collectionSubscriptionKey,
    },
  });

  const text = await response.text();
  const payload = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      payload,
    };
  }

  const status = (payload?.status as MomoStatus | undefined) ?? 'PENDING';
  await updateOrderStatus(referenceId, status, payload);

  return {
    ok: true,
    status: response.status,
    payload,
  };
}

async function registerDeliveryNotification(referenceId: string, explicitCallbackUrl?: string) {
  const accessToken = await createAccessToken();
  const notifyUrl = explicitCallbackUrl ?? callbackUrl;

  if (!notifyUrl) {
    throw new Error('No callback URL configured for delivery notification');
  }

  const response = await fetch(
    `${baseUrl}/collection/v1_0/requesttopay/${referenceId}/deliverynotification`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Target-Environment': targetEnvironment,
        'Ocp-Apim-Subscription-Key': collectionSubscriptionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ callbackUrl: notifyUrl }),
    },
  );

  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    payload: text ? safeJsonParse(text) : null,
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await request.json()) as RequestBody;

    switch (body.action) {
      case 'validateAccountHolder': {
        const result = await validateAccountHolder(body.phone);
        return jsonResponse(result, result.ok ? 200 : result.status);
      }
      case 'requestToPay': {
        const result = await requestToPay(body);
        return jsonResponse(result, result.ok ? 202 : result.status);
      }
      case 'createCashOrder': {
        const orderId = await createCashOrder(body);
        return jsonResponse({ ok: true, orderId }, 201);
      }
      case 'getRequestToPayStatus': {
        const result = await getRequestToPayStatus(body.referenceId);
        return jsonResponse(result, result.ok ? 200 : result.status);
      }
      case 'registerDeliveryNotification': {
        const result = await registerDeliveryNotification(body.referenceId, body.callbackUrl);
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
