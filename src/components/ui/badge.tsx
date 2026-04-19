import type { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

export function Badge({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-800 dark:bg-brand-900/40 dark:text-brand-200',
        className,
      )}
    >
      {children}
    </span>
  );
}
