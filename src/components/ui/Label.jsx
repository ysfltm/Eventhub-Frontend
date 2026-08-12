import React from 'react';
import { cn } from '../../lib/utils';

const Label = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(
        'text-xs font-semibold leading-none tracking-wider text-slate-300 uppercase',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  );
});

Label.displayName = 'Label';

export { Label };

