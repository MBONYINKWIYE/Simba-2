import { useTranslation } from 'react-i18next';
import { HelpCircle, ChevronDown } from 'lucide-react';

const FAQ_KEYS = ['1', '2', '3', '4', '5'] as const;

export function FaqPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="glass-panel p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-2xl bg-sky-50 p-3 text-sky-600 dark:bg-sky-900/20 dark:text-sky-300">
            <HelpCircle size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t('faq')}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('faqCopy')}</p>
          </div>
        </div>
      </section>

      <section className="glass-panel divide-y divide-slate-200 overflow-hidden dark:divide-slate-800">
        {FAQ_KEYS.map((key) => (
          <details key={key} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-sm font-semibold text-slate-800 transition hover:bg-white/50 dark:text-slate-100 dark:hover:bg-slate-900/50">
              <span>{t(`faqQ${key}`)}</span>
              <ChevronDown size={16} className="shrink-0 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <div className="px-6 pb-5 pt-0 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {t(`faqA${key}`)}
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
