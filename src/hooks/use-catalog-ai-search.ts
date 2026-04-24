import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CatalogAiSearchResult, Product } from '@/types';

type CatalogAiSearchArgs = {
  query: string;
  products: Product[];
};

async function searchCatalogWithAi({ query, products }: CatalogAiSearchArgs): Promise<CatalogAiSearchResult> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  console.log('Starting AI Search for query:', query);

  const catalogContext = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    unit: product.unit,
    inStock: product.inStock,
  }));

  const { data, error } = await supabase.functions.invoke<CatalogAiSearchResult>('catalog-search', {
    body: {
      query,
      products: catalogContext,
    },
  });

  if (error) {
    console.error('AI Search Invoke Error:', error);
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('The AI search service returned no result.');
  }

  return data;
}

export function useCatalogAiSearch() {
  return useMutation({
    mutationFn: searchCatalogWithAi,
  });
}
