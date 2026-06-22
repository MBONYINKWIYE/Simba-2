import { Minus, Plus, ShoppingBag, ShoppingBasket, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useCatalog } from '@/hooks/use-catalog';
import { formatCurrency } from '@/lib/utils';
import { useOrderSummary } from '@/hooks/use-order-summary';
import { useCartStore } from '@/store/cart-store';
import { useUiStore } from '@/store/ui-store';
import type { Product } from '@/types';
import { useMemo, useState } from 'react';

function useSuggestedProducts(): Product[] {
  const { data } = useCatalog();
  const itemsMap = useCartStore((state) => state.items);

  return useMemo(() => {
    const allProducts = data?.products ?? [];
    const cartProductIds = new Set(Object.keys(itemsMap).map(Number));
    const cartCategories = new Set(
      Object.values(itemsMap).map((item) => item.product.normalizedCategory),
    );

    const candidates = allProducts.filter((p) => !cartProductIds.has(p.id));

    const fromOtherCategories = candidates.filter(
      (p) => !cartCategories.has(p.normalizedCategory),
    );

    const fromSameCategories = candidates.filter((p) =>
      cartCategories.has(p.normalizedCategory),
    );

    const shuffled = (arr: Product[]) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const picked: Product[] = [];
    picked.push(...shuffled(fromOtherCategories).slice(0, 3));
    if (picked.length < 5) {
      picked.push(...shuffled(fromSameCategories).slice(0, 5 - picked.length));
    }

    return picked.slice(0, 5);
  }, [data, itemsMap]);
}

export function CartDrawer() {
  const { t } = useTranslation();
  const isCartOpen = useUiStore((state) => state.isCartOpen);
  const closeCart = useUiStore((state) => state.closeCart);
  const itemsMap = useCartStore((state) => state.items);
  const items = Object.values(itemsMap);
  const addItem = useCartStore((state) => state.addItem);
  const decrementItem = useCartStore((state) => state.decrementItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const savedItemsMap = useCartStore((state) => state.savedItems);
  const savedItems = Object.values(savedItemsMap);
  const saveForLater = useCartStore((state) => state.saveForLater);
  const moveToCart = useCartStore((state) => state.moveToCart);
  const removeSavedItem = useCartStore((state) => state.removeSavedItem);
  const summary = useOrderSummary();
  const { user, isConfigured } = useAuth();
  const navigate = useNavigate();
  const suggestedProducts = useSuggestedProducts();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSignInRedirect = () => {
    closeCart();
    navigate('/auth/login');
  };

  return (
    <div className={`fixed inset-0 z-50 ${isCartOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-slate-950/50 transition ${isCartOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={closeCart}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white p-5 shadow-soft transition dark:bg-slate-950 ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
              <ShoppingBasket size={18} />
            </div>
            <div>
              <p className="font-bold">{t('cart')}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('cartItems', { count: items.length })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              showClearConfirm ? (
                <div className="flex items-center gap-1 rounded-xl bg-rose-50 px-2 py-1 text-xs dark:bg-rose-900/20">
                  <span className="text-rose-700 dark:text-rose-300">{t('clearCartConfirm')}</span>
                  <button
                    onClick={() => {
                      clearCart();
                      setShowClearConfirm(false);
                    }}
                    className="font-bold text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-200"
                  >
                    {t('clearCart')}
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {t('cancel')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="rounded-xl px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                >
                  {t('clearCart')}
                </button>
              )
            )}
            <button onClick={closeCart} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X size={18} />
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="mt-16 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-100 dark:bg-slate-800">
              <ShoppingBag size={28} className="text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 text-lg font-semibold">{t('emptyCart')}</p>
            <Link to="/" onClick={closeCart} className="mt-4 inline-block">
              <Button>{t('emptyCartCta')}</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-4 overflow-y-auto pb-64">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-3 rounded-3xl border border-slate-200 p-3 dark:border-slate-800">
                  <img src={product.image} alt={product.name} className="h-20 w-20 rounded-2xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-semibold">{product.name}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatCurrency(product.price)}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decrementItem(product.id)}
                          className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-6 text-center text-sm font-semibold">{quantity}</span>
                        <button
                          onClick={() => addItem(product)}
                          className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            saveForLater(product.id);
                          }}
                          className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          {t('saveForLater')}
                        </button>
                        <button
                          onClick={() => removeItem(product.id)}
                          className="text-sm font-semibold text-rose-500"
                        >
                          {t('remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {suggestedProducts.length > 0 && (
                <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                  <p className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    {t('youMightAlsoLike')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {suggestedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white p-2 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-12 w-12 shrink-0 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{product.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatCurrency(product.price)}
                          </p>
                        </div>
                        <button
                          onClick={() => addItem(product)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {savedItems.length > 0 && (
              <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
                <p className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                  {t('savedForLater')} ({savedItems.length})
                </p>
                <div className="space-y-3">
                  {savedItems.map(({ product, quantity }) => (
                    <div key={product.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
                      <img src={product.image} alt={product.name} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{product.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{quantity} x {formatCurrency(product.price)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveToCart(product.id)}
                          className="rounded-lg bg-brand-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                        >
                          {t('moveToCart')}
                        </button>
                        <button
                          onClick={() => removeSavedItem(product.id)}
                          className="rounded-lg p-1.5 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t('subtotal')}</span>
                <span>{formatCurrency(summary.subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>{t('total')}</span>
                <span>{formatCurrency(summary.total)}</span>
              </div>
              </div>
              {isConfigured && !user ? (
                <Button fullWidth className="mt-4" onClick={handleSignInRedirect}>
                  {t('signInToCheckout')}
                </Button>
              ) : (
                <Link to="/checkout" onClick={closeCart} className="mt-4 block">
                  <Button fullWidth>{t('checkout')}</Button>
                </Link>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
