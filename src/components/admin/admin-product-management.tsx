import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCatalog, useUpdateProduct } from '@/hooks/use-catalog';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import type { Product, ProductRecord } from '@/types';

export function AdminProductManagement() {
  const { t, i18n } = useTranslation();
  
  const catalogQuery = useCatalog();
  const updateProductMutation = useUpdateProduct();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<ProductRecord>>({
    id: 0,
    name: '',
    description: '',
    price: 0,
    category: '',
    inStock: true,
    image: '',
    unit: '',
  });

  const filteredProducts = useMemo(() => {
    const products = catalogQuery.data?.products ?? [];
    const normalizedSearch = searchTerm.toLowerCase();

    return products.filter((product) => {
      if (!normalizedSearch) {
        return true;
      }
      return product.name.toLowerCase().includes(normalizedSearch) || 
             product.category.toLowerCase().includes(normalizedSearch);
    });
  }, [catalogQuery.data?.products, searchTerm]);

  const handleCreateProduct = () => {
    setFormData({
      id: Math.max(...catalogQuery.data?.products.map(p => p.id) ?? [0]) + 1,
      name: '',
      description: '',
      price: 0,
      category: '',
      subcategoryId: null,
      inStock: true,
      image: '',
      unit: '',
    });
    setEditingProduct(null);
    setIsCreating(true);
  };

  const handleEditProduct = (product: Product) => {
    setFormData(product);
    setEditingProduct(product);
    setIsCreating(false);
  };

  const handleSaveProduct = async () => {
    if (!formData.id || !formData.name || !formData.description || !formData.price || !formData.category || !formData.unit) {
      return;
    }

    const updatedProducts = catalogQuery.data?.products.map(p => 
      p.id === formData.id ? { ...p, ...formData } : p
    ) ?? [];

    await updateProductMutation.mutateAsync({
      products: updatedProducts,
      locale: i18n.language as 'en' | 'fr' | 'rw',
    });

    setIsCreating(false);
    setEditingProduct(null);
    setFormData({});
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm(t('confirmDeleteProduct'))) {
      return;
    }

    const updatedProducts = catalogQuery.data?.products.filter(p => p.id !== productId) ?? [];

    await updateProductMutation.mutateAsync({
      products: updatedProducts,
      locale: i18n.language as 'en' | 'fr' | 'rw',
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingProduct(null);
    setFormData({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('adminProductManagement')}</h1>
          <p className="text-muted-foreground mt-2">{t('adminProductManagementDesc')}</p>
        </div>
        <Button onClick={handleCreateProduct} disabled={isCreating || updateProductMutation.isPending}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addProduct')}
        </Button>
      </div>

      {isCreating && (
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{t('newProduct')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('createNewProductDescription')}</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('productName')}</label>
                <input
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('productNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('productPrice')}</label>
                <input
                  type="number"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  value={formData.price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, price: Number(e.target.value) })}
                  placeholder={t('productPricePlaceholder')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('productDescription')}</label>
              <textarea
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('productDescriptionPlaceholder')}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('productCategory')}</label>
                <input
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  value={formData.category}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, category: e.target.value })}
                  placeholder={t('productCategoryPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('productUnit')}</label>
                <input
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  value={formData.unit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder={t('productUnitPlaceholder')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('productImageUrl')}</label>
                <input
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  value={formData.image}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, image: e.target.value })}
                  placeholder={t('productImageUrlPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('productInStock')}</label>
                <select
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  value={formData.inStock?.toString() ?? 'false'}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, inStock: e.target.value === 'true' })}
                >
                  <option value="true">{t('yes')}</option>
                  <option value="false">{t('no')}</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="ghost" 
                onClick={handleCancel} 
                disabled={updateProductMutation.isPending}
                className="hover:bg-muted"
              >
                <X className="mr-2 h-4 w-4" />
                {t('cancel')}
              </Button>
              <Button onClick={handleSaveProduct} disabled={updateProductMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {t('saveProduct')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          placeholder={t('searchProducts')}
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <div key={product.id} className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
            <div className="aspect-video w-full overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://placehold.co/300x300?text=No+Image';
                }}
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{product.category}</p>
              <p className="text-sm font-medium mt-2">{t('price')}: {product.price} RWF</p>
              <p className="text-sm mt-1">{product.inStock ? t('inStock') : t('outOfStock')}</p>
               <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditProduct(product)}
                    disabled={updateProductMutation.isPending}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProduct(product.id)}
                    disabled={updateProductMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('noProductsFound')}</p>
        </div>
      )}
    </div>
  );
}
