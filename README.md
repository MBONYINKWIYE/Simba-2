# Simba Supermarket

Simba Supermarket is now a multi-shop grocery storefront with authenticated checkout, MTN MoMo payment support, customer order tracking, and a role-based admin dashboard for shop admins and super admins.

## Reviewer Quick Path

Use this path to verify the judged features quickly without exploring the full repo first:

1. Open the storefront and confirm:
- category browsing
- cart updates
- authenticated checkout
- order history

2. Switch language from the header:
- English
- French
- Kinyarwanda

3. Sign in with a shop admin account and open `/admin`:
- check order summary cards for incoming, preparing, ready, and picked up states
- open an order and update its status
- assign the order to staff
- open the inventory dashboard and confirm add/remove quantity behavior plus history

4. Sign in with a staff account and open `/staff`:
- verify only assigned orders are visible
- mark an assigned order as `preparing`, `ready`, or `picked_up`

5. Sign in with a super admin account and open `/admin?section=team`:
- create shops
- assign admin, manager, or staff roles
- remove existing assignments
- review unassigned staff accounts

## Current Product Scope

The app currently includes:

- Public storefront with category browsing, search, filters, product details, and persistent cart
- Google sign-in with Supabase Auth
- Auth callback flow for web login redirects
- Checkout restricted to authenticated users
- Shop selection at checkout based on cart availability
- Distance-based shop ranking using browser geolocation
- Cash and MTN MoMo checkout flows
- Customer order history with payment and fulfillment status
- Admin login and protected admin routes
- Shop admin dashboard for inventory, order queue, and shop phone updates
- Super admin controls for creating shops and assigning shop admins
- English, French, and Kinyarwanda UI support
- Theme and locale persistence with Zustand

## Stack

- Frontend: Vite, React 19, TypeScript, Tailwind CSS, React Router
- Data fetching and caching: Supabase client and TanStack Query
- State: Zustand
- Auth and database: Supabase Auth, Postgres, Row Level Security, SQL functions
- Payments: Supabase Edge Function for MTN MoMo Collection
- i18n: react-i18next

## Routes

Implemented routes in [src/router.tsx](C:\Users\frank\a2sv_projects\Simba-2\src\router.tsx):

- `/`
- `/products/:slug`
- `/checkout`
- `/orders`
- `/auth/callback`
- `/admin/login`
- `/admin`
- `/admin/orders/:orderId`
- `/staff/login`
- `/staff`
- `/staff/orders/:orderId`

## Auth And Roles

Authentication uses Supabase Google OAuth.

Current role model:

- Customer: signed-in shopper with access to checkout and personal order history
- Shop admin: can manage one or more assigned shops
- Super admin: can manage all shops and assign admins

The current super admin email allowlist is defined in [src/lib/constants.ts](C:\Users\frank\a2sv_projects\Simba-2\src\lib\constants.ts).

Recent auth behavior:

- Logout clears the local Supabase session
- Logout uses global sign-out
- Google sign-in requests account selection so the browser does not silently restore the previous super admin session

## Admin Capabilities

### Shop Admin

- View shop orders
- Update order status from `pending` to `preparing`, `ready`, and `picked_up`
- Manage inventory quantities for assigned shops
- Update shop phone number
- Add and remove staff for their own shop
- View unassigned staff accounts in the team management section

### Super Admin

- Everything a shop admin can do
- Create new shops
- Assign shop admins and managers
- Remove admin, manager, and staff assignments
- View shop admin assignments across all shops
- View and manage data across every shop

## Checkout And Fulfillment Flow

The checkout flow now depends on real shop inventory:

1. The customer signs in with Google.
2. The cart is converted into a payload of product IDs and quantities.
3. Supabase returns shops that can fulfill the entire cart.
4. The frontend ranks those shops by distance when geolocation is available.
5. The customer selects a shop and places the order.
6. Inventory is decremented inside the database transaction that creates the order.

Supported payment methods:

- `momo`
- `cash`

Mobile Money integration uses Paypack and lives in [supabase/functions/payment-collection/index.ts](C:\Users\frank\a2sv_projects\Simba-2\supabase\functions\payment-collection\index.ts).

Frontend payment integration lives in [src/lib/payment.ts](C:\Users\frank\a2sv_projects\Simba-2\src\lib\payment.ts) and [src/pages/checkout-page.tsx](C:\Users\frank\a2sv_projects\Simba-2\src\pages\checkout-page.tsx).

## Database Model

The current schema is in [supabase/schema.sql](C:\Users\frank\a2sv_projects\Simba-2\supabase\schema.sql).

Main tables:

- `catalog_products`
- `shops`
- `shop_admins`
- `inventory`
- `orders`
- `order_items`

Important database behavior already implemented:

- Row Level Security on all main tables
- Helper SQL functions for role checks and shop-scoped access
- Shop availability lookup for a full cart
- Inventory-safe order creation
- Shop admin assignment by email
- Shop inventory upsert and deletion helpers

## Local Development

```bash
npm install
npm run dev
```

If Supabase is not configured, the storefront still runs against the bundled catalog JSON, but authenticated checkout, orders, and admin features will not work.

## Environment Variables

Use [\.env.example](C:\Users\frank\a2sv_projects\Simba-2\.env.example) as the source of truth.

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_AUTH_REDIRECT_URL=http://localhost:5173/auth/callback
SUPABASE_AUTH_CALLBACK_URL=https://your-project-ref.supabase.co/auth/v1/callback
SUPABASE_SERVICE_ROLE_KEY=
PAYPACK_RECEIVER_NUMBER=0791509652
PAYPACK_CLIENT_ID=
PAYPACK_CLIENT_SECRET=
```

Notes:

- `VITE_*` values are exposed to the frontend
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only
- `PAYPACK_RECEIVER_NUMBER` is the merchant number associated with the Paypack account and is used for checkout display and order records
- Paypack secrets belong in Supabase Edge Function secrets, not the frontend

## Setup

### 1. Frontend

```bash
npm install
npm run dev
```

### 2. Supabase Database

1. Create a Supabase project.
2. Run [supabase/schema.sql](C:\Users\frank\a2sv_projects\Simba-2\supabase\schema.sql) in the SQL editor.
3. Enable Google in `Authentication -> Providers`.
4. Add redirect URLs for local and deployed environments, including `/auth/callback`.
5. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the frontend environment.

### 3. Seed Catalog Data

```bash
npm run seed:prepare
npm run seed:supabase
```

This converts `simba_products.json` into the Supabase seed payload and imports it with chunked upserts.

### 4. Deploy The Edge Function

```bash
supabase functions deploy payment-collection
```

Set function secrets:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set PAYPACK_CLIENT_ID=your_client_id
supabase secrets set PAYPACK_CLIENT_SECRET=your_client_secret
```

## Data And Fallback Strategy

- Catalog reads use Supabase when configured
- The app falls back to local JSON catalog data when Supabase is unavailable for storefront browsing
- Locale-specific catalog files can live under `public/catalog/`

Current translated catalog files:

- `public/catalog/simba_products.fr.json`
- `public/catalog/simba_products.rw.json`

## Project Structure

```text
.
|-- public
|   |-- catalog
|   `-- simba_products.json
|-- scripts
|   |-- import-to-supabase.mjs
|   `-- prepare-seed.mjs
|-- src
|   |-- components
|   |-- hooks
|   |-- lib
|   |-- pages
|   |   `-- admin
|   |-- providers
|   |-- store
|   |-- styles
|   |-- types
|   |-- i18n.ts
|   |-- main.tsx
|   `-- router.tsx
|-- supabase
|   |-- functions
|   |   |-- _shared
|   |   |-- catalog-search
|   |   `-- payment-collection
|   |-- seeds
|   `-- schema.sql
|-- .env.example
|-- package.json
`-- README.md
```

## Verification

### Reviewer Checklist

- Buyer flow: add products to cart, sign in, select a shop, and place an order
- Admin flow: review incoming orders, assign staff, and move orders across statuses
- Staff flow: open `/staff` and process only assigned orders
- Inventory flow: use `Add` and `Remove` with an entered quantity and verify inventory history rows
- Team flow: open `/admin?section=team` and verify assignment and removal actions
- Language flow: switch between `en`, `fr`, and `rw` from the header on multiple pages

Last verified in this repo state:

- `npm run build`

The build passed after the latest auth/logout fix and README update.
