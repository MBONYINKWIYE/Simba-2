import { startTransition, useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router-dom';
import { CategoryStrip } from '@/components/shop/category-strip';
import { Hero } from '@/components/shop/hero';
import { ProductGrid } from '@/components/shop/product-grid';
import { SearchFilterBar } from '@/components/shop/search-filter-bar';
import { SkeletonGrid } from '@/components/shop/skeleton-grid';
import { useCatalogAiSearch } from '@/hooks/use-catalog-ai-search';
import { useCatalog } from '@/hooks/use-catalog';
import { useShopReviewSummary } from '@/hooks/use-reviews';
import { useShops, useNearestShop } from '@/hooks/use-shops';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { slugify, haversineDistanceInKm } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [localQuery, setLocalQuery] = useState(filters.query);
  const [aiQuery, setAiQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiProductIds, setAiProductIds] = useState<number[]>([]);
  const [aiError, setAiError] = useState('');
  
  const debouncedQuery = useDebouncedValue(localQuery, 300);
  
  const shopsQuery = useShops();
  const { nearestShop, coords } = useNearestShop();
  const selectedShopId = useCartStore((state) => state.selectedShopId);
  const setSelectedShop = useCartStore((state) => state.setSelectedShop);
  const shopReviewSummaryQuery = useShopReviewSummary();

  useEffect(() => {
    if (nearestShop && !selectedShopId) {
      setSelectedShop(nearestShop.id);
    }
  }, [nearestShop, selectedShopId, setSelectedShop]);
  const aiSearch = useCatalogAiSearch();
  const products = data?.products ?? [];
  const requestedCategory = searchParams.get('category') ?? '';

  const catalogIndex = useMemo(() => {
    const indexedProducts: Array<{ product: Product; searchableText: string }> = [];
    const categorySet = new Set<string>();
    let maxPrice = 0;

    for (const product of products) {
      categorySet.add(product.normalizedCategory);
      maxPrice = Math.max(maxPrice, product.price);
      indexedProducts.push({
        product,
        searchableText: `${product.name} ${product.normalizedCategory} ${product.unit}`.toLowerCase(),
      });
    }

    return {
      indexedProducts,
      categories: Array.from(categorySet).sort(),
      maxPrice,
    };
  }, [products]);

  useEffect(() => {
    const nextCategory = catalogIndex.categories.includes(requestedCategory) ? requestedCategory : '';
    const nextMaxPrice = catalogIndex.maxPrice || defaultFilters.priceRange[1];

    setFilters((current) => {
      const nextPriceLimit = Math.min(current.priceRange[1], nextMaxPrice);
      if (current.category === nextCategory && current.priceRange[1] === nextPriceLimit) {
        return current;
      }

      return {
        ...current,
        category: nextCategory,
        priceRange: [0, nextPriceLimit],
      };
    });
  }, [catalogIndex.categories, catalogIndex.maxPrice, requestedCategory]);

  useEffect(() => {
    if (!location.hash && !requestedCategory) {
      return;
    }

    const catalogSection = document.getElementById('catalog');
    if (!catalogSection) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [location.hash, requestedCategory, products.length]);

  const syncCategoryParam = (category: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (category) {
      nextParams.set('category', category);
    } else {
      nextParams.delete('category');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const updateFilters = (nextFilters: Filters) => {
    syncCategoryParam(nextFilters.category);
    setAiAnswer('');
    setAiError('');
    setAiProductIds([]);
    
    if (nextFilters.query !== localQuery) {
      setLocalQuery(nextFilters.query);
    }
    
    startTransition(() => {
      setFilters(nextFilters);
    });
  };

  const filteredProducts = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();
    const next: Product[] = [];

    for (const entry of catalogIndex.indexedProducts) {
      const { product, searchableText } = entry;

      if (filters.category && product.normalizedCategory !== filters.category) {
        continue;
      }

      if (filters.inStockOnly && !product.inStock) {
        continue;
      }

      if (product.price > filters.priceRange[1]) {
        continue;
      }

      if (query && !searchableText.includes(query)) {
        continue;
      }

      next.push(product);
    }

    if (filters.sortBy === 'price-asc') {
      next.sort((a, b) => a.price - b.price);
    }

    if (filters.sortBy === 'price-desc') {
      next.sort((a, b) => b.price - a.price);
    }

    return next;
  }, [catalogIndex.indexedProducts, debouncedQuery, filters.category, filters.inStockOnly, filters.priceRange[1], filters.sortBy]);

  const spotlightProducts = useMemo<Product[]>(() => products.slice(0, 12), [products]);
  const featuredProducts = useMemo<Product[]>(() => products.slice(0, 6), [products]);
  const activeMaxPrice = catalogIndex.maxPrice || defaultFilters.priceRange[1];
  const aiProducts = useMemo(
    () => aiProductIds.map((id) => products.find((product) => product.id === id)).filter(Boolean) as Product[],
    [aiProductIds, products],
  );
  const showCategorySections =
    aiProducts.length === 0 &&
    !filters.query &&
    !filters.category &&
    !filters.inStockOnly &&
    filters.priceRange[1] === activeMaxPrice &&
    filters.sortBy === 'default';
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>();
    const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));

    for (const product of sortedProducts) {
      const current = groups.get(product.normalizedCategory) ?? [];
      if (current.length < 15) {
        current.push(product);
      }
      groups.set(product.normalizedCategory, current);
    }

    return Array.from(groups.entries());
  }, [products]);

  const displayedProducts = aiProducts.length > 0 ? aiProducts : filteredProducts;
  const shopReviewSummary = new Map(
    (shopReviewSummaryQuery.data ?? []).map((entry) => [entry.shop_id, entry]),
  );

  const handleAiSearch = async () => {
    const query = aiQuery.trim();

    if (!query) {
      return;
    }

    setAiError('');
    setAiAnswer('');
    setAiProductIds([]);

    try {
      const result = await aiSearch.mutateAsync({ query, products });
      setAiAnswer(result.answer);
      setAiProductIds(result.productIds);
      setFilters((current) => ({ ...current, query: '' }));
    } catch (error) {
      setAiError(t('aiSearchFallback'));
      setFilters((current) => ({ ...current, query }));
    }
  };

  const handleAiQueryChange = (value: string) => {
    setAiQuery(value);

    if (!value.trim()) {
      setAiAnswer('');
      setAiError('');
      setAiProductIds([]);
    }
  };

  return (
    <div className="space-y-8">
      <Hero
        productCount={products.length}
        branchNames={(shopsQuery.data ?? []).map((shop) => shop.name)}
      />
      <section className="grid gap-4 md:grid-cols-3">
        {(shopsQuery.data ?? []).slice(0, 3).map((shop) => {
          const reviewSummary = shopReviewSummary.get(shop.id);
          const distance = coords ? haversineDistanceInKm(coords, shop) : null;
          const isNearest = nearestShop?.id === shop.id;
          const isSelected = selectedShopId === shop.id;

          return (
            <article
              key={shop.id}
              onClick={() => setSelectedShop(shop.id)}
              className={`cursor-pointer transition-all glass-panel p-5 border-2 ${
                isSelected ? 'border-brand-500 ring-2 ring-brand-200' : 'border-transparent'
              }`}
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {t('branchCardLabel')}
                </p>
                {isNearest && (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700 uppercase tracking-wider">
                    {t('nearest')}
                  </span>
                )}
              </div>
              <h2 className="mt-3 text-xl font-bold">{shop.name}</h2>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">{shop.address}</p>
                {distance !== null && (
                  <span className="text-xs font-medium text-slate-400">
                    {distance.toFixed(1)} km
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{shop.phone}</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-sm font-medium dark:bg-slate-800">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                {reviewSummary
                  ? t('shopRatingValue', { rating: Number(reviewSummary.average_rating).toFixed(1), count: reviewSummary.review_count })
                  : t('shopRatingEmpty')}
              </div>
            </article>
          );
        })}
      </section>
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{t('featuredProductsTitle')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('featuredProductsCopy')}</p>
          </div>
        </div>
        <ProductGrid products={featuredProducts} />
      </section>
      {data ? (
        <CategoryStrip
          products={spotlightProducts}
          selectedCategory={filters.category}
          onCategorySelect={(category) => updateFilters({ ...filters, category })}
        />
      ) : null}
      <SearchFilterBar
        categories={catalogIndex.categories}
        maxPrice={catalogIndex.maxPrice}
        filters={{ ...filters, query: localQuery }}
        onChange={(nextFilters) => {
          setLocalQuery(nextFilters.query);
          updateFilters(nextFilters);
        }}
        aiQuery={aiQuery}
        onAiQueryChange={handleAiQueryChange}
        onAiSearch={() => void handleAiSearch()}
        aiAnswer={aiAnswer}
        aiError={aiError}
        isAiSearching={aiSearch.isPending}
      />
      {showCategorySections ? (
        isLoading ? (
          <SkeletonGrid />
        ) : (
          <div className="space-y-12">
            {groupedProducts.map(([category, products]) => (
              <section key={category} id={`category-${slugify(category)}`} className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">{category}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t('showingCategoryProducts', { count: products.length })}
                    </p>
                  </div>
                </div>
                <ProductGrid products={products} />
              </section>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {t('productCount', { count: displayedProducts.length })}
          </div>
          {isLoading ? <SkeletonGrid /> : <ProductGrid products={displayedProducts} />}
        </>
      )}
    </div>
  );
}
