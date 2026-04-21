import { useQuery } from '@tanstack/react-query';
import { loadCatalogStoreOverride, loadCatalogTranslations, loadFallbackCatalog } from '@/lib/catalog';
import { queryKeys } from '@/lib/query-keys';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import type { CatalogResponse, Locale, Product, ProductRecord } from '@/types';
import { slugify } from '@/lib/utils';
import { usePreferencesStore } from '@/store/preferences-store';

type ProductRow = {
  id: number;
  name: string;
  price_rwf: number;
  category_name: string;
  raw_subcategory_id: number | null;
  in_stock: boolean;
  image_url: string;
  unit_label: string;
};

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price_rwf,
    category: row.category_name,
    subcategoryId: row.raw_subcategory_id,
    inStock: row.in_stock,
    image: row.image_url,
    unit: row.unit_label,
    slug: `${slugify(row.name)}-${row.id}`,
    normalizedCategory: row.category_name,
  };
}

function applyTranslations(products: Product[], translations: Map<number, ProductRecord>) {
  if (translations.size === 0) {
    return products;
  }

  return products.map((product) => {
    const translatedProduct = translations.get(product.id);

    if (!translatedProduct) {
      return product;
    }

    return {
      ...product,
      name: translatedProduct.name || product.name,
      category: translatedProduct.category || product.category,
      unit: translatedProduct.unit || product.unit,
      normalizedCategory: (translatedProduct.category || product.category).trim(),
    };
  });
}

async function fetchCatalog(locale: Locale): Promise<CatalogResponse> {
  if (!hasSupabaseEnv || !supabase) {
    return loadFallbackCatalog(locale);
  }

  const { data, error } = await supabase
    .from('catalog_products')
    .select('id, name, price_rwf, category_name, raw_subcategory_id, in_stock, image_url, unit_label')
    .order('name');

  if (error) {
    return loadFallbackCatalog(locale);
  }

  const baseProducts = (data ?? []).map(toProduct);
  const localizedStore = await loadCatalogStoreOverride(locale);
  const translations = await loadCatalogTranslations(locale);

  return {
    store: localizedStore ?? {
      name: 'Simba Supermarket',
      tagline: "Rwanda's Online Supermarket",
      location: 'Kigali, Rwanda',
      currency: 'RWF',
    },
    products: applyTranslations(baseProducts, translations).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function useCatalog() {
  const locale = usePreferencesStore((state) => state.locale);

  return useQuery({
    queryKey: queryKeys.catalog(locale),
    queryFn: () => fetchCatalog(locale),
  });
}
