import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

const alertVariants = {
  default: {
    container: 'bg-slate-900/90 border-slate-800 text-slate-200',
    icon: Info,
    iconColor: 'text-indigo-400',
  },
  destructive: {
    container: 'bg-red-950/40 border-red-900/50 text-red-300',
    icon: XCircle,
    iconColor: 'text-red-400',
  },
  success: {
    container: 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300',
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
  },
  warning: {
    container: 'bg-amber-950/40 border-amber-900/50 text-amber-300',
    icon: AlertCircle,
    iconColor: 'text-amber-400',
  },
};

export const Alert = ({ children, variant = 'default', className, ...props }) => {
  const variantStyles = alertVariants[variant] || alertVariants.default;
  const IconComponent = variantStyles.icon;

  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-xl border p-4 flex items-start gap-3 backdrop-blur-md shadow-lg',
        variantStyles.container,
        className
      )}
      {...props}
    >
      <IconComponent className={cn('h-5 w-5 shrink-0 mt-0.5', variantStyles.iconColor)} />
      <div className="flex-1 text-sm font-medium">{children}</div>
    </div>
  );
};

export const AlertTitle = ({ children, className, ...props }) => {
  return (
    <h5 className={cn('mb-1 font-semibold leading-none tracking-tight text-slate-100', className)} {...props}>
      {children}
    </h5>
  );
};

export const AlertDescription = ({ children, className, ...props }) => {
  return (
    <div className={cn('text-sm [&_p]:leading-relaxed text-slate-300', className)} {...props}>
      {children}
    </div>
  );
};

