import { useQuery, useMutation } from '@tanstack/react-query';
import { loadCatalogStoreOverride, loadCatalogTranslations, loadFallbackCatalog } from '@/lib/catalog';
import { queryKeys } from '@/lib/query-keys';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import type { CatalogResponse, Locale, Product, ProductRecord } from '@/types';
import { slugify } from '@/lib/utils';
import { usePreferencesStore } from '@/store/preferences-store';
import { useCartStore } from '@/store/cart-store';

type ProductRow = {
  id: number;
  name: string;
  price_rwf: number;
  category_name: string;
  raw_subcategory_id: number | null;
  in_stock: boolean;
  image_url: string;
  unit_label: string;
  stock_quantity?: number;
};

type ProductWithInventoryRow = ProductRow & {
  inventory?: Array<{
    quantity: number | null;
  }> | null;
};

const CATALOG_PRODUCT_FIELDS =
  'id, name, price_rwf, category_name, raw_subcategory_id, in_stock, image_url, unit_label';

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: '',
    price: row.price_rwf,
    category: row.category_name,
    subcategoryId: row.raw_subcategory_id,
    inStock: row.in_stock,
    image: row.image_url,
    unit: row.unit_label,
    slug: `${slugify(row.name)}-${row.id}`,
    normalizedCategory: row.category_name,
    stockQuantity: row.stock_quantity,
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
      description: translatedProduct.description || product.description,
      category: translatedProduct.category || product.category,
      unit: translatedProduct.unit || product.unit,
      normalizedCategory: (translatedProduct.category || product.category).trim(),
    };
  });
}

async function fetchCatalog(locale: Locale, shopId?: string | null): Promise<CatalogResponse> {
  if (!hasSupabaseEnv || !supabase) {
    return loadFallbackCatalog(locale);
  }

  let data: ProductWithInventoryRow[] | null = null;
  let error: Error | null = null;

  if (shopId) {
    const result = await (supabase
      .from('catalog_products')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select(`${CATALOG_PRODUCT_FIELDS}, inventory!left(quantity)`) as any)
      .eq('inventory.shop_id', shopId)
      .order('name');

    data = (result.data ?? null) as ProductWithInventoryRow[] | null;
    error = result.error;
  } else {
    const result = await supabase.from('catalog_products').select(CATALOG_PRODUCT_FIELDS).order('name');

    data = (result.data ?? null) as ProductRow[] | null;
    error = result.error;
  }

  if (error) {
    console.error('Catalog fetch error:', error);
    return loadFallbackCatalog(locale);
  }

  const baseProducts = (data ?? []).map((row) => {
    const stock_quantity = row.inventory?.[0]?.quantity ?? (row.in_stock ? 50 : 0);
    return toProduct({ ...row, stock_quantity });
  });
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

async function updateCatalogProducts(products: ProductRecord[], _locale: Locale): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const productRows = products.map((product) => {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price_rwf: product.price,
      category_name: product.category,
      raw_subcategory_id: product.subcategoryId,
      in_stock: product.inStock,
      image_url: product.image,
      unit_label: product.unit,
      stock_quantity: product.stockQuantity ?? null,
    };
  });

  const { error: upsertError } = await supabase
    .from('catalog_products')
    .upsert(productRows, {
      onConflict: 'id',
    });

  if (upsertError) {
    throw upsertError;
  }
}

export function useCatalog() {
  const locale = usePreferencesStore((state) => state.locale);
  const selectedShopId = useCartStore((state) => state.selectedShopId);

  return useQuery({
    queryKey: [...queryKeys.catalog(locale), selectedShopId],
    queryFn: () => fetchCatalog(locale, selectedShopId),
  });
}

export function useUpdateProduct() {
  return useMutation({
    mutationFn: async (args: {
      products: ProductRecord[];
      locale: Locale;
    }) => {
      await updateCatalogProducts(args.products, args.locale);

      return { success: true };
    },
  });
}
