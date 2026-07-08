import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { BarChart3, ClipboardList, LayoutGrid, Percent, Settings2, ShieldCheck, Store, Truck } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdminOrdersRealtime } from '@/hooks/use-admin-orders';
import { useShopAdmins, useUnassignedStaff } from '@/hooks/use-shop-admins';
import { useShops } from '@/hooks/use-shops';
import { useAssignShopAdmin, useCreateShop, useRemoveShopAdminAssignment } from '@/hooks/use-super-admin-management';
import { useAssignOrderToDelivery, useAssignOrderToStaff, useRemoveDeliveryAssignment, useUpdateOrderStatus } from '@/hooks/use-update-order-status';
import { useDeliveryPersons, useCreateDeliveryPerson, useDeleteDeliveryPerson } from '@/hooks/use-delivery-persons';
import { usePromotionManagement, useCreatePromotion, useUpdatePromotion, useDeletePromotion } from '@/hooks/use-promotion-management';
import { useCatalog } from '@/hooks/use-catalog';
import { useUserRole } from '@/hooks/use-user-role';
import { AnalyticsPanel } from '@/pages/admin/analytics-panel';
import { InventoryPanel } from '@/pages/admin/inventory-panel';
import { ShopSettingsPanel } from '@/pages/admin/shop-settings-panel';
import { signOut } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import type { AdminOrderRecord, DeliveryPerson, ShopAdminAssignment, ShopOrderStatus, UnassignedStaffProfile } from '@/types';

function SummaryCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

function statusClassName(value: ShopOrderStatus | string) {
  if (value === 'ready' || value === 'picked_up' || value === 'delivered') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }

  if (value === 'accepted' || value === 'preparing' || value === 'out_for_delivery') {
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
  const [rejectionReason, setRejectionReason] = useState('');

  const runStatusUpdate = async (status: ShopOrderStatus) => {
    await updateOrderStatus.mutateAsync({
      orderId: order.id,
      scopeKey,
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : undefined,
    });

    if (status === 'rejected') {
      setRejectionReason('');
    }
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
          <div className="sm:col-span-2 lg:col-span-2 rounded-3xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-900/40 dark:bg-rose-900/10">
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{t('rejectOrder')}</p>
            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              className="mt-3 min-h-24 w-full rounded-2xl border border-rose-200 bg-white px-3 py-2 text-xs dark:border-rose-900/40 dark:bg-slate-950"
              placeholder={t('rejectionReasonPlaceholder')}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={updateOrderStatus.isPending || !rejectionReason.trim()}
              onClick={() => void runStatusUpdate('rejected')}
              className="mt-3 w-full"
            >
              {t('sendRejection')}
            </Button>
          </div>
        </>
      ) : null}
      {canManageOrders && order.status !== 'pending' && order.status !== 'rejected' && order.status !== 'out_for_delivery' && order.status !== 'delivered' ? (
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
      {canManageOrders && order.status === 'out_for_delivery' ? (
        <Button
          type="button"
          className="sm:col-span-2 lg:col-span-3 w-full"
          disabled={updateOrderStatus.isPending}
          onClick={() => void runStatusUpdate('delivered')}
        >
          {t('markDelivered')}
        </Button>
      ) : null}
      {!canManageOrders && isAssignedStaff && order.status !== 'out_for_delivery' && order.status !== 'delivered' ? (
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
        <div className="sm:col-span-2 lg:col-span-3 rounded-3xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/10 dark:text-rose-300">
          <p className="font-medium">{t('orderRejectedNotice')}</p>
          {order.rejection_reason ? <p className="mt-2">{order.rejection_reason}</p> : null}
        </div>
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
  deliveryPersons,
}: {
  order: AdminOrderRecord | null;
  scopeKey: string;
  canManageOrders: boolean;
  currentUserRole: 'admin' | 'manager' | 'staff' | 'super_admin';
  staffAssignments: ShopAdminAssignment[];
  deliveryPersons: DeliveryPerson[];
}) {
  const { t, i18n } = useTranslation();
  const assignOrderToStaff = useAssignOrderToStaff();
  const assignOrderToDelivery = useAssignOrderToDelivery();
  const removeDeliveryAssignment = useRemoveDeliveryAssignment();
  const [staffUserId, setStaffUserId] = useState('');
  const [deliveryPersonId, setDeliveryPersonId] = useState('');

  if (!order) {
    return (
      <section className="glass-panel flex flex-col items-center justify-center p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900/50">
          <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <h2 className="mt-3 text-lg font-bold">{t('adminOrderDetail')}</h2>
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
    <section className="glass-panel p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold break-words">
            {t('orderLabel')} #{order.id.slice(0, 8)}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 break-words">
            {new Date(order.created_at).toLocaleString(i18n.language)}
          </p>
          {order.pickup_time ? (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 break-words">
              {t('pickupTimeLabel')}: {new Date(order.pickup_time).toLocaleString(i18n.language)}
            </p>
          ) : null}
          {order.shops?.name ? (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 break-words">
              {t('pickupShop')}: {order.shops.name}
            </p>
          ) : null}
          {assignedStaff ? (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 break-words">
              {t('assignedStaffLabel')}: {assignedStaff.user_full_name || assignedStaff.user_email}
            </p>
          ) : null}
          {order.delivery_person_name ? (
            <div className="mt-2 rounded-2xl bg-brand-50/50 p-2 dark:bg-brand-900/10 border border-brand-100/50 dark:border-brand-800/30">
              <p className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-0.5">{t('deliveryPersonInfo')}</p>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{order.delivery_person_name}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{order.delivery_person_phone}</p>
            </div>
          ) : null}
          {order.recurrence && order.recurrence !== 'one_time' ? (
            <div className="mt-2 rounded-2xl bg-stone-50/50 p-2 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/30">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-0.5">{t('recurringOrder')}</p>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 capitalize">{t(order.recurrence)}</p>
              {order.next_delivery_date ? (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {t('nextDeliveryDate')}: {new Date(order.next_delivery_date).toLocaleDateString()}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={statusClassName(order.status)}>{formatStatusLabel(order.status, t)}</Badge>
          <Badge className={paymentClassName(order.payment_status)}>
            {t('payment')}: {formatStatusLabel(order.payment_status, t)}
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {t('adminOrderQueue')}
          </h3>
          <div className="mt-2 space-y-1.5">
            {order.order_items.map((item) => (
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
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{order.full_name}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">{t('customerName')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{order.phone}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">{t('phone')}</p>
              </div>
              {order.user_email ? (
                <div>
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{order.user_email}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">{t('email')}</p>
                </div>
              ) : null}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{order.delivery_address}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">{t('deliveryAddress')}</p>
              </div>
              {order.notes ? (
                <div className="rounded-2xl bg-brand-50/50 p-2 dark:bg-brand-900/10 border border-brand-100/50 dark:border-brand-800/30">
                  <p className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-0.5">{t('notes')}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{order.notes}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl bg-stone-100 p-3 dark:bg-slate-900">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-4">
                <span>{t('subtotal')}</span>
                <span>{formatCurrency(order.subtotal_rwf)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-2 text-sm font-bold dark:border-slate-800">
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
                  {assignment.user_full_name || assignment.user_email}
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
      {canManageOrders && order.status === 'ready' ? (
        <form
          className="mt-4 rounded-3xl bg-stone-100 p-4 dark:bg-slate-900"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!deliveryPersonId) return;
            void assignOrderToDelivery.mutateAsync({
              orderId: order.id,
              scopeKey,
              deliveryPersonId,
            });
          }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            {t('assignDeliveryPerson')}
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <select
              value={deliveryPersonId}
              onChange={(event) => setDeliveryPersonId(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">{t('selectDeliveryPerson')}</option>
              {deliveryPersons.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} - {person.phone}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={!deliveryPersonId || assignOrderToDelivery.isPending}>
              {t('assignDelivery')}
            </Button>
          </div>
          {assignOrderToDelivery.isSuccess ? (
            <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-300">{t('deliveryAssigned')}</p>
          ) : null}
          {assignOrderToDelivery.isError ? (
            <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">
              {assignOrderToDelivery.error instanceof Error ? assignOrderToDelivery.error.message : t('deliveryAssignFailed')}
            </p>
          ) : null}
        </form>
      ) : null}
      {canManageOrders && order.status === 'out_for_delivery' && order.delivery_person_id ? (
        <div className="mt-4 rounded-3xl bg-stone-100 p-4 dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            {t('deliveryPerson')}
          </p>
          <p className="mt-2 font-semibold">{order.delivery_person_name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{order.delivery_person_phone}</p>
          <Button
            type="button"
            variant="ghost"
            className="mt-3"
            disabled={removeDeliveryAssignment.isPending}
            onClick={() =>
              void removeDeliveryAssignment.mutateAsync({
                orderId: order.id,
                scopeKey,
              })
            }
          >
            {t('removeDeliveryAssignment')}
          </Button>
          {removeDeliveryAssignment.isSuccess ? (
            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-300">{t('deliveryAssignmentRemoved')}</p>
          ) : null}
          {removeDeliveryAssignment.isError ? (
            <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">
              {removeDeliveryAssignment.error instanceof Error ? removeDeliveryAssignment.error.message : t('deliveryAssignFailed')}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function DeliveryManagementPanel({
  shopId,
}: {
  shopId: string | null;
}) {
  const { t } = useTranslation();
  const [selectedShopId] = useState(shopId ?? '');
  const deliveryPersonsQuery = useDeliveryPersons(selectedShopId || shopId);
  const createDeliveryPerson = useCreateDeliveryPerson();
  const deleteDeliveryPerson = useDeleteDeliveryPerson();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetShopId = selectedShopId || shopId;
    if (!targetShopId || !name.trim() || !phone.trim()) return;

    await createDeliveryPerson.mutateAsync({
      shopId: targetShopId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
    });

    setName('');
    setPhone('');
    setEmail('');
  };

  const deliveryPersons = deliveryPersonsQuery.data ?? [];

  return (
    <section className="glass-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{t('deliveryManagement')}</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('deliveryManagementCopy')}</p>
        </div>
        <Badge>{deliveryPersons.length}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form className="rounded-3xl bg-stone-100 p-4 dark:bg-slate-900" onSubmit={handleAdd}>
          <h3 className="text-sm font-semibold">{t('addDeliveryPerson')}</h3>
          <div className="mt-4 grid gap-3">
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('deliveryPersonName')}
            />
            <input
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('deliveryPersonPhone')}
            />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('deliveryPersonEmail')}
            />
          </div>
          <Button type="submit" className="mt-4 w-full sm:w-auto" disabled={createDeliveryPerson.isPending}>
            {t('addDeliveryPerson')}
          </Button>
          {createDeliveryPerson.isSuccess ? (
            <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-300">{t('deliveryPersonAdded')}</p>
          ) : null}
          {createDeliveryPerson.isError ? (
            <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">
              {createDeliveryPerson.error instanceof Error ? createDeliveryPerson.error.message : t('deliveryPersonAddFailed')}
            </p>
          ) : null}
        </form>

        <div className="rounded-3xl bg-white/70 p-4 dark:bg-slate-900/60">
          <h3 className="text-sm font-semibold">{t('deliveryPerson')}</h3>
          <div className="mt-4 space-y-3 max-h-[28rem] overflow-y-auto pr-1">
            {deliveryPersons.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('noTeamAssignments')}</p>
            ) : (
              deliveryPersons.map((person) => (
                <div key={person.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{person.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{person.phone}</p>
                      {person.email ? <p className="text-sm text-slate-500 dark:text-slate-400">{person.email}</p> : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void deleteDeliveryPerson.mutateAsync({ id: person.id })}
                      disabled={deleteDeliveryPerson.isPending}
                    >
                      {t('remove')}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
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
    <section className="glass-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">{t('superAdminControls')}</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('superAdminControlsCopy')}</p>
        </div>
        <Badge>{t('superAdminBadge')}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form className="rounded-3xl bg-stone-100 p-4 dark:bg-slate-900" onSubmit={handleCreateShop}>
          <h3 className="text-sm font-semibold">{t('createShop')}</h3>
          <div className="mt-4 grid gap-3">
            <input
              required
              value={shopForm.name}
              onChange={(event) => setShopForm((current) => ({ ...current, name: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('shopName')}
            />
            <input
              required
              value={shopForm.address}
              onChange={(event) => setShopForm((current) => ({ ...current, address: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('shopAddress')}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                type="number"
                step="any"
                value={shopForm.latitude}
                onChange={(event) => setShopForm((current) => ({ ...current, latitude: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                placeholder={t('latitude')}
              />
              <input
                required
                type="number"
                step="any"
                value={shopForm.longitude}
                onChange={(event) => setShopForm((current) => ({ ...current, longitude: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                placeholder={t('longitude')}
              />
            </div>
            <input
              required
              value={shopForm.phone}
              onChange={(event) => setShopForm((current) => ({ ...current, phone: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
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
          <h3 className="text-sm font-semibold">{t('assignShopAdmin')}</h3>
          <div className="mt-4 grid gap-3">
            <input
              required
              type="email"
              value={assignmentForm.adminEmail}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, adminEmail: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('shopAdminEmail')}
            />
            <select
              required
              value={assignmentForm.shopId}
              onChange={(event) => setAssignmentForm((current) => ({ ...current, shopId: event.target.value }))}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
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
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
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
          <h3 className="text-sm font-semibold">{t('registeredShops')}</h3>
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
          <h3 className="text-sm font-semibold">{t('shopAdminAssignments')}</h3>
          {shopAdminsQuery.isLoading ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('loading')}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {(shopAdminsQuery.data ?? []).map((assignment) => (
                <div key={assignment.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{assignment.user_full_name || assignment.user_email}</p>
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

function TeamManagementPanel({
  isSuperAdmin,
  scopeShopId,
  shops,
  assignments,
  unassignedStaff,
}: {
  isSuperAdmin: boolean;
  scopeShopId: string | null;
  shops: { id: string; name: string }[];
  assignments: ShopAdminAssignment[];
  unassignedStaff: UnassignedStaffProfile[];
}) {
  const { t } = useTranslation();
  const assignShopAdmin = useAssignShopAdmin();
  const removeShopAdminAssignment = useRemoveShopAdminAssignment();
  const [selectedShopId, setSelectedShopId] = useState(scopeShopId ?? '');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'staff'>(isSuperAdmin ? 'admin' : 'staff');

  const visibleAssignments = assignments.filter((assignment) =>
    isSuperAdmin ? true : assignment.shop_id === scopeShopId && assignment.role === 'staff',
  );

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetShopId = isSuperAdmin ? selectedShopId : scopeShopId;

    if (!targetShopId || !email.trim()) {
      return;
    }

    await assignShopAdmin.mutateAsync({
      adminEmail: email.trim(),
      shopId: targetShopId,
      role: isSuperAdmin ? role : 'staff',
    });

    setEmail('');
    if (!isSuperAdmin) {
      setRole('staff');
    }
  };

  const handleRemove = async (assignmentId: string) => {
    await removeShopAdminAssignment.mutateAsync({ assignmentId });
  };

  return (
    <section className="glass-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
<h2 className="text-base font-bold">{t('teamManagement')}</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isSuperAdmin ? t('teamManagementSuperAdminCopy') : t('teamManagementShopAdminCopy')}
          </p>
        </div>
        <Badge>{visibleAssignments.length}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form className="rounded-3xl bg-stone-100 p-4 dark:bg-slate-900" onSubmit={handleAssign}>
          <h3 className="text-sm font-semibold">{isSuperAdmin ? t('assignShopAdmin') : t('addStaffMember')}</h3>
          <div className="mt-4 grid gap-3">
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('shopAdminEmail')}
            />
            {isSuperAdmin ? (
              <>
                <select
                  required
                  value={selectedShopId}
                  onChange={(event) => setSelectedShopId(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="">{t('selectShop')}</option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as 'admin' | 'manager' | 'staff')}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                >
                  <option value="admin">{t('admin')}</option>
                  <option value="manager">{t('manager')}</option>
                  <option value="staff">{t('staff')}</option>
                </select>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                {shops.find((shop) => shop.id === scopeShopId)?.name ?? t('selectShop')}
              </div>
            )}
          </div>
          <Button type="submit" className="mt-4 w-full sm:w-auto" disabled={assignShopAdmin.isPending}>
            {isSuperAdmin ? t('assignShopAdmin') : t('addStaffMember')}
          </Button>
          {assignShopAdmin.isSuccess ? <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-300">{t('shopAdminAssigned')}</p> : null}
          {assignShopAdmin.isError ? (
            <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">
              {assignShopAdmin.error instanceof Error ? assignShopAdmin.error.message : t('shopAdminAssignFailed')}
            </p>
          ) : null}
        </form>

        <div className="rounded-3xl bg-white/70 p-4 dark:bg-slate-900/60">
          <h3 className="text-sm font-semibold">{t('unassignedStaff')}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('unassignedStaffCopy')}</p>
          <div className="mt-4 space-y-3 max-h-[28rem] overflow-y-auto pr-1">
            {unassignedStaff.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('noUnassignedStaff')}</p>
            ) : (
              unassignedStaff.map((profile) => (
                <div key={profile.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{profile.full_name || profile.email}</p>
                      <p className="truncate text-sm text-slate-500 dark:text-slate-400">{profile.email}</p>
                    </div>
                    <Button type="button" variant="secondary" onClick={() => setEmail(profile.email)}>
                      {t('useEmail')}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-white/70 p-4 dark:bg-slate-900/60">
        <h3 className="text-sm font-semibold">{isSuperAdmin ? t('shopAdminAssignments') : t('assignedStaffMembers')}</h3>
        <div className="mt-4 space-y-3">
          {visibleAssignments.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('noTeamAssignments')}</p>
          ) : (
            visibleAssignments.map((assignment) => (
              <div key={assignment.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{assignment.user_full_name || assignment.user_email}</p>
                      <Badge>{formatStatusLabel(assignment.role, t)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{assignment.shop_name}</p>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => void handleRemove(assignment.id)} disabled={removeShopAdminAssignment.isPending}>
                    {t('remove')}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function PromotionsPanel() {
  const { t } = useTranslation();
  const promotionsQuery = usePromotionManagement();
  const createPromotion = useCreatePromotion();
  const updatePromotion = useUpdatePromotion();
  const deletePromotion = useDeletePromotion();
  const catalogQuery = useCatalog();

  const [searchTerm, setSearchTerm] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  const filteredProducts = useMemo(() => {
    const products = catalogQuery.data?.products ?? [];
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      if (!normalizedSearch) return true;
      return product.name.toLowerCase().includes(normalizedSearch) || product.category.toLowerCase().includes(normalizedSearch);
    });
  }, [catalogQuery.data?.products, searchTerm]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !discountPercent || !startsAt || !endsAt) return;

    await createPromotion.mutateAsync({
      title: title.trim(),
      description: description.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
      banner_image: bannerImage.trim() || undefined,
      product_id: selectedProductId ? Number(selectedProductId) : null,
      discount_percent: Number(discountPercent),
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
    });

    setTitle('');
    setDescription('');
    setImageUrl('');
    setBannerImage('');
    setSelectedProductId('');
    setDiscountPercent('');
    setStartsAt('');
    setEndsAt('');
  };

  const promotions = promotionsQuery.data ?? [];

  return (
    <section className="glass-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">{t('promotions')}</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('promotionsDashboardCopy')}</p>
        </div>
        <Badge>{promotions.length}</Badge>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <form className="rounded-3xl bg-stone-100 p-4 dark:bg-slate-900" onSubmit={handleCreate}>
          <h3 className="text-sm font-semibold">{t('createPromotion')}</h3>
          <div className="mt-3 grid gap-2">
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('promotionTitle')}
            />
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('promotionDescription')}
              rows={2}
            />
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('promotionImageUrl')}
            />
            <input
              value={bannerImage}
              onChange={(event) => setBannerImage(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('promotionBannerImageUrl')}
            />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('searchProducts')}
            />
            <select
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">{t('selectProductOptional')}</option>
              {filteredProducts.slice(0, 100).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              min="1"
              max="100"
              value={discountPercent}
              onChange={(event) => setDiscountPercent(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
              placeholder={t('discountPercent')}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('startsAt')}</p>
                <input
                  required
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('endsAt')}</p>
                <input
                  required
                  type="datetime-local"
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                />
              </div>
            </div>
          </div>
          <Button type="submit" className="mt-3 w-full sm:w-auto" disabled={createPromotion.isPending}>
            {t('createPromotion')}
          </Button>
          {createPromotion.isSuccess ? (
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-300">{t('promotionCreated')}</p>
          ) : null}
          {createPromotion.isError ? (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">
              {createPromotion.error instanceof Error ? createPromotion.error.message : t('promotionCreateFailed')}
            </p>
          ) : null}
        </form>

        <div className="rounded-3xl bg-white/70 p-4 dark:bg-slate-900/60">
          <h3 className="text-sm font-semibold">{t('activePromotions')}</h3>
          <div className="mt-3 space-y-2 max-h-[24rem] overflow-y-auto pr-1">
            {promotions.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('noPromotions')}</p>
            ) : (
              promotions.map((promo) => (
                <div key={promo.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{promo.title}</p>
                        <Badge
                          className={promo.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}
                        >
                          {promo.is_active ? t('active') : t('inactive')}
                        </Badge>
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          -{promo.discount_percent}%
                        </Badge>
                      </div>
                      {promo.description ? (
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{promo.description}</p>
                      ) : null}
                      {(promo.image_url || promo.banner_image) && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {promo.image_url && (
                            <img
                              src={promo.image_url}
                              alt={promo.title}
                              className="h-16 w-auto rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                            />
                          )}
                          {promo.banner_image && (
                            <img
                              src={promo.banner_image}
                              alt={`${promo.title} banner`}
                              className="h-16 w-auto rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                            />
                          )}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        {new Date(promo.starts_at).toLocaleDateString()} - {new Date(promo.ends_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          void updatePromotion.mutateAsync({
                            id: promo.id,
                            is_active: !promo.is_active,
                          })
                        }
                        disabled={updatePromotion.isPending}
                      >
                        {promo.is_active ? t('deactivate') : t('activate')}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void deletePromotion.mutateAsync({ id: promo.id })}
                        disabled={deletePromotion.isPending}
                      >
                        {t('remove')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AdminDashboardPage() {
  const { t, i18n } = useTranslation();
  const { orderId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const authRoleQuery = useUserRole();
  const shopsQuery = useShops();
  const isSuperAdmin = authRoleQuery.data?.role === 'super_admin';
  const adminRole = authRoleQuery.data?.adminRole ?? null;
  const canManageOrders = isSuperAdmin || adminRole === 'admin' || adminRole === 'manager';
  const canManageTeam = isSuperAdmin || adminRole === 'admin';
  const shopId = authRoleQuery.data?.shopId ?? null;
  const scopeKey = isSuperAdmin ? 'all-shops' : (shopId ?? 'unassigned');
  const shopAdminsQuery = useShopAdmins(Boolean(isSuperAdmin || canManageOrders));
  const unassignedStaffQuery = useUnassignedStaff(Boolean(canManageTeam));
  const ordersQuery = useAdminOrdersRealtime(shopId, isSuperAdmin);
  const deliveryPersonsQuery = useDeliveryPersons(isSuperAdmin ? null : shopId, isSuperAdmin || Boolean(shopId));
  const shops = shopsQuery.data ?? [];
  const currentShop = shops.find((shop) => shop.id === shopId) ?? null;

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [footerVisible, setFooterVisible] = useState(true);

  if (authRoleQuery.isLoading || ordersQuery.isLoading || shopsQuery.isLoading || shopAdminsQuery.isLoading || (canManageTeam && unassignedStaffQuery.isLoading)) {
    return <div className="glass-panel p-4">{t('loadingOrders')}</div>;
  }

  if (ordersQuery.isError) {
    return (
      <section className="glass-panel p-4">
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
  const assignedOrdersCount = rawOrders.filter((order) => Boolean(order.assigned_staff_user_id)).length;
  const preparingOrdersCount = rawOrders.filter((order) => order.status === 'preparing').length;
  const readyOrdersCount = rawOrders.filter((order) => order.status === 'ready').length;
  const pendingOrdersCount = rawOrders.filter((order) => order.status === 'pending').length;
  const pickedUpOrdersCount = rawOrders.filter((order) => order.status === 'picked_up').length;
  const outForDeliveryCount = rawOrders.filter((order) => order.status === 'out_for_delivery').length;
  const deliveredCount = rawOrders.filter((order) => order.status === 'delivered').length;

  const activeOrder = orders.find((order) => order.id === orderId) ?? orders[0] ?? null;
  const availableSections = [
    { key: 'analytics', label: t('analytics'), description: t('analyticsDashboardCopy'), icon: BarChart3, visible: canManageOrders || isSuperAdmin },
    { key: 'orders', label: t('adminOrderQueue'), description: t('adminDashboardCopy'), icon: ClipboardList, visible: true },
    { key: 'team', label: t('teamManagement'), description: isSuperAdmin ? t('teamManagementSuperAdminCopy') : t('teamManagementShopAdminCopy'), icon: ShieldCheck, visible: canManageTeam },
    { key: 'inventory', label: t('inventoryDashboard'), description: t('inventoryDashboardCopy'), icon: LayoutGrid, visible: canManageOrders || isSuperAdmin },
    { key: 'delivery', label: t('deliveryManagement'), description: t('deliveryManagementCopy'), icon: Truck, visible: canManageOrders || isSuperAdmin },
    { key: 'promotions', label: t('promotions'), description: t('promotionsDashboardCopy'), icon: Percent, visible: canManageOrders || isSuperAdmin },
    { key: 'settings', label: t('shopSettings'), description: t('shopSettingsCopy'), icon: Settings2, visible: canManageOrders || isSuperAdmin },
    { key: 'platform', label: t('superAdminControls'), description: t('superAdminControlsCopy'), icon: ShieldCheck, visible: isSuperAdmin },
  ].filter((section) => section.visible);
  const requestedSection = searchParams.get('section');
  const activeSection =
    availableSections.find((section) => section.key === requestedSection)?.key ??
    (orderId ? 'orders' : availableSections[0]?.key ?? 'orders');

  const setActiveSection = (section: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('section', section);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 -mb-6 flex min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950">
      <aside className="sticky top-0 hidden w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:flex">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="rounded-2xl bg-brand-100 p-3 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
            <Store size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{t('adminDashboard')}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {authRoleQuery.data?.shopName ?? t('adminShopLabel')}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {availableSections.map((section) => {
            const Icon = section.icon;

            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  activeSection === section.key
                    ? 'bg-brand-50 text-brand-700 font-semibold dark:bg-brand-900/20 dark:text-brand-200'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
                }`}
              >
                <Icon size={17} className="flex-shrink-0" />
                <span className="truncate">{section.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div className="rounded-xl bg-stone-50 p-3 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('dashboardRoleLabel')}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {formatStatusLabel(isSuperAdmin ? 'superAdminBadge' : (adminRole ?? 'staff'), t)}
            </p>
          </div>
          <Button variant="ghost" onClick={() => void signOut()} className="mt-2 w-full">
            {t('signOut')}
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-auto">
        <div className="flex-1 px-4 pb-4 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-lg font-bold sm:text-xl">{t('adminDashboard')}</h1>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('adminDashboardCopy')}</p>
              </div>
              <Button variant="ghost" onClick={() => void signOut()} className="lg:hidden">
                {t('signOut')}
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-4 max-w-7xl">
            <div className="flex justify-center">
              <div className="grid w-full gap-2 sm:grid-cols-2 xl:grid-cols-7">
                <SummaryCard label={t('incomingOrdersMetric')} value={pendingOrdersCount} hint={t('incomingOrdersMetricHint')} />
                <SummaryCard label={t('preparingOrdersMetric')} value={preparingOrdersCount} hint={t('preparingOrdersMetricHint')} />
                <SummaryCard label={t('readyOrdersMetric')} value={readyOrdersCount} hint={t('readyOrdersMetricHint')} />
                <SummaryCard label={t('pickedUpOrdersMetric')} value={pickedUpOrdersCount} hint={t('pickedUpOrdersMetricHint')} />
                <SummaryCard label={t('assignedOrdersMetric')} value={assignedOrdersCount} hint={t('assignedOrdersMetricHint')} />
                <SummaryCard label={t('outForDelivery')} value={outForDeliveryCount} hint={t('outForDelivery')} />
                <SummaryCard label={t('delivered')} value={deliveredCount} hint={t('delivered')} />
              </div>
            </div>
          </div>

          <div className="mx-auto mt-4 max-w-7xl">
            {activeSection === 'analytics' ? (
              <AnalyticsPanel shopId={shopId} isSuperAdmin={isSuperAdmin} />
            ) : null}

            {activeSection === 'orders' ? (
              <div className="grid gap-4 lg:grid-cols-[0.9fr_1.2fr]">
                <section className="glass-panel p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <h2 className="text-base font-bold sm:text-lg">{t('adminOrderQueue')}</h2>
                      <Badge className="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                        {orders.length}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {['all', 'pending', 'accepted', 'preparing', 'ready', 'picked_up', 'out_for_delivery', 'delivered', 'rejected'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
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
                    <div className="mt-4 space-y-2">
                      {orders.map((order) => (
                        <Link
                          key={order.id}
                          to={`/admin/orders/${order.id}?section=orders`}
                          className={`block rounded-2xl border p-3 transition ${
                            activeOrder?.id === order.id
                              ? 'border-brand-400 bg-brand-50 shadow-md dark:border-brand-600 dark:bg-brand-900/20'
                              : 'border-slate-200 bg-white/70 hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                                {order.full_name}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                #{order.id.slice(0, 8)} • {new Date(order.created_at).toLocaleString(i18n.language, {
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

                <AdminOrderDetail
                  order={activeOrder}
                  scopeKey={scopeKey}
                  canManageOrders={canManageOrders || isSuperAdmin}
                  currentUserRole={isSuperAdmin ? 'super_admin' : (adminRole ?? 'staff')}
                  staffAssignments={shopAdminsQuery.data ?? []}
                  deliveryPersons={deliveryPersonsQuery.data ?? []}
                />
              </div>
            ) : null}

            {activeSection === 'inventory' ? (
              <InventoryPanel
                scopeShopId={shopId}
                isSuperAdmin={isSuperAdmin}
                shops={shops.map((shop) => ({ id: shop.id, name: shop.name }))}
              />
            ) : null}

            {activeSection === 'delivery' && (canManageOrders || isSuperAdmin) ? (
              <DeliveryManagementPanel shopId={shopId} />
            ) : null}

            {activeSection === 'promotions' && (canManageOrders || isSuperAdmin) ? (
              <PromotionsPanel />
            ) : null}

            {activeSection === 'team' && canManageTeam ? (
              <TeamManagementPanel
                isSuperAdmin={isSuperAdmin}
                scopeShopId={shopId}
                shops={shops.map((shop) => ({ id: shop.id, name: shop.name }))}
                assignments={shopAdminsQuery.data ?? []}
                unassignedStaff={unassignedStaffQuery.data ?? []}
              />
            ) : null}

            {activeSection === 'settings' ? (
              <ShopSettingsPanel
                shopId={shopId}
                shopName={currentShop?.name ?? authRoleQuery.data?.shopName ?? null}
                phone={currentShop?.phone ?? ''}
                shops={shops.map((shop) => ({ id: shop.id, name: shop.name, phone: shop.phone }))}
                isSuperAdmin={isSuperAdmin}
              />
            ) : null}

            {activeSection === 'platform' && isSuperAdmin ? <SuperAdminPanel /> : null}
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setFooterVisible((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <span>{t('adminDashboard')}</span>
            <span>{footerVisible ? t('hide') : t('show')}</span>
          </button>
          {footerVisible ? (
            <div className="border-t border-slate-100 px-6 py-3 text-xs text-slate-400 dark:border-slate-800/50">
              <p>&copy; {new Date().getFullYear()} Simba Supermarket. {t('allRightsReserved')}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
