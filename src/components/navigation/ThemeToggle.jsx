import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * ThemeToggle
 * ─────────────────────────────────────────────────────────────────────────────
 * Animated sun / moon icon button that switches between light and dark mode.
 *
 * Props:
 *  - size: 'sm' | 'md' (default: 'md')
 *  - className: additional inline style object for positioning
 */
const ThemeToggle = ({ size = 'md', style = {} }) => {
  const { isDark, toggleTheme } = useTheme();

  const dim = size === 'sm' ? 34 : 40;
  const iconSize = size === 'sm' ? 15 : 17;

  return (
    <button
      id="theme-toggle-btn"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={!isDark}
      title={isDark ? 'Light mode' : 'Dark mode'}
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
        overflow: 'hidden',
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
      {/* Sun icon — visible in dark mode (clicking → goes light) */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isDark ? 'var(--cst-blue-400)' : 'transparent',
          transform: isDark ? 'translateY(0) rotate(0deg)' : 'translateY(20px) rotate(90deg)',
          opacity: isDark ? 1 : 0,
          transition: `transform var(--duration-medium) var(--ease-enterprise), opacity var(--duration-medium), color var(--duration-fast)`,
        }}
      >
        <Sun size={iconSize} strokeWidth={2} />
      </span>

      {/* Moon icon — visible in light mode (clicking → goes dark) */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: !isDark ? 'var(--cst-blue-700)' : 'transparent',
          transform: !isDark ? 'translateY(0) rotate(0deg)' : 'translateY(-20px) rotate(-90deg)',
          opacity: !isDark ? 1 : 0,
          transition: `transform var(--duration-medium) var(--ease-enterprise), opacity var(--duration-medium), color var(--duration-fast)`,
        }}
      >
        <Moon size={iconSize} strokeWidth={2} />
      </span>
    </button>
  );
};

export default ThemeToggle;
