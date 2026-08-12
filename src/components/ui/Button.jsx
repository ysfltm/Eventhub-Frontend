import React from 'react';
import { cn } from '../../lib/utils';

const Button = React.forwardRef(
  ({ className, variant = 'default', size = 'default', disabled, children, ...props }, ref) => {
    const baseStyles =
      'cst-btn-motion inline-flex items-center justify-center rounded-xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cst-blue-600)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer';

    const variants = {
      // CST Blue primary — replaces old indigo-600
      default:     'bg-[var(--cst-blue-700)] text-white hover:bg-[var(--cst-blue-600)] shadow-lg shadow-[rgba(29,86,182,0.25)]',
      secondary:   'bg-[var(--surface-800)] text-[var(--text-primary)] hover:bg-[var(--surface-700)] border border-[var(--border-default)] shadow-sm',
      // CST Red destructive
      destructive: 'bg-[var(--cst-red-700)]/10 border border-[var(--cst-red-700)]/20 text-[var(--cst-red-400)] hover:bg-[var(--cst-red-700)]/20',
      outline:     'border border-[var(--border-default)] bg-[var(--surface-900)] hover:bg-[var(--surface-800)] text-[var(--text-primary)]',
      ghost:       'hover:bg-[var(--nav-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
      link:        'underline-offset-4 hover:underline text-[var(--cst-blue-500)] hover:text-[var(--cst-blue-400)] p-0 h-auto',
    };

    const sizes = {
      default: 'h-10 py-2 px-4 text-sm',
      sm:      'h-8 px-3 rounded-lg text-xs',
      lg:      'h-12 px-6 rounded-xl text-base',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
