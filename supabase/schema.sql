create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create table if not exists public.catalog_products (
  id bigint primary key,
  slug text not null unique,
  name text not null,
  normalized_name text generated always as (lower(name)) stored,
  category_name text not null,
  raw_subcategory_id integer,
  price_rwf integer not null check (price_rwf >= 0),
  in_stock boolean not null default true,
  unit_label text not null default 'Pcs',
  image_url text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.shop_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  unique (user_id, shop_id)
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id bigint not null references public.catalog_products(id) on delete cascade,
  quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (shop_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid references public.shops(id),
  assigned_staff_user_id uuid references auth.users(id) on delete set null,
  user_email text,
  full_name text not null,
  phone text not null,
  delivery_address text not null,
  pickup_time timestamptz,
  payment_method text not null check (payment_method in ('momo', 'cash')),
  payment_status text not null default 'pending',
  status text not null default 'pending',
  fulfillment_status text not null default 'pending',
  subtotal_rwf integer not null,
  delivery_fee_rwf integer not null,
  service_fee_rwf integer not null,
  total_rwf integer not null,
  notes text,
  momo_reference text,
  momo_external_id text,
  momo_account_holder_status text,
  momo_status text,
  payment_provider text not null default 'mtn-momo',
  payment_payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id bigint not null references public.catalog_products(id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_rwf integer not null
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.orders add column if not exists shop_id uuid references public.shops(id);
alter table public.orders add column if not exists assigned_staff_user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists user_email text;
alter table public.orders add column if not exists pickup_time timestamptz;
alter table public.orders add column if not exists payment_status text not null default 'pending';
alter table public.orders add column if not exists status text not null default 'pending';
alter table public.orders add column if not exists fulfillment_status text not null default 'pending';

do $$
begin
  if not exists (select 1 from public.shops) then
    insert into public.shops (name, address, latitude, longitude, phone)
    values ('Simba Kigali Main', 'Kigali City Center, Kigali', -1.9441, 30.0619, '+250788000000');
  end if;
end
$$;

do $$
declare
  default_shop_id uuid;
begin
  select id
  into default_shop_id
  from public.shops
  order by created_at asc
  limit 1;

  update public.orders
  set shop_id = default_shop_id
  where shop_id is null;
end
$$;

update public.orders
set status = case fulfillment_status
  when 'processing' then 'preparing'
  when 'delivered' then 'picked_up'
  else 'pending'
end
where status is null
  or status not in ('pending', 'accepted', 'preparing', 'ready', 'picked_up', 'rejected')
  or (status = 'pending' and fulfillment_status in ('processing', 'delivered'));

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'orders'
      and column_name = 'shop_id'
      and is_nullable = 'YES'
  ) then
    alter table public.orders
      alter column shop_id set not null;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'shop_admins_role_check'
      and conrelid = 'public.shop_admins'::regclass
  ) then
    alter table public.shop_admins drop constraint shop_admins_role_check;
  end if;

  alter table public.shop_admins
    add constraint shop_admins_role_check
    check (role in ('admin', 'manager', 'staff'));

  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_quantity_check'
      and conrelid = 'public.inventory'::regclass
  ) then
    alter table public.inventory
      add constraint inventory_quantity_check
      check (quantity >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_payment_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_payment_status_check
      check (payment_status in ('pending', 'paid', 'failed'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_status_check
      check (status in ('pending', 'accepted', 'preparing', 'ready', 'picked_up', 'rejected'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_fulfillment_status_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_fulfillment_status_check
      check (fulfillment_status in ('pending', 'confirmed', 'processing', 'delivered', 'cancelled'));
  end if;
end
$$;

create index if not exists catalog_products_category_idx on public.catalog_products (category_name);
create index if not exists catalog_products_price_idx on public.catalog_products (price_rwf);
create index if not exists catalog_products_in_stock_idx on public.catalog_products (in_stock);
create index if not exists catalog_products_search_idx on public.catalog_products using gin (normalized_name gin_trgm_ops);
create index if not exists shops_created_at_idx on public.shops (created_at);
create index if not exists shop_admins_user_id_idx on public.shop_admins (user_id);
create index if not exists shop_admins_shop_id_idx on public.shop_admins (shop_id);
create index if not exists inventory_shop_id_idx on public.inventory (shop_id);
create index if not exists inventory_product_id_idx on public.inventory (product_id);
create index if not exists inventory_shop_product_qty_idx on public.inventory (shop_id, product_id, quantity);
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_shop_id_idx on public.orders (shop_id);
create index if not exists orders_assigned_staff_user_id_idx on public.orders (assigned_staff_user_id);
create index if not exists orders_shop_status_created_at_idx on public.orders (shop_id, status, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists reviews_shop_id_idx on public.reviews (shop_id);
create index if not exists reviews_user_id_idx on public.reviews (user_id);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
on public.profiles
for select
to anon, authenticated
using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- Trigger for new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create index if not exists profiles_email_idx on public.profiles (email);

create or replace function public.current_shop_admin_shop_ids()
...
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select shop_id
  from public.shop_admins
  where user_id = auth.uid()
    and role in ('admin', 'manager')
$$;

create or replace function public.current_staff_shop_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select shop_id
  from public.shop_admins
  where user_id = auth.uid()
    and role = 'staff'
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'frankbilled@gmail.com'
$$;

create or replace function public.can_manage_shop(target_shop_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_super_admin()
    or target_shop_id in (select public.current_shop_admin_shop_ids())
$$;

create or replace function public.can_access_order(target_shop_id uuid, target_assigned_staff_user_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_super_admin()
    or target_shop_id in (select public.current_shop_admin_shop_ids())
    or (
      target_shop_id in (select public.current_staff_shop_ids())
      and target_assigned_staff_user_id = auth.uid()
    )
$$;

create or replace function public.create_shop(
  shop_name text,
  shop_address text,
  shop_latitude double precision,
  shop_longitude double precision,
  shop_phone text
)
returns public.shops
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  created_shop public.shops;
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can create shops';
  end if;

  insert into public.shops (name, address, latitude, longitude, phone)
  values (shop_name, shop_address, shop_latitude, shop_longitude, shop_phone)
  returning * into created_shop;

  return created_shop;
end
$$;

create or replace function public.assign_shop_admin(
  admin_email text,
  target_shop_id uuid,
  admin_role text default 'admin'
)
returns public.shop_admins
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
  assignment public.shop_admins;
begin
  if not public.is_super_admin() and not public.can_manage_shop(target_shop_id) then
    raise exception 'Only super admins and shop admins can assign shop team members';
  end if;

  if admin_role not in ('admin', 'manager', 'staff') then
    raise exception 'Invalid shop admin role';
  end if;

  if admin_role in ('admin', 'manager') and not public.is_super_admin() then
    raise exception 'Only super admins can assign admin or manager roles';
  end if;

  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(admin_email)
  limit 1;

  if target_user_id is null then
    raise exception 'No authenticated user exists for %', admin_email;
  end if;

  insert into public.shop_admins (user_id, shop_id, role)
  values (target_user_id, target_shop_id, admin_role)
  on conflict (user_id, shop_id)
  do update set role = excluded.role
  returning * into assignment;

  return assignment;
end
$$;

create or replace function public.list_shop_admin_assignments()
returns table (
  id uuid,
  user_id uuid,
  user_email text,
  shop_id uuid,
  shop_name text,
  role text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select sa.id,
    sa.user_id,
    au.email as user_email,
    sa.shop_id,
    s.name as shop_name,
    sa.role,
    sa.created_at
  from public.shop_admins sa
  join public.shops s on s.id = sa.shop_id
  join auth.users au on au.id = sa.user_id
  where public.is_super_admin()
    or sa.shop_id in (select public.current_shop_admin_shop_ids())
  order by sa.created_at desc
$$;

create or replace function public.update_shop_phone(
  target_shop_id uuid,
  new_phone text
)
returns public.shops
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  updated_shop public.shops;
begin
  if not public.can_manage_shop(target_shop_id) then
    raise exception 'You do not have permission to update this shop';
  end if;

  update public.shops
  set phone = new_phone
  where id = target_shop_id
  returning * into updated_shop;

  if updated_shop.id is null then
    raise exception 'Shop not found';
  end if;

  return updated_shop;
end
$$;

create or replace function public.upsert_inventory_entry(
  target_shop_id uuid,
  target_product_id bigint,
  target_quantity integer
)
returns public.inventory
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  saved_inventory public.inventory;
begin
  if not public.can_manage_shop(target_shop_id) then
    raise exception 'You do not have permission to manage this shop inventory';
  end if;

  if target_quantity < 0 then
    raise exception 'Inventory quantity cannot be negative';
  end if;

  insert into public.inventory (shop_id, product_id, quantity, updated_at)
  values (target_shop_id, target_product_id, target_quantity, now())
  on conflict (shop_id, product_id)
  do update set quantity = excluded.quantity, updated_at = now()
  returning * into saved_inventory;

  return saved_inventory;
end
$$;

create or replace function public.delete_inventory_entry(
  target_inventory_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_shop_id uuid;
begin
  select shop_id
  into target_shop_id
  from public.inventory
  where id = target_inventory_id;

  if target_shop_id is null then
    raise exception 'Inventory entry not found';
  end if;

  if not public.can_manage_shop(target_shop_id) then
    raise exception 'You do not have permission to manage this shop inventory';
  end if;

  delete from public.inventory
  where id = target_inventory_id;
end
$$;

create or replace function public.list_inventory_entries(
  target_shop_id uuid default null
)
returns table (
  inventory_id uuid,
  shop_id uuid,
  shop_name text,
  product_id bigint,
  product_name text,
  quantity integer,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select inv.id as inventory_id,
    inv.shop_id,
    s.name as shop_name,
    inv.product_id,
    cp.name as product_name,
    inv.quantity,
    inv.updated_at
  from public.inventory inv
  join public.shops s on s.id = inv.shop_id
  join public.catalog_products cp on cp.id = inv.product_id
  where (
      public.is_super_admin()
      and (target_shop_id is null or inv.shop_id = target_shop_id)
    )
    or (
      not public.is_super_admin()
      and inv.shop_id in (select public.current_shop_admin_shop_ids())
      and (target_shop_id is null or inv.shop_id = target_shop_id)
    )
  order by s.name, cp.name
$$;

drop function if exists public.get_available_shops_for_cart(jsonb);
create or replace function public.get_available_shops_for_cart(
  cart_items jsonb
)
returns table (
  id uuid,
  name text,
  address text,
  latitude double precision,
  longitude double precision,
  phone text,
  created_at timestamptz,
  available_product_count integer,
  average_rating numeric,
  review_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with input_items as (
    select *
    from jsonb_to_recordset(cart_items) as item("productId" bigint, quantity integer)
  ),
  item_count as (
    select count(*)::integer as total
    from input_items
  ),
  review_summary as (
    select shop_id,
      round(avg(rating)::numeric, 1) as average_rating,
      count(*)::integer as review_count
    from public.reviews
    group by shop_id
  )
  select s.id,
    s.name,
    s.address,
    s.latitude,
    s.longitude,
    s.phone,
    s.created_at,
    count(ii."productId")::integer as available_product_count,
    coalesce(rs.average_rating, 0) as average_rating,
    coalesce(rs.review_count, 0) as review_count
  from public.shops s
  join public.inventory inv on inv.shop_id = s.id
  join input_items ii on ii."productId" = inv.product_id
  cross join item_count ic
  left join review_summary rs on rs.shop_id = s.id
  where inv.quantity >= ii.quantity
  group by s.id, s.name, s.address, s.latitude, s.longitude, s.phone, s.created_at, ic.total, rs.average_rating, rs.review_count
  having count(ii."productId") = ic.total
  order by s.created_at asc
$$;

drop function if exists public.list_shop_review_summary();
create or replace function public.list_shop_review_summary()
returns table (
  shop_id uuid,
  average_rating numeric,
  review_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select shop_id,
    round(avg(rating)::numeric, 1) as average_rating,
    count(*)::integer as review_count
  from public.reviews
  group by shop_id
$$;

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
  p_payment_payload jsonb default '{}'::jsonb
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
    payment_payload
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
    coalesce(p_payment_payload, '{}'::jsonb)
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

  return created_order_id;
end
$$;

create or replace function public.assign_order_to_staff(
  target_order_id uuid,
  target_staff_user_id uuid
)
returns public.orders
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_order public.orders;
  target_role text;
begin
  select *
  into target_order
  from public.orders
  where id = target_order_id;

  if target_order.id is null then
    raise exception 'Order not found';
  end if;

  if not public.can_manage_shop(target_order.shop_id) then
    raise exception 'You do not have permission to assign this order';
  end if;

  select role
  into target_role
  from public.shop_admins
  where user_id = target_staff_user_id
    and shop_id = target_order.shop_id
  limit 1;

  if target_role is distinct from 'staff' then
    raise exception 'Assigned user must be staff for this shop';
  end if;

  update public.orders
  set assigned_staff_user_id = target_staff_user_id
  where id = target_order_id
  returning * into target_order;

  return target_order;
end
$$;

create or replace function public.update_shop_order_status(
  target_order_id uuid,
  next_status text
)
returns public.orders
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_order public.orders;
  actor_role text;
begin
  if next_status not in ('pending', 'accepted', 'preparing', 'ready', 'picked_up', 'rejected') then
    raise exception 'Invalid order status';
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
    set status = next_status
    where id = target_order_id
    returning * into target_order;

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
      fulfillment_status = case
        when next_status = 'accepted' then 'confirmed'
        when next_status = 'preparing' then 'processing'
        when next_status = 'picked_up' then 'delivered'
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

    return target_order;
  end if;

  if actor_role = 'staff' and target_order.assigned_staff_user_id = auth.uid() and next_status = 'ready' then
    update public.orders
    set
      status = next_status,
      fulfillment_status = 'processing'
    where id = target_order_id
    returning * into target_order;

    return target_order;
  end if;

  raise exception 'You do not have permission to update this order status';
end
$$;

create or replace function public.create_review(
  p_order_id uuid,
  p_rating integer,
  p_comment text default null
)
returns public.reviews
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_order public.orders;
  created_review public.reviews;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;

  select *
  into target_order
  from public.orders
  where id = p_order_id
    and user_id = auth.uid();

  if target_order.id is null then
    raise exception 'Order not found';
  end if;

  if target_order.status <> 'picked_up' then
    raise exception 'Reviews are only allowed after pickup';
  end if;

  insert into public.reviews (order_id, user_id, shop_id, rating, comment)
  values (target_order.id, auth.uid(), target_order.shop_id, p_rating, nullif(trim(coalesce(p_comment, '')), ''))
  returning * into created_review;

  return created_review;
end
$$;

alter table public.catalog_products enable row level security;
alter table public.shops enable row level security;
alter table public.shop_admins enable row level security;
alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "Public read access to products" on public.catalog_products;
create policy "Public read access to products"
on public.catalog_products
for select
to anon, authenticated
using (true);

drop policy if exists "Public read access to shops" on public.shops;
create policy "Public read access to shops"
on public.shops
for select
to anon, authenticated
using (true);

drop policy if exists "Shop managers can update own shop" on public.shops;
create policy "Shop managers can update own shop"
on public.shops
for update
to authenticated
using (public.can_manage_shop(id))
with check (public.can_manage_shop(id));

drop policy if exists "Super admins can insert shops" on public.shops;
create policy "Super admins can insert shops"
on public.shops
for insert
to authenticated
with check (public.is_super_admin());

drop policy if exists "Super admins can delete shops" on public.shops;
create policy "Super admins can delete shops"
on public.shops
for delete
to authenticated
using (public.is_super_admin());

drop policy if exists "Service role manages shop admins" on public.shop_admins;
create policy "Service role manages shop admins"
on public.shop_admins
for all
to service_role
using (true)
with check (true);

drop policy if exists "Users can read own shop admin assignment" on public.shop_admins;
create policy "Users can read own shop admin assignment"
on public.shop_admins
for select
to authenticated
using (auth.uid() = user_id or public.is_super_admin() or shop_id in (select public.current_shop_admin_shop_ids()));

drop policy if exists "Super admins manage shop admin assignments" on public.shop_admins;
create policy "Super admins manage shop admin assignments"
on public.shop_admins
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "Service role manages inventory" on public.inventory;
create policy "Service role manages inventory"
on public.inventory
for all
to service_role
using (true)
with check (true);

drop policy if exists "Shop admins can read inventory" on public.inventory;
create policy "Shop admins can read inventory"
on public.inventory
for select
to authenticated
using (public.is_super_admin() or shop_id in (select public.current_shop_admin_shop_ids()));

drop policy if exists "Shop admins can manage inventory" on public.inventory;
create policy "Shop admins can manage inventory"
on public.inventory
for all
to authenticated
using (public.is_super_admin() or shop_id in (select public.current_shop_admin_shop_ids()))
with check (public.is_super_admin() or shop_id in (select public.current_shop_admin_shop_ids()));

drop policy if exists "Service role manages orders" on public.orders;
create policy "Service role manages orders"
on public.orders
for all
to service_role
using (true)
with check (true);

drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
on public.orders
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Shop admins can read assigned shop orders" on public.orders;
create policy "Shop admins can read assigned shop orders"
on public.orders
for select
to authenticated
using (public.can_access_order(shop_id, assigned_staff_user_id));

drop policy if exists "Shop admins can update assigned shop orders" on public.orders;
create policy "Shop admins can update assigned shop orders"
on public.orders
for update
to authenticated
using (public.can_access_order(shop_id, assigned_staff_user_id))
with check (public.can_access_order(shop_id, assigned_staff_user_id));

drop policy if exists "Service role manages order items" on public.order_items;
create policy "Service role manages order items"
on public.order_items
for all
to service_role
using (true)
with check (true);

drop policy if exists "Users can read own order items" on public.order_items;
create policy "Users can read own order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where public.orders.id = public.order_items.order_id
      and public.orders.user_id = auth.uid()
  )
);

drop policy if exists "Shop admins can read assigned shop order items" on public.order_items;
create policy "Shop admins can read assigned shop order items"
on public.order_items
for select
to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.orders
    where public.orders.id = public.order_items.order_id
      and public.can_access_order(public.orders.shop_id, public.orders.assigned_staff_user_id)
  )
);

drop policy if exists "Public read access to reviews" on public.reviews;
create policy "Public read access to reviews"
on public.reviews
for select
to anon, authenticated
using (true);

drop policy if exists "Users can create own reviews" on public.reviews;
create policy "Users can create own reviews"
on public.reviews
for insert
to authenticated
with check (auth.uid() = user_id);

-- Seeding extra shops and inventory
do $$
declare
  main_shop_id uuid;
  other_shop_id uuid;
  prod_id bigint;
begin
  -- Ensure extra shops exist
  if not exists (select 1 from public.shops where name = 'Simba Gikondo') then
    insert into public.shops (name, address, latitude, longitude, phone)
    values ('Simba Gikondo', 'KK 31 St, Gikondo, Kigali', -1.9721, 30.0719, '+250788111111');
  end if;

  if not exists (select 1 from public.shops where name = 'Simba Kimironko') then
    insert into public.shops (name, address, latitude, longitude, phone)
    values ('Simba Kimironko', 'KG 11 St, Kimironko, Kigali', -1.9321, 30.1219, '+250788222222');
  end if;

  -- Get main shop ID
  select id into main_shop_id from public.shops where name = 'Simba Kigali Main' limit 1;

  -- 1. All products for Simba Kigali Main (Large stock)
  for prod_id in select id from public.catalog_products loop
    insert into public.inventory (shop_id, product_id, quantity)
    values (main_shop_id, prod_id, 100)
    on conflict (shop_id, product_id) do update set quantity = 100;
  end loop;

  -- 2. Varied products for other shops (15-40 items per category)
  for other_shop_id in select id from public.shops where id <> main_shop_id loop
    -- Insert roughly 20 random products per shop to simulate varied inventory
    insert into public.inventory (shop_id, product_id, quantity)
    select other_shop_id, id, floor(random() * 26 + 15)::int -- 15 to 40
    from public.catalog_products
    order by random()
    limit 40
    on conflict (shop_id, product_id) do nothing;
  end loop;
end
$$;
