import i18n from '@/i18n';
import type { CatalogResponse, Locale, Product, ProductRecord } from '@/types';
import { slugify } from '@/lib/utils';

type RawCatalog = {
  store: CatalogResponse['store'];
  products: ProductRecord[];
};

const DEFAULT_CATALOG_PATH = '/simba_products.json';

function getLocalizedCatalogPath(locale: Locale) {
  return `/catalog/simba_products.${locale}.json`;
}

function normalizeProduct(product: ProductRecord, slugSourceName = product.name): Product {
  return {
    ...product,
    subcategoryId: product.subcategoryId ?? null,
    slug: `${slugify(slugSourceName)}-${product.id}`,
    normalizedCategory: product.category.trim(),
  };
}

async function fetchCatalogFile(path: string, optional = false): Promise<RawCatalog | null> {
  const response = await fetch(path);

  if (!response.ok) {
    if (optional) {
      return null;
    }

    throw new Error(i18n.t('fallbackCatalogError'));
  }

  return (await response.json()) as RawCatalog;
}

function mergeLocalizedProducts(baseProducts: ProductRecord[], localizedProducts: ProductRecord[]) {
  const localizedById = new Map(localizedProducts.map((product) => [product.id, product]));

  return baseProducts.map((product) => {
    const localizedProduct = localizedById.get(product.id);

    if (!localizedProduct) {
      return normalizeProduct(product);
    }

    return normalizeProduct(
      {
        ...product,
        name: localizedProduct.name || product.name,
        category: localizedProduct.category || product.category,
        unit: localizedProduct.unit || product.unit,
      },
      product.name,
    );
  });
}

export async function loadFallbackCatalog(locale: Locale = 'en'): Promise<CatalogResponse> {
  const baseCatalog = await fetchCatalogFile(DEFAULT_CATALOG_PATH);

  if (!baseCatalog) {
    throw new Error(i18n.t('fallbackCatalogError'));
  }

  const localizedCatalog =
    locale === 'en' ? null : await fetchCatalogFile(getLocalizedCatalogPath(locale), true);

  const products = (
    localizedCatalog
      ? mergeLocalizedProducts(baseCatalog.products, localizedCatalog.products)
      : baseCatalog.products.map((product) => normalizeProduct(product))
  ).sort((a, b) => a.name.localeCompare(b.name));

  return {
    store: localizedCatalog?.store ?? baseCatalog.store,
    products,
  };
}

export async function loadCatalogTranslations(locale: Locale): Promise<Map<number, ProductRecord>> {
  if (locale === 'en') {
    return new Map();
  }

  const localizedCatalog = await fetchCatalogFile(getLocalizedCatalogPath(locale), true);
  return new Map((localizedCatalog?.products ?? []).map((product) => [product.id, product]));
}

export async function loadCatalogStoreOverride(locale: Locale): Promise<CatalogResponse['store'] | null> {
  if (locale === 'en') {
    return null;
  }

  const localizedCatalog = await fetchCatalogFile(getLocalizedCatalogPath(locale), true);
  return localizedCatalog?.store ?? null;
}
