import { useState } from 'react';
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
  onAiSearch,
  aiAnswer,
  aiError,
  isAiSearching,
}: {
  categories: string[];
  maxPrice: number;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onAiSearch: (query: string) => void;
  aiAnswer: string;
  aiError: string;
  isAiSearching: boolean;
}) {
  const { t } = useTranslation();
  const [draftQuery, setDraftQuery] = useState('');

  return (
    <section
      id="catalog"
      className="glass-panel mt-8 border-2 border-brand-200/70 bg-gradient-to-br from-white via-brand-50/30 to-sky-50/50 p-5 shadow-[0_24px_80px_-48px_rgba(25,118,210,0.55)] dark:border-brand-900/60 dark:from-slate-950 dark:via-slate-950 dark:to-sky-950/30 sm:p-6"
    >
      <div className="rounded-[1.75rem] border border-brand-200/80 bg-white/90 p-4 shadow-sm dark:border-brand-900/70 dark:bg-slate-950/75">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-brand-600 p-3 text-white shadow-lg shadow-brand-500/25 dark:bg-brand-500">
              <SlidersHorizontal size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-700 dark:text-brand-300">
                {t('filters')}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                {t('refineYourSearch')}
              </p>
              <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                {t('filtersHint')}
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-200">
            {t('searchAndFilterSection')}
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-brand-200/60 bg-brand-50/70 p-4 dark:border-brand-900/50 dark:bg-brand-900/10">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white p-3 text-brand-600 shadow-sm dark:bg-slate-900 dark:text-brand-300">
              <Bot size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t('aiSearchTitle')}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('aiSearchHint')}</p>
              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                <input
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && draftQuery.trim() && !isAiSearching) {
                      onAiSearch(draftQuery.trim());
                    }
                  }}
                  placeholder={t('aiSearchPlaceholder')}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-brand-200 transition focus:ring dark:border-slate-700 dark:bg-slate-900"
                />
                <Button onClick={() => onAiSearch(draftQuery.trim())} disabled={isAiSearching || !draftQuery.trim()}>
                  {isAiSearching ? t('loading') : t('aiSearchButton')}
                </Button>
              </div>
              {aiAnswer ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{aiAnswer}</p> : null}
              {aiError ? <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{aiError}</p> : null}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr]">
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
            <option value="default">{t('sortDefault')}</option>
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
            className="w-full accent-brand-500"
          />
        </div>
      </div>
    </section>
  );
}
