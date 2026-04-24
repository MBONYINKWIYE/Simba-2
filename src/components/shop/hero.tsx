import { ArrowRight, Clock3, Leaf, WalletCards } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import adVideo from '../../../images/ad.mp4';

export function Hero({
  productCount,
  branchNames,
}: {
  productCount: number;
  branchNames: string[];
}) {
  const { t } = useTranslation();
  const visibleBranches = branchNames.slice(0, 3);

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="relative glass-panel overflow-hidden bg-brand-900 p-6 text-white sm:p-8">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        >
          <source src={adVideo} type="video/mp4" />
        </video>
        
        {/* Gradient Overlay for professional look and readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/90 via-brand-900/60 to-emerald-900/60" />

        <div className="relative z-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-100">{t('heroEyebrow')}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">{t('heroTitle')}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-emerald-50/85">{t('heroCopy')}</p>
          <div className="mt-6">
            <Link to="/#catalog">
              <Button>
                {t('startShopping')}
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
              <Clock3 size={18} className="text-emerald-200" />
              <p className="mt-3 font-semibold">{t('valueFastPickupTitle')}</p>
              <p className="mt-1 text-sm text-emerald-50/80">{t('valueFastPickupCopy')}</p>
            </div>
            <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
              <Leaf size={18} className="text-emerald-200" />
              <p className="mt-3 font-semibold">{t('valueFreshTitle')}</p>
              <p className="mt-1 text-sm text-emerald-50/80">{t('valueFreshCopy')}</p>
            </div>
            <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
              <WalletCards size={18} className="text-emerald-200" />
              <p className="mt-3 font-semibold">{t('valueMomoTitle')}</p>
              <p className="mt-1 text-sm text-emerald-50/80">{t('valueMomoCopy')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="glass-panel p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{t('trustSignals')}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <p className="text-3xl font-bold">{productCount}+</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('heroProductCountCopy')}</p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                {t('heroBranchLabel')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {visibleBranches.length > 0 ? (
                  visibleBranches.map((branchName) => (
                    <span key={branchName} className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium dark:bg-slate-800">
                      {branchName}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t('heroBranchFallback')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="glass-panel p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{t('heroTrustLabel')}</p>
          <p className="mt-4 text-2xl font-bold">{t('heroTrustTitle')}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('heroTrustCopy')}</p>
        </div>
      </div>
    </section>
  );
}
