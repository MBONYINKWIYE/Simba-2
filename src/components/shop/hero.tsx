import { ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function Hero() {
  const { t } = useTranslation();

  return (
    <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="glass-panel overflow-hidden p-6 sm:p-8">
        <Badge className="mb-4 gap-2">
          <Sparkles size={14} />
          {t('heroBadge')}
        </Badge>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">{t('heroTitle')}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">{t('heroCopy')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/checkout">
            <Button>
              {t('shopNow')}
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
          <a href="#catalog">
            <Button variant="secondary">{t('exploreCategories')}</Button>
          </a>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="glass-panel bg-brand-900 p-6 text-white dark:bg-brand-800">
          <p className="text-sm uppercase tracking-[0.24em] text-brand-100">{t('heroStatLabel')}</p>
          <p className="mt-4 text-3xl font-bold">700+</p>
          <p className="mt-2 text-sm text-brand-100">{t('heroStatCopy')}</p>
        </div>
        <div className="glass-panel p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{t('heroMomoLabel')}</p>
          <p className="mt-4 text-2xl font-bold">{t('heroMomoTitle')}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {t('heroMomoCopy')}
          </p>
        </div>
      </div>
    </section>
  );
}
