import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Download, ExternalLink, Apple, Mail } from 'lucide-react';
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateYahooCalendarUrl,
  downloadIcsFile,
} from '../../utils/calendarUtils';
import { useLanguage } from '../../context/LanguageContext';

export const AddToCalendarDropdown = ({
  event,
  className = '',
  buttonVariant = 'outline',
  buttonSize = 'sm',
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { t, dir } = useLanguage();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!event) return null;

  const handleOpenGoogle = (e) => {
    e.stopPropagation();
    window.open(generateGoogleCalendarUrl(event), '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleOpenOutlook = (e) => {
    e.stopPropagation();
    window.open(generateOutlookCalendarUrl(event), '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleOpenYahoo = (e) => {
    e.stopPropagation();
    window.open(generateYahooCalendarUrl(event), '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleDownloadIcs = (e) => {
    e.stopPropagation();
    downloadIcsFile(event);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="cst-btn-motion inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-800)] hover:bg-[var(--surface-750)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-sm cursor-pointer transition-all hover:border-[var(--cst-blue-600)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--cst-blue-600)]/30"
      >
        <Calendar className="w-4 h-4 text-[var(--cst-blue-400)] shrink-0" />
        <span>{label || t('calendar.addToCalendar', 'Add to Calendar')}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[var(--cst-blue-400)]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          dir={dir}
          className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-56 rounded-2xl bg-[var(--surface-900)] border border-[var(--border-default)] shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 p-1.5 space-y-1"
        >
          <div className="px-3 py-1.5 border-b border-[var(--border-subtle)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t('calendar.chooseProvider', 'Choose Calendar')}
            </p>
          </div>

          {/* Google Calendar */}
          <button
            type="button"
            onClick={handleOpenGoogle}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-800)] rounded-xl transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <span className="font-bold text-[10px]">G</span>
              </div>
              <span>{t('calendar.google', 'Google Calendar')}</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-blue-400 transition-colors" />
          </button>

          {/* Apple Calendar / iCal (.ics download) */}
          <button
            type="button"
            onClick={handleDownloadIcs}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-800)] rounded-xl transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-lg bg-slate-500/10 border border-slate-500/20 flex items-center justify-center text-slate-300">
                <Apple className="w-3.5 h-3.5" />
              </div>
              <span>{t('calendar.appleIcs', 'Apple Calendar / iCal (.ics)')}</span>
            </div>
            <Download className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-slate-200 transition-colors" />
          </button>

          {/* Outlook / Office 365 */}
          <button
            type="button"
            onClick={handleOpenOutlook}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-800)] rounded-xl transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Mail className="w-3.5 h-3.5" />
              </div>
              <span>{t('calendar.outlook', 'Outlook & Office 365')}</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-sky-400 transition-colors" />
          </button>

          {/* Yahoo Calendar */}
          <button
            type="button"
            onClick={handleOpenYahoo}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-800)] rounded-xl transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <span className="font-bold text-[10px]">Y!</span>
              </div>
              <span>{t('calendar.yahoo', 'Yahoo Calendar')}</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-purple-400 transition-colors" />
          </button>
        </div>
      )}
    </div>
  );
};
