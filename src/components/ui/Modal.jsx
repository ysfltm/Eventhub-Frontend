import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Modal Component
 * Modern glassmorphic dialog with backdrop blur and smooth exit/entry.
 */
export const Modal = ({ isOpen, onClose, title, description, children, maxWidth = 'max-w-md' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        className={`relative w-full ${maxWidth} bg-[var(--surface-900)] border border-[var(--border-default)] rounded-3xl p-6 shadow-2xl z-10 transition-all transform animate-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            {title && (
              <h3 id="modal-title" className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                {title}
              </h3>
            )}
            {description && (
              <p id="modal-description" className="text-xs text-[var(--text-secondary)] mt-1">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-800)] rounded-xl transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="pt-4">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
