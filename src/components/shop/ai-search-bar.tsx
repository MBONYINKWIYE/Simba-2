import { useState } from 'react';
import { Bot, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { SearchFilters } from '@/store/search-store';

export function AiSearchBar({
  categories,
  maxPrice,
  filters,
  onChange,
  onAiSearch,
  aiAnswer,
  aiError,
  isAiSearching,
}: {
  categories: string[];
  maxPrice: number;
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  onAiSearch: (query: string) => void;
  aiAnswer: string;
  aiError: string;
  isAiSearching: boolean;
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [localQuery, setLocalQuery] = useState('');

  const handleAiSearch = () => {
    if (!localQuery.trim() || isAiSearching) return;
    onAiSearch(localQuery.trim());
  };

  return (
    <section
      id="catalog"
      className="transition-all duration-300 z-30"
    >
      <div className="glass-panel border-2 border-brand-200/70 bg-gradient-to-br from-white via-brand-50/30 to-sky-50/50 shadow-soft transition-all duration-300 dark:border-brand-900/60 dark:from-slate-950 dark:via-slate-950 dark:to-sky-950/30 p-5 sm:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[280px]">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500" style={{ opacity: isAiSearching ? 1 : 0 }}>
                {isAiSearching ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                ) : (
                  <Bot size={18} />
                )}
              </div>
              <input
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && localQuery.trim() && !isAiSearching) {
                    handleAiSearch();
                  }
                }}
                placeholder={t('aiSearchPlaceholder')}
                className={cn(
                  "w-full rounded-2xl border border-brand-300 bg-white py-3 pl-11 pr-12 outline-none ring-brand-200 transition focus:ring",
                  isAiSearching ? "bg-brand-50/50 dark:bg-brand-900/20" : "dark:border-slate-700 dark:bg-slate-900"
                )}
              />
              <button
                onClick={handleAiSearch}
                disabled={isAiSearching || !localQuery.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-500 transition hover:scale-110 disabled:opacity-30"
                title={t('aiSearchButton')}
              >
                <Sparkles size={20} className="fill-brand-500/10" />
              </button>
            </div>

            <button
              className={cn("h-12 rounded-2xl px-4", isExpanded && "bg-brand-100 dark:bg-brand-900/40")}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <SlidersHorizontal size={18} className="mr-2" />
              {t('filters')}
            </button>
          </div>

          {(aiAnswer || aiError) && (
            <div className="rounded-2xl bg-brand-50/50 p-3 border border-brand-200 dark:bg-brand-900/10 dark:border-brand-900/40">
              <div className="flex items-start gap-3">
                <Bot className="text-brand-600 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{aiAnswer || aiError}</p>
              </div>
            </div>
          )}

          <div className={cn(
            "grid gap-3 transition-all duration-300 overflow-hidden",
            isExpanded ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"
          )}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2 border-t border-brand-200/30 dark:border-brand-900/30">
              <select
                value={filters.category}
                onChange={(event) => onChange({ ...filters, category: event.target.value })}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">{t('allCategories')}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={filters.sortBy}
                onChange={(event) => onChange({ ...filters, sortBy: event.target.value as 'default' | 'price-asc' | 'price-desc' })}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="default">{t('sortDefault')}</option>
                <option value="price-asc">{t('lowToHigh')}</option>
                <option value="price-desc">{t('highToLow')}</option>
              </select>

              <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <span className="font-medium">{t('inStockOnly')}</span>
                <input
                  type="checkbox"
                  checked={filters.inStockOnly}
                  onChange={(event) => onChange({ ...filters, inStockOnly: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-300"
                />
              </label>

              <div className="px-2">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t('priceRange', { max: Math.min(filters.priceRange[1], maxPrice).toLocaleString() })}
                </label>
                <input
                  type="range"
                  min={0}
                  max={maxPrice}
                  value={filters.priceRange[1]}
                  onChange={(event) =>
                    onChange({ ...filters, priceRange: [0, Number(event.target.value)] })
                  }
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
