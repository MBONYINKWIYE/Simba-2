import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FEATURED_CATEGORY_ART } from '@/lib/constants';
import type { Product } from '@/types';

export function CategoryStrip({
  products,
  selectedCategory,
  onCategorySelect,
}: {
  products: Product[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}) {
  const { t, i18n } = useTranslation();

  const topCategories = useMemo(() => {
    const counts = products.reduce<Record<string, number>>((acc, product) => {
      acc[product.normalizedCategory] = (acc[product.normalizedCategory] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name]) => name);
  }, [products]);

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">{t('featuredCategories')}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {FEATURED_CATEGORY_ART.map((item, index) => {
          const category = topCategories[index] ?? topCategories[0] ?? '';
          return (
            <button
              key={item.key}
              className={`group relative overflow-hidden rounded-3xl text-left shadow-soft ${
                selectedCategory === category ? 'ring-2 ring-brand-400' : ''
              }`}
              onClick={() => onCategorySelect(category)}
            >
              <img
                src={item.image}
                alt={item.title[i18n.language as 'en' | 'fr' | 'rw']}
                className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.24em] text-white/70">{category}</p>
                <p className="mt-2 text-2xl font-bold">{item.title[i18n.language as 'en' | 'fr' | 'rw']}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
