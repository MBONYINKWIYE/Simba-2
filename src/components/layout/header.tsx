import { MoonStar, ShoppingBasket, SunMedium } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { LANGUAGES } from '@/lib/constants';
import { useCartStore } from '@/store/cart-store';
import { usePreferencesStore } from '@/store/preferences-store';
import { useUiStore } from '@/store/ui-store';

export function Header() {
  const { t } = useTranslation();
  const cartItems = useCartStore((state) => state.items);
  const itemCount = Object.values(cartItems).reduce((sum, item) => sum + item.quantity, 0);
  const locale = usePreferencesStore((state) => state.locale);
  const setLocale = usePreferencesStore((state) => state.setLocale);
  const theme = usePreferencesStore((state) => state.theme);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const openCart = useUiStore((state) => state.openCart);

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-stone-50/85 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
      <div className="container-shell flex items-center justify-between gap-4 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500 text-lg font-bold text-white shadow-soft">
            S
          </div>
          <div>
            <p className="text-base font-bold">{t('appName')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('deliveryIn')}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          <NavLink to="/" className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Home
          </NavLink>
          <NavLink to="/checkout" className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('checkout')}
          </NavLink>
          <NavLink to="/architecture" className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('architecture')}
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900 sm:flex">
            {LANGUAGES.map((language) => (
              <button
                key={language.value}
                className={`rounded-xl px-2 py-1 text-xs font-semibold ${
                  locale === language.value
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
                onClick={() => setLocale(language.value)}
              >
                {language.label}
              </button>
            ))}
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
            <span className="ml-2 hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-accent-500 text-[10px] text-white">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
