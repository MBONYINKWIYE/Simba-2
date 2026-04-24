import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { createBrowserRouter, useRouteError, Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/app-shell';
import { AdminRoute } from '@/pages/admin/admin-route';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home } from 'lucide-react';

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
const LoginPage = lazy(() => import('@/pages/auth/login-page'));
const SignupPage = lazy(() => import('@/pages/auth/signup-page'));
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

function ErrorBoundary() {
  const error = useRouteError() as any;
  const { t } = useTranslation();

  return (
    <AppShell>
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className="glass-panel max-w-lg p-8 text-center shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertCircle size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            {error?.message || "An unexpected error occurred while navigating. Our team has been notified."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => window.location.reload()} className="px-8">
              Try again
            </Button>
            <Link to="/">
              <Button variant="secondary" className="w-full sm:w-auto px-8">
                <Home size={18} className="mr-2" />
                Back to home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

const fallback = <RouteFallback />;

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <AppShell>
            <Suspense fallback={fallback}>
              <HomePage />
            </Suspense>
          </AppShell>
        ),
      },
      {
        path: 'products/:slug',
        element: (
          <AppShell>
            <Suspense fallback={fallback}>
              <ProductPage />
            </Suspense>
          </AppShell>
        ),
      },
      {
        path: 'checkout',
        element: (
          <AppShell>
            <Suspense fallback={fallback}>
              <CheckoutPage />
            </Suspense>
          </AppShell>
        ),
      },
      {
        path: 'auth/login',
        element: (
          <AppShell>
            <Suspense fallback={fallback}>
              <LoginPage />
            </Suspense>
          </AppShell>
        ),
      },
      {
        path: 'auth/signup',
        element: (
          <AppShell>
            <Suspense fallback={fallback}>
              <SignupPage />
            </Suspense>
          </AppShell>
        ),
      },
      {
        path: 'auth/callback',
        element: (
          <AppShell>
            <Suspense fallback={fallback}>
              <AuthCallbackPage />
            </Suspense>
          </AppShell>
        ),
      },
      {
        path: 'orders',
        element: (
          <AppShell>
            <Suspense fallback={fallback}>
              <OrdersPage />
            </Suspense>
          </AppShell>
        ),
      },
      {
        path: 'admin/login',
        element: (
          <AppShell>
            <Suspense fallback={fallback}>
              <AdminLoginPage />
            </Suspense>
          </AppShell>
        ),
      },
      {
        path: 'admin',
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
        path: 'admin/orders/:orderId',
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
    ],
  },
]);
