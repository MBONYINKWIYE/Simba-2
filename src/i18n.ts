import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { usePreferencesStore } from '@/store/preferences-store';
import type { Locale } from '@/types';

type TranslationModule = {
  default: Record<string, string>;
};

const localeLoaders: Record<Locale, () => Promise<TranslationModule>> = {
  en: () => import('@/locales/en'),
  fr: () => import('@/locales/fr'),
  rw: () => import('@/locales/rw'),
};

const loadedLocales = new Set<Locale>();

async function loadLocale(locale: Locale) {
  const { default: translation } = await localeLoaders[locale]();

  return {
    translation,
  };
}

export async function ensureLocaleLoaded(locale: Locale) {
  if (loadedLocales.has(locale)) {
    return;
  }

  const resources = await loadLocale(locale);
  i18n.addResourceBundle(locale, 'translation', resources.translation, true, true);
  loadedLocales.add(locale);
}

export async function initializeI18n() {
  const initialLocale = usePreferencesStore.getState().locale;
  const initialResources: Partial<Record<Locale, { translation: Record<string, string> }>> = {
    [initialLocale]: await loadLocale(initialLocale),
  };

  loadedLocales.add(initialLocale);

  if (initialLocale !== 'en') {
    initialResources.en = await loadLocale('en');
    loadedLocales.add('en');
  }

  await i18n.use(initReactI18next).init({
    resources: initialResources,
    lng: initialLocale,
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'rw'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
