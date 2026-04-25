import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, LogOut, Menu, MoonStar, ShoppingBasket, SunMedium, X } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/layout/brand-logo';
import { useAuth } from '@/hooks/use-auth';
import { signOut } from '@/lib/auth';
import { useCatalog } from '@/hooks/use-catalog';
import { LANGUAGES } from '@/lib/constants';
import { useCartStore } from '@/store/cart-store';
import { usePreferencesStore } from '@/store/preferences-store';
import { useUiStore } from '@/store/ui-store';

export function Header() {
  const { t } = useTranslation();
  const { data } = useCatalog();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const cartItems = useCartStore((state) => state.items);
  const itemCount = Object.values(cartItems).reduce((sum, item) => sum + item.quantity, 0);
  const locale = usePreferencesStore((state) => state.locale);
  const setLocale = usePreferencesStore((state) => state.setLocale);
  const theme = usePreferencesStore((state) => state.theme);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const openCart = useUiStore((state) => state.openCart);
  const { user, isConfigured } = useAuth();
  const products = data?.products ?? [];
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.normalizedCategory))).sort(),
    [products]
  );

  const navigate = useNavigate();

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsLanguageMenuOpen(false);
  }, [locale, theme, user]);

  const handleSignIn = () => {
    setIsMobileMenuOpen(false);
    navigate('/auth/login');
  };

  const handleSignOut = async () => {
    try {
      setIsMobileMenuOpen(false);
      await signOut();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t('failedToSignOut'));
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-stone-50/85 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
      <div className="container-shell flex items-center justify-between gap-2 py-4 md:gap-3">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <Link to="/" className="flex min-w-0 items-center gap-3">
          <BrandLogo />
          <div className="hidden min-[430px]:block">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('deliveryIn')}</p>
          </div>
          </Link>
        </div>

        <nav className="hidden items-center gap-4 lg:flex xl:gap-5">
          <NavLink to="/" className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('home')}
          </NavLink>
          <div className="group relative">
            <button className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              {t('categories')}
              <ChevronDown size={15} className="transition group-hover:rotate-180" />
            </button>
            <div className="pointer-events-none absolute left-0 top-full pt-3 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
              <div className="w-80 rounded-3xl border border-slate-200 bg-white p-3 shadow-soft dark:border-slate-700 dark:bg-slate-900">
                <div className="grid max-h-96 grid-cols-1 gap-1 overflow-y-auto">
                  {categories.map((category) => (
                    <Link
                      key={category}
                      to={`/?category=${encodeURIComponent(category)}#catalog`}
                      className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-stone-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <NavLink to="/checkout" className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('checkout')}
          </NavLink>
          <NavLink to="/orders" className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('myOrders')}
          </NavLink>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative hidden lg:block">
            <Button
              variant="secondary"
              className="h-11 rounded-2xl px-3"
              onClick={() => setIsLanguageMenuOpen((open) => !open)}
              aria-expanded={isLanguageMenuOpen}
              aria-haspopup="menu"
            >
              <span className="max-w-20 truncate text-xs font-semibold uppercase tracking-[0.18em]">
                {LANGUAGES.find((language) => language.value === locale)?.label ?? locale}
              </span>
              <ChevronDown size={15} className={`ml-2 transition ${isLanguageMenuOpen ? 'rotate-180' : ''}`} />
            </Button>
            {isLanguageMenuOpen ? (
              <div className="absolute right-0 top-full z-20 mt-2 w-40 rounded-3xl border border-slate-200 bg-white p-2 shadow-soft dark:border-slate-700 dark:bg-slate-900">
                {LANGUAGES.map((language) => (
                  <button
                    key={language.value}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-medium transition ${
                      locale === language.value
                        ? 'bg-brand-500 text-white'
                        : 'text-slate-600 hover:bg-stone-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                    onClick={() => setLocale(language.value)}
                  >
                    <span>{language.label}</span>
                    {locale === language.value ? <span className="text-[11px] uppercase tracking-[0.16em]">{t('selected')}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Button
            variant="ghost"
            className="h-11 w-11 rounded-2xl p-0"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={t('darkMode')}
          >
            {theme === 'dark' ? <SunMedium size={18} /> : <MoonStar size={18} />}
          </Button>
          <Button variant="secondary" className="relative h-11 rounded-2xl px-4" onClick={openCart}>
            <ShoppingBasket size={18} />
            <span className="ml-2 hidden sm:inline">{t('cart')}</span>
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-accent-500 text-[10px] text-white">
                {itemCount}
              </span>
            )}
          </Button>
          {isConfigured ? (
            user ? (
              <>
                <Link to="/orders" className="hidden xl:block">
                  <Button variant="secondary" className="h-11 rounded-2xl px-4">
                    {user.user_metadata.full_name ?? user.email ?? t('account')}
                  </Button>
                </Link>
                <Button variant="ghost" className="h-11 w-11 rounded-2xl p-0" onClick={handleSignOut} aria-label={t('signOut')}>
                  <LogOut size={18} />
                </Button>
              </>
            ) : (
              <Button variant="secondary" className="h-11 rounded-2xl px-4" onClick={handleSignIn}>
                {t('signIn')}
              </Button>
            )
          ) : null}
          <Button
            variant="ghost"
            className="h-11 w-11 shrink-0 rounded-2xl p-0 lg:hidden"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label={isMobileMenuOpen ? t('closeNavigationMenu') : t('openNavigationMenu')}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </div>
      {isMobileMenuOpen ? (
        <div id="mobile-navigation" className="container-shell border-t border-slate-200/80 pb-4 lg:hidden dark:border-slate-800">
          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-700 dark:bg-slate-900">
            <nav className="flex flex-col gap-2">
              <NavLink
                to="/"
                className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('home')}
              </NavLink>
              <details className="group rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t('categories')}
                  <ChevronDown size={15} className="transition group-open:rotate-180" />
                </summary>
                <div className="mt-3 grid gap-1">
                  {categories.map((category) => (
                    <Link
                      key={category}
                      to={`/?category=${encodeURIComponent(category)}#catalog`}
                      className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-stone-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {category}
                    </Link>
                  ))}
                </div>
              </details>
              <NavLink
                to="/checkout"
                className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('checkout')}
              </NavLink>
              <NavLink
                to="/orders"
                className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t('myOrders')}
              </NavLink>
            </nav>

            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
              <details className="group rounded-2xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span>
                    {t('language')}: {LANGUAGES.find((language) => language.value === locale)?.label ?? locale}
                  </span>
                  <ChevronDown size={15} className="transition group-open:rotate-180" />
                </summary>
                <div className="mt-3 grid gap-1">
                  {LANGUAGES.map((language) => (
                    <button
                      key={language.value}
                      className={`flex items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-medium transition ${
                        locale === language.value
                          ? 'bg-brand-500 text-white'
                          : 'text-slate-600 hover:bg-stone-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                      }`}
                      onClick={() => setLocale(language.value)}
                    >
                      <span>{language.label}</span>
                      {locale === language.value ? <span className="text-[11px] uppercase tracking-[0.16em]">{t('selected')}</span> : null}
                    </button>
                  ))}
                </div>
              </details>
            </div>

            {isConfigured ? (
              <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                {user ? (
                  <div className="flex flex-col gap-2">
                    <Link to="/orders" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="secondary" className="h-11 w-full justify-start rounded-2xl px-4">
                        {user.user_metadata.full_name ?? user.email ?? t('account')}
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      className="h-11 w-full justify-start rounded-2xl px-4"
                      onClick={handleSignOut}
                    >
                      <LogOut size={18} />
                      <span className="ml-2">{t('signOut')}</span>
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
