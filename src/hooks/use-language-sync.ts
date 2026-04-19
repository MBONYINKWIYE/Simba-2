import { useEffect } from 'react';
import i18n from '@/i18n';
import { usePreferencesStore } from '@/store/preferences-store';

export function useLanguageSync() {
  const locale = usePreferencesStore((state) => state.locale);

  useEffect(() => {
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
  }, [locale]);
}
