import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/layout/brand-logo';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-slate-200/80 bg-orange-200/85 py-4 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="container-shell">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1 space-y-2">
            <BrandLogo compact className="gap-2" />
            <div className="max-w-md space-y-1">
              <p className="text-sm font-bold tracking-tight text-slate-950 dark:text-white">
                {t('footerTitle')}
              </p>
              <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                {t('footerCopy')}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                {t('footerContactTitle')}
              </p>
              <address className="not-italic text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
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
            <div className="mt-1.5 grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Link className="text-xs font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400" to="/">
                {t('footerHomeLink')}
              </Link>
              <Link className="text-xs font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400" to="/#catalog">
                {t('footerCatalogLink')}
              </Link>
              <Link className="text-xs font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400" to="/branches">
                {t('branches')}
              </Link>
              <Link className="text-xs font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400" to="/about">
                {t('about')}
              </Link>
              <Link className="text-xs font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400" to="/faq">
                {t('faq')}
              </Link>
              <Link className="text-xs font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400" to="/checkout">
                {t('footerCheckoutLink')}
              </Link>
              <Link className="text-xs font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400" to="/orders">
                {t('footerOrdersLink')}
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
              {t('footerSupportTitle')}
            </p>
            <div className="mt-1.5 grid gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Link className="text-xs font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400" to="/auth/login">
                {t('footerSignInLink')}
              </Link>
              <Link className="text-xs font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400" to="/auth/signup">
                {t('footerCreateAccountLink')}
              </Link>
              <Link className="text-xs font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400" to="/checkout">
                {t('footerPaymentHelpLink')}
              </Link>
              <Link className="text-xs font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400" to="/orders">
                {t('footerTrackOrderLink')}
              </Link>
              <Link className="text-xs font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400" to="/branches">
                {t('branches')}
              </Link>
              <Link className="text-xs font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400" to="/about">
                {t('about')}
              </Link>
              <Link className="text-xs font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400" to="/faq">
                {t('faq')}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-slate-200/80 pt-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>{t('footerRights', { year })}</p>
        </div>
      </div>
    </footer>
  );
}
