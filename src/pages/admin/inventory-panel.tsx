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
    <section className="glass-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{t('inventoryDashboard')}</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('inventoryDashboardCopy')}</p>
        </div>
        <Badge>{inventoryQuery.data?.length ?? 0}</Badge>
      </div>

      <form className="mt-5 grid gap-3 lg:grid-cols-[1fr_1.2fr_0.7fr_auto]" onSubmit={handleAddInventory}>
        {isSuperAdmin ? (
          <select
            value={selectedShopId}
            onChange={(event) => setSelectedShopId(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
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
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
          placeholder={t('searchInventoryProducts')}
        />
        <select
          value={selectedProductId}
          onChange={(event) => setSelectedProductId(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="">{t('selectProduct')}</option>
          {filteredProducts.slice(0, 100).map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          value={newQuantity}
          onChange={(event) => setNewQuantity(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
          placeholder={t('quantity')}
        />
        <Button type="submit" disabled={upsertInventoryEntry.isPending || !(isSuperAdmin ? selectedShopId : scopeShopId) || !selectedProductId}>
          {t('addInventory')}
        </Button>
      </form>

      {inventoryQuery.isLoading ? <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('loading')}</p> : null}
      {inventoryQuery.isError ? (
        <p className="mt-4 text-sm text-rose-600 dark:text-rose-300">
          {inventoryQuery.error instanceof Error ? inventoryQuery.error.message : t('inventoryLoadFailed')}
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {(inventoryQuery.data ?? []).map((entry) => (
          <div key={entry.inventory_id} className="rounded-3xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold">{entry.product_name}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {isSuperAdmin ? entry.shop_name : t('inventoryUpdatedAt', { value: new Date(entry.updated_at).toLocaleString() })}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:w-32 dark:border-slate-700 dark:bg-slate-950"
                />
                <Button variant="secondary" onClick={() => void handleSaveQuantity(entry)} disabled={upsertInventoryEntry.isPending}>
                  {t('saveQuantity')}
                </Button>
                <Button variant="ghost" onClick={() => void handleRemoveInventory(entry)} disabled={deleteInventoryEntry.isPending}>
                  {t('remove')}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
