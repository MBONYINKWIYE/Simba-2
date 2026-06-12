import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/layout/brand-logo';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-slate-200/80 bg-gradient-to-br from-white via-brand-50/20 to-stone-100/80 py-8 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="container-shell">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-4">
            <BrandLogo compact className="gap-2" />
            <div className="max-w-md space-y-2">
              <p className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                {t('footerTitle')}
              </p>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t('footerCopy')}
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                {t('footerContactTitle')}
              </p>
              <address className="not-italic text-sm text-slate-600 dark:text-slate-300 space-y-1">
                <p>
                  <a href="tel:+250788123456" className="hover:text-brand-600 dark:hover:text-brand-400">
                    +250 788 123 456
                  </a>
                </p>
                <p>
                  <a href="mailto:info@simba.rw" className="hover:text-brand-600 dark:hover:text-brand-400">
                    info@simba.rw
                  </a>
                </p>
                <p>{t('footerHours')}</p>
              </address>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
              {t('footerShopTitle')}
            </p>
            <div className="mt-3 grid gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Link className="inline-flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/">
                <span>{t('footerHomeLink')}</span>
                <ArrowUpRight size={14} />
              </Link>
              <Link className="inline-flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/#catalog">
                <span>{t('footerCatalogLink')}</span>
                <ArrowUpRight size={14} />
              </Link>
              <Link className="inline-flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/checkout">
                <span>{t('footerCheckoutLink')}</span>
                <ArrowUpRight size={14} />
              </Link>
              <Link className="inline-flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/orders">
                <span>{t('footerOrdersLink')}</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
              {t('footerSupportTitle')}
            </p>
            <div className="mt-3 grid gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              <Link className="inline-flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/auth/login">
                <span>{t('footerSignInLink')}</span>
                <ArrowUpRight size={14} />
              </Link>
              <Link className="inline-flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/auth/signup">
                <span>{t('footerCreateAccountLink')}</span>
                <ArrowUpRight size={14} />
              </Link>
              <Link className="inline-flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/checkout">
                <span>{t('footerPaymentHelpLink')}</span>
                <ArrowUpRight size={14} />
              </Link>
              <Link className="inline-flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 transition hover:bg-white dark:bg-slate-900/70 dark:hover:bg-slate-900" to="/orders">
                <span>{t('footerTrackOrderLink')}</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-200/80 pt-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>{t('footerRights', { year })}</p>
        </div>
      </div>
    </footer>
  );
}
