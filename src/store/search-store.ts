import { create } from 'zustand';

export type SearchFilters = {
  query: string;
  category: string;
  inStockOnly: boolean;
  priceRange: [number, number];
  sortBy: 'default' | 'price-asc' | 'price-desc';
};

export const defaultFilters: SearchFilters = {
  query: '',
  category: '',
  inStockOnly: false,
  priceRange: [0, 300000],
  sortBy: 'default',
};

interface SearchState {
  filters: SearchFilters;
  aiAnswer: string;
  aiError: string;
  aiProductIds: number[];
  isAiSearching: boolean;
  hasActiveSearch: boolean;
  setFilters: (filters: Partial<SearchFilters> | ((state: SearchFilters) => SearchFilters)) => void;
  setAiResult: (result: { answer: string; productIds: number[]; error?: string }) => void;
  setIsAiSearching: (isSearching: boolean) => void;
  setHasActiveSearch: (hasActive: boolean) => void;
  resetFilters: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  filters: defaultFilters,
  aiAnswer: '',
  aiError: '',
  aiProductIds: [],
  isAiSearching: false,
  hasActiveSearch: false,
  setFilters: (update) =>
    set((state) => {
      const newFilters = typeof update === 'function' ? update(state.filters) : { ...state.filters, ...update };
      const queryChanged = newFilters.query !== state.filters.query;
      
      return {
        filters: newFilters,
        hasActiveSearch: newFilters.query.trim().length > 0 || state.aiAnswer.length > 0 || state.aiError.length > 0,
        // Reset AI results ONLY when the search query changes
        ...(queryChanged ? {
          aiAnswer: '',
          aiError: '',
          aiProductIds: [],
        } : {}),
      };
    }),
  setAiResult: (result) =>
    set({
      aiAnswer: result.answer,
      aiProductIds: result.productIds,
      aiError: result.error ?? '',
      hasActiveSearch: true,
    }),
  setIsAiSearching: (value) => set({ isAiSearching: value }),
  setHasActiveSearch: (hasActive) => set({ hasActiveSearch: hasActive }),
  resetFilters: () => set({ filters: defaultFilters, aiAnswer: '', aiError: '', aiProductIds: [], hasActiveSearch: false }),
}));
