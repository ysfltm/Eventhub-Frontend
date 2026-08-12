import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx and tailwind-merge
 * Prevents class conflicts and provides clean class composition
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
