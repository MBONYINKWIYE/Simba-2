import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

// 1. Inlined CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
  paymentAmountRwf?: number;
  paymentPlan?: 'momo' | 'cash-on-pickup';
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

type InitiatePaymentBody = {
  action: 'initiatePayment';
  orderId: string;
  phone?: string; // Optional: allow paying with a different number
};

type AuthenticatedUser = {
  id: string;
  email: string | null;
};

type RequestBody = | RequestToPayBody | CreateCashOrderBody | StatusBody | InitiatePaymentBody;

const baseUrl = 'https://payments.paypack.rw/api';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizeRwPhoneNumber(rawNumber: string) {
  const digits = rawNumber.replace(/\D/g, '');
  if (digits.startsWith('250') && digits.length === 12) return `0${digits.slice(3)}`;
  if (digits.startsWith('0') && digits.length === 10) return digits;
  if (digits.length === 9 && digits.startsWith('7')) return `0${digits}`;
  return digits;
}

async function createAccessToken() {
  const clientId = Deno.env.get('PAYPACK_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('PAYPACK_CLIENT_SECRET') ?? '';
  if (!clientId || !clientSecret) throw new Error('Missing Paypack credentials');

  const response = await fetch(`${baseUrl}/auth/agents/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });

  if (!response.ok) throw new Error('Paypack auth failed');
  const json = await response.json();
  return json.access as string;
}

async function getAuthenticatedUser(request: Request, supabaseAdmin: any): Promise<AuthenticatedUser> {
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Auth token missing');

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid user token');

  return { id: data.user.id, email: data.user.email ?? null };
}

async function insertOrder(
  payload: RequestToPayBody | CreateCashOrderBody,
  user: AuthenticatedUser,
  supabaseAdmin: any,
  momoReference: string | null = null,
  momoStatus: string | null = null
) {
  const receiver = Deno.env.get('PAYPACK_RECEIVER_NUMBER') ?? '';
  const amount = (payload as any).paymentAmountRwf ?? payload.totalRwf;
  const paymentPlan = (payload as any).paymentPlan ?? (payload.checkout.paymentMethod === 'momo' ? 'momo' : 'cash-on-pickup');

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
    p_momo_reference: momoReference,
    p_momo_external_id: momoReference,
    p_momo_account_holder_status: momoReference ? 'active' : null,
    p_momo_status: momoStatus ? momoStatus.toUpperCase() : null,
    p_payment_provider: 'paypack',
    p_payment_payload: { 
      provider: 'paypack', 
      receiver, 
      paymentAmountRwf: amount,
      paymentPlan
    },
  });

  if (error || !data) throw new Error(`DB Error: ${error?.message}`);
  return data;
}

async function requestToPay(payload: RequestToPayBody, user: AuthenticatedUser, supabaseAdmin: any) {
  // 1. Always insert order first so it's in history even if payment initiation fails
  const orderId = await insertOrder(payload, user, supabaseAdmin);
  
  try {
    const accessToken = await createAccessToken();
    const amount = payload.paymentAmountRwf ?? payload.totalRwf;

    const response = await fetch(`${baseUrl}/transactions/cashin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, number: normalizeRwPhoneNumber(payload.checkout.phone) }),
    });

    const responseData = await response.json();
    
    if (response.ok && responseData.ref) {
      // Update order with reference
      await supabaseAdmin.from('orders').update({
        momo_reference: responseData.ref,
        momo_external_id: responseData.ref,
        momo_status: responseData.status?.toUpperCase() ?? 'PENDING',
        momo_account_holder_status: 'active'
      }).eq('id', orderId);

      return { ok: true, orderId, referenceId: responseData.ref };
    } else {
      return { 
        ok: true, // Still true because order was created
        orderId, 
        warning: 'Payment initiation failed, but order was placed. You can pay from your order history.',
        message: responseData?.message 
      };
    }
  } catch (error) {
    return { 
      ok: true, 
      orderId, 
      warning: 'Order placed but payment initiation encountered an error. You can pay from your order history.' 
    };
  }
}

async function initiatePayment(orderId: string, phone: string | undefined, user: AuthenticatedUser, supabaseAdmin: any) {
  // 1. Fetch order details
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single();

  if (orderError || !order) throw new Error('Order not found or unauthorized');
  if (order.payment_status === 'paid') throw new Error('Order is already paid');

  const accessToken = await createAccessToken();
  const paymentPayload = order.payment_payload || {};
  const amount = paymentPayload.paymentAmountRwf ?? order.total_rwf;
  const targetPhone = phone || order.phone;

  const response = await fetch(`${baseUrl}/transactions/cashin`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, number: normalizeRwPhoneNumber(targetPhone) }),
  });

  const responseData = await response.json();
  if (!response.ok) return { ok: false, status: response.status, message: responseData?.message };

  // Update order with new reference
  await supabaseAdmin.from('orders').update({
    momo_reference: responseData.ref,
    momo_external_id: responseData.ref,
    momo_status: responseData.status?.toUpperCase() ?? 'PENDING',
    momo_account_holder_status: 'active',
    payment_method: 'momo' // Ensure method is updated if they switched from cash
  }).eq('id', orderId);

  return { ok: true, orderId, referenceId: responseData.ref };
}

async function getRequestToPayStatus(referenceId: string, user: AuthenticatedUser, supabaseAdmin: any) {
  const { data: order } = await supabaseAdmin.from('orders').select('id').eq('momo_reference', referenceId).eq('user_id', user.id).maybeSingle();
  if (!order) throw new Error('Order not found or unauthorized');

  const accessToken = await createAccessToken();
  const response = await fetch(`${baseUrl}/transactions/find/${referenceId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const payload = await response.json();
  if (!response.ok) return { ok: false, status: response.status, payload };

  const status = payload?.status ?? 'pending';
  
  await supabaseAdmin.from('orders').update({
    momo_status: status.toUpperCase(),
    payment_status: status.toLowerCase() === 'success' ? 'paid' : 'pending',
    paid_at: status.toLowerCase() === 'success' ? new Date().toISOString() : null,
  }).eq('momo_reference', referenceId);

  return { ok: true, status: response.status, payload: { status: status.toUpperCase(), ...payload } };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables.');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const body = (await request.json()) as RequestBody;

    switch (body.action) {
      case 'requestToPay': {
        const user = await getAuthenticatedUser(request, supabaseAdmin);
        const result = await requestToPay(body, user, supabaseAdmin);
        return jsonResponse(result, result.ok ? 200 : 500);
      }
      case 'createCashOrder': {
        const user = await getAuthenticatedUser(request, supabaseAdmin);
        const orderId = await insertOrder(body, user, supabaseAdmin);
        return jsonResponse({ ok: true, orderId }, 201);
      }
      case 'getRequestToPayStatus': {
        const user = await getAuthenticatedUser(request, supabaseAdmin);
        const result = await getRequestToPayStatus(body.referenceId, user, supabaseAdmin);
        return jsonResponse(result, result.ok ? 200 : result.status);
      }
      case 'initiatePayment': {
        const user = await getAuthenticatedUser(request, supabaseAdmin);
        const result = await initiatePayment(body.orderId, body.phone, user, supabaseAdmin);
        return jsonResponse(result, result.ok ? 200 : 400);
      }
      default:
        return jsonResponse({ error: 'Unsupported action' }, 400);
    }
  } catch (error) {
    console.error('Function error:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});
