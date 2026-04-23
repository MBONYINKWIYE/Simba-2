import { Bot, Search, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

type FilterState = {
  query: string;
  category: string;
  inStockOnly: boolean;
  priceRange: [number, number];
  sortBy: 'default' | 'price-asc' | 'price-desc';
};

export function SearchFilterBar({
  categories,
  maxPrice,
  filters,
  onChange,
  aiQuery,
  onAiQueryChange,
  onAiSearch,
  aiAnswer,
  aiError,
  isAiSearching,
}: {
  categories: string[];
  maxPrice: number;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  aiQuery: string;
  onAiQueryChange: (value: string) => void;
  onAiSearch: () => void;
  aiAnswer: string;
  aiError: string;
  isAiSearching: boolean;
}) {
  const { t } = useTranslation();

  return (
    <section id="catalog" className="glass-panel mt-8 p-4 sm:p-6">
      <div className="rounded-3xl border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-900 dark:bg-brand-900/10">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white p-3 text-brand-600 dark:bg-slate-900 dark:text-brand-300">
            <Bot size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t('aiSearchTitle')}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('aiSearchHint')}</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
              <input
                value={aiQuery}
                onChange={(event) => onAiQueryChange(event.target.value)}
                placeholder={t('aiSearchPlaceholder')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-brand-200 transition focus:ring dark:border-slate-700 dark:bg-slate-900"
              />
              <Button onClick={onAiSearch} disabled={isAiSearching || !aiQuery.trim()}>
                {isAiSearching ? t('loading') : t('aiSearchButton')}
              </Button>
            </div>
            {aiAnswer ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{aiAnswer}</p> : null}
            {aiError ? <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{aiError}</p> : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-300">
        <SlidersHorizontal size={16} />
        {t('filters')}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <label className="relative block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={filters.query}
            onChange={(event) => onChange({ ...filters, query: event.target.value })}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none ring-brand-200 transition focus:ring dark:border-slate-700 dark:bg-slate-900"
          />
        </label>

        <select
          value={filters.category}
          onChange={(event) => onChange({ ...filters, category: event.target.value })}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
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
          onChange={(event) => onChange({ ...filters, sortBy: event.target.value as FilterState['sortBy'] })}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="default">{t('sortByPrice')}</option>
          <option value="price-asc">{t('lowToHigh')}</option>
          <option value="price-desc">{t('highToLow')}</option>
        </select>

        <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <span className="text-sm font-medium">{t('inStockOnly')}</span>
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(event) => onChange({ ...filters, inStockOnly: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-300"
          />
        </label>
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-sm text-slate-500 dark:text-slate-300">
          Price: 0 RWF - {Math.min(filters.priceRange[1], maxPrice).toLocaleString()} RWF
        </label>
        <input
          type="range"
          min={0}
          max={maxPrice}
          value={filters.priceRange[1]}
          onChange={(event) =>
            onChange({ ...filters, priceRange: [0, Number(event.target.value)] })
          }
          className="w-full accent-brand-500"
        />
      </div>
    </section>
  );
}
