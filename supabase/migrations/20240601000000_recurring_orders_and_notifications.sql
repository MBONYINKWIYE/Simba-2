-- ============================================================
-- Phase 4: Recurring Orders Engine + Notifications
-- ============================================================

-- 1. Update create_order_with_inventory to accept recurrence params
drop function if exists public.create_order_with_inventory(
  uuid, text, uuid, timestamptz, text, text, text, text, text, text, text, integer, integer, integer, integer, text, jsonb, text, text, text, text, text, jsonb
);

create or replace function public.create_order_with_inventory(
  p_user_id uuid,
  p_user_email text,
  p_shop_id uuid,
  p_pickup_time timestamptz,
  p_full_name text,
  p_phone text,
  p_delivery_address text,
  p_payment_method text,
  p_payment_status text,
  p_status text,
  p_fulfillment_status text,
  p_subtotal_rwf integer,
  p_delivery_fee_rwf integer,
  p_service_fee_rwf integer,
  p_total_rwf integer,
  p_notes text,
  p_items jsonb,
  p_momo_reference text default null,
  p_momo_external_id text default null,
  p_momo_account_holder_status text default null,
  p_momo_status text default null,
  p_payment_provider text default 'paypack',
  p_payment_payload jsonb default '{}'::jsonb,
  p_recurrence text default 'one_time',
  p_next_delivery_date timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  created_order_id uuid;
  item_count integer;
begin
  if not exists (select 1 from public.shops where id = p_shop_id) then
    raise exception 'Selected shop does not exist';
  end if;

  if p_pickup_time is null then
    raise exception 'Pickup time is required';
  end if;

  select count(*)
  into item_count
  from jsonb_to_recordset(p_items) as item("productId" bigint, "productName" text, quantity integer, "unitPriceRwf" integer);

  if coalesce(item_count, 0) = 0 then
    raise exception 'Cannot create an order without items';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item("productId" bigint, "productName" text, quantity integer, "unitPriceRwf" integer)
    where quantity <= 0
  ) then
    raise exception 'Order item quantities must be positive';
  end if;

  perform 1
  from public.inventory inv
  join jsonb_to_recordset(p_items) as item("productId" bigint, "productName" text, quantity integer, "unitPriceRwf" integer)
    on item."productId" = inv.product_id
  where inv.shop_id = p_shop_id
  for update;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item("productId" bigint, "productName" text, quantity integer, "unitPriceRwf" integer)
    left join public.inventory inv
      on inv.shop_id = p_shop_id
      and inv.product_id = item."productId"
    where inv.id is null or inv.quantity < item.quantity
  ) then
    raise exception 'Selected shop no longer has enough inventory to fulfill this order';
  end if;

  insert into public.orders (
    user_id,
    shop_id,
    assigned_staff_user_id,
    user_email,
    full_name,
    phone,
    delivery_address,
    pickup_time,
    payment_method,
    payment_status,
    status,
    fulfillment_status,
    subtotal_rwf,
    delivery_fee_rwf,
    service_fee_rwf,
    total_rwf,
    notes,
    momo_reference,
    momo_external_id,
    momo_account_holder_status,
    momo_status,
    payment_provider,
    payment_payload,
    recurrence,
    next_delivery_date
  )
  values (
    p_user_id,
    p_shop_id,
    null,
    p_user_email,
    p_full_name,
    p_phone,
    p_delivery_address,
    p_pickup_time,
    p_payment_method,
    p_payment_status,
    p_status,
    p_fulfillment_status,
    p_subtotal_rwf,
    p_delivery_fee_rwf,
    p_service_fee_rwf,
    p_total_rwf,
    p_notes,
    p_momo_reference,
    p_momo_external_id,
    p_momo_account_holder_status,
    p_momo_status,
    p_payment_provider,
    coalesce(p_payment_payload, '{}'::jsonb),
    p_recurrence,
    p_next_delivery_date
  )
  returning id into created_order_id;

  insert into public.order_items (order_id, product_id, product_name, quantity, unit_price_rwf)
  select created_order_id,
    item."productId",
    item."productName",
    item.quantity,
    item."unitPriceRwf"
  from jsonb_to_recordset(p_items) as item("productId" bigint, "productName" text, quantity integer, "unitPriceRwf" integer);

  update public.inventory inv
  set quantity = inv.quantity - item.quantity,
    updated_at = now()
  from jsonb_to_recordset(p_items) as item("productId" bigint, "productName" text, quantity integer, "unitPriceRwf" integer)
  where inv.shop_id = p_shop_id
    and inv.product_id = item."productId";

  insert into public.inventory_history (
    shop_id,
    product_id,
    operation_type,
    quantity_change,
    previous_quantity,
    total_quantity,
    order_id
  )
  select
    p_shop_id,
    inv.product_id,
    'sale',
    -item.quantity,
    inv.quantity + item.quantity,
    inv.quantity,
    created_order_id
  from public.inventory inv
  join jsonb_to_recordset(p_items) as item("productId" bigint, "productName" text, quantity integer, "unitPriceRwf" integer)
    on inv.product_id = item."productId"
  where inv.shop_id = p_shop_id;

  return created_order_id;
end
$$;

-- 2. Create notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_unread on public.notifications(user_id, is_read);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Service role can insert notifications"
  on public.notifications for insert
  with check (true);

-- 3. Cancel order recurrence RPC
create or replace function public.cancel_order_recurrence(
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.orders
  set recurrence = 'one_time',
      next_delivery_date = null
  where id = p_order_id
    and user_id = auth.uid();
end
$$;
