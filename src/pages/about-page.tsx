import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Mail, Phone, Clock, MapPin, ShoppingBag, Heart, Target, Award, Store, ChefHat, Gamepad2, Globe, Building2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CATEGORIES = [
  'Fruits & Vegetables', 'Meats', 'Frozen', 'Wines & Spirits',
  'Furniture', 'Electronics', 'Utensils & Ornaments', 'Homecare',
  'Baby Products', 'Gym & Sports', 'Health & Beauty (Cosmetics)', 'Bakery',
];

const BRANCHES = [
  'Simba Centenary', 'Simba Gishushu', 'Simba Kimironko', 'Simba Kicukiro',
  'Simba Kigali Heights', 'Simba UTC', 'Simba Gacuriro', 'Simba Gikondo',
  'Simba Sonatube', 'Simba Kisimenti', 'Simba Rebero',
];

const MILESTONES = [
  { key: 'aboutMilestone2013', year: '2013', icon: Award },
  { key: 'aboutMilestone2014', year: '2014', icon: Award },
  { key: 'aboutMilestone2015', year: '2015', icon: Award },
  { key: 'aboutMilestone2020', year: '2020', icon: Award },
];

const SERVICES = [
  { key: 'aboutServicesButchery', icon: ChefHat },
  { key: 'aboutServicesBakery', icon: ChefHat },
  { key: 'aboutServicesCoffee', icon: Store },
  { key: 'aboutServicesArcade', icon: Gamepad2 },
  { key: 'aboutServicesOnline', icon: Globe },
  { key: 'aboutServicesBakeryFactory', icon: Building2 },
];

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Hero */}
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-brand-500 text-white shadow-lg shadow-brand-500/20">
          <ShoppingBag size={28} />
        </div>
        <h1 className="text-3xl font-bold sm:text-4xl">{t('about')}</h1>
        <p className="mt-3 max-w-2xl mx-auto text-base leading-relaxed text-slate-500 dark:text-slate-400">
          {t('aboutCopy')}
        </p>
      </div>

      {/* Our Story */}
      <section className="glass-panel overflow-hidden p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <Heart size={24} />
          </div>
          <div className="space-y-3 flex-1">
            <h2 className="text-2xl font-bold">{t('aboutHistoryTitle')}</h2>
            <p className="leading-7 text-slate-600 dark:text-slate-300">
              {t('aboutHistoryCopy')}
            </p>
            <p className="leading-7 text-slate-600 dark:text-slate-300">
              {t('aboutFounder')}
            </p>
            <p className="leading-7 text-slate-600 dark:text-slate-300">
              {t('aboutStoryDetail')}
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="glass-panel p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <Target size={24} />
          </div>
          <h2 className="text-2xl font-bold">{t('aboutValuesTitle')}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-900/70">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Heart size={20} />
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {t('aboutValueRespect')}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-900/70">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              <ShoppingBag size={20} />
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {t('aboutValueService')}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-900/70">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
              <Sparkles size={20} />
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {t('aboutValueExcellence')}
            </p>
          </div>
        </div>
      </section>

      {/* Product Categories */}
      <section className="glass-panel p-6 sm:p-8">
        <h2 className="text-2xl font-bold mb-5">{t('aboutProductsTitle')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <div
              key={cat}
              className="rounded-2xl border border-slate-200 bg-white/50 px-4 py-3 text-center text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
            >
              {cat}
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="glass-panel p-6 sm:p-8">
        <h2 className="text-2xl font-bold mb-5">{t('aboutServicesTitle')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                <Icon size={20} />
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {t(key)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Branches */}
      <section className="glass-panel p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            <Store size={24} />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{t('aboutBranchesTitle')}</h2>
              <p className="mt-1 text-sm font-medium text-brand-600 dark:text-brand-400">
                {t('aboutBranchesCount')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {BRANCHES.map((branch) => (
                <div
                  key={branch}
                  className="rounded-2xl border border-slate-200 bg-white/50 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
                >
                  {branch}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="glass-panel p-6 sm:p-8">
        <h2 className="text-2xl font-bold mb-5">{t('aboutMilestonesTitle')}</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {MILESTONES.map(({ key, year, icon: Icon }) => (
            <div
              key={key}
              className="rounded-3xl border border-slate-200 bg-white/70 p-5 text-center dark:border-slate-700 dark:bg-slate-900/70"
            >
              <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                <Icon size={20} />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">{year}</p>
              <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                {t(key)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
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

      {/* CTA */}
      <div className="text-center">
        <Link to="/">
          <Button className="px-8 py-4 text-base">
            {t('startShopping')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
