import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock3, Star, ShoppingBasket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useAvailableShops } from '@/hooks/use-available-shops';
import { signInWithGoogle } from '@/lib/auth';
import { DEFAULT_CHECKOUT_VALUES, ORDER_DEPOSIT_RWF } from '@/lib/constants';
import { createCashOrder, requestToPay, getRequestToPayStatus } from '@/lib/payment';
import { formatCurrency } from '@/lib/utils';
import { useOrderSummary } from '@/hooks/use-order-summary';
import { useCartStore } from '@/store/cart-store';
import type { AvailableShop, CheckoutFormValues } from '@/types';

type Coordinates = {
  latitude: number;
  longitude: number;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistanceInKm(origin: Coordinates, shop: Pick<AvailableShop, 'latitude' | 'longitude'>) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(shop.latitude - origin.latitude);
  const longitudeDelta = toRadians(shop.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const shopLatitude = toRadians(shop.latitude);

  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(originLatitude) *
      Math.cos(shopLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function roundUpToHalfHour(date: Date) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();

  if (minutes === 0 || minutes === 30) {
    next.setMinutes(minutes + 30);
    return next;
  }

  next.setMinutes(minutes < 30 ? 30 : 60);
  return next;
}

function buildPickupSlots() {
  const slots: { value: string; label: string }[] = [];
  const start = roundUpToHalfHour(new Date());

  for (let index = 0; index < 8; index += 1) {
    const slotDate = new Date(start.getTime() + index * 30 * 60 * 1000);
    slots.push({
      value: slotDate.toISOString(),
      label: slotDate.toLocaleString([], {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      }),
    });
  }

  return slots;
}

export function CheckoutPage() {
  const { t } = useTranslation();
  const itemsMap = useCartStore((state) => state.items);
  const items = Object.values(itemsMap);
  const clearCart = useCartStore((state) => state.clearCart);
  const selectedShopId = useCartStore((state) => state.selectedShopId);
  const setSelectedShop = useCartStore((state) => state.setSelectedShop);
  const summary = useOrderSummary();
  const [formValues, setFormValues] = useState<CheckoutFormValues>({ ...DEFAULT_CHECKOUT_VALUES });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [locationError, setLocationError] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const { user, isLoading: isAuthLoading, isConfigured } = useAuth();
  const pickupSlots = useMemo(() => buildPickupSlots(), []);

  const checkoutItems = useMemo(
    () =>
      items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPriceRwf: item.product.price,
      })),
    [items],
  );
  const availableShopsQuery = useAvailableShops(checkoutItems);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(t('locationUnavailable'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setLocationError(t('locationPermissionDenied'));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000 * 60 * 5,
      },
    );
  }, [t]);

  const rankedShops = useMemo(() => {
    const shops = availableShopsQuery.data ?? [];

    return [...shops]
      .map((shop) => ({
        ...shop,
        distanceKm: coordinates ? haversineDistanceInKm(coordinates, shop) : null,
      }))
      .sort((left, right) => {
        if (left.distanceKm === null && right.distanceKm === null) {
          return left.name.localeCompare(right.name);
        }

        if (left.distanceKm === null) {
          return 1;
        }

        if (right.distanceKm === null) {
          return -1;
        }

        return left.distanceKm - right.distanceKm;
      });
  }, [availableShopsQuery.data, coordinates]);

  useEffect(() => {
    if (rankedShops.length === 0) {
      if (selectedShopId) {
        setSelectedShop(null);
      }
      return;
    }

    const hasSelectedShop = rankedShops.some((shop) => shop.id === selectedShopId);

    if (!hasSelectedShop) {
      setSelectedShop(rankedShops[0].id);
    }
  }, [rankedShops, selectedShopId, setSelectedShop]);

  const selectedShop = rankedShops.find((shop) => shop.id === selectedShopId) ?? null;

  useEffect(() => {
    if (pickupSlots.length === 0) {
      return;
    }

    setFormValues((current) => {
      if (current.pickupTime && pickupSlots.some((slot) => slot.value === current.pickupTime)) {
        return current;
      }

      return {
        ...current,
        pickupTime: pickupSlots[0].value,
      };
    });
  }, [pickupSlots]);

  const handleGoogleSignIn = async () => {
    setAuthError('');

    try {
      await signInWithGoogle('/checkout');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : t('failedToStartGoogleSignIn'));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    setPaymentReference('');
    setPaymentStatus('');

    if (items.length === 0) {
      setErrorMessage(t('emptyCartError'));
      return;
    }

    if (!selectedShopId) {
      setErrorMessage(t('pickupShopRequired'));
      return;
    }

    if (!formValues.pickupTime) {
      setErrorMessage(t('pickupTimeRequired'));
      return;
    }

    const requestPayload = {
      checkout: formValues,
      items: checkoutItems,
      subtotalRwf: summary.subtotal,
      deliveryFeeRwf: summary.deliveryFee,
      serviceFeeRwf: summary.serviceFee,
      totalRwf: summary.total,
      shopId: selectedShopId,
    };

    if (formValues.paymentMethod === 'cash') {
      try {
        setIsSubmitting(true);
        await createCashOrder(requestPayload);
        clearCart();
        setFormValues({ ...DEFAULT_CHECKOUT_VALUES });
        setSuccessMessage(t('cashOrderSaved'));
        return;
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : t('failedToCreateCashOrder'));
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    try {
      setIsSubmitting(true);
      const payment = await requestToPay(requestPayload);

      if (!payment.referenceId) {
        throw new Error(t('momoNoReference'));
      }

      setPaymentReference(payment.referenceId);
      setPaymentStatus('PENDING');

      for (let attempt = 0; attempt < 8; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 2500));
        const statusResult = await getRequestToPayStatus(payment.referenceId);
        const nextStatus = statusResult?.payload?.status ?? 'PENDING';
        setPaymentStatus(nextStatus);

        if (nextStatus === 'SUCCESSFUL') {
          clearCart();
          setFormValues({ ...DEFAULT_CHECKOUT_VALUES });
          setSuccessMessage(t('momoAuthorized'));
          return;
        }

        if (nextStatus === 'FAILED') {
          setErrorMessage(t('momoFailed'));
          return;
        }
      }

      setSuccessMessage(t('momoPending'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('failedToStartMomo'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isConfigured && isAuthLoading) {
    return <div className="glass-panel p-6">{t('loadingCheckout')}</div>;
  }

  if (isConfigured && !user) {
    return (
      <section className="glass-panel mx-auto max-w-2xl p-6 sm:p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg">
            <ShoppingBasket className="text-white" size={32} />
          </div>
        </div>
        <h1 className="text-3xl font-bold">{t('checkout')}</h1>
        <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          {t('signInCheckoutPrompt')}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row justify-center">
          <Link to="/auth/login?next=/checkout">
            <Button className="w-full sm:w-auto px-8">{t('signIn')}</Button>
          </Link>
          <Link to="/auth/signup?next=/checkout">
            <Button variant="secondary" className="w-full sm:w-auto px-8">{t('signUp')}</Button>
          </Link>
        </div>
        <div className="mt-6">
          <Link to="/" className="text-sm text-brand-600 font-medium hover:underline">
            {t('keepShopping')}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <form className="glass-panel p-6" onSubmit={handleSubmit}>
        <h1 className="text-3xl font-bold">{t('checkout')}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t('checkoutIntro')}
        </p>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t('availablePickupShops')}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('availablePickupShopsHint')}
              </p>
            </div>
            {coordinates ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                {t('nearestShops')}
              </span>
            ) : null}
          </div>

          {availableShopsQuery.isLoading && checkoutItems.length > 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('validatingInventory')}</p>
          ) : null}

          {availableShopsQuery.isError ? (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
              {availableShopsQuery.error instanceof Error ? availableShopsQuery.error.message : t('failedToLoadShops')}
            </p>
          ) : null}

          {locationError ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              {locationError}
            </p>
          ) : null}

          {checkoutItems.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('emptyCart')}</p>
          ) : null}

          {checkoutItems.length > 0 && !availableShopsQuery.isLoading && rankedShops.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              {t('noShopCanFulfillCart')}
            </p>
          ) : null}

          <div className="mt-4 grid gap-3">
            {rankedShops.map((shop) => (
              <label
                key={shop.id}
                className={`rounded-3xl border p-4 transition ${
                  selectedShopId === shop.id
                    ? 'border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-900/20'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="pickupShop"
                    checked={selectedShopId === shop.id}
                    onChange={() => setSelectedShop(shop.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold">{shop.name}</p>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {shop.distanceKm === null
                          ? t('distanceUnavailable')
                          : t('distanceKm', { value: shop.distanceKm.toFixed(1) })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{shop.address}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{shop.phone}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Star size={14} className="fill-amber-400 text-amber-400" />
                        {shop.review_count > 0
                          ? t('shopRatingValue', { rating: Number(shop.average_rating).toFixed(1), count: shop.review_count })
                          : t('shopRatingEmpty')}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-300">
                      {t('inventoryReadyForCart')}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-brand-50 p-3 text-brand-700 dark:bg-brand-900/20 dark:text-brand-200">
              <Clock3 size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">{t('selectPickupTime')}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('pickupTimeHint')}</p>
              <select
                required
                value={formValues.pickupTime}
                onChange={(event) => setFormValues((current) => ({ ...current, pickupTime: event.target.value }))}
                className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">{t('selectPickupTime')}</option>
                {pickupSlots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="text-sm font-semibold">{t('depositNoticeTitle', { amount: formatCurrency(ORDER_DEPOSIT_RWF) })}</p>
          <p className="mt-2 text-sm leading-6">{t('depositNoticeCopy')}</p>
        </div>

        <div className="mt-6 grid gap-4">
          <input
            required
            value={formValues.fullName}
            onChange={(event) => setFormValues((current) => ({ ...current, fullName: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            placeholder={t('fullName')}
          />
          <input
            required
            value={formValues.phone}
            onChange={(event) => setFormValues((current) => ({ ...current, phone: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            placeholder={t('phoneNumber')}
          />
          <textarea
            required
            value={formValues.address}
            onChange={(event) => setFormValues((current) => ({ ...current, address: event.target.value }))}
            className="min-h-32 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            placeholder={t('deliveryAddress')}
          />
          <textarea
            value={formValues.notes}
            onChange={(event) => setFormValues((current) => ({ ...current, notes: event.target.value }))}
            className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            placeholder={t('deliveryNotes')}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="rounded-3xl border border-brand-300 bg-brand-50 p-4 dark:border-brand-700 dark:bg-brand-900/20">
              <input
                type="radio"
                name="paymentMethod"
                checked={formValues.paymentMethod === 'momo'}
                onChange={() => setFormValues((current) => ({ ...current, paymentMethod: 'momo' }))}
              />
              <span className="ml-3 font-semibold">{t('momo')}</span>
            </label>
            <label className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <input
                type="radio"
                name="paymentMethod"
                checked={formValues.paymentMethod === 'cash'}
                onChange={() => setFormValues((current) => ({ ...current, paymentMethod: 'cash' }))}
              />
              <span className="ml-3 font-semibold">{t('cash')}</span>
            </label>
          </div>
        </div>
        <Button
          type="submit"
          className="mt-6"
          fullWidth
          disabled={items.length === 0 || isSubmitting || !selectedShopId || rankedShops.length === 0}
        >
          {t('placeOrder')}
        </Button>
        {paymentReference ? (
          <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700 dark:bg-sky-900/20 dark:text-sky-300">
            {t('referenceLabel')}: {paymentReference} {paymentStatus ? `(${paymentStatus})` : ''}
          </p>
        ) : null}
        {successMessage ? (
          <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
            {successMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
            {errorMessage}
          </p>
        ) : null}
      </form>

      <aside className="glass-panel p-6">
        <h2 className="text-2xl font-bold">{t('orderSummary')}</h2>
        {selectedShop ? (
          <div className="mt-5 rounded-3xl bg-brand-50 p-4 dark:bg-brand-900/20">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700 dark:text-brand-200">
              {t('pickupShop')}
            </p>
            <p className="mt-2 font-semibold">{selectedShop.name}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedShop.address}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedShop.phone}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {selectedShop.review_count > 0
                ? t('shopRatingValue', { rating: Number(selectedShop.average_rating).toFixed(1), count: selectedShop.review_count })
                : t('shopRatingEmpty')}
            </p>
          </div>
        ) : null}
        {formValues.pickupTime ? (
          <div className="mt-4 rounded-3xl bg-white/80 p-4 dark:bg-slate-900/70">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              {t('selectPickupTime')}
            </p>
            <p className="mt-2 font-semibold">
              {new Date(formValues.pickupTime).toLocaleString([], {
                weekday: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
        ) : null}
        <div className="mt-6 space-y-4">
          {items.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">{t('emptyCart')}</p>
          ) : (
            items.map(({ product, quantity }) => (
              <div key={product.id} className="flex items-center gap-3 rounded-3xl bg-stone-100 p-3 dark:bg-slate-900">
                <img src={product.image} alt={product.name} className="h-16 w-16 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-semibold">{product.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {quantity} x {formatCurrency(product.price)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="mt-6 space-y-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
          <div className="flex justify-between">
            <span>{t('subtotal')}</span>
            <span>{formatCurrency(summary.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('delivery')}</span>
            <span>{formatCurrency(summary.deliveryFee)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('serviceFee')}</span>
            <span>{formatCurrency(summary.serviceFee)}</span>
          </div>
          <div className="flex justify-between text-amber-700 dark:text-amber-300">
            <span>{t('depositLine')}</span>
            <span>{formatCurrency(ORDER_DEPOSIT_RWF)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>{t('total')}</span>
            <span>{formatCurrency(summary.total)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
