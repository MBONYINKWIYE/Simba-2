import { useTranslation } from 'react-i18next';
import { Mail, Phone, Clock, MapPin, ShoppingBag } from 'lucide-react';

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('about')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('aboutCopy')}</p>
      </div>

      <section className="glass-panel overflow-hidden p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-brand-100 p-3 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            <ShoppingBag size={24} />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold">{t('aboutHistoryTitle')}</h2>
            <p className="leading-7 text-slate-600 dark:text-slate-300">
              {t('aboutHistoryCopy')}
            </p>
          </div>
        </div>
      </section>

      <section className="glass-panel p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <Mail size={24} />
          </div>
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-bold">{t('aboutContactTitle')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('aboutContactCopy')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-brand-600" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</p>
                    <a href="mailto:info@simbasupermarket.rw" className="text-sm font-semibold text-brand-600 hover:underline">
                      info@simbasupermarket.rw
                    </a>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-brand-600" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('phoneNumber')}</p>
                    <a href="tel:+250788123456" className="text-sm font-semibold text-brand-600 hover:underline">
                      +250 788 123 456
                    </a>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-brand-600" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('branchHours')}</p>
                    <p className="text-sm font-semibold">{t('aboutHours')}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-brand-600" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('branches')}</p>
                    <p className="text-sm font-semibold">Kigali, Rwanda</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
