import type { FormEvent } from 'react';
import { useState } from 'react';
import { Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useCreateReview } from '@/hooks/use-reviews';
import { ordersQueryOptions } from '@/lib/orders';
import { formatCurrency } from '@/lib/utils';
import type { OrderHistoryRecord } from '@/types';

function formatStatusLabel(value: string, translate: (key: string) => string) {
  const normalizedValue = value.replace(/_/g, ' ');
  const translationKey = value.toLowerCase();

  const translated = translate(translationKey);
  return translated === translationKey
    ? normalizedValue.replace(/\b\w/g, (letter) => letter.toUpperCase())
    : translated;
}

function getOrderStatusDisplay(paymentStatus: string, fulfillmentStatus?: string | null) {
  if (fulfillmentStatus) {
    return fulfillmentStatus;
  }

  if (paymentStatus === 'paid') {
    return 'confirmed';
  }

  if (paymentStatus === 'failed') {
    return 'cancelled';
  }

  return 'pending';
}

function getShopOrderStatus(orderStatus?: string | null, paymentStatus?: string) {
  if (orderStatus) {
    return orderStatus;
  }

  return getOrderStatusDisplay(paymentStatus ?? 'pending');
}

function statusClassName(value: string) {
  if (value === 'paid' || value === 'delivered' || value === 'ready' || value === 'picked_up') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }

  if (value === 'preparing' || value === 'processing') {
    return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
  }

  if (value === 'failed' || value === 'cancelled') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  }

  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
}

function OrdersHeader() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold">{t('myOrders')}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t('ordersHeaderCopy')}
        </p>
      </div>
      <Link to="/#catalog" className="sm:self-start">
        <Button className="w-full sm:w-auto">{t('placeNewOrder')}</Button>
      </Link>
    </div>
  );
}

function ReviewForm({ order }: { order: OrderHistoryRecord }) {
  const { t } = useTranslation();
  const createReview = useCreateReview();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createReview.mutateAsync({
      orderId: order.id,
      rating,
      comment,
    });
    setComment('');
  };

  if (order.review) {
    return (
      <div className="mt-5 rounded-3xl bg-stone-100 p-4 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          {t('yourReview')}
        </p>
        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              size={16}
              className={index < order.review!.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
            />
          ))}
        </div>
        {order.review.comment ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{order.review.comment}</p> : null}
      </div>
    );
  }

  if (order.status !== 'picked_up') {
    return null;
  }

  return (
    <form className="mt-5 rounded-3xl bg-stone-100 p-4 dark:bg-slate-900" onSubmit={handleSubmit}>
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
        {t('leaveReview')}
      </p>
      <div className="mt-3 flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => {
          const value = index + 1;

          return (
            <button
              key={value}
              type="button"
              className="rounded-full p-1"
              onClick={() => setRating(value)}
              aria-label={t('selectRating', { value })}
            >
              <Star size={18} className={value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
            </button>
          );
        })}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={t('reviewPlaceholder')}
        className="mt-4 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
      />
      <Button className="mt-4" type="submit" disabled={createReview.isPending}>
        {t('submitReview')}
      </Button>
      {createReview.isError ? (
        <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">
          {createReview.error instanceof Error ? createReview.error.message : t('reviewFailed')}
        </p>
      ) : null}
      {createReview.isSuccess ? <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-300">{t('reviewSaved')}</p> : null}
    </form>
  );
}

export function OrdersPage() {
  const { t } = useTranslation();
  const { user, isLoading, isConfigured } = useAuth();
  const ordersQuery = useQuery({
    ...(user ? ordersQueryOptions(user.id) : ordersQueryOptions('guest')),
    enabled: Boolean(user),
  });

  if (!isConfigured) {
    return (
      <section className="glass-panel p-6">
        <OrdersHeader />
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {t('ordersUnavailable')}
        </p>
      </section>
    );
  }

  if (isLoading) {
    return <div className="glass-panel p-6">{t('loadingAccount')}</div>;
  }

  if (!user) {
    return (
      <section className="glass-panel p-6">
        <OrdersHeader />
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {t('ordersSignInPrompt')}
        </p>
        <Link to="/checkout" className="mt-5 inline-block">
          <Button>{t('goToCheckout')}</Button>
        </Link>
      </section>
    );
  }

  if (ordersQuery.isLoading) {
    return <div className="glass-panel p-6">{t('loadingOrders')}</div>;
  }

  if (ordersQuery.isError) {
    return (
      <section className="glass-panel p-6">
        <OrdersHeader />
        <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">
          {ordersQuery.error instanceof Error ? ordersQuery.error.message : t('failedToLoadOrders')}
        </p>
      </section>
    );
  }

  const orders = ordersQuery.data ?? [];

  return (
    <div className="space-y-6">
      <section className="glass-panel p-6">
        <OrdersHeader />
      </section>

      {orders.length === 0 ? (
        <section className="glass-panel p-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('noOrdersYet')}
          </p>
        </section>
      ) : (
        orders.map((order) => {
          const orderStatus = getShopOrderStatus(order.status, order.payment_status);

          return (
            <section key={order.id} className="glass-panel p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-bold">{t('orderLabel')} #{order.id.slice(0, 8)}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {new Date(order.created_at).toLocaleString()}
                </p>
                {order.pickup_time ? (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t('pickupTimeLabel')}: {new Date(order.pickup_time).toLocaleString()}
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{order.delivery_address}</p>
                {order.shops?.name ? (
                  <>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t('pickupShop')}: {order.shops.name}
                    </p>
                    {order.shops.phone ? (
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {t('shopPhone')}: {order.shops.phone}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(orderStatus)}`}>
                  {formatStatusLabel(orderStatus, t)}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(order.payment_status)}`}>
                  {t('payment')}: {formatStatusLabel(order.payment_status, t)}
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {order.order_items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-white/60 px-4 py-3 dark:bg-slate-900/60"
                >
                  <div>
                    <p className="font-semibold">{item.product_name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {item.quantity} x {formatCurrency(item.unit_price_rwf)}
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(item.quantity * item.unit_price_rwf)}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('paymentMethod')}: {formatStatusLabel(order.payment_method, t)}</p>
              <p className="text-lg font-bold">{formatCurrency(order.total_rwf)}</p>
            </div>
            <ReviewForm order={order} />
            </section>
          );
        })
      )}
    </div>
  );
}
