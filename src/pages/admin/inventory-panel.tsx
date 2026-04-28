import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCatalog } from '@/hooks/use-catalog';
import { useDeleteInventoryEntry, useInventory, useInventoryHistory, useUpsertInventoryEntry } from '@/hooks/use-inventory';
import type { InventoryHistoryRecord, InventoryRecord } from '@/types';

type InventoryPanelProps = {
  scopeShopId: string | null;
  isSuperAdmin: boolean;
  shops: { id: string; name: string }[];
};

function formatSignedQuantity(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function buildInventoryReportDocument(records: InventoryHistoryRecord[]) {
  const escapeCell = (value: string | number | null) =>
    String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');

  const rows = records
    .map(
      (record) => `
        <tr>
          <td>${escapeCell(record.created_at)}</td>
          <td>${escapeCell(record.shop_name)}</td>
          <td>${escapeCell(record.product_name)}</td>
          <td>${escapeCell(record.operation_type)}</td>
          <td>${escapeCell(record.quantity_change)}</td>
          <td>${escapeCell(record.previous_quantity)}</td>
          <td>${escapeCell(record.total_quantity)}</td>
          <td>${escapeCell(record.order_id)}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
        th, td { border: 1px solid #d6d3d1; padding: 8px; text-align: left; }
        th { background: #f5f5f4; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Shop</th>
            <th>Product</th>
            <th>Operation</th>
            <th>Added Qty</th>
            <th>Existing Qty</th>
            <th>Total Available Qty</th>
            <th>Order ID</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
  </html>`;
}

export function InventoryPanel({ scopeShopId, isSuperAdmin, shops }: InventoryPanelProps) {
  const { t, i18n } = useTranslation();
  const catalogQuery = useCatalog();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShopId, setSelectedShopId] = useState(scopeShopId ?? '');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantityToAdd, setQuantityToAdd] = useState('1');
  const [historyNameFilter, setHistoryNameFilter] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const inventoryScopeKey = isSuperAdmin ? `super:${selectedShopId || 'all'}` : (scopeShopId ?? 'unassigned');
  const activeShopId = isSuperAdmin ? (selectedShopId || null) : scopeShopId;
  const inventoryQuery = useInventory(activeShopId, isSuperAdmin);
  const recentHistoryQuery = useInventoryHistory(activeShopId, isSuperAdmin, 20);
  const fullHistoryQuery = useInventoryHistory(activeShopId, isSuperAdmin, 'all');
  const upsertInventoryEntry = useUpsertInventoryEntry();
  const deleteInventoryEntry = useDeleteInventoryEntry();

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    if (!selectedShopId && shops.length > 0) {
      setSelectedShopId(shops[0].id);
    }
  }, [isSuperAdmin, selectedShopId, shops]);

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

  const selectedProduct = useMemo(
    () => filteredProducts.find((product) => String(product.id) === selectedProductId) ?? null,
    [filteredProducts, selectedProductId],
  );

  const selectedInventory = useMemo(
    () => (inventoryQuery.data ?? []).find((entry) => String(entry.product_id) === selectedProductId) ?? null,
    [inventoryQuery.data, selectedProductId],
  );

  const inventoryWithCatalog = useMemo(() => {
    const productsById = new Map((catalogQuery.data?.products ?? []).map((product) => [product.id, product]));

    return (inventoryQuery.data ?? []).map((entry) => ({
      ...entry,
      image: productsById.get(entry.product_id)?.image ?? '',
    }));
  }, [catalogQuery.data?.products, inventoryQuery.data]);

  const filteredRecentHistory = useMemo(() => {
    const normalizedNameFilter = historyNameFilter.trim().toLowerCase();

    return (recentHistoryQuery.data ?? []).filter((entry) => {
      const matchesName =
        normalizedNameFilter.length === 0 ||
        entry.product_name.toLowerCase().includes(normalizedNameFilter) ||
        entry.shop_name.toLowerCase().includes(normalizedNameFilter);

      const matchesDate =
        historyDateFilter.length === 0 || entry.created_at.slice(0, 10) === historyDateFilter;

      return matchesName && matchesDate;
    });
  }, [historyDateFilter, historyNameFilter, recentHistoryQuery.data]);

  const handleAddInventory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetShopId = activeShopId;
    const parsedQuantity = Number(quantityToAdd);

    if (!targetShopId || !selectedProductId || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return;
    }

    await upsertInventoryEntry.mutateAsync({
      shopId: targetShopId,
      productId: Number(selectedProductId),
      quantity: parsedQuantity,
    });

    setQuantityToAdd('1');
  };

  const handleRemoveInventory = async (entry: InventoryRecord) => {
    await deleteInventoryEntry.mutateAsync({
      inventoryId: entry.inventory_id,
      scopeKey: inventoryScopeKey,
    });
  };

  const handleExportReport = () => {
    if (typeof window === 'undefined' || fullHistoryQuery.data == null || fullHistoryQuery.data.length === 0) {
      return;
    }

    const blob = new Blob([buildInventoryReportDocument(fullHistoryQuery.data)], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    const safeDate = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `inventory-history-${safeDate}.xls`;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
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

      <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-stone-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="grid min-w-0 gap-3 lg:grid-cols-[1fr_1fr] xl:grid-cols-[0.9fr_1.1fr_1.2fr]">
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
            {filteredProducts.slice(0, 100).map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedProduct ? (
        <form className="mt-6 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/70" onSubmit={handleAddInventory}>
          <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="border-b border-slate-200 bg-stone-100/80 dark:border-slate-800 dark:bg-slate-900/70 lg:border-b-0 lg:border-r">
              <img src={selectedProduct.image} alt={selectedProduct.name} className="h-full min-h-56 w-full object-cover" />
            </div>
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{t('selectedProductInventory')}</p>
                  <h3 className="mt-2 text-2xl font-bold">{selectedProduct.name}</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedProduct.category}</p>
                </div>
                <Badge className="bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
                  {t('currentInventory')}: {selectedInventory?.quantity ?? 0}
                </Badge>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-stone-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{t('existingQty')}</p>
                  <p className="mt-2 text-2xl font-bold">{selectedInventory?.quantity ?? 0}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-stone-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{t('addedQty')}</p>
                  <input
                    type="number"
                    min="1"
                    value={quantityToAdd}
                    onChange={(event) => setQuantityToAdd(event.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div className="rounded-3xl border border-slate-200 bg-stone-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{t('totalAvailableQty')}</p>
                  <p className="mt-2 text-2xl font-bold">
                    {(selectedInventory?.quantity ?? 0) + (Number(quantityToAdd) > 0 ? Number(quantityToAdd) : 0)}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="submit"
                  className="h-12 px-6"
                  disabled={upsertInventoryEntry.isPending || !activeShopId || !(Number(quantityToAdd) > 0)}
                >
                  {t('addToInventory')}
                </Button>
                {selectedInventory ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-12 px-6"
                    disabled={deleteInventoryEntry.isPending}
                    onClick={() => void handleRemoveInventory(selectedInventory)}
                  >
                    {t('remove')}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </form>
      ) : null}

      {inventoryQuery.isLoading ? <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">{t('loading')}</p> : null}
      {inventoryQuery.isError ? (
        <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
          {inventoryQuery.error instanceof Error ? inventoryQuery.error.message : t('inventoryLoadFailed')}
        </p>
      ) : null}

      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{t('inventoryHistory')}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('inventoryHistoryCopy')}</p>
          </div>
          <Button variant="secondary" onClick={handleExportReport} disabled={fullHistoryQuery.isLoading || (fullHistoryQuery.data?.length ?? 0) === 0}>
            {t('exportInventoryReport')}
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={historyNameFilter}
            onChange={(event) => setHistoryNameFilter(event.target.value)}
            className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder={t('searchInventoryHistoryByName')}
          />
          <input
            type="date"
            value={historyDateFilter}
            onChange={(event) => setHistoryDateFilter(event.target.value)}
            className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            aria-label={t('filterInventoryHistoryByDate')}
          />
        </div>

        <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-stone-100/90 dark:bg-slate-900/80">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t('date')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t('product')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t('operation')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t('addedQty')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t('existingQty')}</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">{t('totalAvailableQty')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white/80 dark:divide-slate-800 dark:bg-slate-950/60">
                {filteredRecentHistory.slice(0, 20).map((entry) => (
                  <tr key={entry.history_id}>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(entry.created_at).toLocaleString(i18n.language)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{entry.product_name}</p>
                        {isSuperAdmin ? <p className="text-xs text-slate-500 dark:text-slate-400">{entry.shop_name}</p> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={entry.operation_type === 'sale' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : ''}>
                        {entry.operation_type === 'sale' ? t('saleOperation') : t('restockOperation')}
                      </Badge>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${entry.quantity_change < 0 ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
                      {formatSignedQuantity(entry.quantity_change)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{entry.previous_quantity}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{entry.total_quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRecentHistory.length === 0 && !recentHistoryQuery.isLoading ? (
            <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('noInventoryHistory')}</div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid min-w-0 gap-4">
        {(inventoryWithCatalog ?? []).length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-slate-700 dark:bg-slate-950/40">
            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">{t('inventoryDashboard')}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('noInventoryEntriesYet')}</p>
          </div>
        ) : (
          inventoryWithCatalog.map((entry) => (
            <div
              key={entry.inventory_id}
              className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white/85 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950/70"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-3xl bg-stone-100 dark:bg-slate-900">
                    {entry.image ? <img src={entry.image} alt={entry.product_name} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">{entry.product_name}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t('inventoryUpdatedAt', { value: new Date(entry.updated_at).toLocaleString(i18n.language) })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {t('currentInventory')}: {entry.quantity}
                  </Badge>
                  <Button variant="ghost" onClick={() => void handleRemoveInventory(entry)} disabled={deleteInventoryEntry.isPending}>
                    {t('remove')}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
