-- Create notifications table if it doesn't exist yet
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable RLS but allow all authenticated users to read their own, and security definer functions to insert
alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Add customer notification when order status changes
-- This replaces the update_shop_order_status function to insert a notification
-- into the public.notifications table whenever an order status is updated.

create or replace function public.update_shop_order_status(
  target_order_id uuid,
  next_status text,
  rejection_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_order public.orders;
  actor_role text;
  notification_title text;
  notification_body text;
begin
  if next_status not in ('pending', 'accepted', 'preparing', 'ready', 'picked_up', 'rejected', 'out_for_delivery', 'delivered') then
    raise exception 'Invalid order status';
  end if;

  if next_status = 'rejected' and coalesce(nullif(trim(rejection_note), ''), '') = '' then
    raise exception 'Rejection reason is required';
  end if;

  select *
  into target_order
  from public.orders
  where id = target_order_id;

  if target_order.id is null then
    raise exception 'Order not found';
  end if;

  if public.is_super_admin() then
    update public.orders
    set
      status = next_status,
      rejection_reason = case
        when next_status = 'rejected' then trim(rejection_note)
        when next_status = 'accepted' then null
        else rejection_reason
      end
    where id = target_order_id
    returning * into target_order;

    notification_title := case next_status
      when 'accepted' then 'Order Accepted'
      when 'preparing' then 'Preparing'
      when 'ready' then 'Ready for Pickup'
      when 'picked_up' then 'Picked Up'
      when 'out_for_delivery' then 'Out for Delivery'
      when 'delivered' then 'Delivered'
      when 'rejected' then 'Order Rejected'
      else next_status
    end;
    notification_body := 'Your order #' || substr(target_order.id::text, 1, 8) || ' is now: ' || notification_title;
    insert into public.notifications (user_id, title, body, link)
    values (target_order.user_id, notification_title, notification_body, '/orders/' || target_order.id);

    return target_order;
  end if;

  select role
  into actor_role
  from public.shop_admins
  where user_id = auth.uid()
    and shop_id = target_order.shop_id
  limit 1;

  if actor_role in ('admin', 'manager') then
    update public.orders
    set
      status = next_status,
      rejection_reason = case
        when next_status = 'rejected' then trim(rejection_note)
        when next_status = 'accepted' then null
        else rejection_reason
      end,
      fulfillment_status = case
        when next_status = 'accepted' then 'confirmed'
        when next_status = 'preparing' then 'processing'
        when next_status = 'picked_up' then 'delivered'
        when next_status = 'out_for_delivery' then 'processing'
        when next_status = 'delivered' then 'delivered'
        when next_status = 'rejected' then 'cancelled'
        else fulfillment_status
      end,
      payment_status = case
        when next_status = 'rejected' then 'failed'
        else payment_status
      end,
      paid_at = case
        when next_status = 'rejected' then null
        else paid_at
      end
    where id = target_order_id
    returning * into target_order;

    notification_title := case next_status
      when 'accepted' then 'Order Accepted'
      when 'preparing' then 'Preparing'
      when 'ready' then 'Ready for Pickup'
      when 'picked_up' then 'Picked Up'
      when 'out_for_delivery' then 'Out for Delivery'
      when 'delivered' then 'Delivered'
      when 'rejected' then 'Order Rejected'
      else next_status
    end;
    notification_body := 'Your order #' || substr(target_order.id::text, 1, 8) || ' is now: ' || notification_title;
    insert into public.notifications (user_id, title, body, link)
    values (target_order.user_id, notification_title, notification_body, '/orders/' || target_order.id);

    return target_order;
  end if;

  if actor_role = 'staff'
    and target_order.assigned_staff_user_id = auth.uid()
    and next_status in ('preparing', 'ready', 'picked_up') then
    update public.orders
    set
      status = next_status,
      fulfillment_status = case
        when next_status = 'picked_up' then 'delivered'
        else 'processing'
      end
    where id = target_order_id
    returning * into target_order;

    notification_title := case next_status
      when 'preparing' then 'Preparing'
      when 'ready' then 'Ready for Pickup'
      when 'picked_up' then 'Picked Up'
      else next_status
    end;
    notification_body := 'Your order #' || substr(target_order.id::text, 1, 8) || ' is now: ' || notification_title;
    insert into public.notifications (user_id, title, body, link)
    values (target_order.user_id, notification_title, notification_body, '/orders/' || target_order.id);

    return target_order;
  end if;

  raise exception 'You do not have permission to update this order status';
end
$$;
