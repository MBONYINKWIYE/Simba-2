import { useState, useRef, useEffect } from 'react';
import { Bot, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSearchStore, defaultFilters } from '@/store/search-store';
import { useCatalogAiSearch } from '@/hooks/use-catalog-ai-search';
import { useCatalog } from '@/hooks/use-catalog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function HeaderSearch() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { filters, setFilters, aiAnswer, aiError, isAiSearching, setAiResult, setIsAiSearching, setHasActiveSearch } = useSearchStore();
  const { data } = useCatalog();
  const aiSearch = useCatalogAiSearch();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(filters.query);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const products = data?.products ?? [];
  const categorySet = new Set<string>();
  let maxPrice = 0;
  for (const p of products) {
    categorySet.add(p.normalizedCategory);
    maxPrice = Math.max(maxPrice, p.price);
  }
  const categories = Array.from(categorySet).sort();

  useEffect(() => {
    setLocalQuery(filters.query);
  }, [filters.query]);

  const handleAiSearch = async (forceQuery?: string) => {
    const trimmedQuery = (forceQuery ?? localQuery).trim();
    if (!trimmedQuery || isAiSearching) return;
    
    setFilters({ ...defaultFilters, query: trimmedQuery });
    setHasActiveSearch(true);

    if (location.pathname !== '/' || location.search.includes('category=')) {
      navigate('/');
    }

    setIsAiSearching(true);
    try {
      const result = await aiSearch.mutateAsync({ query: trimmedQuery, products });
      
      // Small timeout to ensure the store update from setFilters has fully settled
      // and navigation to Home has completed.
      setTimeout(() => {
        setAiResult({ answer: result.answer, productIds: result.productIds });
        setIsAiSearching(false);
        // Scroll to catalog section to show results
        document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch {
      setAiResult({ answer: '', productIds: [], error: t('aiSearchFallback') });
      setIsAiSearching(false);
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative flex flex-1 max-w-2xl mx-2 sm:mx-4 group">
      <div className="relative w-full">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 transition-all duration-300">
          {isAiSearching ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          ) : (
            <Bot size={18} className={cn("transition-transform duration-300", localQuery.trim() ? "scale-110" : "scale-100")} />
          )}
        </div>
        <input
          type="text"
          value={localQuery}
          onChange={(e) => {
            const val = e.target.value;
            setLocalQuery(val);
            setFilters({ query: val });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (location.pathname !== '/') {
                navigate('/#catalog');
              } else {
                document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
              }
              handleAiSearch();
              setIsFiltersOpen(false);
            }
          }}
          placeholder={t('aiSearchPlaceholder')}
          className={cn(
            "w want-flex-1 h-12 pl-12 pr-20 sm:pr-28 rounded-2xl border-2 transition-all duration-300 outline-none text-sm font-medium shadow-sm",
            "bg-white dark:bg-slate-900 border-brand-100 dark:border-brand-900/30",
            "focus:border-brand-400 dark:focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10",
            isAiSearching && "opacity-70 cursor-wait"
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={cn(
              "p-1.5 sm:p-2 rounded-xl transition-all duration-200",
              isFiltersOpen 
                ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400" 
                : "text-brand-500 hover:bg-orange-50 dark:hover:bg-brand-900/20 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
            )}
            title={t('filters')}
            aria-label={t('filters')}
          >
            <SlidersHorizontal size={18} />
          </button>
          <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block" />
          <button
            onClick={() => handleAiSearch()}
            disabled={isAiSearching || !localQuery.trim()}
            className={cn(
              "flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl transition-all duration-300",
              localQuery.trim() && !isAiSearching
                ? "text-brand-600 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100" 
                : "text-brand-400 dark:text-brand-500 pointer-events-none"
            )}
          >
            <Sparkles size={18} className={cn("transition-transform duration-300", localQuery.trim() && "fill-brand-500/10")} />
            <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">{t('aiSearchButton')}</span>
          </button>
        </div>
      </div>

      {isFiltersOpen && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-3 p-5 bg-white dark:bg-slate-900 border-2 border-brand-100 dark:border-brand-900/30 rounded-[2rem] shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="grid gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">{t('categories')}</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ category: e.target.value })}
                  className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 text-sm outline-none transition focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">{t('allCategories')}</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">{t('sortDefault')}</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ sortBy: e.target.value as 'default' | 'price-asc' | 'price-desc' })}
                  className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 text-sm outline-none transition focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="default">{t('sortDefault')}</option>
                  <option value="price-asc">{t('lowToHigh')}</option>
                  <option value="price-desc">{t('highToLow')}</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between py-3 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('inStockOnly')}</span>
              <input
                type="checkbox"
                checked={filters.inStockOnly}
                onChange={(e) => setFilters({ inStockOnly: e.target.checked })}
                className="h-5 w-5 rounded-lg border-slate-300 text-brand-600 focus:ring-brand-500 transition-all cursor-pointer"
              />
            </div>

            <div className="space-y-3 px-1">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t('priceRange', { max: Math.min(filters.priceRange[1], maxPrice).toLocaleString() })}
                </label>
              </div>
              <input
                type="range"
                min={0}
                max={maxPrice}
                value={filters.priceRange[1]}
                onChange={(e) => setFilters({ priceRange: [0, Number(e.target.value)] })}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>
            
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <Button 
                variant="ghost" 
                className="text-xs font-bold text-slate-400 hover:text-rose-500 rounded-xl transition-colors px-4 py-2"
                onClick={() => {
                  useSearchStore.getState().resetFilters();
                  setLocalQuery('');
                }}
              >
                {t('resetFilters')}
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  className="text-xs font-bold rounded-xl px-5 py-2 border-slate-200"
                  onClick={() => setIsFiltersOpen(false)}
                >
                  {t('close')}
                </Button>
                <Button
                  className="text-xs font-bold rounded-xl px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20"
                  onClick={() => setIsFiltersOpen(false)}
                >
                  {t('apply')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {(aiAnswer || aiError) && (
        <div className="absolute top-full left-0 right-0 mt-3 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-brand-200 dark:border-brand-900/50 rounded-[1.5rem] shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-start gap-4">
            <div className="h-8 w-8 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/20">
              <Bot size={18} />
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-relaxed italic">
                "{aiAnswer || aiError}"
              </p>
            </div>
            <button 
              onClick={() => {
                const ids = useSearchStore.getState().aiProductIds;
                useSearchStore.getState().setAiResult({ answer: '', productIds: ids, error: '' });
              }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
