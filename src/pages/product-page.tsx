import { ChevronLeft, Minus, Plus, Share2, ShoppingBasket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCatalog } from '@/hooks/use-catalog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { ProductGrid } from '@/components/shop/product-grid';

function useShare(product: { name: string; slug: string } | null) {
  const { t } = useTranslation();

  return () => {
    if (!product) return;
    const url = `${window.location.origin}/products/${product.slug}`;
    const text = `${product.name} — Simba Supermarket`;

    if (navigator.share) {
      navigator.share({ title: product.name, text, url }).catch(() => {});
    } else {
      const encodedUrl = encodeURIComponent(url);
      const encodedText = encodeURIComponent(text);
      const whatsapp = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
      const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      const twitter = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
      const platform = window.prompt(`${t('shareVia')}: WhatsApp / Facebook / Twitter`, 'WhatsApp');
      if (platform?.toLowerCase().includes('whatsapp')) window.open(whatsapp, '_blank');
      else if (platform?.toLowerCase().includes('facebook')) window.open(facebook, '_blank');
      else if (platform?.toLowerCase().includes('twitter')) window.open(twitter, '_blank');
    }
  };
}

export function ProductPage() {
  const { t } = useTranslation();
  const { slug = '' } = useParams();
  const { data } = useCatalog();
  const addItem = useCartStore((state) => state.addItem);
  const decrementItem = useCartStore((state) => state.decrementItem);
  const product = data?.products.find((item) => item.slug === slug);
  const cartItem = useCartStore((state) => (product ? state.items[product.id] : undefined));
  const quantity = cartItem?.quantity ?? 0;

  const relatedProducts = useMemo(() => {
    if (!product || !data?.products) return [];
    const sameCategory = data.products.filter(
      (p) => p.id !== product.id && p.normalizedCategory === product.normalizedCategory
    );
    const otherCategories = data.products.filter(
      (p) => p.id !== product.id && p.normalizedCategory !== product.normalizedCategory
    );
    const shuffled = [...sameCategory, ...otherCategories].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 12);
  }, [product, data?.products]);

  if (!product) {
    return (
      <div className="glass-panel p-8">
        <p className="text-lg font-semibold">{t('productNotFound')}</p>
        <Link to="/" className="mt-4 inline-flex text-brand-600">
          {t('backHome')}
        </Link>
      </div>
    );
  }

  return (
    <section className="glass-panel overflow-hidden p-4 sm:p-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
        <ChevronLeft size={16} />
        {t('backToCatalog')}
      </Link>
      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className="overflow-hidden rounded-3xl"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            (e.currentTarget.querySelector('img') as HTMLElement).style.transformOrigin = `${x}% ${y}%`;
          }}
        >
          <img
            src={product.image}
            alt={product.name}
            className="h-full min-h-80 w-full object-cover transition duration-200 ease-out hover:scale-[2]"
          />
        </div>
        <div className="flex flex-col justify-center">
          <Badge>{product.normalizedCategory}</Badge>
          <h1 className="mt-4 text-2xl font-bold sm:text-4xl">{product.name}</h1>
          <p className="mt-3 text-2xl font-bold text-brand-600 dark:text-brand-300 sm:text-3xl">{formatCurrency(product.price)}</p>
          <div className="mt-6 grid gap-4 rounded-3xl bg-stone-100 p-5 dark:bg-slate-900">
            <div className="flex justify-between">
              <span className="text-slate-500">{t('availability')}</span>
              <span className="font-semibold">{product.inStock ? t('availableInStock') : t('availableOutOfStock')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('unit')}</span>
              <span className="font-semibold">{product.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{t('rawSubcategory')}</span>
              <span className="font-semibold">{product.subcategoryId ?? t('notAvailable')}</span>
            </div>
          </div>
          <p className="mt-6 leading-7 text-slate-600 dark:text-slate-300">
            {t('productPageCopy')}
          </p>
          {quantity > 0 ? (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => decrementItem(product.id)}
                disabled={!product.inStock}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
              >
                <Minus size={20} />
              </button>
              <span className="min-w-[2.5rem] text-center text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {quantity}
              </span>
              <button
                onClick={() => addItem(product)}
                disabled={!product.inStock || (product.stockQuantity !== undefined && quantity >= product.stockQuantity)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                <Plus size={20} />
              </button>
            </div>
          ) : (
            <Button className="mt-6 w-full sm:w-fit" onClick={() => addItem(product)} disabled={!product.inStock}>
              <ShoppingBasket size={16} className="mr-2" />
              {t('addToCartButton')}
            </Button>
          )}
          <Button
            variant="secondary"
            className="mt-3 w-full sm:w-fit"
            onClick={useShare(product)}
          >
            <Share2 size={16} className="mr-2" />
            {t('shareProduct')}
          </Button>
        </div>
      </div>
      {relatedProducts.length > 0 && (
        <section className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
          <h2 className="text-2xl font-bold mb-6">{t('relatedProducts')}</h2>
          <ProductGrid products={relatedProducts} />
        </section>
      )}
    </section>
  );
}
