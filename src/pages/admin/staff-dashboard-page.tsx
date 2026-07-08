import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminOrdersRealtime } from '@/hooks/use-admin-orders';
import { useAuth } from '@/hooks/use-auth';
import { useUpdateOrderStatus } from '@/hooks/use-update-order-status';
import { useUserRole } from '@/hooks/use-user-role';
import { signOut } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';

function SummaryCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {hint ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

function statusClassName(value: string) {
  if (value === 'ready' || value === 'picked_up' || value === 'delivered') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }

  if (value === 'accepted' || value === 'preparing' || value === 'out_for_delivery') {
    return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
  }

  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
}

function formatStatusLabel(value: string, translate: (key: string) => string) {
  const translated = translate(value);
  return translated === value ? value.replace(/_/g, ' ') : translated;
}

export function StaffDashboardPage() {
  const { t, i18n } = useTranslation();
  const { orderId } = useParams();
  const { user } = useAuth();
  const authRoleQuery = useUserRole();
  const updateOrderStatus = useUpdateOrderStatus();
  const shopId = authRoleQuery.data?.shopId ?? null;
  const shopName = authRoleQuery.data?.shopName ?? null;
  const scopeKey = shopId ?? 'unassigned';
  const ordersQuery = useAdminOrdersRealtime(shopId, false);

  const assignedOrders = useMemo(
    () => (ordersQuery.data ?? []).filter((order) => order.assigned_staff_user_id === user?.id),
    [ordersQuery.data, user?.id],
  );
  const preparingOrdersCount = assignedOrders.filter((order) => order.status === 'preparing').length;
  const readyOrdersCount = assignedOrders.filter((order) => order.status === 'ready').length;
  const pickedUpOrdersCount = assignedOrders.filter((order) => order.status === 'picked_up').length;

  const activeOrder = assignedOrders.find((order) => order.id === orderId) ?? assignedOrders[0] ?? null;

  const runStatusUpdate = async (status: 'preparing' | 'ready' | 'picked_up') => {
    if (!activeOrder) {
      return;
    }

    await updateOrderStatus.mutateAsync({
      orderId: activeOrder.id,
      scopeKey,
      status,
    });
  };

  if (authRoleQuery.isLoading || ordersQuery.isLoading) {
    return <div className="glass-panel p-6">{t('loadingOrders')}</div>;
  }

  if (ordersQuery.isError) {
    return (
      <section className="glass-panel p-6">
        <p className="text-sm text-rose-600 dark:text-rose-300">
          {ordersQuery.error instanceof Error ? ordersQuery.error.message : t('failedToLoadOrders')}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t('staffDashboard')}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('staffDashboardCopy')}</p>
            {shopName ? (
              <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                {t('adminShopLabel')}: {shopName}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" onClick={() => void signOut()}>
            {t('signOut')}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label={t('assignedOrdersMetric')} value={assignedOrders.length} hint={t('assignedOrdersMetricHint')} />
        <SummaryCard label={t('preparingOrdersMetric')} value={preparingOrdersCount} hint={t('preparingOrdersMetricHint')} />
        <SummaryCard label={t('readyOrdersMetric')} value={readyOrdersCount} hint={t('readyOrdersMetricHint')} />
        <SummaryCard label={t('pickedUpOrdersMetric')} value={pickedUpOrdersCount} hint={t('pickedUpOrdersMetricHint')} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.2fr]">
        <section className="glass-panel p-3">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold">{t('myAssignedOrders')}</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('staffDashboardCopy')}</p>
            </div>
            <Badge className="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
              {assignedOrders.length}
            </Badge>
          </div>

          {assignedOrders.length === 0 ? (
            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('noAssignedOrders')}</p>
          ) : (
            <div className="mt-4 space-y-2">
              {assignedOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/staff/orders/${order.id}`}
                  className={`block rounded-2xl border p-3 transition ${
                    activeOrder?.id === order.id
                      ? 'border-brand-400 bg-brand-50 shadow-md dark:border-brand-600 dark:bg-brand-900/20'
                      : 'border-slate-200 bg-white/70 hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{order.full_name}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        #{order.id.slice(0, 8)} ·{' '}
                        {new Date(order.created_at).toLocaleString(i18n.language, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Badge className={`${statusClassName(order.status)} text-xs uppercase tracking-wider`}>
                      {formatStatusLabel(order.status, t)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{order.phone}</span>
                    <span className="text-sm font-bold text-brand-600 dark:text-brand-300">{formatCurrency(order.total_rwf)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="glass-panel p-3">
          {!activeOrder ? (
            <div className="flex min-h-[20rem] items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
              {t('noAssignedOrders')}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold">
                    {t('orderLabel')} #{activeOrder.id.slice(0, 8)}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {new Date(activeOrder.created_at).toLocaleString(i18n.language)}
                  </p>
                  {activeOrder.pickup_time ? (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {t('pickupTimeLabel')}: {new Date(activeOrder.pickup_time).toLocaleString(i18n.language)}
                    </p>
                  ) : null}
                  {activeOrder.shops?.name ? (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {t('pickupShop')}: {activeOrder.shops.name}
                    </p>
                  ) : null}
                </div>
                <Badge className={statusClassName(activeOrder.status)}>{formatStatusLabel(activeOrder.status, t)}</Badge>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {t('adminOrderQueue')}
                  </h3>
                  <div className="mt-2 space-y-1.5">
                    {activeOrder.order_items.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white/70 p-2.5 dark:bg-slate-900/70">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold">{item.product_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.quantity} x {formatCurrency(item.unit_price_rwf)}
                            </p>
                          </div>
                          <p className="text-xs font-semibold">{formatCurrency(item.quantity * item.unit_price_rwf)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl bg-stone-50 p-3 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                      {t('customerInfo')}
                    </h3>
                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{activeOrder.full_name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{activeOrder.phone}</p>
                      </div>
                      {activeOrder.delivery_person_name ? (
                        <div className="rounded-2xl bg-brand-50/50 p-2 dark:bg-brand-900/10 border border-brand-100/50 dark:border-brand-800/30">
                          <p className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-0.5">{t('deliveryPersonInfo')}</p>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{activeOrder.delivery_person_name}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">{activeOrder.delivery_person_phone}</p>
                        </div>
                      ) : null}
                      {activeOrder.recurrence && activeOrder.recurrence !== 'one_time' ? (
                        <div className="rounded-2xl bg-stone-50/50 p-2 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/30">
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-0.5">{t('recurringOrder')}</p>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 capitalize">{t(activeOrder.recurrence)}</p>
                          {activeOrder.next_delivery_date ? (
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                              {t('nextDeliveryDate')}: {new Date(activeOrder.next_delivery_date).toLocaleDateString()}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{activeOrder.delivery_address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-stone-100 p-3 dark:bg-slate-900">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between gap-4">
                        <span>{t('subtotal')}</span>
                        <span>{formatCurrency(activeOrder.subtotal_rwf)}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 text-sm font-bold dark:border-slate-800">
                        <span>{t('total')}</span>
                        <span>{formatCurrency(activeOrder.total_rwf)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={activeOrder.status === 'preparing' || activeOrder.status === 'ready' || activeOrder.status === 'picked_up' || activeOrder.status === 'out_for_delivery' || activeOrder.status === 'delivered' || updateOrderStatus.isPending}
                  onClick={() => void runStatusUpdate('preparing')}
                >
                  {t('markPreparing')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={activeOrder.status === 'ready' || activeOrder.status === 'picked_up' || activeOrder.status === 'out_for_delivery' || activeOrder.status === 'delivered' || updateOrderStatus.isPending}
                  onClick={() => void runStatusUpdate('ready')}
                >
                  {t('markReady')}
                </Button>
                <Button
                  type="button"
                  disabled={activeOrder.status === 'picked_up' || activeOrder.status === 'out_for_delivery' || activeOrder.status === 'delivered' || updateOrderStatus.isPending}
                  onClick={() => void runStatusUpdate('picked_up')}
                >
                  {t('markPickedUp')}
                </Button>
              </div>

              {updateOrderStatus.isSuccess ? (
                <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-300">{t('adminStatusUpdated')}</p>
              ) : null}
              {updateOrderStatus.isError ? (
                <p className="mt-4 text-sm text-rose-600 dark:text-rose-300">
                  {updateOrderStatus.error instanceof Error ? updateOrderStatus.error.message : t('adminStatusUpdateFailed')}
                </p>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
