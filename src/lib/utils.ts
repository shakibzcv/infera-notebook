import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges multiple Tailwind CSS classes using clsx and tailwind-merge.
 * This handles conditional classes and ensures that Tailwind classes are
 * properly overridden without conflicts.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
