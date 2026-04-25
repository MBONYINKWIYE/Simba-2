import type { PropsWithChildren } from 'react';
import { CartDrawer } from '@/components/shop/cart-drawer';
import { AddToCartToast } from '@/components/layout/add-to-cart-toast';
import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { useLanguageSync } from '@/hooks/use-language-sync';
import { useThemeSync } from '@/hooks/use-theme-sync';
import { useLocation } from 'react-router-dom';

export function AppShell({ children }: PropsWithChildren) {
  useThemeSync();
  useLanguageSync();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="absolute inset-0 -z-10 bg-hero-grid" />
      <Header />
      <main className={`container-shell py-6 ${isLandingPage ? 'pt-24 sm:pt-28' : ''}`}>{children}</main>
      <Footer />
      <AddToCartToast />
      <CartDrawer />
    </div>
  );
}
