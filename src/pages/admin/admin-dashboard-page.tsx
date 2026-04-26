import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminOrdersRealtime } from '@/hooks/use-admin-orders';
import { useShopAdmins } from '@/hooks/use-shop-admins';
import { useShops } from '@/hooks/use-shops';
import { useAssignShopAdmin, useCreateShop } from '@/hooks/use-super-admin-management';
import { useAssignOrderToStaff, useUpdateOrderStatus } from '@/hooks/use-update-order-status';
import { useUserRole } from '@/hooks/use-user-role';
import { InventoryPanel } from '@/pages/admin/inventory-panel';
import { ShopSettingsPanel } from '@/pages/admin/shop-settings-panel';
import { signOut } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import type { AdminOrderRecord, ShopAdminAssignment, ShopOrderStatus } from '@/types';

function statusClassName(value: ShopOrderStatus | string) {
  if (value === 'ready' || value === 'picked_up') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }

  if (value === 'accepted' || value === 'preparing') {
    return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
  }

  if (value === 'rejected') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  }

  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
}

function paymentClassName(value: string) {
  if (value === 'paid') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }

  if (value === 'failed') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  }

  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
}

function formatStatusLabel(value: string, translate: (key: string) => string) {
  const translated = translate(value);
  return translated === value ? value.replace(/_/g, ' ') : translated;
}

function AdminOrderActions({
  order,
  scopeKey,
  canManageOrders,
  isAssignedStaff,
}: {
  order: AdminOrderRecord;
  scopeKey: string;
  canManageOrders: boolean;
  isAssignedStaff: boolean;
}) {
  const { t } = useTranslation();
  const updateOrderStatus = useUpdateOrderStatus();

  const runStatusUpdate = async (status: ShopOrderStatus) => {
    await updateOrderStatus.mutateAsync({
      orderId: order.id,
      scopeKey,
      status,
    });
  };

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {canManageOrders && order.status === 'pending' ? (
        <>
          <Button
            type="button"
            disabled={updateOrderStatus.isPending}
            onClick={() => void runStatusUpdate('accepted')}
            className="w-full"
          >
            {t('acceptOrder')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={updateOrderStatus.isPending}
            onClick={() => void runStatusUpdate('rejected')}
            className="w-full"
          >
            {t('rejectOrder')}
          </Button>
        </>
      ) : null}
      {canManageOrders && order.status !== 'pending' && order.status !== 'rejected' ? (
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={order.status === 'preparing' || updateOrderStatus.isPending}
            onClick={() => void runStatusUpdate('preparing')}
            className="w-full"
          >
            {t('markPreparing')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={order.status === 'ready' || updateOrderStatus.isPending}
            onClick={() => void runStatusUpdate('ready')}
            className="w-full"
          >
            {t('markReady')}
          </Button>
          <Button
            type="button"
            disabled={order.status === 'picked_up' || updateOrderStatus.isPending}
            onClick={() => void runStatusUpdate('picked_up')}
            className="w-full"
          >
            {t('markPickedUp')}
          </Button>
        </>
      ) : null}
      {!canManageOrders && isAssignedStaff ? (
        <Button
          type="button"
          className="sm:col-span-2 lg:col-span-3 w-full"
          disabled={order.status === 'ready' || order.status === 'picked_up' || updateOrderStatus.isPending}
          onClick={() => void runStatusUpdate('ready')}
        >
          {t('markReady')}
        </Button>
      ) : null}
      {canManageOrders && order.status === 'rejected' ? (
        <p className="sm:col-span-2 lg:col-span-3 text-sm text-rose-600 dark:text-rose-300">{t('orderRejectedNotice')}</p>
      ) : null}
      {!canManageOrders && !isAssignedStaff ? (
        <p className="sm:col-span-2 lg:col-span-3 text-sm text-slate-500 dark:text-slate-400">{t('staffAssignmentRequired')}</p>
      ) : null}
      {updateOrderStatus.isSuccess ? (
        <p className="sm:col-span-2 lg:col-span-3 text-sm text-emerald-600 dark:text-emerald-300">{t('adminStatusUpdated')}</p>
      ) : null}
      {updateOrderStatus.isError ? (
        <p className="sm:col-span-2 lg:col-span-3 text-sm text-rose-600 dark:text-rose-300">
          {updateOrderStatus.error instanceof Error ? updateOrderStatus.error.message : t('adminStatusUpdateFailed')}
        </p>
      ) : null}
    </div>
  );
}

function AdminOrderDetail({
  order,
  scopeKey,
  canManageOrders,
  currentUserRole,
  staffAssignments,
}: {
  order: AdminOrderRecord | null;
  scopeKey: string;
  canManageOrders: boolean;
  currentUserRole: 'admin' | 'manager' | 'staff' | 'super_admin';
  staffAssignments: ShopAdminAssignment[];
}) {
  const { t, i18n } = useTranslation();
  const assignOrderToStaff = useAssignOrderToStaff();
  const [staffUserId, setStaffUserId] = useState('');

  if (!order) {
    return (
      <section className="glass-panel flex flex-col items-center justify-center p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900/50">
          <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-bold">{t('adminOrderDetail')}</h2>
        <p className="mt-2 max-w-[240px] text-sm text-slate-500 dark:text-slate-400">{t('adminNoOrders')}</p>
      </section>
    );
  }

  const orderStaffAssignments = staffAssignments.filter(
    (assignment) => assignment.shop_id === order.shop_id && assignment.role === 'staff',
  );
  const assignedStaff = orderStaffAssignments.find((assignment) => assignment.user_id === order.assigned_staff_user_id) ?? null;
  const handleAssignStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!staffUserId) {
      return;
    }

    await assignOrderToStaff.mutateAsync({
      orderId: order.id,
      scopeKey,
      staffUserId,
    });
  };

  return (
    <section className="glass-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold break-words">
            {t('orderLabel')} #{order.id.slice(0, 8)}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 break-words">
            {new Date(order.created_at).toLocaleString(i18n.language)}
          </p>
          {order.pickup_time ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 break-words">
              {t('pickupTimeLabel')}: {new Date(order.pickup_time).toLocaleString(i18n.language)}
            </p>
          ) : null}
          {order.shops?.name ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 break-words">
              {t('pickupShop')}: {order.shops.name}
            </p>
          ) : null}
          {assignedStaff ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 break-words">
              {t('assignedStaffLabel')}: {assignedStaff.user_email}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={statusClassName(order.status)}>{formatStatusLabel(order.status, t)}</Badge>
          <Badge className={paymentClassName(order.payment_status)}>
            {t('payment')}: {formatStatusLabel(order.payment_status, t)}
          </Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            {t('adminOrderQueue')}
          </h3>
          <div className="mt-3 space-y-3">
            {order.order_items.map((item) => (
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
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{order.full_name}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">{t('customerName')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{order.phone}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">{t('phone')}</p>
              </div>
              {order.user_email ? (
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{order.user_email}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">{t('email')}</p>
                </div>
              ) : null}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{order.delivery_address}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">{t('deliveryAddress')}</p>
              </div>
              {order.notes ? (
                <div className="rounded-2xl bg-brand-50/50 p-3 dark:bg-brand-900/10 border border-brand-100/50 dark:border-brand-800/30">
                  <p className="text-[10px] font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-1">{t('notes')}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{order.notes}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl bg-stone-100 p-4 dark:bg-slate-900">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span>{t('subtotal')}</span>
                <span>{formatCurrency(order.subtotal_rwf)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base font-bold dark:border-slate-800">
                <span>{t('total')}</span>
                <span>{formatCurrency(order.total_rwf)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AdminOrderActions
        order={order}
        scopeKey={scopeKey}
        canManageOrders={canManageOrders}
        isAssignedStaff={currentUserRole === 'staff' && Boolean(order.assigned_staff_user_id)}
      />
      {canManageOrders ? (
        <form className="mt-6 rounded-3xl bg-stone-100 p-4 dark:bg-slate-900" onSubmit={handleAssignStaff}>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            {t('assignOrderToStaff')}
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <select
              value={staffUserId}
              onChange={(event) => setStaffUserId(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">{t('selectStaff')}</option>
              {orderStaffAssignments.map((assignment) => (
                <option key={assignment.user_id} value={assignment.user_id}>
                  {assignment.user_email}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={!staffUserId || assignOrderToStaff.isPending}>
              {t('assignOrder')}
            </Button>
          </div>
          {assignOrderToStaff.isSuccess ? (
            <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-300">{t('orderAssigned')}</p>
          ) : null}
          {assignOrderToStaff.isError ? (
            <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">
              {assignOrderToStaff.error instanceof Error ? assignOrderToStaff.error.message : t('orderAssignFailed')}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}

function SuperAdminPanel() {
  const { t } = useTranslation();
  const shopsQuery = useShops();
  const shopAdminsQuery = useShopAdmins(true);
  const createShop = useCreateShop();
  const assignShopAdmin = useAssignShopAdmin();
  const [shopForm, setShopForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    phone: '',
  });
  const [assignmentForm, setAssignmentForm] = useState({
    adminEmail: '',
    shopId: '',
    role: 'admin' as 'admin' | 'manager' | 'staff',
  });

  const handleCreateShop = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createShop.mutateAsync({
      name: shopForm.name,
      address: shopForm.address,
      latitude: Number(shopForm.latitude),
      longitude: Number(shopForm.longitude),
      phone: shopForm.phone,
    });
    setShopForm({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      phone: '',
    });
  };

  const handleAssignShopAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await assignShopAdmin.mutateAsync(assignmentForm);
    setAssignmentForm((current) => ({
      ...current,
      adminEmail: '',
    }));
  };

  return (
    <section className="glass-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{t('superAdminControls')}</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('superAdminControlsCopy')}</p>
        </div>
        <Badge>{t('superAdminBadge')}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form className="rounded-3xl bg-stone-100 p-4 dark:bg-slate-900" onSubmit={handleCreateShop}>
          <h3 className="text-lg font-semibold">{t('createShop')}</h3>
          <div className="mt-4 grid gap-3">
            <input
              required
              value={shopForm.name}
              onChange={(event) => setShopForm((current) => ({ ...current, name: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('shopName')}
            />
            <input
              required
              value={shopForm.address}
              onChange={(event) => setShopForm((current) => ({ ...current, address: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('shopAddress')}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                type="number"
                step="any"
                value={shopForm.latitude}
                onChange={(event) => setShopForm((current) => ({ ...current, latitude: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                placeholder={t('latitude')}
              />
              <input
                required
                type="number"
                step="any"
                value={shopForm.longitude}
                onChange={(event) => setShopForm((current) => ({ ...current, longitude: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                placeholder={t('longitude')}
              />
            </div>
            <input
              required
              value={shopForm.phone}
              onChange={(event) => setShopForm((current) => ({ ...current, phone: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('shopPhone')}
            />
          </div>
          <Button type="submit" className="mt-4 w-full sm:w-auto" disabled={createShop.isPending}>
            {t('createShop')}
          </Button>
          {createShop.isSuccess ? <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-300">{t('shopCreated')}</p> : null}
          {createShop.isError ? (
            <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">
              {createShop.error instanceof Error ? createShop.error.message : t('shopCreateFailed')}
            </p>
          ) : null}
        </form>

        <form className="rounded-3xl bg-stone-100 p-4 dark:bg-slate-900" onSubmit={handleAssignShopAdmin}>
          <h3 className="text-lg font-semibold">{t('assignShopAdmin')}</h3>
          <div className="mt-4 grid gap-3">
            <input
              required
              type="email"
              value={assignmentForm.adminEmail}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, adminEmail: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('shopAdminEmail')}
            />
            <select
              required
              value={assignmentForm.shopId}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, shopId: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">{t('selectShop')}</option>
              {(shopsQuery.data ?? []).map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
            <select
              value={assignmentForm.role}
              onChange={(event) =>
                setAssignmentForm((current) => ({ ...current, role: event.target.value as 'admin' | 'manager' | 'staff' }))
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="admin">{t('admin')}</option>
              <option value="manager">{t('manager')}</option>
              <option value="staff">{t('staff')}</option>
            </select>
          </div>
          <Button type="submit" className="mt-4 w-full sm:w-auto" disabled={assignShopAdmin.isPending}>
            {t('assignShopAdmin')}
          </Button>
          {assignShopAdmin.isSuccess ? (
            <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-300">{t('shopAdminAssigned')}</p>
          ) : null}
          {assignShopAdmin.isError ? (
            <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">
              {assignShopAdmin.error instanceof Error ? assignShopAdmin.error.message : t('shopAdminAssignFailed')}
            </p>
          ) : null}
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white/70 p-4 dark:bg-slate-900/60">
          <h3 className="text-lg font-semibold">{t('registeredShops')}</h3>
          <div className="mt-4 space-y-3">
            {(shopsQuery.data ?? []).map((shop) => (
              <div key={shop.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-semibold">{shop.name}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{shop.address}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{shop.phone}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white/70 p-4 dark:bg-slate-900/60">
          <h3 className="text-lg font-semibold">{t('shopAdminAssignments')}</h3>
          {shopAdminsQuery.isLoading ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('loading')}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {(shopAdminsQuery.data ?? []).map((assignment) => (
                <div key={assignment.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{assignment.user_email}</p>
                    <Badge>{formatStatusLabel(assignment.role, t)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{assignment.shop_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function AdminDashboardPage() {
  const { t, i18n } = useTranslation();
  const { orderId } = useParams();
  const authRoleQuery = useUserRole();
  const shopsQuery = useShops();
  const isSuperAdmin = authRoleQuery.data?.role === 'super_admin';
  const adminRole = authRoleQuery.data?.adminRole ?? null;
  const canManageOrders = isSuperAdmin || adminRole === 'admin' || adminRole === 'manager';
  const shopId = authRoleQuery.data?.shopId ?? null;
  const scopeKey = isSuperAdmin ? 'all-shops' : (shopId ?? 'unassigned');
  const shopAdminsQuery = useShopAdmins(Boolean(isSuperAdmin || canManageOrders));
  const ordersQuery = useAdminOrdersRealtime(shopId, isSuperAdmin);
  const shops = shopsQuery.data ?? [];
  const currentShop = shops.find((shop) => shop.id === shopId) ?? null;

  const [statusFilter, setStatusFilter] = useState<string>('all');

  if (authRoleQuery.isLoading || ordersQuery.isLoading || shopsQuery.isLoading || shopAdminsQuery.isLoading) {
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

  const rawOrders = ordersQuery.data ?? [];
  const orders = rawOrders
    .filter((order) => (statusFilter === 'all' ? true : order.status === statusFilter))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const activeOrder = orders.find((order) => order.id === orderId) ?? orders[0] ?? null;

  return (
    <div className="space-y-6">
      <section className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t('adminDashboard')}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('adminDashboardCopy')}</p>
            {authRoleQuery.data?.shopName ? (
              <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                {t('adminShopLabel')}: {authRoleQuery.data.shopName === 'All Simba shops' ? t('allOrders') : authRoleQuery.data.shopName}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t('dashboardRoleLabel')}: {formatStatusLabel(isSuperAdmin ? 'superAdminBadge' : (adminRole ?? 'staff'), t)}
            </p>
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

      {isSuperAdmin ? <SuperAdminPanel /> : null}

      {canManageOrders || isSuperAdmin ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <InventoryPanel
            scopeShopId={shopId}
            isSuperAdmin={isSuperAdmin}
            shops={shops.map((shop) => ({ id: shop.id, name: shop.name }))}
          />
          <ShopSettingsPanel
            shopId={shopId}
            shopName={currentShop?.name ?? authRoleQuery.data?.shopName ?? null}
            phone={currentShop?.phone ?? ''}
            shops={shops.map((shop) => ({ id: shop.id, name: shop.name, phone: shop.phone }))}
            isSuperAdmin={isSuperAdmin}
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] xl:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-panel p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
              <h2 className="text-xl font-bold sm:text-2xl">{t('adminOrderQueue')}</h2>
              <Badge className="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                {orders.length}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'accepted', 'preparing', 'ready', 'picked_up', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                    statusFilter === status
                      ? 'bg-brand-500 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  {status === 'all' ? t('allCategories') : formatStatusLabel(status, t)}
                </button>
              ))}
            </div>
          </div>

          {orders.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {statusFilter === 'all' ? t('adminNoOrders') : t('noResults')}
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  to={`/admin/orders/${order.id}`}
                  className={`block rounded-3xl border p-4 transition ${
                    activeOrder?.id === order.id
                      ? 'border-brand-400 bg-brand-50 shadow-md dark:border-brand-600 dark:bg-brand-900/20'
                      : 'border-slate-200 bg-white/70 hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-900 dark:text-slate-100">
                        {order.full_name}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        #{order.id.slice(0, 8)} • {new Date(order.created_at).toLocaleString(i18n.language, {
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

        <AdminOrderDetail
          order={activeOrder}
          scopeKey={scopeKey}
          canManageOrders={canManageOrders || isSuperAdmin}
          currentUserRole={isSuperAdmin ? 'super_admin' : (adminRole ?? 'staff')}
          staffAssignments={shopAdminsQuery.data ?? []}
        />
      </div>
    </div>
  );
}
