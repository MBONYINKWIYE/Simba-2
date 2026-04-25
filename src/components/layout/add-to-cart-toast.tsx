import { useEffect, useState } from 'react';
import { CheckCircle2, ShoppingBasket, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart-store';
import { useUiStore } from '@/store/ui-store';

export function AddToCartToast() {
  const { t } = useTranslation();
  const lastAddedItem = useCartStore((state) => state.lastAddedItem);
  const openCart = useUiStore((state) => state.openCart);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!lastAddedItem) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
    const timeoutId = window.setTimeout(() => {
      setIsVisible(false);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [lastAddedItem?.productName, lastAddedItem?.quantity]);

  if (!lastAddedItem) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={`fixed left-1/2 top-20 z-[60] w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 transition-all duration-300 sm:top-24 sm:max-w-md ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0 pointer-events-none'
      }`}
    >
      <div className="rounded-[1.75rem] border border-emerald-200 bg-white/95 p-4 shadow-2xl backdrop-blur dark:border-emerald-900/40 dark:bg-slate-950/95">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {lastAddedItem.image ? (
              <img src={lastAddedItem.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <CheckCircle2 size={20} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ShoppingBasket size={16} className="shrink-0 text-emerald-600 dark:text-emerald-300" />
              <p className="min-w-0 flex-1 truncate font-semibold text-slate-900 dark:text-slate-100">
                {t('addedToCartToast', { name: lastAddedItem.productName })}
              </p>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t('cartToastQuantity', { count: lastAddedItem.quantity })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t('closeNavigationMenu')}
          >
            <X size={16} />
          </button>
        </div>

        <Button
          variant="secondary"
          className="mt-4 w-full justify-center"
          onClick={() => {
            openCart();
            setIsVisible(false);
          }}
        >
          {t('viewCart')}
        </Button>
      </div>
    </div>
  );
}
