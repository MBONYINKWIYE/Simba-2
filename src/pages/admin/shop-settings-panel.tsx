import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useUpdateShopPhone } from '@/hooks/use-inventory';

type ShopSettingsPanelProps = {
  shopId: string | null;
  shopName: string | null;
  phone: string;
  shops: { id: string; name: string; phone: string }[];
  isSuperAdmin: boolean;
};

export function ShopSettingsPanel({ shopId, shopName, phone, shops, isSuperAdmin }: ShopSettingsPanelProps) {
  const { t } = useTranslation();
  const updateShopPhone = useUpdateShopPhone();
  const [targetShopId, setTargetShopId] = useState(shopId ?? '');
  const [phoneValue, setPhoneValue] = useState(phone);

  useEffect(() => {
    setTargetShopId(shopId ?? '');
  }, [shopId]);

  useEffect(() => {
    setPhoneValue(phone);
  }, [phone]);

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    const targetShop = shops.find((shop) => shop.id === targetShopId);
    if (targetShop) {
      setPhoneValue(targetShop.phone);
    }
  }, [isSuperAdmin, shops, targetShopId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!targetShopId) {
      return;
    }

    await updateShopPhone.mutateAsync({
      shopId: targetShopId,
      phone: phoneValue,
    });
  };

  return (
    <section className="glass-panel p-6">
      <h2 className="text-2xl font-bold">{t('shopSettings')}</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('shopSettingsCopy')}</p>

      <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
        {isSuperAdmin ? (
          <select
            value={targetShopId}
            onChange={(event) => setTargetShopId(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">{t('selectShop')}</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium dark:border-slate-700 dark:bg-slate-950">
            {shopName ?? t('adminShopLabel')}
          </div>
        )}

        <input
          required
          value={phoneValue}
          onChange={(event) => setPhoneValue(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
          placeholder={t('shopPhone')}
        />

        <Button type="submit" disabled={!targetShopId || updateShopPhone.isPending}>
          {t('saveShopPhone')}
        </Button>

        {updateShopPhone.isSuccess ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-300">{t('shopPhoneUpdated')}</p>
        ) : null}
        {updateShopPhone.isError ? (
          <p className="text-sm text-rose-600 dark:text-rose-300">
            {updateShopPhone.error instanceof Error ? updateShopPhone.error.message : t('shopPhoneUpdateFailed')}
          </p>
        ) : null}
      </form>
    </section>
  );
}
