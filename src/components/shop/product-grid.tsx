import { useTranslation } from 'react-i18next';
import type { Product } from '@/types';
import { ProductCard } from '@/components/shop/product-card';

export function ProductGrid({ products }: { products: Product[] }) {
  const { t } = useTranslation();

  if (products.length === 0) {
    return (
      <div className="glass-panel mt-6 p-10 text-center text-slate-500 dark:text-slate-400">
        {t('noResults')}
      </div>
    );
  }

  return (
    <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </section>
  );
}
