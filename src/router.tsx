import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { AdminRoute } from '@/pages/admin/admin-route';

const HomePage = lazy(() => import('@/pages/home-page').then((module) => ({ default: module.HomePage })));
const ProductPage = lazy(() =>
  import('@/pages/product-page').then((module) => ({ default: module.ProductPage })),
);
const CheckoutPage = lazy(() =>
  import('@/pages/checkout-page').then((module) => ({ default: module.CheckoutPage })),
);
const OrdersPage = lazy(() => import('@/pages/orders-page').then((module) => ({ default: module.OrdersPage })));
const AuthCallbackPage = lazy(() =>
  import('@/pages/auth-callback-page').then((module) => ({ default: module.AuthCallbackPage })),
);
const AdminLoginPage = lazy(() =>
  import('@/pages/admin/admin-login-page').then((module) => ({ default: module.AdminLoginPage })),
);
const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/admin-dashboard-page').then((module) => ({ default: module.AdminDashboardPage })),
);

function RouteFallback() {
  const { t } = useTranslation();

  return <div className="glass-panel p-8">{t('loading')}</div>;
}

const fallback = <RouteFallback />;

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
  {
    path: '/auth/callback',
    element: (
      <AppShell>
        <Suspense fallback={fallback}>
          <AuthCallbackPage />
        </Suspense>
      </AppShell>
    ),
  },
  {
    path: '/orders',
    element: (
      <AppShell>
        <Suspense fallback={fallback}>
          <OrdersPage />
        </Suspense>
      </AppShell>
    ),
  },
  {
    path: '/admin/login',
    element: (
      <AppShell>
        <Suspense fallback={fallback}>
          <AdminLoginPage />
        </Suspense>
      </AppShell>
    ),
  },
  {
    path: '/admin',
    element: (
      <AppShell>
        <Suspense fallback={fallback}>
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        </Suspense>
      </AppShell>
    ),
  },
  {
    path: '/admin/orders/:orderId',
    element: (
      <AppShell>
        <Suspense fallback={fallback}>
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        </Suspense>
      </AppShell>
    ),
  },
]);
