import { Minus, Plus, ShoppingBasket, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { signInWithGoogle } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import { useOrderSummary } from '@/hooks/use-order-summary';
import { useCartStore } from '@/store/cart-store';
import { useUiStore } from '@/store/ui-store';

export function CartDrawer() {
  const { t } = useTranslation();
  const isCartOpen = useUiStore((state) => state.isCartOpen);
  const closeCart = useUiStore((state) => state.closeCart);
  const itemsMap = useCartStore((state) => state.items);
  const items = Object.values(itemsMap);
  const addItem = useCartStore((state) => state.addItem);
  const decrementItem = useCartStore((state) => state.decrementItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const summary = useOrderSummary();
  const { user, isConfigured } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      closeCart();
      await signInWithGoogle('/checkout');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t('failedToStartGoogleSignIn'));
    }
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
          <button onClick={closeCart} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-lg font-semibold">{t('emptyCart')}</p>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-4 overflow-y-auto pb-48">
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
                      <button
                        onClick={() => removeItem(product.id)}
                        className="text-sm font-semibold text-rose-500"
                      >
                        {t('remove')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
                <Button fullWidth className="mt-4" onClick={handleGoogleSignIn}>
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
