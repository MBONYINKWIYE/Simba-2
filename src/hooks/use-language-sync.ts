import { useEffect } from 'react';
import i18n, { ensureLocaleLoaded } from '@/i18n';
import { usePreferencesStore } from '@/store/preferences-store';

export function useLanguageSync() {
  const locale = usePreferencesStore((state) => state.locale);

  useEffect(() => {
    if (i18n.language === locale) {
      return;
    }

    void (async () => {
      await ensureLocaleLoaded(locale);
      await i18n.changeLanguage(locale);
    })();
  }, [locale]);
}
