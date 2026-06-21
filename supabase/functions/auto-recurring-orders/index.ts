import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function computeNextDeliveryDate(currentDate: string, recurrence: string): string | null {
  if (recurrence === 'one_time') return null;
  const base = new Date(currentDate);
  const next = new Date(base);
  switch (recurrence) {
    case 'weekly': next.setDate(next.getDate() + 7); break;
    case 'bi_weekly': next.setDate(next.getDate() + 14); break;
    case 'monthly': next.setMonth(next.getMonth() + 1); break;
    default: return null;
  }
  return next.toISOString();
}

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase environment variables.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Find due recurring orders
    const now = new Date().toISOString();
    const { data: dueOrders, error: queryError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        user_email,
        shop_id,
        full_name,
        phone,
        delivery_address,
        pickup_time,
        payment_method,
        subtotal_rwf,
        delivery_fee_rwf,
        service_fee_rwf,
        total_rwf,
        notes,
        recurrence,
        next_delivery_date,
        order_items(id, product_id, product_name, quantity, unit_price_rwf)
      `)
      .lte('next_delivery_date', now)
      .neq('recurrence', 'one_time')
      .eq('payment_status', 'paid');

    if (queryError) {
      throw new Error(`Query error: ${queryError.message}`);
    }

    if (!dueOrders || dueOrders.length === 0) {
      return jsonResponse({ ok: true, processed: 0, message: 'No due recurring orders found' });
    }

    let processed = 0;
    const results: { parentId: string; newOrderId: string }[] = [];

    for (const order of dueOrders) {
      try {
        // 2. Compute next delivery date for the new order
        const newPickupTime = order.next_delivery_date
          ? new Date(order.next_delivery_date).toISOString()
          : new Date().toISOString();

        // 3. Clone the order items into the RPC format
        const items = order.order_items.map((item: { product_id: number; product_name: string; quantity: number; unit_price_rwf: number }) => ({
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPriceRwf: item.unit_price_rwf,
        }));

        // 4. Compute the next delivery date for the PARENT (next occurrence after this one)
        const parentNextDate = order.next_delivery_date
          ? computeNextDeliveryDate(order.next_delivery_date, order.recurrence)
          : null;

        // 5. Create the new order via RPC
        const { data: newOrderId, error: createError } = await supabase.rpc('create_order_with_inventory', {
          p_user_id: order.user_id,
          p_user_email: order.user_email ?? '',
          p_shop_id: order.shop_id,
          p_pickup_time: newPickupTime,
          p_full_name: order.full_name,
          p_phone: order.phone,
          p_delivery_address: order.delivery_address,
          p_payment_method: order.payment_method,
          p_payment_status: 'pending',
          p_status: 'pending',
          p_fulfillment_status: 'pending',
          p_subtotal_rwf: order.subtotal_rwf,
          p_delivery_fee_rwf: order.delivery_fee_rwf,
          p_service_fee_rwf: order.service_fee_rwf,
          p_total_rwf: order.total_rwf,
          p_notes: `${order.notes ?? ''} [Auto-generated recurring order]`,
          p_items: items,
          p_momo_reference: null,
          p_momo_external_id: null,
          p_momo_account_holder_status: null,
          p_momo_status: null,
          p_payment_provider: order.payment_method === 'momo' ? 'manual-momo' : 'cash-on-pickup',
          p_payment_payload: {},
          p_recurrence: 'one_time',
          p_next_delivery_date: null,
        });

        if (createError) {
          console.error(`Failed to create recurring order for parent ${order.id}: ${createError.message}`);
          continue;
        }

        // 6. Update parent order's next_delivery_date
        const { error: updateError } = await supabase
          .from('orders')
          .update({ next_delivery_date: parentNextDate })
          .eq('id', order.id);

        if (updateError) {
          console.error(`Failed to update next_delivery_date for parent ${order.id}: ${updateError.message}`);
        }

        // 7. Insert notification for the user
        const recurrenceLabel = order.recurrence.replace('_', ' ');
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: order.user_id,
            title: 'Recurring order placed',
            body: `Your ${recurrenceLabel} order has been automatically placed.`,
            link: `/orders`,
          });

        if (notifError) {
          console.error(`Failed to insert notification for user ${order.user_id}: ${notifError.message}`);
        }

        processed++;
        results.push({ parentId: order.id, newOrderId: newOrderId as string });
      } catch (err) {
        console.error(`Error processing order ${order.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return jsonResponse({
      ok: true,
      processed,
      total: dueOrders.length,
      results,
    });
  } catch (error) {
    console.error('Function error:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }
});
