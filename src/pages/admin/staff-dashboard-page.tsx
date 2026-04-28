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

function statusClassName(value: string) {
  if (value === 'ready' || value === 'picked_up') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }

  if (value === 'accepted' || value === 'preparing') {
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
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/">
              <Button variant="secondary">{t('keepShopping')}</Button>
            </Link>
            <Button variant="ghost" onClick={() => void signOut()}>
              {t('signOut')}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
        <section className="glass-panel p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">{t('myAssignedOrders')}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('staffDashboardCopy')}</p>
            </div>
            <Badge className="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
              {assignedOrders.length}
            </Badge>
          </div>

          {assignedOrders.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">{t('noAssignedOrders')}</p>
          ) : (
            <div className="mt-5 space-y-3">
              {assignedOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/staff/orders/${order.id}`}
                  className={`block rounded-3xl border p-4 transition ${
                    activeOrder?.id === order.id
                      ? 'border-brand-400 bg-brand-50 shadow-md dark:border-brand-600 dark:bg-brand-900/20'
                      : 'border-slate-200 bg-white/70 hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-900 dark:text-slate-100">{order.full_name}</p>
                      <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        #{order.id.slice(0, 8)} ·{' '}
                        {new Date(order.created_at).toLocaleString(i18n.language, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Badge className={`${statusClassName(order.status)} text-[10px] uppercase tracking-wider`}>
                      {formatStatusLabel(order.status, t)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{order.phone}</span>
                    <span className="font-bold text-brand-600 dark:text-brand-300">{formatCurrency(order.total_rwf)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="glass-panel p-6">
          {!activeOrder ? (
            <div className="flex min-h-[24rem] items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
              {t('noAssignedOrders')}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">
                    {t('orderLabel')} #{activeOrder.id.slice(0, 8)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {new Date(activeOrder.created_at).toLocaleString(i18n.language)}
                  </p>
                  {activeOrder.pickup_time ? (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t('pickupTimeLabel')}: {new Date(activeOrder.pickup_time).toLocaleString(i18n.language)}
                    </p>
                  ) : null}
                  {activeOrder.shops?.name ? (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t('pickupShop')}: {activeOrder.shops.name}
                    </p>
                  ) : null}
                </div>
                <Badge className={statusClassName(activeOrder.status)}>{formatStatusLabel(activeOrder.status, t)}</Badge>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    {t('adminOrderQueue')}
                  </h3>
                  <div className="mt-3 space-y-3">
                    {activeOrder.order_items.map((item) => (
                      <div key={item.id} className="rounded-3xl bg-white/70 p-4 dark:bg-slate-900/70">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold">{item.product_name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {item.quantity} x {formatCurrency(item.unit_price_rwf)}
                            </p>
                          </div>
                          <p className="font-semibold">{formatCurrency(item.quantity * item.unit_price_rwf)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl bg-stone-50 p-5 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                      {t('customerInfo')}
                    </h3>
                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activeOrder.full_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{activeOrder.phone}</p>
                      </div>
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{activeOrder.delivery_address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-stone-100 p-4 dark:bg-slate-900">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <span>{t('subtotal')}</span>
                        <span>{formatCurrency(activeOrder.subtotal_rwf)}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base font-bold dark:border-slate-800">
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
                  disabled={activeOrder.status === 'preparing' || activeOrder.status === 'ready' || activeOrder.status === 'picked_up' || updateOrderStatus.isPending}
                  onClick={() => void runStatusUpdate('preparing')}
                >
                  {t('markPreparing')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={activeOrder.status === 'ready' || activeOrder.status === 'picked_up' || updateOrderStatus.isPending}
                  onClick={() => void runStatusUpdate('ready')}
                >
                  {t('markReady')}
                </Button>
                <Button
                  type="button"
                  disabled={activeOrder.status === 'picked_up' || updateOrderStatus.isPending}
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
