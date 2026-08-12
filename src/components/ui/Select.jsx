import React from 'react';
import { cn } from '../../lib/utils';

const Select = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-xl border px-3.5 py-2 text-sm shadow-sm transition-all',
        'focus:outline-none focus:border-[var(--cst-blue-600)] focus:ring-1 focus:ring-[var(--cst-blue-600)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      style={{
        backgroundColor: 'var(--bg-input)',
        color: 'var(--text-primary)',
        borderColor: 'var(--border-default)',
      }}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  );
});

Select.displayName = 'Select';

export { Select };
