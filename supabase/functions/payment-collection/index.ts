import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

// 1. Inlined CORS headers (Removes reliance on external files)
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

type AuthenticatedUser = {
  id: string;
  email: string | null;
};

type RequestBody = | RequestToPayBody | CreateCashOrderBody | StatusBody;

const baseUrl = 'https://payments.paypack.rw/api';

// Helper for JSON responses
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

// Phone normalization logic
function normalizeRwPhoneNumber(rawNumber: string) {
  const digits = rawNumber.replace(/\D/g, '');
  if (digits.startsWith('250') && digits.length === 12) return `0${digits.slice(3)}`;
  if (digits.startsWith('0') && digits.length === 10) return digits;
  if (digits.length === 9 && digits.startsWith('7')) return `0${digits}`;
  return digits;
}

// --- Helper Functions (Moved up to be available in Deno.serve) ---

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

async function insertOrder(payload: RequestToPayBody, user: AuthenticatedUser, referenceId: string, status: string, supabaseAdmin: any) {
  const receiver = Deno.env.get('PAYPACK_RECEIVER_NUMBER') ?? '';
  const amount = payload.paymentAmountRwf ?? payload.totalRwf;

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
    p_momo_external_id: referenceId,
    p_momo_account_holder_status: 'active',
    p_momo_status: status.toUpperCase(),
    p_payment_provider: 'paypack',
    p_payment_payload: { provider: 'paypack', receiver, paymentAmountRwf: amount },
  });

  if (error || !data) throw new Error(`DB Error: ${error?.message}`);
  return data;
}

async function requestToPay(payload: RequestToPayBody, user: AuthenticatedUser, supabaseAdmin: any) {
  const accessToken = await createAccessToken();
  const amount = payload.paymentAmountRwf ?? payload.totalRwf;

  const response = await fetch(`${baseUrl}/transactions/cashin`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, number: normalizeRwPhoneNumber(payload.checkout.phone) }),
  });

  const responseData = await response.json();
  if (!response.ok) return { ok: false, status: response.status, message: responseData?.message };

  const orderId = await insertOrder(payload, user, responseData.ref, responseData.status, supabaseAdmin);
  return { ok: true, orderId, referenceId: responseData.ref };
}

async function createCashOrder(payload: CreateCashOrderBody, user: AuthenticatedUser, supabaseAdmin: any) {
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
    p_payment_provider: 'cash-on-pickup',
    p_payment_payload: { mode: 'cash-on-pickup' },
  });

  if (error || !data) throw new Error(`DB Error: ${error?.message}`);
  return data;
}

async function getRequestToPayStatus(referenceId: string, user: AuthenticatedUser, supabaseAdmin: any) {
  // Check ownership
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
  
  // Update DB
  await supabaseAdmin.from('orders').update({
    momo_status: status.toUpperCase(),
    payment_status: status.toLowerCase() === 'success' ? 'paid' : 'pending',
    paid_at: status.toLowerCase() === 'success' ? new Date().toISOString() : null,
  }).eq('momo_reference', referenceId);

  return { ok: true, status: response.status, payload: { status: status.toUpperCase(), ...payload } };
}

// --- Main Handler ---
Deno.serve(async (request) => {
  // 1. Handle CORS preflight IMMEDIATELY
  if (request.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    // 2. Safely initialize constants inside the handler
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
        return jsonResponse(result, result.ok ? 200 : result.status);
      }
      case 'createCashOrder': {
        const user = await getAuthenticatedUser(request, supabaseAdmin);
        const orderId = await createCashOrder(body, user, supabaseAdmin);
        return jsonResponse({ ok: true, orderId }, 201);
      }
      case 'getRequestToPayStatus': {
        const user = await getAuthenticatedUser(request, supabaseAdmin);
        const result = await getRequestToPayStatus(body.referenceId, user, supabaseAdmin);
        return jsonResponse(result, result.ok ? 200 : result.status);
      }
      default:
        return jsonResponse({ error: 'Unsupported action' }, 400);
    }
  } catch (error) {
    console.error('Function error:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});
