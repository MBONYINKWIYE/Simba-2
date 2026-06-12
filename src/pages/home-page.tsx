import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Sparkles, Star, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router-dom';
import { CategoryStrip } from '@/components/shop/category-strip';
import { Hero } from '@/components/shop/hero';
import { ProductGrid } from '@/components/shop/product-grid';
import { SkeletonGrid } from '@/components/shop/skeleton-grid';
import { useCatalog } from '@/hooks/use-catalog';
import { useShopReviewSummary } from '@/hooks/use-reviews';
import { useShops, useNearestShop } from '@/hooks/use-shops';
import { slugify, haversineDistanceInKm } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import type { Product } from '@/types';
import { useSearchStore } from '@/store/search-store';
import { useCatalogAiSearch } from '@/hooks/use-catalog-ai-search';
import { Button } from '@/components/ui/button';

export function HomePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useCatalog();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const { 
    filters, 
    setFilters, 
    aiAnswer, 
    aiError, 
    aiProductIds,
    setAiResult,
    setIsAiSearching,
    isAiSearching
  } = useSearchStore();

  const aiSearch = useCatalogAiSearch();

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

    if (filters.category !== nextCategory && requestedCategory && !filters.query.trim()) {
      setFilters({ category: nextCategory });
    }
  }, [catalogIndex.categories, requestedCategory, setFilters, filters.query]);

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

  const updateFilters = (nextFilters: Partial<typeof filters>) => {
    if ('category' in nextFilters) {
      syncCategoryParam(nextFilters.category || '');
    }
    setFilters(nextFilters);
  };

  const branchesScrollRef = useRef<HTMLDivElement>(null);
  const [branchesAnimating, setBranchesAnimating] = useState(true);

  useEffect(() => {
    const container = branchesScrollRef.current;
    if (!container) return;

    let animationFrameId: number;
    let lastTime = 0;
    const speed = 0.5;

    const animate = (currentTime: number) => {
      if (!branchesAnimating) return;
      
      if (lastTime === 0) {
        lastTime = currentTime;
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = currentTime - lastTime;
      const scrollAmount = speed * (deltaTime / 16.67);
      
      container.scrollLeft += scrollAmount;

      if (container.scrollLeft >= container.scrollWidth - container.clientWidth - 1) {
        container.scrollLeft = 0;
      }

      lastTime = currentTime;
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [branchesAnimating]);

  const aiProducts = useMemo(
    () => aiProductIds.map((id) => products.find((product) => product.id === id)).filter(Boolean) as Product[],
    [aiProductIds, products],
  );

  const filteredAiProducts = useMemo(() => {
    if (aiProducts.length === 0) return [];
    
    // When showing AI results, we trust the AI's 'reasoning' logic.
    // We only apply filters if they are active AND were likely intentional (like inStockOnly).
    // We ignore category filtering for AI results because the AI might suggest items from multiple categories.
    return aiProducts.filter(product => {
      if (filters.inStockOnly && !product.inStock) return false;
      if (product.price > filters.priceRange[1]) return false;
      return true;
    });
  }, [aiProducts, filters.inStockOnly, filters.priceRange]);

  const hasActiveSearch = filters.query.trim().length > 0 || aiProducts.length > 0;
  const showCategorySections =
    aiProducts.length === 0 &&
    !filters.query &&
    !filters.category &&
    !filters.inStockOnly &&
    filters.sortBy === 'default';

  const spotlightProducts = useMemo<Product[]>(() => products.slice(0, 12), [products]);
  const featuredProducts = useMemo<Product[]>(() => products.slice(0, 6), [products]);
  const CHUNK_SIZE = 20;
  const [visibleLimit, setVisibleLimit] = useState(CHUNK_SIZE);

  const filteredProducts = useMemo(() => {
    const rawQuery = filters.query.trim().toLowerCase();
    
    // Loosen keyword matching for conversational queries
    const stopWords = new Set(['do', 'you', 'have', 'show', 'me', 'the', 'all', 'kinds', 'of', 'can', 'i', 'find', 'get', 'any']);
    const queryTokens = rawQuery
      .split(/\s+/)
      .filter(token => token.length > 1 && !stopWords.has(token));

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

      if (queryTokens.length > 0) {
        const isMatch = queryTokens.every(token => searchableText.includes(token));
        if (!isMatch) continue;
      } else if (rawQuery.length > 0) {
        if (!searchableText.includes(rawQuery)) continue;
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
  }, [catalogIndex.indexedProducts, filters]);

  const displayedProducts = aiProducts.length > 0 ? filteredAiProducts : filteredProducts;
  const catalogProducts = displayedProducts.slice(0, visibleLimit);
  const hasMoreProducts = visibleLimit < displayedProducts.length;

  const isConversational = useMemo(() => {
    const query = filters.query.trim();
    if (query.length < 10) return false;
    const tokens = query.split(/\s+/);
    return tokens.length >= 3;
  }, [filters.query]);

  const handleAiSearchTrigger = async () => {
    if (!filters.query.trim() || isAiSearching) return;
    
    setIsAiSearching(true);
    try {
      const result = await aiSearch.mutateAsync({ query: filters.query.trim(), products });
      setAiResult({ answer: result.answer, productIds: result.productIds });
    } catch (error) {
      setAiResult({ answer: '', productIds: [], error: t('aiSearchFallback') });
    } finally {
      setIsAiSearching(false);
    }
  };

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>();
    const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));

    for (const product of sortedProducts) {
      const current = groups.get(product.normalizedCategory) ?? [];
      if (current.length < 6) {
        current.push(product);
      }
      groups.set(product.normalizedCategory, current);
    }

    return Array.from(groups.entries());
  }, [products]);

  const shopReviewSummary = new Map(
    (shopReviewSummaryQuery.data ?? []).map((entry) => [entry.shop_id, entry]),
  );

  const branchesCards = (shopsQuery.data ?? []).slice(0, 3).map((shop) => {
    const reviewSummary = shopReviewSummary.get(shop.id);
    const distance = coords ? haversineDistanceInKm(coords, shop) : null;
    const isNearest = nearestShop?.id === shop.id;
    const isSelected = selectedShopId === shop.id;

    return (
      <article
        key={`${shop.id}-original`}
        onClick={() => setSelectedShop(shop.id)}
        className={`cursor-pointer transition-all glass-panel p-5 border-2 flex-shrink-0 w-[300px] sm:w-[340px] md:w-[360px] ${
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
  });

  return (
    <div className="space-y-8">
      {!hasActiveSearch && (
        <Hero
          productCount={products.length}
          branchNames={(shopsQuery.data ?? []).map((shop) => shop.name)}
        />
      )}
      <div id="catalog" />
       {hasActiveSearch ? (
         <section className="space-y-6">
           {(aiAnswer || aiError) && (
             <div className="relative p-6 bg-brand-50/50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/30 rounded-[2.5rem] animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="flex items-start gap-4">
                 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/20">
                   <Bot size={22} />
                 </div>
                 <div className="flex-1 pt-1">
                   <h3 className="text-sm font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">
                     {t('aiSearchTitle')}
                   </h3>
                   <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium italic">
                     "{aiAnswer || aiError}"
                   </p>
                 </div>
                  <button 
                    onClick={() => setAiResult({ answer: '', productIds: aiProductIds, error: '' })}
                    className="p-1 hover:bg-brand-100 dark:hover:bg-brand-900/30 rounded-xl transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
               </div>
             </div>
           )}

           <div className="flex items-end justify-between gap-4 px-2">
             <div>
               <h2 className="text-2xl font-bold tracking-tight">
                 {isAiSearching ? t('aiSearching') || 'Simba AI is reasoning...' : (aiProducts.length > 0 ? t('aiSearchTitle') : t('searchResults'))}
               </h2>
               <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                 {isAiSearching 
                   ? t('aiAnalyzing') || 'Finding the best products for your situation...' 
                   : `${t('productCount', { count: displayedProducts.length })} ${filters.query ? `for "${filters.query}"` : ''}`}
               </p>
             </div>
           </div>

           {isAiSearching ? (
             <SkeletonGrid />
           ) : displayedProducts.length > 0 ? (
             <ProductGrid products={catalogProducts} />
           ) : (
             <div className="flex flex-col items-center justify-center py-20 px-4 text-center glass-panel rounded-[3rem] border-brand-100/50 bg-white/50 dark:bg-slate-900/50">
               <div className="relative mb-6">
                 <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center animate-pulse">
                   <Bot size={40} className="text-brand-500" />
                 </div>
                 <div className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-lg">
                   <Sparkles size={16} />
                 </div>
               </div>
               <h3 className="text-xl font-bold mb-2">
                 {isConversational ? t('aiSearchTitle') : t('noResults')}
               </h3>
               <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                 {isConversational 
                    ? t('aiSearchHint') 
                    : (t('noResultsHint') || "We couldn't find any direct matches. Try adjusting your filters or ask Simba AI for a recommendation.")
                 }
               </p>
               <Button 
                 onClick={handleAiSearchTrigger}
                 disabled={isAiSearching || !filters.query.trim()}
                 className="h-14 px-8 rounded-2xl gap-3 shadow-xl shadow-brand-500/20 bg-brand-500 hover:bg-brand-600 text-white transition-all hover:scale-105 active:scale-95"
               >
                 {isAiSearching ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                 ) : (
                    <Sparkles size={20} />
                 )}
                 {t('aiSearchButton')}
               </Button>
             </div>
           )}

           {hasMoreProducts && displayedProducts.length > 0 && (
             <div className="mt-12 flex justify-center pb-8">
               <button
                 onClick={() => setVisibleLimit((prev) => prev + CHUNK_SIZE)}
                 className="rounded-full bg-white px-8 py-3 text-sm font-bold shadow-soft transition-all hover:scale-105 active:scale-95 dark:bg-slate-900"
               >
                 Show more
               </button>
             </div>
           )}
         </section>
       ) : (
         <>
            <section className="mt-8">
              <div
               ref={branchesScrollRef}
               className="overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide"
               onMouseEnter={() => setBranchesAnimating(false)}
               onMouseLeave={() => setBranchesAnimating(true)}
               style={{ scrollBehavior: 'auto' }}
             >
               <div className="flex gap-4 min-w-max">
                 {branchesCards}
                 {branchesCards}
               </div>
             </div>
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
              {isLoading ? <SkeletonGrid /> : (
                <>
                  <ProductGrid products={catalogProducts} />
                  {hasMoreProducts && (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={() => setVisibleLimit((prev) => prev + CHUNK_SIZE)}
                        className="cursor-pointer rounded-full border border-gray-300 bg-white px-8 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:shadow-md dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        Show more
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
