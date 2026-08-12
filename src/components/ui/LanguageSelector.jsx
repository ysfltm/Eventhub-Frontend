import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export const LanguageSelector = ({ size = 'md', style = {} }) => {
  const { lang, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const dim = size === 'sm' ? 34 : 40;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        id="language-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change Language / تغيير اللغة"
        title={`Language: ${currentLang.label} (${currentLang.flag})`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${dim}px`,
          height: `${dim}px`,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
          background: 'transparent',
          cursor: 'pointer',
          position: 'relative',
          flexShrink: 0,
          transition: `border-color var(--duration-fast), background var(--duration-fast)`,
          ...style,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--nav-hover-bg)';
          e.currentTarget.style.borderColor = 'var(--border-strong)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'var(--border-default)';
        }}
      >
        <Globe size={18} className="text-[var(--cst-blue-400)] shrink-0" />
        <span className="text-[9px] font-mono font-bold uppercase absolute bottom-0.5 right-0.5 text-[var(--cst-blue-400)] bg-[var(--surface-800)] px-0.5 rounded leading-none">
          {currentLang.code}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-36 bg-[var(--surface-900)] border border-[var(--border-default)] rounded-2xl shadow-2xl overflow-hidden z-50 p-1 divide-y divide-[var(--border-subtle)]"
          >
            {LANGUAGES.map((item) => {
              const isSelected = item.code === lang;
              return (
                <button
                  key={item.code}
                  onClick={() => {
                    setLanguage(item.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--cst-blue-700)]/20 text-[var(--cst-blue-400)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-800)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{item.flag}</span>
                    <span>{item.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSelector;
