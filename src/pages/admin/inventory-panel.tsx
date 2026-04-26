import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCatalog } from '@/hooks/use-catalog';
import { useDeleteInventoryEntry, useInventory, useUpsertInventoryEntry } from '@/hooks/use-inventory';
import type { InventoryRecord } from '@/types';

type InventoryPanelProps = {
  scopeShopId: string | null;
  isSuperAdmin: boolean;
  shops: { id: string; name: string }[];
};

export function InventoryPanel({ scopeShopId, isSuperAdmin, shops }: InventoryPanelProps) {
  const { t } = useTranslation();
  const catalogQuery = useCatalog();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShopId, setSelectedShopId] = useState(scopeShopId ?? '');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newQuantity, setNewQuantity] = useState('0');
  const inventoryScopeKey = isSuperAdmin ? `super:${selectedShopId || 'all'}` : (scopeShopId ?? 'unassigned');
  const inventoryQuery = useInventory(isSuperAdmin ? (selectedShopId || null) : scopeShopId, isSuperAdmin);
  const upsertInventoryEntry = useUpsertInventoryEntry();
  const deleteInventoryEntry = useDeleteInventoryEntry();
  const [draftQuantities, setDraftQuantities] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    if (!selectedShopId && shops.length > 0) {
      setSelectedShopId(shops[0].id);
    }
  }, [isSuperAdmin, selectedShopId, shops]);

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    for (const item of inventoryQuery.data ?? []) {
      nextDrafts[item.inventory_id] = String(item.quantity);
    }
    setDraftQuantities(nextDrafts);
  }, [inventoryQuery.data]);

  const filteredProducts = useMemo(() => {
    const products = catalogQuery.data?.products ?? [];
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      if (!normalizedSearch) {
        return true;
      }

      return product.name.toLowerCase().includes(normalizedSearch) || product.category.toLowerCase().includes(normalizedSearch);
    });
  }, [catalogQuery.data?.products, searchTerm]);

  const orderedProducts = useMemo(() => {
    if (!selectedProductId) {
      return filteredProducts;
    }

    const selectedProduct = filteredProducts.find((product) => String(product.id) === selectedProductId);

    if (!selectedProduct) {
      return filteredProducts;
    }

    return [selectedProduct, ...filteredProducts.filter((product) => String(product.id) !== selectedProductId)];
  }, [filteredProducts, selectedProductId]);

  const handleAddInventory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetShopId = isSuperAdmin ? selectedShopId : scopeShopId;

    if (!targetShopId || !selectedProductId) {
      return;
    }

    await upsertInventoryEntry.mutateAsync({
      shopId: targetShopId,
      productId: Number(selectedProductId),
      quantity: Number(newQuantity),
    });

    setSelectedProductId('');
    setNewQuantity('0');
  };

  const handleSaveQuantity = async (entry: InventoryRecord) => {
    await upsertInventoryEntry.mutateAsync({
      shopId: entry.shop_id,
      productId: entry.product_id,
      quantity: Number(draftQuantities[entry.inventory_id] ?? entry.quantity),
    });
  };

  const handleRemoveInventory = async (entry: InventoryRecord) => {
    await deleteInventoryEntry.mutateAsync({
      inventoryId: entry.inventory_id,
      scopeKey: inventoryScopeKey,
    });
  };

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-soft dark:border-slate-800/80 dark:bg-slate-950/85">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
            {t('inventoryDashboard')}
          </div>
          <h2 className="text-2xl font-bold">{t('inventoryDashboard')}</h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{t('inventoryDashboardCopy')}</p>
        </div>
        <Badge className="mt-1">{inventoryQuery.data?.length ?? 0}</Badge>
      </div>

      <form className="mt-6 rounded-[1.75rem] border border-slate-200 bg-stone-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60" onSubmit={handleAddInventory}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            {t('addInventory')}
          </p>
          {selectedProductId ? (
            <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
              {t('selected')}
            </span>
          ) : null}
        </div>

        <div className={`grid min-w-0 gap-3 ${isSuperAdmin ? 'lg:grid-cols-2 xl:grid-cols-[0.9fr_1.1fr_1.2fr_0.7fr_auto]' : 'md:grid-cols-2 lg:grid-cols-[1.1fr_1.4fr_0.7fr_auto]'}`}>
          {isSuperAdmin ? (
            <select
              value={selectedShopId}
              onChange={(event) => setSelectedShopId(event.target.value)}
              className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">{t('selectShop')}</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          ) : null}
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder={t('searchInventoryProducts')}
          />
          <select
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
            className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">{t('selectProduct')}</option>
            {orderedProducts.slice(0, 100).map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <div className="flex gap-3 md:col-span-2 lg:col-auto">
            <input
              type="number"
              min="0"
              value={newQuantity}
              onChange={(event) => setNewQuantity(event.target.value)}
              className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder={t('quantity')}
            />
            <Button
              type="submit"
              className="h-12 w-full lg:w-auto px-6"
              disabled={upsertInventoryEntry.isPending || !(isSuperAdmin ? selectedShopId : scopeShopId) || !selectedProductId}
            >
              {t('addInventory')}
            </Button>
          </div>
        </div>
      </form>

      {inventoryQuery.isLoading ? (
        <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">{t('loading')}</p>
      ) : null}
      {inventoryQuery.isError ? (
        <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
          {inventoryQuery.error instanceof Error ? inventoryQuery.error.message : t('inventoryLoadFailed')}
        </p>
      ) : null}

      <div className="mt-6 grid min-w-0 gap-4">
        {(inventoryQuery.data ?? []).length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-slate-700 dark:bg-slate-950/40">
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">{t('inventoryDashboard')}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('noInventoryEntriesYet')}</p>
          </div>
        ) : (
          (inventoryQuery.data ?? []).map((entry) => (
            <div
              key={entry.inventory_id}
              className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white/85 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-brand-300 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:border-brand-700"
            >
              <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate text-lg font-semibold">{entry.product_name}</p>
                    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {t('quantity')}: {entry.quantity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {isSuperAdmin ? entry.shop_name : t('inventoryUpdatedAt', { value: new Date(entry.updated_at).toLocaleString() })}
                  </p>
                </div>
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:flex-none">
                  <input
                    type="number"
                    min="0"
                    value={draftQuantities[entry.inventory_id] ?? String(entry.quantity)}
                    onChange={(event) =>
                      setDraftQuantities((current) => ({
                        ...current,
                        [entry.inventory_id]: event.target.value,
                      }))
                    }
                    className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200 sm:w-32 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => void handleSaveQuantity(entry)} disabled={upsertInventoryEntry.isPending}>
                      {t('saveQuantity')}
                    </Button>
                    <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => void handleRemoveInventory(entry)} disabled={deleteInventoryEntry.isPending}>
                      {t('remove')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
