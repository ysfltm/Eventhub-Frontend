import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * MobileDrawer
 * ─────────────────────────────────────────────────────────────────────────────
 * Accessible slide-in navigation drawer for mobile viewports.
 *
 * Features:
 *  - 250ms slide animation with CST enterprise easing
 *  - Focus trapping while open
 *  - Escape key closes drawer
 *  - ARIA: role="dialog", aria-modal, aria-label
 *  - Backdrop click closes drawer
 *  - Prevents body scroll when open
 */
const MobileDrawer = ({ isOpen, onClose, children, title = 'Navigation' }) => {
  const drawerRef = useRef(null);
  const closeBtnRef = useRef(null);

  /* ── Trap focus inside drawer when open ─────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button on open
    const timer = setTimeout(() => closeBtnRef.current?.focus(), 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = drawerRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 'var(--z-backdrop)',
          backgroundColor: 'rgba(2, 6, 23, 0.75)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: `opacity var(--duration-slow) var(--ease-enterprise)`,
        }}
      />

      {/* ── Drawer Panel ──────────────────────────────────────────────────── */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 'min(var(--nav-sidebar-width), 85vw)',
          zIndex: 'var(--z-sidebar)',
          backgroundColor: 'var(--surface-900)',
          borderRight: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: `transform var(--duration-slow) var(--ease-enterprise)`,
          boxShadow: isOpen ? 'var(--shadow-xl)' : 'none',
          overflowY: 'auto',
        }}
      >
        {/* Close Button */}
        <button
          ref={closeBtnRef}
          onClick={onClose}
          aria-label="Close navigation"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: `background var(--duration-fast), color var(--duration-fast)`,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-800)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <X size={16} />
        </button>

        {children}
      </div>
    </>
  );
};

export default MobileDrawer;
