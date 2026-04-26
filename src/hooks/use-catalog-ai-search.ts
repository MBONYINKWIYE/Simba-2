import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import type { CatalogAiSearchResult, CatalogSearchContext, Product } from '@/types';

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

const OCCASION_HINTS: Array<[RegExp, string]> = [
  [/\bbreakfast\b|\bmorning\b/i, 'breakfast or morning meals'],
  [/\blunch\b|\bmeal prep\b/i, 'lunch or meal prep'],
  [/\bdinner\b|\bevening\b/i, 'dinner'],
  [/\bguests?\b|\bparty\b|\bhanging out\b/i, 'hosting guests or a small gathering'],
  [/\bbaby\b|\bkid(s)?\b|\bchildren\b/i, 'kids or family use'],
  [/\btravel\b|\btrip\b|\broad trip\b/i, 'travel'],
  [/\bclean(ing)?\b|\bhouse\b|\bkitchen\b/i, 'cleaning or household tasks'],
  [/\boffice\b|\bwork\b/i, 'work or office needs'],
  [/\bschool\b|\bstudent\b|\bback to school\b/i, 'school needs'],
];

const AUDIENCE_HINTS: Array<[RegExp, string]> = [
  [/\bkids?\b|\bchildren\b/i, 'kids'],
  [/\bfamily\b/i, 'family'],
  [/\bguests?\b|\bparty\b/i, 'guests'],
  [/\bone person\b|\bmyself\b/i, 'one person'],
];

const DIETARY_HINTS: Array<[RegExp, string]> = [
  [/\bhealthy\b|\blight\b/i, 'healthier options'],
  [/\bvegan\b/i, 'vegan-friendly options'],
  [/\bvegetarian\b/i, 'vegetarian options'],
  [/\bgluten[- ]free\b/i, 'gluten-free options'],
  [/\bno sugar\b|\blow sugar\b|\bdiabetic\b/i, 'lower-sugar options'],
];

const URGENCY_HINTS: Array<[RegExp, string]> = [
  [/\btonight\b|\bnow\b|\burgent\b|\bquick\b|\bfast\b/i, 'urgent'],
  [/\btoday\b/i, 'for today'],
  [/\bthis week\b/i, 'for this week'],
];

const PRODUCT_HINTS = [
  'milk',
  'bread',
  'eggs',
  'rice',
  'pasta',
  'oil',
  'soap',
  'detergent',
  'water',
  'snack',
  'juice',
  'tea',
  'coffee',
  'baby',
  'diaper',
  'cleaning',
  'breakfast',
  'lunch',
  'dinner',
];

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function detectHint(query: string, patterns: Array<[RegExp, string]>) {
  for (const [pattern, value] of patterns) {
    if (pattern.test(query)) {
      return value;
    }
  }

  return null;
}

function extractSearchContext(query: string): CatalogSearchContext {
  const normalizedQuery = query.trim().toLowerCase();
  const tokens = tokenize(query);
  const filteredHints = Array.from(new Set(tokens.filter((token) => PRODUCT_HINTS.some((hint) => hint.includes(token) || token.includes(hint)))));

  const budgetMatch =
    query.match(/\b(?:under|below|less than|around|about|budget(?: of)?)\s*(?:rwf\s*)?([\d,]+)\s*([kK]?)\b/) ??
    query.match(/\b([\d,]+)\s*([kK])\b/);

  const budget =
    budgetMatch?.[1]
      ? `${budgetMatch[1].replace(/,/g, '')}${budgetMatch[2]?.toLowerCase() === 'k' ? 'k' : ''} RWF`
      : null;

  const intent =
    normalizedQuery.includes('recommend') || normalizedQuery.includes('suggest')
      ? 'recommendation request'
      : normalizedQuery.includes('need') || normalizedQuery.includes('want') || normalizedQuery.includes('looking for')
        ? 'shopping request'
        : 'shopping search';

  return {
    intent,
    occasion: detectHint(query, OCCASION_HINTS),
    audience: detectHint(query, AUDIENCE_HINTS),
    budget,
    urgency: detectHint(query, URGENCY_HINTS),
    dietaryPreference: detectHint(query, DIETARY_HINTS),
    productHints: filteredHints,
    normalizedQuery,
  };
}

function buildContextSummary(context: CatalogSearchContext, t: (key: string, options?: any) => string) {
  const parts: string[] = [];

  if (context.occasion) {
    parts.push(context.occasion);
  }

  if (context.audience) {
    parts.push(`${t('for')} ${context.audience}`);
  }

  if (context.dietaryPreference) {
    parts.push(context.dietaryPreference);
  }

  if (context.budget) {
    parts.push(`${t('budget')} ${context.budget}`);
  }

  if (context.urgency) {
    parts.push(context.urgency);
  }

  if (parts.length === 0) {
    return context.intent;
  }

  return `${context.intent}: ${parts.join(', ')}`;
}

function buildLocalAiFallback({ query, products }: CatalogAiSearchArgs, t: (key: string, options?: any) => string): CatalogAiSearchResult {
  const context = extractSearchContext(query);
  const tokens = tokenize(query);
  const contextualTokens = tokenize([context.occasion, context.audience, context.dietaryPreference, context.urgency].filter(Boolean).join(' '));
  const searchTokens = Array.from(new Set([...tokens, ...contextualTokens, ...context.productHints]));

  if (searchTokens.length === 0) {
    return {
      answer: t('aiSearchNoTokens'),
      productIds: [],
    };
  }

  const rankedProducts = products
    .map((product) => {
      const searchableText =
        `${product.name} ${product.category} ${product.normalizedCategory} ${product.unit}`.toLowerCase();

      let score = product.inStock ? 3 : 0;

      for (const token of searchTokens) {
        if (product.name.toLowerCase().includes(token)) {
          score += 8;
        } else if (searchableText.includes(token)) {
          score += 4;
        }
      }

      if (searchTokens.length > 1 && searchTokens.every((token) => searchableText.includes(token))) {
        score += 6;
      }

      if (context.occasion && searchableText.includes(context.occasion.split(' ')[0])) {
        score += 2;
      }

      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.product.price - right.product.price)
    .slice(0, 8);

  if (rankedProducts.length === 0) {
    return {
      answer: t('aiSearchNoMatches'),
      productIds: [],
    };
  }

  const matchedNames = rankedProducts.slice(0, 3).map((entry) => entry.product.name).join(', ');
  const matchedCount = rankedProducts.length;
  const contextSummary = buildContextSummary(context, t);

  return {
    answer:
      matchedCount === 1
        ? t('aiSearchSingleMatch', { context: contextSummary, query, name: matchedNames })
        : t('aiSearchMultipleMatches', { context: contextSummary, query, count: matchedCount, names: matchedNames }),
    productIds: rankedProducts.map((entry) => entry.product.id),
  };
}

async function searchCatalogWithAi({ query, products }: CatalogAiSearchArgs, t: (key: string, options?: any) => string): Promise<CatalogAiSearchResult> {
  if (!supabase) {
    return buildLocalAiFallback({ query, products }, t);
  }

  const catalogContext = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    unit: product.unit,
    inStock: product.inStock,
  }));
  const context = extractSearchContext(query);

  const { data, error } = await supabase.functions.invoke<CatalogAiSearchResult>('catalog-search', {
    body: {
      query,
      products: catalogContext,
      context,
    },
  });

  if (error) {
    console.warn('AI search function failed; using local fallback instead.', error);
    return buildLocalAiFallback({ query, products }, t);
  }

  if (!data) {
    return buildLocalAiFallback({ query, products }, t);
  }

  return data;
}

export function useCatalogAiSearch() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (args: CatalogAiSearchArgs) => searchCatalogWithAi(args, t),
  });
}
