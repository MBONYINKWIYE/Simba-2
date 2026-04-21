# Simba Supermarket

Modern e-commerce storefront for Simba Supermarket, built with `Vite + React + TypeScript + Tailwind + Supabase`.

## Stack

- Frontend: Vite, React 19, TypeScript, Tailwind CSS, React Router
- State: Zustand for cart and user preferences
- Data: Supabase Postgres via `@supabase/supabase-js`
- Caching: React Query
- i18n: `react-i18next` for English, French, and Kinyarwanda

## Folder Structure

```text
.
|-- src
|   |-- components
|   |   |-- layout
|   |   |-- shop
|   |   `-- ui
|   |-- hooks
|   |-- lib
|   |-- pages
|   |-- store
|   |-- styles
|   |-- types
|   |-- i18n.ts
|   |-- main.tsx
|   `-- router.tsx
|-- scripts
|   |-- prepare-seed.mjs
|   `-- import-to-supabase.mjs
|-- supabase
|   |-- schema.sql
|   |-- functions
|   |   |-- _shared
|   |   `-- momo-collection
|   `-- seeds
|-- simba_products.json
|-- .env.example
`-- README.md
```

## Database Schema

Use [schema.sql](/C:/Users/frank/a2sv_projects/Simba-2/supabase/schema.sql:1).

- `catalog_products`: denormalized catalog table tuned for fast listing, search, category, and price filtering.
- `orders`: checkout records with mock MoMo/cash payment state.
- `order_items`: snapshot of line items at purchase time.

Why denormalized:

- The source data does not include stable subcategory names, only `subcategoryId`.
- 700+ products do not justify an over-normalized read path for the initial storefront.
- Filtering and search are simpler and faster against a single listing table.

## Import Strategy From JSON

1. Run `npm run seed:prepare`.
2. This converts `simba_products.json` into `supabase/seeds/catalog-products.json`.
3. Create the schema in Supabase SQL editor with `supabase/schema.sql`.
4. Import with `npm run seed:supabase` after setting `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

Import notes:

- The script performs chunked `upsert` calls in batches of 250 rows.
- Product IDs from the dataset are preserved as primary keys.
- Slugs are generated from `name + id` for stable routing.
- Raw `subcategoryId` is preserved in `raw_subcategory_id` for future cleanup or mapping.

## Frontend Implementation

Core user flows already implemented:

- Hero landing section with mobile-first promotional layout
- Product listing grid
- Category-based browsing
- Debounced search
- Filters: category, price ceiling, and stock availability
- Product detail page
- Persistent cart with `localStorage`
- One-page checkout with Supabase Edge Function backed MoMo initiation and status polling
- Google sign-in required for checkout and order history
- Authenticated order history with per-user order/payment status
- Dark mode toggle
- English, French, and Kinyarwanda support
- Route-level lazy loading
- Skeleton loading UI

## State Management

`Zustand` is used for:

- `cart-store.ts`: cart CRUD and persistence
- `preferences-store.ts`: theme and locale persistence
- `ui-store.ts`: cart drawer visibility

This keeps the implementation lighter than Redux Toolkit while still being production-realistic.

## Data Fetching Layer

`src/hooks/use-catalog.ts` uses:

- Supabase client when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present
- Local JSON fallback when env vars are missing or the query fails

That gives a working storefront in local development before backend setup is complete.

### Translated Catalog Files

If you want product text to switch with the selected language, add locale-specific files in `public/catalog/`:

- `public/catalog/simba_products.fr.json`
- `public/catalog/simba_products.rw.json`

Required structure:

- Top-level object with `store` and `products`
- `store` must include `name`, `tagline`, `location`, and `currency`
- `products` must be an array of objects with:
  - `id`
  - `name`
  - `price`
  - `category`
  - `subcategoryId`
  - `inStock`
  - `image`
  - `unit`

Important rules:

- Keep `id` exactly the same as the base `simba_products.json` file
- Keep `price`, `inStock`, `image`, and `subcategoryId` aligned with the base file
- Translate only display fields such as `name`, `category`, `unit`, and optionally `store` text
- Missing locale files automatically fall back to the default `public/simba_products.json`

## MoMo Integration Strategy

Implemented MTN Collection sandbox flow:

- Frontend calls Supabase Edge Function `momo-collection`
- Edge Function gets MTN access token
- Edge Function optionally validates account holder status
- Edge Function calls `requesttopay`
- Frontend polls `requesttopay/{referenceId}`
- Order and payment metadata are stored in `orders` and `order_items`

Supported actions in [supabase/functions/momo-collection/index.ts](/C:/Users/frank/a2sv_projects/Simba-2/supabase/functions/momo-collection/index.ts:1):

- `createAccessToken` against `/collection/token/`
- `validateAccountHolder` against `/collection/v1_0/accountholder/.../active`
- `requestToPay` against `/collection/v1_0/requesttopay`
- `getRequestToPayStatus` against `/collection/v1_0/requesttopay/{referenceId}`
- `registerDeliveryNotification` against `/collection/v1_0/requesttopay/{referenceId}/deliverynotification`

Frontend integration points:

- [src/lib/momo.ts](/C:/Users/frank/a2sv_projects/Simba-2/src/lib/momo.ts:1)
- [src/pages/checkout-page.tsx](/C:/Users/frank/a2sv_projects/Simba-2/src/pages/checkout-page.tsx:1)

## Internationalization

Languages included:

- English: `en`
- French: `fr`
- Kinyarwanda: `rw`

All core shopping surfaces are translated via `src/i18n.ts`.

## Dark Mode

- Tailwind `darkMode: 'class'`
- User preference persisted in Zustand
- System preference fallback supported

## UI/UX Direction

- Mobile-first spacing and card sizing
- Large tap targets for search, cart, and checkout
- Warm grocery-oriented palette using olive/green brand tones and cool accent blue
- High-contrast CTAs and simplified page sections
- Sticky header and off-canvas cart for quick basket review

Suggested next UX improvements:

- Category pages with editorial banners
- Real delivery slot selection
- Saved addresses and authenticated order history
- Homepage personalization by frequent purchases

## Image Handling

- Product images: existing Cloudinary URLs from dataset
- Category imagery: curated Unsplash/Pexels lifestyle images
- Keep product cards on `loading="lazy"`
- For production, transform Cloudinary URLs with optimized width/quality parameters

## Performance Optimizations

- Route-based code splitting using `React.lazy`
- Lazy-loaded product images
- Debounced search to avoid per-keystroke heavy filtering
- React Query cache with 5-minute stale time
- Denormalized Supabase reads for listing screens
- Local fallback catalog to avoid blank states during backend setup

For larger growth:

- Add virtualization if catalog size grows well beyond the current range
- Paginate server-side by category
- Move search to Postgres trigram or full-text queries

## Deployment Guide

### Frontend on Vercel

1. Push the repo to GitHub.
2. Import the project into Vercel.
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy.

### Supabase

1. Create a new Supabase project.
2. Run [schema.sql](/C:/Users/frank/a2sv_projects/Simba-2/supabase/schema.sql:1) in SQL Editor.
3. In `Authentication -> Providers`, enable `Google`.
4. Add your site URL and redirect URLs such as `http://localhost:5173/auth/callback` and your production `/auth/callback` URL.
5. Set `anon` key in Vercel env vars.
6. Set `service_role` key locally for import scripts only.
7. Deploy the Edge Function:

```bash
supabase functions deploy momo-collection
```

8. Set Edge Function secrets:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com
supabase secrets set MTN_MOMO_TARGET_ENVIRONMENT=sandbox
supabase secrets set MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY=your_collection_subscription_key
supabase secrets set MTN_MOMO_API_USER=your_api_user
supabase secrets set MTN_MOMO_API_KEY=your_api_key
supabase secrets set MTN_MOMO_CALLBACK_URL=https://your-public-callback-url
```

9. Run:

```bash
npm run seed:prepare
npm run seed:supabase
```

## Environment Variables

Use [.env.example](/C:/Users/frank/a2sv_projects/Simba-2/.env.example:1).

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_public_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com
MTN_MOMO_TARGET_ENVIRONMENT=sandbox
MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY=your_collection_subscription_key
MTN_MOMO_API_USER=your_api_user
MTN_MOMO_API_KEY=your_api_key
MTN_MOMO_CALLBACK_URL=https://your-public-callback-url
```

Important:

- `VITE_*` values are frontend-safe
- `SUPABASE_SERVICE_ROLE_KEY`, `MTN_MOMO_COLLECTION_SUBSCRIPTION_KEY`, `MTN_MOMO_API_USER`, and `MTN_MOMO_API_KEY` must stay in backend or Edge Function secrets only

## Optional Enhancements

- Supabase Auth for saved carts and order history
- Edge Function checkout API
- Promo codes
- Skeleton loaders for product detail and checkout
- Recently viewed products
- Cloudinary transformed thumbnails
- Analytics for search terms and cart abandonment

## Local Development

```bash
npm install
npm run dev
```

If Supabase is not configured, the app still runs using the bundled JSON catalog.
