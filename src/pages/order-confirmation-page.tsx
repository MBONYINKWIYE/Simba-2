import { useEffect } from 'react';
import { CheckCircle2, Clock3, ReceiptText, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { orderQueryOptions } from '@/lib/orders';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useQuery } from '@tanstack/react-query';
import type { OrderPaymentPayload } from '@/types';

type ConfirmationState = {
  orderId?: string;
  paymentMethod?: 'cash' | 'momo';
  referenceId?: string;
};

function statusClassName(value: string) {
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

export function OrderConfirmationPage() {
  const { t } = useTranslation();
  const { orderId = '' } = useParams();
  const location = useLocation();
  const clearCart = useCartStore((state) => state.clearCart);
  const confirmationState = (location.state ?? {}) as ConfirmationState;
  const orderQuery = useQuery({
    ...orderQueryOptions(orderId),
    enabled: Boolean(orderId),
    refetchOnWindowFocus: false,
  });

  const order = orderQuery.data ?? null;
  const paymentPayload = (order?.payment_payload ?? {}) as OrderPaymentPayload;
  const orderTotalRwf = order?.total_rwf ?? 0;
  const depositPaidRwf = paymentPayload.depositRwf ?? 0;
  const balanceDueRwf = paymentPayload.balanceDueRwf ?? Math.max(orderTotalRwf - depositPaidRwf, 0);

  useEffect(() => {
    if (!order || confirmationState.orderId !== order.id) {
      return;
    }

    if (order.payment_status === 'paid') {
      clearCart();
    }
  }, [clearCart, confirmationState.orderId, confirmationState.paymentMethod, order]);

  if (orderQuery.isLoading) {
    return (
      <section className="glass-panel mx-auto max-w-3xl p-6 sm:p-8">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-2/3 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-1/2 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-28 rounded-3xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-28 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </section>
    );
  }

  if (orderQuery.isError || !order) {
    return (
      <section className="glass-panel mx-auto max-w-3xl p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-rose-50 p-3 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300">
            <ReceiptText size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t('orderConfirmation')}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t('orderConfirmationUnavailable')}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/orders">
            <Button>{t('myOrders')}</Button>
          </Link>
          <Link to="/checkout">
            <Button variant="secondary">{t('backToCheckout')}</Button>
          </Link>
        </div>
      </section>
    );
  }

  const paymentComplete = order.payment_status === 'paid';
  const orderStatus = order.status ?? 'pending';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="glass-panel overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  {t('orderConfirmed')}
                </p>
                <h1 className="text-2xl font-bold sm:text-3xl">{t('orderConfirmation')}</h1>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              {paymentComplete ? t('orderConfirmationSuccess') : t('orderConfirmationPending')}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">{t(order.payment_method)}</Badge>
              <Badge className={statusClassName(orderStatus)}>
                {t(orderStatus)}
              </Badge>
              <Badge className="bg-stone-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                #{order.id.slice(0, 8)}
              </Badge>
            </div>
          </div>
          <div className="rounded-3xl bg-brand-50 p-4 dark:bg-brand-900/20">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700 dark:text-brand-200">
              {t('total')}
            </p>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(order.total_rwf)}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {order.payment_method === 'momo' ? t('momo') : t('cash')}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="glass-panel p-6">
          <h2 className="text-2xl font-bold">{t('nextSteps')}</h2>
          <div className="mt-5 space-y-4">
            <div className="flex gap-3 rounded-3xl bg-white/70 p-4 dark:bg-slate-900/70">
              <ShieldCheck className="mt-0.5 text-brand-600 dark:text-brand-300" size={18} />
              <div>
                <p className="font-semibold">{t('orderSaved')}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('orderSavedCopy')}</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-3xl bg-white/70 p-4 dark:bg-slate-900/70">
              <Clock3 className="mt-0.5 text-brand-600 dark:text-brand-300" size={18} />
              <div>
                <p className="font-semibold">{t('pickupTimeLabel')}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {order.pickup_time ? new Date(order.pickup_time).toLocaleString() : t('notAvailable')}
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-3xl bg-white/70 p-4 dark:bg-slate-900/70">
              <ReceiptText className="mt-0.5 text-brand-600 dark:text-brand-300" size={18} />
              <div>
                <p className="font-semibold">{t('referenceLabel')}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {confirmationState.referenceId ?? order.momo_reference ?? t('notAvailable')}
                </p>
              </div>
            </div>
            {order.payment_method === 'cash' ? (
              <div className="flex gap-3 rounded-3xl bg-white/70 p-4 dark:bg-slate-900/70">
                <ShieldCheck className="mt-0.5 text-brand-600 dark:text-brand-300" size={18} />
                <div className="min-w-0">
                  <p className="font-semibold">{t('cashOnPickupTitle')}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t('depositLine')}: {formatCurrency(depositPaidRwf)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t('balanceDueOnPickup')}: {formatCurrency(balanceDueRwf)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-2xl font-bold">{t('orderSummary')}</h2>
          <div className="mt-5 space-y-3">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 rounded-3xl bg-white/70 p-4 dark:bg-slate-900/70">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.product_name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {item.quantity} x {formatCurrency(item.unit_price_rwf)}
                  </p>
                </div>
                <p className="font-semibold">{formatCurrency(item.quantity * item.unit_price_rwf)}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
            <div className="flex justify-between">
              <span>{t('subtotal')}</span>
              <span>{formatCurrency(order.subtotal_rwf)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('delivery')}</span>
              <span>{formatCurrency(order.delivery_fee_rwf)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('serviceFee')}</span>
              <span>{formatCurrency(order.service_fee_rwf)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>{t('total')}</span>
              <span>{formatCurrency(order.total_rwf)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('keepTracking')}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('orderConfirmationTrackingCopy')}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/orders">
              <Button className="w-full sm:w-auto">{t('myOrders')}</Button>
            </Link>
            <Link to="/checkout">
              <Button variant="secondary" className="w-full sm:w-auto">
                {t('backToCheckout')}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
