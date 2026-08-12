import React from 'react';
import { useTranslate } from '../../hooks/useTranslate';

/**
 * Reusable <Translate /> UI Wrapper Component
 * Automatically translates input text with caching and optional skeleton loading state.
 * 
 * Usage:
 * <Translate text="Executive Analytics" />
 */
export const Translate = ({ text, fallback, className = '', showSkeleton = false }) => {
  const { translatedText, isLoading } = useTranslate(text, fallback);

  if (isLoading && showSkeleton) {
    return (
      <span className={`inline-block animate-pulse bg-slate-700/50 rounded h-4 w-16 align-middle ${className}`} />
    );
  }

  return <span className={className}>{translatedText}</span>;
};

export default Translate;
