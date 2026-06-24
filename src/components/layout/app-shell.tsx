import { useEffect, type PropsWithChildren } from 'react';
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

  useEffect(() => {
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className={`relative min-h-screen ${isLandingPage ? 'bg-gradient-to-b from-orange-100/60 to-stone-50 dark:bg-gradient-to-b dark:from-orange-950/30 dark:to-slate-950' : 'bg-stone-50 dark:bg-slate-950'} text-slate-900 dark:text-slate-100`}>
      <div className="absolute inset-0 -z-10 bg-hero-grid" />
      <Header />
      <div className="min-h-[calc(100vh-72px)] flex flex-col">
        <main className={`${isLandingPage ? 'px-3' : 'container-shell'} py-6 ${isLandingPage ? 'pt-24 sm:pt-28' : ''}`}>{children}</main>
      </div>
      <div className="mt-auto">
        <Footer />
      </div>
      <AddToCartToast />
      <CartDrawer />
    </div>
  );
}
