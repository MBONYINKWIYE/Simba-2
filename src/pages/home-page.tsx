import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CategoryStrip } from '@/components/shop/category-strip';
import { Hero } from '@/components/shop/hero';
import { ProductGrid } from '@/components/shop/product-grid';
import { SearchFilterBar } from '@/components/shop/search-filter-bar';
import { SkeletonGrid } from '@/components/shop/skeleton-grid';
import { useCatalog } from '@/hooks/use-catalog';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { Product } from '@/types';

type Filters = {
  query: string;
  category: string;
  inStockOnly: boolean;
  priceRange: [number, number];
  sortBy: 'default' | 'price-asc' | 'price-desc';
};

const defaultFilters: Filters = {
  query: '',
  category: '',
  inStockOnly: false,
  priceRange: [0, 300000],
  sortBy: 'default',
};

export function HomePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useCatalog();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const debouncedQuery = useDebouncedValue(filters.query, 250);

  const filteredProducts = useMemo(() => {
    const products = data?.products ?? [];
    const query = debouncedQuery.trim().toLowerCase();

    const next = products
      .filter((product) => (filters.category ? product.normalizedCategory === filters.category : true))
      .filter((product) => (filters.inStockOnly ? product.inStock : true))
      .filter((product) => product.price <= filters.priceRange[1])
      .filter((product) => {
        if (!query) return true;
        return [product.name, product.normalizedCategory, product.unit].some((field) =>
          field.toLowerCase().includes(query),
        );
      });

    if (filters.sortBy === 'price-asc') {
      next.sort((a, b) => a.price - b.price);
    }

    if (filters.sortBy === 'price-desc') {
      next.sort((a, b) => b.price - a.price);
    }

    return next;
  }, [data?.products, debouncedQuery, filters]);

  const spotlightProducts = useMemo<Product[]>(() => (data?.products ?? []).slice(0, 12), [data?.products]);

  return (
    <div className="space-y-8">
      <Hero />
      {data ? (
        <CategoryStrip
          products={spotlightProducts}
          selectedCategory={filters.category}
          onCategorySelect={(category) => setFilters((current) => ({ ...current, category }))}
        />
      ) : null}
      <SearchFilterBar products={data?.products ?? []} filters={filters} onChange={setFilters} />
      <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        {t('productCount', { count: filteredProducts.length })}
      </div>
      {isLoading ? <SkeletonGrid /> : <ProductGrid products={filteredProducts} />}
    </div>
  );
}
