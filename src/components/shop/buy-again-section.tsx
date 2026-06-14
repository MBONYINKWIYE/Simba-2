import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart-store';
import { useCatalog } from '@/hooks/use-catalog';
import { formatCurrency } from '@/lib/utils';
import type { OrderHistoryRecord, Product } from '@/types';

function mapOrderToProducts(
  order: OrderHistoryRecord,
  catalog: Product[],
): { product: Product; quantity: number }[] {
  const catalogMap = new Map(catalog.map((p) => [p.id, p]));
  const result: { product: Product; quantity: number }[] = [];

  for (const item of order.order_items) {
    const product = catalogMap.get(item.product_id);
    if (product && product.inStock) {
      result.push({ product, quantity: item.quantity });
    }
  }

  return result;
}

type Props = {
  orders: OrderHistoryRecord[];
};

export function BuyAgainSection({ orders }: Props) {
  const { t } = useTranslation();
  const addItem = useCartStore((state) => state.addItem);
  const { data: catalogData } = useCatalog();
  const catalog = catalogData?.products ?? [];

  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === 'picked_up' || o.status === 'delivered'),
    [orders],
  );

  if (completedOrders.length === 0) return null;

  const handleAddAll = (order: OrderHistoryRecord) => {
    const items = mapOrderToProducts(order, catalog);
    for (const { product } of items) {
      addItem(product);
    }
  };

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('buyAgainTitle')}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('buyAgainSubtitle')}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {completedOrders.slice(0, 3).map((order) => {
          const items = mapOrderToProducts(order, catalog);
          const missingCount = order.order_items.length - items.length;

          return (
            <div
              key={order.id}
              className="glass-panel flex flex-col p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {new Date(order.created_at).toLocaleDateString()}
              </p>
              <div className="mt-3 flex-1 space-y-2">
                {items.slice(0, 4).map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-slate-500">
                        {quantity} x {formatCurrency(product.price)}
                      </p>
                    </div>
                  </div>
                ))}
                {items.length > 4 && (
                  <p className="text-xs text-slate-400">
                    +{items.length - 4} {t('buyAgainMore')}
                  </p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <p className="text-sm font-semibold">{formatCurrency(order.total_rwf)}</p>
                <Button
                  onClick={() => handleAddAll(order)}
                  className="gap-1.5 bg-orange-500 px-3 py-2 text-xs hover:bg-orange-600"
                  disabled={items.length === 0}
                >
                  <ShoppingCart size={14} />
                  {t('buyAgainButton')}
                </Button>
              </div>
              {missingCount > 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  {t('buyAgainMissing', { count: missingCount })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
