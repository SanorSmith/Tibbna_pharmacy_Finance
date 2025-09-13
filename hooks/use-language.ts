import { useCallback } from 'react';
import {
  useLanguageContext,
  TranslationKey,
  translations,
} from "@/contexts/languageprovider";

export function useLanguage() {
  const { language, setLanguage, isLoaded } = useLanguageContext();
  const ttt = useCallback(
    (key: TranslationKey, params?: Record<string, string>) => {
      const translation = translations[language][key] || String(key);
      if (params) {
        return Object.entries(params).reduce(
          (str, [param, value]) => str.replace(`{{${param}}}`, value),
          translation
        );
      }

      return translation;
    },
    [language]
  );

  const translateText = useCallback(
    (key: string, params?: Record<string, string>) => {
      const translation = translations[language][key] || String(key);
      if (params) {
        return Object.entries(params).reduce(
          (str, [param, value]) => str.replace(`{{${param}}}`, value),
          translation
        );
      }

      return translation;
    },
    [language]
  );

  const ttrisky = useCallback(
    (key: string, params?: Record<string, string>) =>
      translateText(key, params),
    [translateText]
  );

  return { language, setLanguage, ttt, ttrisky, isLoaded };
}
