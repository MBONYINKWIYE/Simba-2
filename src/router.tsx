import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';

const HomePage = lazy(() => import('@/pages/home-page').then((module) => ({ default: module.HomePage })));
const ProductPage = lazy(() =>
  import('@/pages/product-page').then((module) => ({ default: module.ProductPage })),
);
const CheckoutPage = lazy(() =>
  import('@/pages/checkout-page').then((module) => ({ default: module.CheckoutPage })),
);

const fallback = <div className="glass-panel p-8">Loading...</div>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppShell>
        <Suspense fallback={fallback}>
          <HomePage />
        </Suspense>
      </AppShell>
    ),
  },
  {
    path: '/products/:slug',
    element: (
      <AppShell>
        <Suspense fallback={fallback}>
          <ProductPage />
        </Suspense>
      </AppShell>
    ),
  },
  {
    path: '/checkout',
    element: (
      <AppShell>
        <Suspense fallback={fallback}>
          <CheckoutPage />
        </Suspense>
      </AppShell>
    ),
  },
]);
