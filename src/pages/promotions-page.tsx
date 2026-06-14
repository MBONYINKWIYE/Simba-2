import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePromotions } from '@/hooks/use-promotions';
import { useCatalog } from '@/hooks/use-catalog';
import { ProductGrid } from '@/components/shop/product-grid';
import { formatCurrency } from '@/lib/utils';
import type { Product, Promotion } from '@/types';

function useCountdown(endDate: string) {
  const diff = useMemo(() => {
    const now = Date.now();
    const end = new Date(endDate).getTime();
    const remaining = Math.max(0, end - now);
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes, isExpired: remaining === 0 };
  }, [endDate]);

  return diff;
}

function PromotionCard({ promotion, product }: { promotion: Promotion; product?: Product }) {
  const countdown = useCountdown(promotion.ends_at);
  const discountedPrice = product
    ? Math.round(product.price * (1 - promotion.discount_percent / 100))
    : null;

  return (
    <article className="glass-panel overflow-hidden">
      {promotion.image_url && (
        <div className="aspect-[16/9] overflow-hidden bg-stone-100">
          <img
            src={promotion.image_url}
            alt={promotion.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        {product && (
          <Link
            to={`/products/${product.slug}`}
            className="mb-2 inline-block rounded-full bg-brand-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
          >
            {product.name}
          </Link>
        )}
        <h3 className="text-lg font-bold">{promotion.title}</h3>
        {promotion.description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{promotion.description}</p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-md bg-rose-100 px-2 py-1 text-sm font-bold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            -{promotion.discount_percent}%
          </span>
          {discountedPrice && product && (
            <div className="flex items-center gap-1 text-sm">
              <span className="font-bold text-rose-600">{formatCurrency(discountedPrice)}</span>
              <span className="text-gray-400 line-through">{formatCurrency(product.price)}</span>
            </div>
          )}
        </div>
        {!countdown.isExpired && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={13} />
            <span>
              {countdown.days > 0 && `${countdown.days}d `}
              {countdown.hours}h {countdown.minutes}m
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

export function PromotionsPage() {
  const { t } = useTranslation();
  const { data: promotionsData, isLoading } = usePromotions();
  const { data: catalogData } = useCatalog();
  const catalog = catalogData?.products ?? [];
  const promotions = promotionsData ?? [];

  const promoProducts = useMemo(() => {
    const productIds = new Set<number>();
    const result: Product[] = [];

    for (const promo of promotions) {
      if (promo.product_id && !productIds.has(promo.product_id)) {
        const product = catalog.find((p) => p.id === promo.product_id);
        if (product) {
          productIds.add(promo.product_id);
          result.push(product);
        }
      }
    }

    for (const promo of promotions) {
      if (promo.category) {
        for (const product of catalog) {
          if (
            product.normalizedCategory === promo.category &&
            !productIds.has(product.id)
          ) {
            productIds.add(product.id);
            result.push(product);
          }
        }
      }
    }

    return result;
  }, [promotions, catalog]);

  const findProduct = (promotion: Promotion) => {
    if (promotion.product_id) {
      return catalog.find((p) => p.id === promotion.product_id);
    }
    return undefined;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('promotionsTitle')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('promotionsSubtitle')}</p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-panel h-64 animate-pulse" />
          ))}
        </div>
      ) : promotions.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Tag size={48} className="text-slate-300" />
          <p className="mt-4 text-lg font-semibold text-slate-500">{t('promotionsEmpty')}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {promotions.map((promotion) => (
              <PromotionCard
                key={promotion.id}
                promotion={promotion}
                product={findProduct(promotion)}
              />
            ))}
          </div>

          {promoProducts.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{t('promotionsOnSale')}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t('promotionsOnSaleCopy', { count: promoProducts.length })}
                </p>
              </div>
              <ProductGrid products={promoProducts} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
