import { ChevronLeft, ShoppingBasket } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useCatalog } from '@/hooks/use-catalog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';

export function ProductPage() {
  const { slug = '' } = useParams();
  const { data } = useCatalog();
  const addItem = useCartStore((state) => state.addItem);
  const product = data?.products.find((item) => item.slug === slug);

  if (!product) {
    return (
      <div className="glass-panel p-8">
        <p className="text-lg font-semibold">Product not found.</p>
        <Link to="/" className="mt-4 inline-flex text-brand-600">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <section className="glass-panel overflow-hidden p-4 sm:p-6">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
        <ChevronLeft size={16} />
        Back to catalog
      </Link>
      <div className="grid gap-6 lg:grid-cols-2">
        <img src={product.image} alt={product.name} className="h-full min-h-80 w-full rounded-3xl object-cover" />
        <div className="flex flex-col justify-center">
          <Badge>{product.normalizedCategory}</Badge>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{product.name}</h1>
          <p className="mt-3 text-3xl font-bold text-brand-600 dark:text-brand-300">{formatCurrency(product.price)}</p>
          <div className="mt-6 grid gap-4 rounded-3xl bg-stone-100 p-5 dark:bg-slate-900">
            <div className="flex justify-between">
              <span className="text-slate-500">Availability</span>
              <span className="font-semibold">{product.inStock ? 'In stock' : 'Out of stock'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Unit</span>
              <span className="font-semibold">{product.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Raw subcategory</span>
              <span className="font-semibold">{product.subcategoryId ?? 'N/A'}</span>
            </div>
          </div>
          <p className="mt-6 leading-7 text-slate-600 dark:text-slate-300">
            This product page is intentionally lightweight: core catalog facts, strong imagery, and a one-tap route into the cart and checkout flow.
          </p>
          <Button className="mt-6 w-full sm:w-fit" onClick={() => addItem(product)} disabled={!product.inStock}>
            <ShoppingBasket size={16} className="mr-2" />
            Add to cart
          </Button>
        </div>
      </div>
    </section>
  );
}
