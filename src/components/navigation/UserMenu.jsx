import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { getRoleStyle, normalizeRole } from '../../utils/roleUtils';

/**
 * UserMenu
 * ─────────────────────────────────────────────────────────────────────────────
 * Accessible user profile dropdown for the top navigation bar.
 */
const UserMenu = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);

  const displayName = user?.email?.split('@')[0] || 'User';
  const initial = displayName[0]?.toUpperCase() || 'U';

  const normalizedRole = normalizeRole(user?.role);
  const roleStyle = getRoleStyle(normalizedRole);
  const RoleIcon = roleStyle.icon;

  const menuItems = [
    { label: 'My Profile', to: '/profile', icon: User },
  ];

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  /* ── Click-outside ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (!menuRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  /* ── Keyboard navigation ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    // Focus first item when opened
    const timer = setTimeout(() => itemRefs.current[0]?.focus(), 20);

    const handleKey = (e) => {
      const items = itemRefs.current.filter(Boolean);
      const idx = items.indexOf(document.activeElement);

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'ArrowDown':
          e.preventDefault();
          items[(idx + 1) % items.length]?.focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          items[(idx - 1 + items.length) % items.length]?.focus();
          break;
        case 'Home':
          e.preventDefault();
          items[0]?.focus();
          break;
        case 'End':
          e.preventDefault();
          items[items.length - 1]?.focus();
          break;
        case 'Tab':
          close();
          break;
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, close]);

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Trigger Button ──────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        id="user-menu-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="user-menu"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px 6px 6px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          background: open ? 'var(--surface-800)' : 'transparent',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          transition: `background var(--duration-fast), border-color var(--duration-fast)`,
          minWidth: 0,
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = 'var(--surface-800)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Avatar */}
        <div
          aria-hidden="true"
          style={{
            width: '30px',
            height: '30px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--cst-blue-800), var(--cst-blue-600))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {initial}
        </div>
        {/* Name */}
        <span style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          color: 'var(--text-primary)',
          maxWidth: '120px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {displayName}
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          style={{
            color: 'var(--text-muted)',
            transition: `transform var(--duration-fast)`,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </button>

      {/* ── Dropdown Panel ──────────────────────────────────────────────── */}
      <div
        ref={menuRef}
        id="user-menu"
        role="menu"
        aria-labelledby="user-menu-trigger"
        className="cst-dropdown-anim"
        style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          minWidth: '220px',
          backgroundColor: 'var(--surface-900)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          padding: '6px',
          zIndex: 'var(--z-dropdown)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transform: open ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
          transformOrigin: 'top right',
          transition: `opacity var(--duration-normal) var(--ease-enterprise), transform var(--duration-normal) var(--ease-enterprise)`,
        }}
      >
        {/* Header info */}
        <div style={{
          padding: '10px 12px',
          marginBottom: '4px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
            {displayName}
          </p>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', wordBreak: 'break-all' }}>
            {user?.email}
          </p>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleStyle.badgeClass}`}>
            <RoleIcon className="w-3 h-3" />
            {roleStyle.label}
          </span>
        </div>

        {/* Menu items */}
        <div style={{ padding: '4px 0' }}>
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                role="menuitem"
                ref={(el) => (itemRefs.current[i] = el)}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  transition: `background var(--duration-fast), color var(--duration-fast)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--nav-hover-bg)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <Icon size={15} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Divider + Logout */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '4px 0 0' }}>
          <button
            role="menuitem"
            ref={(el) => (itemRefs.current[menuItems.length] = el)}
            onClick={() => { setOpen(false); onLogout(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '9px 12px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'transparent',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: `background var(--duration-fast), color var(--duration-fast)`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(181,31,36,0.1)';
              e.currentTarget.style.color = 'var(--cst-red-400)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <LogOut size={15} aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserMenu;
