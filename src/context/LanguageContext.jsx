import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { en } from '../translations/en';
import { fr } from '../translations/fr';
import { ar } from '../translations/ar';
import { getCachedTranslation, translateText } from '../services/translationService';

const dictionaries = { en, fr, ar };

export const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('eventhub_lang') || 'en';
  });
  const [, setCacheRevision] = useState(0);

  const setLanguage = (newLang) => {
    if (newLang) {
      setLangState(newLang);
      localStorage.setItem('eventhub_lang', newLang);
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  /**
   * Universal translation helper:
   * 1. Checks dictionary for static key paths (e.g., 'nav.events')
   * 2. Checks translationService cache for dynamic strings
   * 3. Triggers asynchronous Translator API request in background if uncached
   * 4. Seamlessly returns fallback / source text while loading
   */
  const t = useCallback(
    (keyPath, fallback = '') => {
      if (!keyPath) return fallback;
      const defaultText = fallback || keyPath;
      if (lang === 'en') return defaultText;

      // 1. Static Dictionary Lookup
      if (dictionaries[lang]) {
        const keys = keyPath.split('.');
        let dict = dictionaries[lang];
        let found = true;
        for (const key of keys) {
          if (dict && dict[key] !== undefined) {
            dict = dict[key];
          } else {
            found = false;
            break;
          }
        }
        if (found && typeof dict === 'string') {
          return dict;
        }
      }

      // 2. Client-Side Cache Lookup for Dynamic API Translation
      const cached = getCachedTranslation(defaultText, lang);
      if (cached) return cached;

      // 3. Trigger Async Background Translation Request
      translateText(defaultText, lang).then((result) => {
        if (result && result !== defaultText) {
          setCacheRevision((prev) => prev + 1);
        }
      });

      // 4. Return default source text while request completes
      return defaultText;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t, dir: lang === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

