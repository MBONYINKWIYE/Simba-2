import type { CatalogResponse, Product, ProductRecord } from '@/types';
import { slugify } from '@/lib/utils';

type RawCatalog = {
  store: CatalogResponse['store'];
  products: ProductRecord[];
};

function normalizeProduct(product: ProductRecord): Product {
  return {
    ...product,
    subcategoryId: product.subcategoryId ?? null,
    slug: `${slugify(product.name)}-${product.id}`,
    normalizedCategory: product.category.trim(),
  };
}

export async function loadFallbackCatalog(): Promise<CatalogResponse> {
  const response = await fetch('/simba_products.json');

  if (!response.ok) {
    throw new Error('Failed to load fallback catalog');
  }

  const rawCatalog = (await response.json()) as RawCatalog;

  return {
    store: rawCatalog.store,
    products: rawCatalog.products.map(normalizeProduct),
  };
}
