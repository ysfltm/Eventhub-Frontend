import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getCachedTranslation, translateText } from '../services/translationService';

/**
 * Custom React Hook for Dynamic Text Translation
 * Accepts a string or fallback, checks client-side cache, fetches async translation if needed,
 * and manages smooth loading states.
 * 
 * Usage:
 * const { translatedText, isLoading } = useTranslate('Welcome back');
 */
export const useTranslate = (text, fallback = '') => {
  const { lang } = useLanguage();
  const sourceText = text || fallback || '';
  const cached = getCachedTranslation(sourceText, lang);

  const [translatedText, setTranslatedText] = useState(cached || sourceText);
  const [isLoading, setIsLoading] = useState(!cached && lang !== 'en' && !!sourceText);

  useEffect(() => {
    if (!sourceText || lang === 'en') {
      setTranslatedText(sourceText);
      setIsLoading(false);
      return;
    }

    const cachedVal = getCachedTranslation(sourceText, lang);
    if (cachedVal) {
      setTranslatedText(cachedVal);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    translateText(sourceText, lang).then((res) => {
      if (isMounted) {
        setTranslatedText(res || sourceText);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [sourceText, lang]);

  return { translatedText, isLoading };
};
