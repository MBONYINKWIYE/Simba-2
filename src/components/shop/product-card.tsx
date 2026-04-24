import { Eye, ShoppingBasket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Product } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';

export function ProductCard({ product }: { product: Product }) {
  const { t } = useTranslation();
  const addItem = useCartStore((state) => state.addItem);
  const isInCart = useCartStore((state) => Boolean(state.items[product.id]));

  return (
    <article className="group overflow-hidden rounded-3xl border border-white/50 bg-white shadow-soft transition hover:-translate-y-1 dark:border-white/10 dark:bg-slate-900">
      <Link to={`/products/${product.slug}`} className="block overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </Link>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge>{product.normalizedCategory}</Badge>
            <h3 className="mt-3 line-clamp-2 text-base font-bold">{product.name}</h3>
          </div>
          {product.inStock ? (
            <div className="text-right">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                {t('availableInStock')}
              </span>
              {product.stockQuantity !== undefined && (
                <p className="mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {product.stockQuantity} {t('availableInStock').toLowerCase()}
                </p>
              )}
            </div>
          ) : (
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
              Out
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(product.price)}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('unit')}: {product.unit}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to={`/products/${product.slug}`}>
              <Button variant="ghost" className="h-11 w-11 rounded-2xl p-0">
                <Eye size={18} />
              </Button>
            </Link>
            <Button onClick={() => addItem(product)} disabled={!product.inStock}>
              <ShoppingBasket size={16} className="mr-2" />
              {isInCart ? t('addedToCart') : t('addToCart')}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
