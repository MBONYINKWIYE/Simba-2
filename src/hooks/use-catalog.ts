import { useQuery } from '@tanstack/react-query';
import { loadFallbackCatalog } from '@/lib/catalog';
import { queryKeys } from '@/lib/query-keys';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import type { CatalogResponse, Product } from '@/types';
import { slugify } from '@/lib/utils';

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

async function fetchCatalog(): Promise<CatalogResponse> {
  if (!hasSupabaseEnv || !supabase) {
    return loadFallbackCatalog();
  }

  const { data, error } = await supabase
    .from('catalog_products')
    .select('id, name, price_rwf, category_name, raw_subcategory_id, in_stock, image_url, unit_label')
    .order('name');

  if (error) {
    return loadFallbackCatalog();
  }

  return {
    store: {
      name: 'Simba Supermarket',
      tagline: "Rwanda's Online Supermarket",
      location: 'Kigali, Rwanda',
      currency: 'RWF',
    },
    products: (data ?? []).map(toProduct),
  };
}

export function useCatalog() {
  return useQuery({
    queryKey: queryKeys.catalog,
    queryFn: fetchCatalog,
  });
}
