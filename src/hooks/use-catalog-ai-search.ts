import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CatalogAiSearchResult, Product } from '@/types';

type CatalogAiSearchArgs = {
  query: string;
  products: Product[];
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'for',
  'i',
  'in',
  'is',
  'me',
  'need',
  'of',
  'on',
  'or',
  'please',
  'show',
  'the',
  'to',
  'want',
  'with',
]);

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function buildLocalAiFallback({ query, products }: CatalogAiSearchArgs): CatalogAiSearchResult {
  const tokens = tokenize(query);

  if (tokens.length === 0) {
    return {
      answer: 'Try a more specific request like milk, rice, breakfast items, or cleaning supplies.',
      productIds: [],
    };
  }

  const rankedProducts = products
    .map((product) => {
      const searchableText =
        `${product.name} ${product.category} ${product.normalizedCategory} ${product.unit}`.toLowerCase();

      let score = product.inStock ? 3 : 0;

      for (const token of tokens) {
        if (product.name.toLowerCase().includes(token)) {
          score += 8;
        } else if (searchableText.includes(token)) {
          score += 4;
        }
      }

      if (tokens.length > 1 && tokens.every((token) => searchableText.includes(token))) {
        score += 6;
      }

      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.product.price - right.product.price)
    .slice(0, 8);

  if (rankedProducts.length === 0) {
    return {
      answer:
        'I could not find a close product match in the current catalog. Try a brand, category, or simpler keywords.',
      productIds: [],
    };
  }

  const matchedNames = rankedProducts.slice(0, 3).map((entry) => entry.product.name).join(', ');
  const matchedCount = rankedProducts.length;

  return {
    answer:
      matchedCount === 1
        ? `I found 1 close match for "${query}": ${matchedNames}.`
        : `I found ${matchedCount} close matches for "${query}", including ${matchedNames}.`,
    productIds: rankedProducts.map((entry) => entry.product.id),
  };
}

async function searchCatalogWithAi({ query, products }: CatalogAiSearchArgs): Promise<CatalogAiSearchResult> {
  if (!supabase) {
    return buildLocalAiFallback({ query, products });
  }

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
    console.warn('AI search function failed; using local fallback instead.', error);
    return buildLocalAiFallback({ query, products });
  }

  if (!data) {
    return buildLocalAiFallback({ query, products });
  }

  return data;
}

export function useCatalogAiSearch() {
  return useMutation({
    mutationFn: searchCatalogWithAi,
  });
}
