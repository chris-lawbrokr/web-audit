import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface OverlineProps {
  /** accent is the indigo used to introduce a screen; muted labels a section. */
  tone?: 'accent' | 'muted';
  className?: string;
  children: ReactNode;
}

/** 12px uppercase label with the design system's wide tracking. */
export function Overline({ tone = 'muted', className, children }: OverlineProps) {
  return (
    <span
      className={cn(
        'text-xs font-semibold tracking-wide uppercase',
        tone === 'accent' ? 'text-violet-600' : 'text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  );
}
