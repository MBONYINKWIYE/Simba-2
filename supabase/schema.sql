create extension if not exists pg_trgm;

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

create index if not exists catalog_products_category_idx on public.catalog_products (category_name);
create index if not exists catalog_products_price_idx on public.catalog_products (price_rwf);
create index if not exists catalog_products_in_stock_idx on public.catalog_products (in_stock);
create index if not exists catalog_products_search_idx on public.catalog_products using gin (normalized_name gin_trgm_ops);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  delivery_address text not null,
  payment_method text not null check (payment_method in ('momo', 'cash')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
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

alter table public.catalog_products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Public read access to products" on public.catalog_products;
create policy "Public read access to products"
on public.catalog_products
for select
to anon, authenticated
using (true);

drop policy if exists "Service role manages orders" on public.orders;
create policy "Service role manages orders"
on public.orders
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role manages order items" on public.order_items;
create policy "Service role manages order items"
on public.order_items
for all
to service_role
using (true)
with check (true);
