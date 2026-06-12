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
  'all',
  'an',
  'and',
  'any',
  'are',
  'buy',
  'can',
  'do',
  'find',
  'for',
  'get',
  'give',
  'have',
  'i',
  'in',
  'is',
  'it',
  'kind',
  'kinds',
  'looking',
  'me',
  'my',
  'need',
  'of',
  'on',
  'or',
  'please',
  'search',
  'show',
  'some',
  'something',
  'the',
  'to',
  'want',
  'what',
  'where',
  'which',
  'with',
  'you',
]);

const OCCASION_HINTS: Array<[RegExp, string]> = [
  [/\bbreakfast\b|\bmorning\b/i, 'breakfast'],
  [/\blunch\b|\bnoon\b|\bmidday\b/i, 'lunch'],
  [/\bdinner\b|\bevening\b|\bsupper\b/i, 'dinner'],
  [/\bguests?\b|\bparty\b|\bhanging out\b|\bhosting\b/i, 'hosting guests'],
  [/\bbaby\b|\bkid(s)?\b|\bchildren\b|\btoddler\b/i, 'kids and family'],
  [/\btravel\b|\btrip\b|\broad trip\b|\bjourney\b/i, 'travel'],
  [/\bclean(ing)?\b|\bhouse\b|\bkitchen\b|\bchore\b/i, 'household tasks'],
  [/\boffice\b|\bwork\b|\bbusiness\b/i, 'work/office'],
  [/\bschool\b|\bstudent\b|\bback to school\b|\buniversity\b/i, 'school/study'],
  [/\bsnack\b|\bnibble\b|\bmunchies\b/i, 'snacking'],
];

const AUDIENCE_HINTS: Array<[RegExp, string]> = [
  [/\bkids?\b|\bchildren\b|\btoddler\b/i, 'kids'],
  [/\bfamily\b|\bhousehold\b/i, 'family'],
  [/\bguests?\b|\bparty\b|\beveryone\b/i, 'guests'],
  [/\bone person\b|\bmyself\b|\bme only\b/i, 'one person'],
  [/\bpet(s)?\b|\bdog(s)?\b|\bcat(s)?\b/i, 'pets'],
];

const DIETARY_HINTS: Array<[RegExp, string]> = [
  [/\bhealthy\b|\blight\b|\bfitness\b|\bdiet\b/i, 'healthy choices'],
  [/\bvegan\b|\bplant based\b/i, 'vegan'],
  [/\bvegetarian\b|\bno meat\b/i, 'vegetarian'],
  [/\bgluten[- ]free\b|\bceliac\b/i, 'gluten-free'],
  [/\bno sugar\b|\blow sugar\b|\bdiabetic\b/i, 'low sugar'],
  [/\borganic\b|\bnatural\b/i, 'organic'],
  [/\bhalal\b/i, 'halal'],
];

const URGENCY_HINTS: Array<[RegExp, string]> = [
  [/\btonight\b|\bnow\b|\burgent\b|\bquick\b|\bfast\b|\basap\b/i, 'urgent'],
  [/\btoday\b/i, 'for today'],
  [/\bthis week\b|\bweekly\b/i, 'weekly shopping'],
];

const MOOD_HINTS: Array<[RegExp, string]> = [
  [/\blazy\b|\btired\b|\beasy\b/i, 'convenient/easy'],
  [/\bromantic\b|\bdate night\b/i, 'romantic'],
  [/\bcelebrat(e|ion)\b|\bparty\b|\bfun\b/i, 'celebratory'],
  [/\bmovie\b|\bnetflix\b|\bchilling\b/i, 'relaxing'],
  [/\bpicnic\b|\boutdoor\b/i, 'outdoor/picnic'],
];

const SEASON_HINTS: Array<[RegExp, string]> = [
  [/\bsummer\b|\bhot\b|\bsunny\b/i, 'hot weather'],
  [/\brain(y)?\b|\bcold\b|\bwet\b/i, 'rainy season'],
  [/\bchristmas\b|\bxmas\b|\bholiday\b/i, 'christmas'],
  [/\beaster\b/i, 'easter'],
  [/\beid\b|\bramadan\b/i, 'eid/ramadan'],
];

const VALUE_HINTS: Array<[RegExp, string]> = [
  [/\bcheap\b|\baffordable\b|\bbudget\b|\blow cost\b/i, 'affordable'],
  [/\bpremium\b|\bhigh quality\b|\best\b|\bluxury\b/i, 'premium'],
  [/\bbulk\b|\blarge\b|\bbig pack\b/i, 'bulk'],
];

const BRAND_HINTS: Array<[RegExp, string]> = [
  [/\bsimba\b/i, 'Simba'],
  [/\binyange\b/i, 'Inyange'],
  [/\bazam\b/i, 'Azam'],
  [/\bsulfo\b/i, 'Sulfo'],
  [/\bminerva\b/i, 'Minerva'],
  [/\bperrier\b/i, 'Perrier'],
  [/\bevian\b/i, 'Evian'],
  [/\bblue band\b/i, 'Blue Band'],
];

const PRODUCT_HINTS = [
  'milk', 'bread', 'eggs', 'rice', 'pasta', 'oil', 'soap', 'detergent', 'water', 'snack', 'juice', 'tea', 'coffee',
  'baby', 'diaper', 'cleaning', 'breakfast', 'lunch', 'dinner', 'fruit', 'vegetable', 'meat', 'chicken', 'beef',
  'fish', 'yogurt', 'cheese', 'butter', 'flour', 'sugar', 'salt', 'spice', 'chocolate', 'biscuit', 'candy',
  'beer', 'wine', 'soda', 'shampoo', 'lotion', 'toothpaste', 'toilet paper', 'napkin', 'battery', 'bulb',
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
  const brandHintsFound = BRAND_HINTS.map(([reg]) => reg.exec(query)?.[0]).filter(Boolean) as string[];

  const budgetMatch =
    query.match(/\b(?:under|below|less than|around|about|budget(?: of)?)\s*(?:rwf\s*)?([\d,]+)\s*([kK]?)\b/) ??
    query.match(/\b([\d,]+)\s*([kK])\b/);

  const budget =
    budgetMatch?.[1]
      ? `${budgetMatch[1].replace(/,/g, '')}${budgetMatch[2]?.toLowerCase() === 'k' ? 'k' : ''} RWF`
      : null;

  const intent =
    normalizedQuery.includes('recommend') || normalizedQuery.includes('suggest') || normalizedQuery.includes('what')
      ? 'recommendation request'
      : normalizedQuery.includes('need') || normalizedQuery.includes('want') || normalizedQuery.includes('looking for') || normalizedQuery.includes('buy')
        ? 'shopping request'
        : 'shopping search';

  return {
    intent,
    occasion: detectHint(query, OCCASION_HINTS),
    audience: detectHint(query, AUDIENCE_HINTS),
    budget,
    urgency: detectHint(query, URGENCY_HINTS),
    dietaryPreference: detectHint(query, DIETARY_HINTS),
    mood: detectHint(query, MOOD_HINTS),
    season: detectHint(query, SEASON_HINTS),
    valuePreference: detectHint(query, VALUE_HINTS),
    productHints: filteredHints,
    brandHints: Array.from(new Set(brandHintsFound)),
    normalizedQuery,
  };
}

function buildContextSummary(context: CatalogSearchContext, t: (key: string, options?: any) => string) {
  const parts: string[] = [];

  if (context.occasion) parts.push(context.occasion);
  if (context.mood) parts.push(context.mood);
  if (context.season) parts.push(context.season);
  if (context.dietaryPreference) parts.push(context.dietaryPreference);
  if (context.valuePreference) parts.push(context.valuePreference);
  if (context.audience) parts.push(`${t('for')} ${context.audience}`);
  if (context.budget) parts.push(`${t('budget')} ${context.budget}`);
  if (context.urgency) parts.push(context.urgency);
  if (context.brandHints.length > 0) parts.push(`brands: ${context.brandHints.join(', ')}`);

  if (parts.length === 0) {
    return context.intent;
  }

  return `${context.intent}: ${parts.join(', ')}`;
}

function buildLocalAiFallback({ query, products }: CatalogAiSearchArgs, t: (key: string, options?: any) => string): CatalogAiSearchResult {
  const context = extractSearchContext(query);
  const tokens = tokenize(query);
  const contextualTokens = tokenize([
    context.occasion, 
    context.audience, 
    context.dietaryPreference, 
    context.urgency,
    context.mood,
    context.season,
    context.valuePreference,
    ...context.brandHints
  ].filter(Boolean).join(' '));
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
          score += 10;
        } else if (searchableText.includes(token)) {
          score += 5;
        }
      }

      // Bonus for brand match
      for (const brand of context.brandHints) {
        if (product.name.toLowerCase().includes(brand.toLowerCase())) {
          score += 15;
        }
      }

      // Bonus for exact token match
      if (searchTokens.length > 1 && searchTokens.every((token) => searchableText.includes(token))) {
        score += 8;
      }

      // Occasion/Category match bonus
      if (context.occasion && searchableText.includes(context.occasion.split('/')[0].split(' ')[0])) {
        score += 4;
      }

      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.product.price - right.product.price)
    .slice(0, 12);

  if (rankedProducts.length === 0) {
    return {
      answer: t('aiSearchNoMatches'),
      productIds: [],
    };
  }

  const matchedNames = rankedProducts.slice(0, 4).map((entry) => entry.product.name).join(', ');
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

const SITUATIONAL_MAP: Record<string, string[]> = {
  dinner: ['meat', 'fish', 'rice', 'pasta', 'vegetable', 'oil', 'salt', 'spice', 'sauce', 'beef', 'chicken', 'tomato', 'potato', 'flour', 'food'],
  breakfast: ['milk', 'bread', 'egg', 'tea', 'coffee', 'cereal', 'juice', 'butter', 'jam', 'yogurt', 'sugar', 'food'],
  lunch: ['snack', 'bread', 'cheese', 'ham', 'fruit', 'soda', 'water', 'biscuit', 'sandwich', 'food'],
  party: ['drink', 'soda', 'beer', 'wine', 'snack', 'chips', 'biscuit', 'chocolate', 'napkin', 'cup', 'plate', 'alcohol'],
  cleaning: ['soap', 'detergent', 'cleaner', 'sponge', 'tissue', 'toilet', 'mop', 'brush', 'shampoo', 'cleaning', 'sanitary'],
  baby: ['diaper', 'wipe', 'milk', 'baby', 'toddler', 'toy', 'cerelac', 'baby products'],
  healthy: ['fruit', 'vegetable', 'water', 'yogurt', 'organic', 'low sugar', 'fitness', 'salad', 'food'],
};

function getRelevantCandidates(query: string, products: Product[]): any[] {
  const normalizedQuery = query.toLowerCase();
  const tokens = tokenize(normalizedQuery);
  
  // Identify situational keywords
  const situations = Object.keys(SITUATIONAL_MAP).filter(s => normalizedQuery.includes(s));
  const situationalTokens = situations.flatMap(s => SITUATIONAL_MAP[s]);

  // Rank products locally to pick the top candidates for the AI
  const ranked = products.map(p => {
    const text = `${p.name} ${p.category} ${p.normalizedCategory}`.toLowerCase();
    let score = 0;
    
    // Exact name matches are highest priority
    for (const token of tokens) {
      if (p.name.toLowerCase().includes(token)) score += 15;
      else if (text.includes(token)) score += 8;
    }

    // Situational matches (e.g., rice is good for dinner)
    for (const st of situationalTokens) {
      if (text.includes(st)) score += 10;
    }

    // Category boosts for situational queries (using exact Simba category names)
    if ((situations.includes('dinner') || situations.includes('breakfast') || situations.includes('lunch')) && p.category === 'Food Products') score += 10;
    if (situations.includes('party') && p.category === 'Alcoholic Drinks') score += 10;
    if (situations.includes('baby') && p.category === 'Baby Products') score += 10;
    if (situations.includes('cleaning') && p.category === 'Cleaning & Sanitary') score += 10;

    return { product: p, score };
  })
  .filter(item => item.score > 0 || Math.random() > 0.98) // Keep all logic matches + tiny bit of variety
  .sort((a, b) => b.score - a.score)
  .slice(0, 1200); // Send more candidates to ensure AI has a full 'pantry'

  return ranked.map(item => ({
    id: item.product.id,
    name: item.product.name,
    category: item.product.category,
    price: item.product.price,
    unit: item.product.unit,
    inStock: item.product.inStock
  }));
}

async function searchCatalogWithAi({ query, products }: CatalogAiSearchArgs, t: (key: string, options?: any) => string): Promise<CatalogAiSearchResult> {
  if (!supabase) {
    return buildLocalAiFallback({ query, products }, t);
  }

  const catalogContext = getRelevantCandidates(query, products);
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
