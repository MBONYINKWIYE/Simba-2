import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Clock3, Star, ShoppingBasket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useAvailableShops } from '@/hooks/use-available-shops';
import { useShops } from '@/hooks/use-shops';
import { DEFAULT_CHECKOUT_VALUES, PAYPACK_RECEIVER_NUMBER } from '@/lib/constants';
import { buildMomoUssdCode, createManualPaymentOrder, openMomoDialer } from '@/lib/payment';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import type { AvailableShop, CheckoutFormValues } from '@/types';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type TravelMode = 'walk' | 'drive';
type RankedShop = AvailableShop & { distanceKm: number | null };

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

function estimateTravelMinutes(distanceKm: number | null, mode: TravelMode) {
  if (distanceKm === null) {
    return null;
  }

  const speedKmPerHour = mode === 'walk' ? 4.5 : 28;
  return Math.max(1, Math.round((distanceKm / speedKmPerHour) * 60));
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
  const navigate = useNavigate();
  const itemsMap = useCartStore((state) => state.items);
  const items = Object.values(itemsMap);
  const clearCart = useCartStore((state) => state.clearCart);
  const selectedShopId = useCartStore((state) => state.selectedShopId);
  const setSelectedShop = useCartStore((state) => state.setSelectedShop);
  const [formValues, setFormValues] = useState<CheckoutFormValues>({ ...DEFAULT_CHECKOUT_VALUES });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState('');
  const [locationError, setLocationError] = useState('');
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>('drive');
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
  const shopsQuery = useShops();

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
    const availabilityMap = new Map((availableShopsQuery.data ?? []).map((shop) => [shop.id, shop]));
    const shops = shopsQuery.data ?? [];

    return [...shops]
      .map((shop) => ({
        ...shop,
        available_product_count: availabilityMap.get(shop.id)?.available_product_count ?? 0,
        required_product_count: availabilityMap.get(shop.id)?.required_product_count ?? checkoutItems.length,
        is_fully_available: availabilityMap.get(shop.id)?.is_fully_available ?? false,
        average_rating: availabilityMap.get(shop.id)?.average_rating ?? 0,
        review_count: availabilityMap.get(shop.id)?.review_count ?? 0,
        missing_items:
          availabilityMap.get(shop.id)?.missing_items ??
          checkoutItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            requestedQuantity: item.quantity,
            availableQuantity: 0,
          })),
        distanceKm: coordinates ? haversineDistanceInKm(coordinates, shop) : null,
      }) satisfies RankedShop)
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
  }, [availableShopsQuery.data, shopsQuery.data, coordinates, checkoutItems.length, checkoutItems]);

  const selectableShops = useMemo(
    () => rankedShops,
    [rankedShops],
  );

  useEffect(() => {
    if (selectableShops.length === 0) {
      if (selectedShopId) {
        setSelectedShop(null);
      }
      return;
    }

    const hasSelectedShop = selectableShops.some((shop) => shop.id === selectedShopId);

    if (!hasSelectedShop) {
      setSelectedShop(selectableShops[0].id);
    }
  }, [selectableShops, selectedShopId, setSelectedShop]);

  const selectedShop = selectableShops.find((shop) => shop.id === selectedShopId) ?? null;
  const selectedShopTravelMinutes = estimateTravelMinutes(selectedShop?.distanceKm ?? null, travelMode);
  const missingProductIds = useMemo(
    () => new Set((selectedShop?.missing_items ?? []).map((item) => item.productId)),
    [selectedShop],
  );
  const branchAvailableItems = useMemo(
    () => items.filter((item) => !missingProductIds.has(item.product.id)),
    [items, missingProductIds],
  );
  const branchUnavailableItems = useMemo(
    () => items.filter((item) => missingProductIds.has(item.product.id)),
    [items, missingProductIds],
  );
  const branchCheckoutItems = useMemo(
    () =>
      branchAvailableItems.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPriceRwf: item.product.price,
      })),
    [branchAvailableItems],
  );
  const branchSubtotal = useMemo(
    () => branchAvailableItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [branchAvailableItems],
  );
  const excludedSubtotal = useMemo(
    () => branchUnavailableItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [branchUnavailableItems],
  );
  const branchTotal = branchSubtotal;
  const submitLabel = isSubmitting
    ? t('processingOrder')
    : formValues.paymentMethod === 'momo'
      ? t('payNow')
      : t('placeOrder');

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    setPaymentNotice('');

    if (items.length === 0) {
      setErrorMessage(t('emptyCartError'));
      return;
    }

    if (!selectedShopId) {
      setErrorMessage(t('pickupShopRequired'));
      return;
    }

    if (branchCheckoutItems.length === 0) {
      setErrorMessage(t('noAvailableItemsForShop'));
      return;
    }

    if (!formValues.pickupTime) {
      setErrorMessage(t('pickupTimeRequired'));
      return;
    }

    const requestPayload = {
      checkout: formValues,
      items: branchCheckoutItems,
      subtotalRwf: branchSubtotal,
      deliveryFeeRwf: 0,
      serviceFeeRwf: 0,
      totalRwf: branchTotal,
      shopId: selectedShopId,
    };

    try {
      setIsSubmitting(true);
      if (!user) {
        throw new Error(t('signInCheckoutPrompt'));
      }

      const result = await createManualPaymentOrder({
        userId: user.id,
        userEmail: user.email,
        order: requestPayload,
      });

      if (!result.orderId) {
        throw new Error(t('failedToCreateOrder'));
      }

      if (formValues.paymentMethod === 'momo') {
        openMomoDialer(branchTotal);
      }

      clearCart();
      navigate(`/checkout/confirmation/${result.orderId}`, {
        replace: true,
        state: {
          orderId: result.orderId,
          paymentMethod: formValues.paymentMethod,
          ussdCode: formValues.paymentMethod === 'momo' ? buildMomoUssdCode(branchTotal) : undefined,
        },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t('failedToCreateOrder'));
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  if (isConfigured && isAuthLoading) {
    return (
      <div className="glass-panel p-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-1/2 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-3/4 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (isConfigured && !user) {
    return (
      <section className="glass-panel mx-auto max-w-2xl p-6 sm:p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg">
            <ShoppingBasket className="text-white" size={32} />
          </div>
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">{t('checkout')}</h1>
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
        <h1 className="text-2xl font-bold sm:text-3xl">{t('checkout')}</h1>
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

          {(availableShopsQuery.isLoading || shopsQuery.isLoading) && checkoutItems.length > 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('validatingInventory')}</p>
          ) : null}

          {availableShopsQuery.isError || shopsQuery.isError ? (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
              {availableShopsQuery.error instanceof Error
                ? availableShopsQuery.error.message
                : shopsQuery.error instanceof Error
                  ? shopsQuery.error.message
                  : t('failedToLoadShops')}
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

          {selectableShops.length > 0 ? (
            <div className="mt-4 space-y-4">
              <div className="relative">
                <select
                  value={selectedShopId ?? ''}
                  onChange={(event) => setSelectedShop(event.target.value || null)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="">{t('selectShop')}</option>
                  {selectableShops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name} · {shop.distanceKm === null ? t('distanceUnavailable') : t('distanceKm', { value: shop.distanceKm.toFixed(1) })}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTravelMode('drive')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    travelMode === 'drive'
                      ? 'bg-brand-500 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {t('driveMode')}
                </button>
                <button
                  type="button"
                  onClick={() => setTravelMode('walk')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    travelMode === 'walk'
                      ? 'bg-brand-500 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {t('walkMode')}
                </button>
                {selectedShop ? (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    {selectedShopTravelMinutes === null
                      ? t('travelTimeUnavailable')
                      : t('travelTimeMinutes', { mode: t(travelMode === 'drive' ? 'driveMode' : 'walkMode'), minutes: selectedShopTravelMinutes })}
                  </span>
                ) : null}
              </div>

              {selectedShop ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-semibold">{selectedShop.name}</p>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {selectedShop.distanceKm === null
                            ? t('distanceUnavailable')
                            : t('distanceKm', { value: selectedShop.distanceKm.toFixed(1) })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedShop.address}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedShop.phone}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          {selectedShop.review_count > 0
                            ? t('shopRatingValue', { rating: Number(selectedShop.average_rating).toFixed(1), count: selectedShop.review_count })
                            : t('shopRatingEmpty')}
                        </span>
                      </div>
                      <p className={`mt-2 text-xs font-semibold uppercase tracking-[0.22em] ${
                        selectedShop.is_fully_available
                          ? 'text-brand-600 dark:text-brand-300'
                          : 'text-amber-600 dark:text-amber-300'
                      }`}>
                        {selectedShop.is_fully_available ? t('inventoryReadyForCart') : t('branchSelectionWillAdjustTotal')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedShop && selectedShop.missing_items.length > 0 ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-4 dark:border-amber-900/60 dark:bg-amber-900/10">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    {t('missingCartItemsTitle')}
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-amber-900 dark:text-amber-100">
                    {selectedShop.missing_items.map((item) => (
                      <div key={`${selectedShop.id}-${item.productId}`} className="flex items-start justify-between gap-3 rounded-2xl bg-white/70 px-3 py-2 dark:bg-slate-950/40">
                        <span className="min-w-0 flex-1">{item.productName}</span>
                        <span className="shrink-0 text-xs font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                          {t('missingCartItemStock', {
                            available: item.availableQuantity,
                            requested: item.requestedQuantity,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
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

        <div className="mt-6 grid gap-4">
          <input
            required
            value={formValues.fullName}
            onChange={(event) => setFormValues((current) => ({ ...current, fullName: event.target.value }))}
            autoComplete="name"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            placeholder={t('fullName')}
          />
          <input
            required
            value={formValues.phone}
            onChange={(event) => setFormValues((current) => ({ ...current, phone: event.target.value }))}
            autoComplete="tel"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            placeholder={t('phoneNumber')}
          />
          <textarea
            required
            value={formValues.address}
            onChange={(event) => setFormValues((current) => ({ ...current, address: event.target.value }))}
            autoComplete="street-address"
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
          {formValues.paymentMethod === 'momo' ? (
            <div className="mt-4 rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700 dark:border-sky-900/60 dark:bg-sky-900/20 dark:text-sky-200">
              <p className="font-semibold">{t('momoCheckoutTitle')}</p>
              <p className="mt-1">{t('momoManualCheckoutCopy', { receiverNumber: PAYPACK_RECEIVER_NUMBER, ussdCode: buildMomoUssdCode(branchTotal) })}</p>
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700 dark:border-sky-900/60 dark:bg-sky-900/20 dark:text-sky-200">
              <p className="font-semibold">{t('cashOnPickupTitle')}</p>
              <p className="mt-1">{t('cashOnPickupManualCopy')}</p>
            </div>
          )}
        </div>
        <Button
          type="submit"
          className="mt-6"
          fullWidth
          disabled={
            items.length === 0 ||
            isSubmitting ||
            !selectedShopId ||
            selectableShops.length === 0 ||
            branchCheckoutItems.length === 0
          }
        >
          {submitLabel}
        </Button>
        {paymentNotice ? (
          <p className="mt-4 rounded-2xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-200" aria-live="polite">
            {paymentNotice}
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
            items.map(({ product, quantity }) => {
              const isUnavailable = missingProductIds.has(product.id);

              return (
              <div
                key={product.id}
                className={`flex items-center gap-3 rounded-3xl p-3 ${
                  isUnavailable ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-stone-100 dark:bg-slate-900'
                }`}
              >
                <img src={product.image} alt={product.name} className="h-16 w-16 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="line-clamp-2 font-semibold">{product.name}</p>
                    {isUnavailable ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                        {t('notAvailableInBranch')}
                      </span>
                    ) : null}
                  </div>
                  <p className={`text-sm ${isUnavailable ? 'text-amber-700 dark:text-amber-200' : 'text-slate-500 dark:text-slate-400'}`}>
                    {quantity} x {formatCurrency(product.price)}
                  </p>
                  {isUnavailable ? (
                    <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-200">
                      {t('itemExcludedFromTotal')}
                    </p>
                  ) : null}
                </div>
                <div className={`text-sm font-semibold ${isUnavailable ? 'text-amber-700 line-through dark:text-amber-200' : ''}`}>
                  {formatCurrency(product.price * quantity)}
                </div>
              </div>
            )})
          )}
        </div>
        <div className="mt-6 space-y-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
          <div className="flex justify-between">
            <span>{t('subtotal')}</span>
            <span>{formatCurrency(branchSubtotal)}</span>
          </div>
          {excludedSubtotal > 0 ? (
            <div className="flex justify-between text-amber-700 dark:text-amber-200">
              <span>{t('unavailableItemsDeducted')}</span>
              <span>-{formatCurrency(excludedSubtotal)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-lg font-bold">
            <span>{t('total')}</span>
            <span>{formatCurrency(branchTotal)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
