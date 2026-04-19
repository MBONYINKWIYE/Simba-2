import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { DEFAULT_CHECKOUT_VALUES } from '@/lib/constants';
import { createCashOrder, requestToPay, getRequestToPayStatus } from '@/lib/momo';
import { formatCurrency } from '@/lib/utils';
import { useOrderSummary } from '@/hooks/use-order-summary';
import { useCartStore } from '@/store/cart-store';
import type { CheckoutFormValues } from '@/types';

export function CheckoutPage() {
  const { t } = useTranslation();
  const itemsMap = useCartStore((state) => state.items);
  const items = Object.values(itemsMap);
  const clearCart = useCartStore((state) => state.clearCart);
  const summary = useOrderSummary();
  const [formValues, setFormValues] = useState<CheckoutFormValues>({ ...DEFAULT_CHECKOUT_VALUES });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    setPaymentReference('');
    setPaymentStatus('');

    const requestPayload = {
      checkout: formValues,
      items: items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPriceRwf: item.product.price,
      })),
      subtotalRwf: summary.subtotal,
      deliveryFeeRwf: summary.deliveryFee,
      serviceFeeRwf: summary.serviceFee,
      totalRwf: summary.total,
    };

    if (items.length === 0) {
      setErrorMessage('Your cart is empty.');
      return;
    }

    if (formValues.paymentMethod === 'cash') {
      try {
        setIsSubmitting(true);
        await createCashOrder(requestPayload);
        clearCart();
        setFormValues({ ...DEFAULT_CHECKOUT_VALUES });
        setSuccessMessage('Cash on delivery order saved successfully.');
        return;
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to create cash order');
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    try {
      setIsSubmitting(true);
      const payment = await requestToPay(requestPayload);

      if (!payment.referenceId) {
        throw new Error('MoMo payment started but no referenceId was returned.');
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
          setSuccessMessage('MoMo payment authorized successfully and the order has been saved.');
          return;
        }

        if (nextStatus === 'FAILED') {
          setErrorMessage('MoMo payment failed. Confirm the number and try again.');
          return;
        }
      }

      setSuccessMessage('MoMo payment request submitted. The payment is still pending; check again shortly.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start MoMo payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <form className="glass-panel p-6" onSubmit={handleSubmit}>
        <h1 className="text-3xl font-bold">{t('checkout')}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Mobile Money checkout is routed through a Supabase Edge Function that talks to the MTN MoMo Collection sandbox.
        </p>
        <div className="mt-6 grid gap-4">
          <input
            required
            value={formValues.fullName}
            onChange={(event) => setFormValues((current) => ({ ...current, fullName: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            placeholder="Full name"
          />
          <input
            required
            value={formValues.phone}
            onChange={(event) => setFormValues((current) => ({ ...current, phone: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            placeholder="Phone number"
          />
          <textarea
            required
            value={formValues.address}
            onChange={(event) => setFormValues((current) => ({ ...current, address: event.target.value }))}
            className="min-h-32 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            placeholder="Delivery address"
          />
          <textarea
            value={formValues.notes}
            onChange={(event) => setFormValues((current) => ({ ...current, notes: event.target.value }))}
            className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            placeholder="Delivery notes"
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
        <Button type="submit" className="mt-6" fullWidth disabled={items.length === 0 || isSubmitting}>
          {t('placeOrder')}
        </Button>
        {paymentReference ? (
          <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700 dark:bg-sky-900/20 dark:text-sky-300">
            Reference: {paymentReference} {paymentStatus ? `(${paymentStatus})` : ''}
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
            <span>Subtotal</span>
            <span>{formatCurrency(summary.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{formatCurrency(summary.deliveryFee)}</span>
          </div>
          <div className="flex justify-between">
            <span>Service fee</span>
            <span>{formatCurrency(summary.serviceFee)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatCurrency(summary.total)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
