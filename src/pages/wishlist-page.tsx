import { Heart, ShoppingBasket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/shop/product-grid';
import { useAuth } from '@/hooks/use-auth';
import { useWishlistStore } from '@/store/wishlist-store';

export function WishlistPage() {
  const { t } = useTranslation();
  const { user, isLoading, isConfigured } = useAuth();
  const userId = user?.id ?? 'guest';
  const items = useWishlistStore((state) => state.items[userId]);
  const wishlistProducts = items ? Object.values(items) : [];

  if (!isConfigured) {
    return (
      <section className="glass-panel p-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{t('myWishlist')}</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {t('ordersUnavailable')}
        </p>
      </section>
    );
  }

  if (isLoading) {
    return <div className="glass-panel p-6">{t('loadingAccount')}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t('myWishlist')}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {wishlistProducts.length > 0
                ? t('wishlistCount', { count: wishlistProducts.length })
                : t('wishlistEmpty')}
            </p>
          </div>
          {!user && (
            <Link to="/auth/login" className="sm:self-start">
              <Button className="w-full sm:w-auto">{t('signIn')}</Button>
            </Link>
          )}
        </div>
      </section>

      {wishlistProducts.length > 0 ? (
        <section>
          <ProductGrid products={wishlistProducts} />
        </section>
      ) : (
        <section className="glass-panel p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
              <Heart size={28} className="text-rose-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t('wishlistEmpty')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
              {t('wishlistEmptyHint')}
            </p>
            <Link to="/#catalog">
              <Button>
                <ShoppingBasket size={16} className="mr-2" />
                {t('startShopping')}
              </Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
