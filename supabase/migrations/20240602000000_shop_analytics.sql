-- ============================================================
-- Phase 5: Admin Analytics Dashboard — get_shop_analytics RPC
-- ============================================================

create or replace function public.get_shop_analytics(
  p_shop_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  result jsonb;
begin
  if p_shop_id is not null and not can_manage_shop(p_shop_id) then
    raise exception 'Access denied';
  end if;

  with filtered_orders as (
    select *
    from public.orders o
    where (p_shop_id is null or o.shop_id = p_shop_id)
  ),
  revenue_stats as (
    select
      coalesce(sum(total_rwf), 0) as total_revenue,
      count(*) as total_orders,
      coalesce(avg(total_rwf), 0)::integer as avg_order_value,
      coalesce(sum(case when payment_status = 'paid' then total_rwf else 0 end), 0) as paid_revenue,
      count(*) filter (where payment_status = 'paid') as paid_orders
    from filtered_orders
  ),
  revenue_by_day as (
    select
      date_trunc('day', created_at)::date as day,
      count(*) as orders,
      coalesce(sum(total_rwf), 0) as revenue
    from filtered_orders
    where created_at >= now() - interval '30 days'
    group by date_trunc('day', created_at)
    order by day
  ),
  orders_by_status as (
    select
      status,
      count(*) as count
    from filtered_orders
    group by status
    order by count desc
  ),
  top_products as (
    select
      oi.product_name,
      sum(oi.quantity) as quantity_sold,
      sum(oi.quantity * oi.unit_price_rwf) as revenue
    from filtered_orders fo
    join public.order_items oi on oi.order_id = fo.id
    group by oi.product_name
    order by quantity_sold desc
    limit 10
  ),
  revenue_by_payment as (
    select
      payment_method,
      count(*) as count,
      coalesce(sum(total_rwf), 0) as revenue
    from filtered_orders
    group by payment_method
  ),
  today_stats as (
    select
      coalesce(sum(total_rwf), 0) as revenue,
      count(*) as orders
    from filtered_orders
    where created_at >= date_trunc('day', now())
  ),
  week_stats as (
    select
      coalesce(sum(total_rwf), 0) as revenue,
      count(*) as orders
    from filtered_orders
    where created_at >= date_trunc('week', now())
  ),
  month_stats as (
    select
      coalesce(sum(total_rwf), 0) as revenue,
      count(*) as orders
    from filtered_orders
    where created_at >= date_trunc('month', now())
  )
  select jsonb_build_object(
    'totalRevenue', (select total_revenue from revenue_stats),
    'totalOrders', (select total_orders from revenue_stats),
    'avgOrderValue', (select avg_order_value from revenue_stats),
    'paidRevenue', (select paid_revenue from revenue_stats),
    'paidOrders', (select paid_orders from revenue_stats),
    'today', jsonb_build_object(
      'revenue', (select revenue from today_stats),
      'orders', (select orders from today_stats)
    ),
    'thisWeek', jsonb_build_object(
      'revenue', (select revenue from week_stats),
      'orders', (select orders from week_stats)
    ),
    'thisMonth', jsonb_build_object(
      'revenue', (select revenue from month_stats),
      'orders', (select orders from month_stats)
    ),
    'revenueByDay', coalesce(
      (select jsonb_agg(jsonb_build_object('day', day, 'orders', orders, 'revenue', revenue) order by day) from revenue_by_day),
      '[]'::jsonb
    ),
    'ordersByStatus', coalesce(
      (select jsonb_agg(jsonb_build_object('status', status, 'count', count)) from orders_by_status),
      '[]'::jsonb
    ),
    'topProducts', coalesce(
      (select jsonb_agg(jsonb_build_object('productName', product_name, 'quantitySold', quantity_sold, 'revenue', revenue)) from top_products),
      '[]'::jsonb
    ),
    'revenueByPayment', coalesce(
      (select jsonb_agg(jsonb_build_object('paymentMethod', payment_method, 'count', count, 'revenue', revenue)) from revenue_by_payment),
      '[]'::jsonb
    )
  ) into result;

  return result;
end
$$;
