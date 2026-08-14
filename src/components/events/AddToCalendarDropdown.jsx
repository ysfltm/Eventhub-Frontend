import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 230, placeAbove: false });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const { t, dir } = useLanguage();

  const isRtl = dir === 'rtl';

  // Calculate coordinates for portal positioning
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = 220;
    const padding = 8;

    // Check if there is enough space below
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < menuHeight && rect.top > menuHeight;

    let top = placeAbove
      ? rect.top + window.scrollY - menuHeight - padding
      : rect.bottom + window.scrollY + padding;

    // Calculate left/horizontal alignment
    let left;
    if (isRtl) {
      left = rect.right + window.scrollX - menuWidth;
    } else {
      left = rect.left + window.scrollX;
    }

    // Boundary check for window width
    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }
    if (left < 10) {
      left = 10;
    }

    setMenuPosition({ top, left, width: menuWidth, placeAbove });
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    const handleScrollOrResize = () => {
      if (isOpen) updatePosition();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
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
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={handleToggle}
        className={`cst-btn-motion inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[var(--surface-800)] hover:bg-[var(--surface-750)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-md cursor-pointer transition-all hover:border-[var(--cst-blue-600)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--cst-blue-600)]/30 ${className}`}
      >
        <Calendar className="w-4 h-4 text-[var(--cst-blue-400)] shrink-0" />
        <span className="truncate">{label || t('calendar.addToCalendar', 'Add to Calendar')}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[var(--cst-blue-400)]' : ''
          }`}
        />
      </button>

      {/* Render Portal directly to body to avoid container clipping or overflow-hidden */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            dir={dir}
            style={{
              position: 'absolute',
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`,
              zIndex: 99999,
            }}
            className="rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-3 py-1.5 border-b border-slate-800/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('calendar.chooseProvider', 'Choose Calendar')}
              </p>
            </div>

            {/* Google Calendar */}
            <button
              type="button"
              onClick={handleOpenGoogle}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-xl transition-colors text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
                  <span className="font-black text-[10px]">G</span>
                </div>
                <span>{t('calendar.google', 'Google Calendar')}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
            </button>

            {/* Apple Calendar / iCal (.ics download) */}
            <button
              type="button"
              onClick={handleDownloadIcs}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-xl transition-colors text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-slate-700/50 border border-slate-600/50 flex items-center justify-center text-slate-200 shadow-sm">
                  <Apple className="w-3.5 h-3.5" />
                </div>
                <span>{t('calendar.appleIcs', 'Apple Calendar (.ics)')}</span>
              </div>
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            </button>

            {/* Outlook / Office 365 */}
            <button
              type="button"
              onClick={handleOpenOutlook}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-xl transition-colors text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <span>{t('calendar.outlook', 'Outlook & 365')}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400 transition-colors" />
            </button>

            {/* Yahoo Calendar */}
            <button
              type="button"
              onClick={handleOpenYahoo}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800/90 hover:text-white rounded-xl transition-colors text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm">
                  <span className="font-bold text-[10px]">Y!</span>
                </div>
                <span>{t('calendar.yahoo', 'Yahoo Calendar')}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-400 transition-colors" />
            </button>
          </div>,
          document.body
        )}
    </>
  );
};
