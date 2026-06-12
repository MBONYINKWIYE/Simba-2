import { Eye, Minus, Plus, ShoppingBasket } from 'lucide-react';
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
  const decrementItem = useCartStore((state) => state.decrementItem);
  const cartItem = useCartStore((state) => state.items[product.id]);
  const quantity = cartItem?.quantity ?? 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-900">
      {/* Image container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-gray-800">
        <Link to={`/products/${product.slug}`} className="block h-full w-full">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </Link>

        {/* View details eye icon */}
        <Link
          to={`/products/${product.slug}`}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-gray-600 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-gray-900 dark:bg-gray-800/80 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <Eye size={12} />
        </Link>

        {/* Quantity overlay controls when in cart */}
        {quantity > 0 && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-md border border-emerald-200 bg-white/95 px-1 py-0.5 shadow-sm backdrop-blur-sm dark:border-emerald-800 dark:bg-gray-900/95">
            <button
              onClick={() => decrementItem(product.id)}
              className="flex h-5 w-5 items-center justify-center rounded text-emerald-600 transition hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
            >
              <Minus size={11} />
            </button>
            <span className="min-w-[1.125rem] text-center text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              {quantity}
            </span>
            <button
              onClick={() => addItem(product)}
              disabled={product.stockQuantity !== undefined && quantity >= product.stockQuantity}
              className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500 text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              <Plus size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="flex flex-1 flex-col p-2.5">
        <Badge className="mb-1 w-fit text-[10px] px-1.5 py-0.5">{product.normalizedCategory}</Badge>
        <h3 className="line-clamp-2 text-[13px] font-semibold text-gray-900 dark:text-white">
          {product.name}
        </h3>

        <div className="mt-auto flex items-end justify-between pt-1.5">
          <div>
            <span className="text-base font-bold text-gray-900 dark:text-white">
              {formatCurrency(product.price)}
            </span>
            <span className="ml-0.5 text-[10px] text-gray-500 dark:text-gray-400">
              /{product.unit}
            </span>
          </div>

          {/* Prominent green + quick-add button */}
          {quantity === 0 && (
            <button
              onClick={() => addItem(product)}
              disabled={!product.inStock}
              className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-600 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              <Plus size={18} />
            </button>
          )}
        </div>

        {/* Stock status */}
        {product.inStock ? (
          <div className="mt-1 flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
              {t('availableInStock')}
              {product.stockQuantity !== undefined && ` · ${product.stockQuantity}`}
            </span>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-red-400" />
            <span className="text-[9px] font-medium text-red-500 dark:text-red-400">
              {t('availableOutOfStock')}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
