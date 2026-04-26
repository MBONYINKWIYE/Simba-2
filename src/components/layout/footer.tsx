import { ArrowUpRight, Clock3, ShieldCheck, ShoppingBasket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/layout/brand-logo';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-slate-200/80 bg-gradient-to-br from-white via-brand-50/20 to-stone-100/80 py-12 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="container-shell">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_0.8fr_0.8fr]">
          <div className="space-y-5">
            <BrandLogo compact className="gap-2" />
            <div className="max-w-xl space-y-3">
              <p className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {t('footerTitle')}
              </p>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t('footerCopy')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300">
                <ShoppingBasket size={14} />
                {t('footerPickupFeature')}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-sky-900/60 dark:bg-sky-900/20 dark:text-sky-300">
                <ShieldCheck size={14} />
                {t('footerSecurityFeature')}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300">
                <Clock3 size={14} />
                {t('footerTrackingFeature')}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
              {t('footerShopTitle')}
            </p>
            <div className="mt-4 grid gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Link className="inline-flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/">
                <span>{t('footerHomeLink')}</span>
                <ArrowUpRight size={16} />
              </Link>
              <Link className="inline-flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/#catalog">
                <span>{t('footerCatalogLink')}</span>
                <ArrowUpRight size={16} />
              </Link>
              <Link className="inline-flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/checkout">
                <span>{t('footerCheckoutLink')}</span>
                <ArrowUpRight size={16} />
              </Link>
              <Link className="inline-flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/orders">
                <span>{t('footerOrdersLink')}</span>
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
              {t('footerSupportTitle')}
            </p>
            <div className="mt-4 grid gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Link className="inline-flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/auth/login">
                <span>{t('footerSignInLink')}</span>
                <ArrowUpRight size={16} />
              </Link>
              <Link className="inline-flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/auth/signup">
                <span>{t('footerCreateAccountLink')}</span>
                <ArrowUpRight size={16} />
              </Link>
              <Link className="inline-flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/checkout">
                <span>{t('footerPaymentHelpLink')}</span>
                <ArrowUpRight size={16} />
              </Link>
              <Link className="inline-flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/orders">
                <span>{t('footerTrackOrderLink')}</span>
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200/80 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>{t('footerRights', { year })}</p>
          <p>{t('footerStack')}</p>
        </div>
      </div>
    </footer>
  );
}
