import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, LayoutGrid, LogOut, MoonStar, ShoppingBasket, SunMedium, User, Search, Grid } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/layout/brand-logo';
import { useAuth } from '@/hooks/use-auth';
import { signOut } from '@/lib/auth';
import { useCatalog } from '@/hooks/use-catalog';
import { useUserRole } from '@/hooks/use-user-role';
import { LANGUAGES } from '@/lib/constants';
import { useCartStore } from '@/store/cart-store';
import { usePreferencesStore } from '@/store/preferences-store';
import { useUiStore } from '@/store/ui-store';
import { useSearchStore } from '@/store/search-store';
import { UserAvatar } from '@/components/ui/user-avatar';
import { HeaderSearch } from '@/components/layout/header-search';

export function Header() {
  const { t } = useTranslation();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const hasActiveSearch = useSearchStore((state) => state.hasActiveSearch);
  
  const showHomeLink = location.pathname !== '/';
  const showCheckoutLink = location.pathname !== '/checkout' && location.pathname !== '/checkout/confirmation/';
  const showOrdersLink = location.pathname !== '/orders';
  const { data } = useCatalog();
  const authRoleQuery = useUserRole();
  const isAdmin = authRoleQuery.data?.role === 'shop_admin' || authRoleQuery.data?.role === 'super_admin';
  const isStaff = authRoleQuery.data?.role === 'shop_admin' && authRoleQuery.data?.adminRole === 'staff';
  const dashboardPath = isStaff ? '/staff' : '/admin';
  const dashboardLabel = isStaff ? t('staffDashboard') : t('adminDashboard');

  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const cartItems = useCartStore((state) => state.items);
  const itemCount = Object.values(cartItems).reduce((sum, item) => sum + item.quantity, 0);
  const locale = usePreferencesStore((state) => state.locale);
  const setLocale = usePreferencesStore((state) => state.setLocale);
  const theme = usePreferencesStore((state) => state.theme);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const openCart = useUiStore((state) => state.openCart);
  const { user, isConfigured } = useAuth();

  const userDisplayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? t('account');
  const userAvatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null;

  const products = data?.products ?? [];
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.normalizedCategory))).sort(),
    [products]
  );

  const navigate = useNavigate();
  const hideThreshold = 72;
  const showThreshold = 24;
  const directionThreshold = 8;

  useEffect(() => {
    setIsLanguageMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [locale, theme, user]);

  useEffect(() => {
    if (!isLandingPage) {
      setIsVisible(true);
      return;
    }

    lastScrollYRef.current = window.scrollY;
    setIsVisible(true);

    let ticking = false;

    const updateVisibility = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollYRef.current;
      const scrollingUp = scrollDelta < -directionThreshold;
      const scrollingDown = scrollDelta > directionThreshold;
      const atTop = currentScrollY < showThreshold;

      if (atTop || isUserMenuOpen || isCategoryMenuOpen || hasActiveSearch) {
        setIsVisible(true);
      } else if (scrollingUp) {
        setIsVisible(true);
      } else if (scrollingDown && currentScrollY > hideThreshold) {
        setIsVisible(false);
      }

      lastScrollYRef.current = currentScrollY;
      ticking = false;
    };

    const onScroll = () => {
      if (isUserMenuOpen || isCategoryMenuOpen || hasActiveSearch) {
        return;
      }

      if (!ticking) {
        window.requestAnimationFrame(updateVisibility);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [isLandingPage, isUserMenuOpen, isCategoryMenuOpen, hasActiveSearch]);

  useEffect(() => {
    if (!isLandingPage) {
      return;
    }

    if (isUserMenuOpen || isCategoryMenuOpen || hasActiveSearch) {
      setIsVisible(true);
    }
  }, [isLandingPage, isUserMenuOpen, isCategoryMenuOpen, hasActiveSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const categoryMenu = document.querySelector('[data-category-menu]');
      if (categoryMenu && !categoryMenu.contains(target)) {
        setIsCategoryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      setIsUserMenuOpen(false);
      await signOut();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t('failedToSignOut'));
    }
  };

  return (
    <header
      className={`z-40 border-b border-white/50 bg-stone-50/85 backdrop-blur transition-transform duration-500 ease-out dark:border-white/10 dark:bg-slate-950/80 ${
        isLandingPage ? 'fixed left-0 right-0 top-0' : 'sticky top-0'
      } ${isLandingPage && !isVisible ? '-translate-y-full' : 'translate-y-0'}`}
    >
      <div className="container-shell flex items-center justify-between gap-2 py-4 md:gap-3">
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo />
          </Link>
        </div>

        <div className="hidden flex-1 justify-center lg:flex">
          <HeaderSearch />
        </div>

        <div className="relative hidden lg:block ml-4">
          <Button
            variant="secondary"
            className="h-11 rounded-2xl px-3"
            onClick={() => setIsCategoryMenuOpen((open) => !open)}
            aria-expanded={isCategoryMenuOpen}
            aria-haspopup="menu"
          >
            <Grid size={18} className="mr-2" />
            <span className="max-w-24 truncate text-xs font-semibold uppercase tracking-[0.18em] hidden sm:inline">
              {t('categories')}
            </span>
            <ChevronDown size={15} className={`ml-2 transition ${isCategoryMenuOpen ? 'rotate-180' : ''}`} />
          </Button>
          {isCategoryMenuOpen && (
            <div data-category-menu className="absolute right-0 top-full z-20 mt-2 w-56 rounded-3xl border border-slate-200 bg-white p-2 shadow-soft dark:border-slate-700 dark:bg-slate-900">
              <button
                onClick={() => {
                  useSearchStore.getState().setFilters({ category: '' });
                  setIsCategoryMenuOpen(false);
                  navigate('/#catalog');
                }}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-medium transition ${
                  useSearchStore.getState().filters.category === ''
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-600 hover:bg-stone-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <span>{t('allCategories')}</span>
                {useSearchStore.getState().filters.category === '' ? <span className="text-[11px] uppercase tracking-[0.16em]">{t('selected')}</span> : null}
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    useSearchStore.getState().setFilters({ category });
                    setIsCategoryMenuOpen(false);
                    navigate('/#catalog');
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm font-medium transition ${
                    useSearchStore.getState().filters.category === category
                      ? 'bg-brand-500 text-white'
                      : 'text-slate-600 hover:bg-stone-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  <span>{category}</span>
                  {useSearchStore.getState().filters.category === category ? <span className="text-[11px] uppercase tracking-[0.16em]">{t('selected')}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1 md:gap-2">
          <Button
            variant="ghost"
            className="h-11 w-11 rounded-2xl p-0 lg:hidden"
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            aria-label={t('search')}
          >
            <Search size={18} />
          </Button>
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
            <div className="relative">
              <Button
                variant="secondary"
                className={`h-11 rounded-2xl ${user ? 'pl-1 pr-3' : 'px-4'}`}
                onClick={() => setIsUserMenuOpen((open) => !open)}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
              >
                {user ? (
                  <>
                    <UserAvatar src={userAvatarUrl} name={userDisplayName} email={user.email} size="sm" className="mr-2" />
                    <span className="max-w-[100px] truncate text-sm font-semibold hidden sm:inline">{userDisplayName}</span>
                  </>
                ) : (
                  <>
                    <User size={18} className="lg:hidden" />
                    <span className="hidden lg:inline">{t('signIn')}</span>
                    <span className="lg:hidden ml-2 text-sm font-semibold">{t('menu')}</span>
                  </>
                )}
                <ChevronDown size={14} className={`ml-2 transition ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </Button>
              {isUserMenuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-3xl border border-slate-200 bg-white p-2 shadow-soft dark:border-slate-700 dark:bg-slate-900">
                  {/* Mobile-only Navigation Links */}
                  <div className="lg:hidden space-y-1 mb-2 border-b border-slate-100 pb-2 dark:border-slate-800">
                    {showHomeLink && (
                      <Link
                        to="/"
                        className="flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        {t('home')}
                      </Link>
                    )}
                    <details className="group rounded-2xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t('categories')}
                        <ChevronDown size={14} className="transition group-open:rotate-180" />
                      </summary>
                      <div className="mt-2 grid gap-1 pl-2 border-l border-brand-100 dark:border-brand-900">
                        {categories.map((category) => (
                          <Link
                            key={category}
                            to={`/?category=${encodeURIComponent(category)}#catalog`}
                            className="rounded-xl px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-stone-50 dark:text-slate-400 dark:hover:bg-slate-800"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            {category}
                          </Link>
                        ))}
                      </div>
                    </details>
                    {showCheckoutLink && (
                      <Link
                        to="/checkout"
                        className="flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        {t('checkout')}
                      </Link>
                    )}
                    {showOrdersLink && !user && (
                      <Link
                        to="/orders"
                        className="flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        {t('myOrders')}
                      </Link>
                    )}
                    {isAdmin && !user && (
                      <Link
                        to={dashboardPath}
                        className="flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm font-bold text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        {dashboardLabel}
                      </Link>
                    )}
                    {/* Mobile Language Selector */}
                    <div className="my-1 border-t border-slate-100 pt-1 dark:border-slate-800" />
                    <details className="group px-3 py-1">
                      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        <span>{t('language')}</span>
                        <ChevronDown size={12} className="transition group-open:rotate-180" />
                      </summary>
                      <div className="mt-2 grid grid-cols-1 gap-1">
                        {LANGUAGES.map((language) => (
                          <button
                            key={language.value}
                            className={`flex items-center justify-between rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                              locale === language.value
                                ? 'bg-brand-500 text-white'
                                : 'text-slate-600 hover:bg-stone-50 dark:text-slate-400 dark:hover:bg-slate-800'
                            }`}
                            onClick={() => {
                              setLocale(language.value);
                              setIsUserMenuOpen(false);
                            }}
                          >
                            <span>{language.label}</span>
                            {locale === language.value ? <span className="text-[10px] uppercase tracking-wider">{t('selected')}</span> : null}
                          </button>
                        ))}
                      </div>
                    </details>
                  </div>

                  {/* Account Section */}
                  {user ? (
                    <div className="space-y-1">
                      <div className="px-3 py-2 mb-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{t('account')}</p>
                        <p className="truncate text-sm font-semibold">{userDisplayName}</p>
                      </div>
                      <Link
                        to="/orders"
                        className="flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-stone-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        {t('myOrders')}
                      </Link>
                      <Link
                        to="/orders"
                        className="flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-stone-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        {t('profileSettings')}
                      </Link>
                      {isAdmin ? (
                        <Link
                          to={dashboardPath}
                          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-bold text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                            <LayoutGrid size={16} />
                          </div>
                          {dashboardLabel}
                        </Link>
                      ) : null}
                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                      <button
                        className="flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                        onClick={handleSignOut}
                      >
                        <LogOut size={16} className="mr-2" />
                        {t('signOut')}
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      className="w-full justify-start rounded-2xl px-3"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        navigate('/auth/login');
                      }}
                    >
                      <User size={16} className="mr-2" />
                      {t('signIn')}
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile Search Bar */}
      {isMobileSearchOpen && (
        <div className="container-shell pb-4 lg:hidden animate-in slide-in-from-top-2 duration-200">
          <HeaderSearch />
        </div>
      )}
    </header>
  );
}
